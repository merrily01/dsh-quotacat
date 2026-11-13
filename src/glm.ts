// GLM Coding Plan 额度查询 —— QuotaCat (Swift) 的 TypeScript 移植。
//
// 端点：GET {base}/api/monitor/usage/quota/limit
// 鉴权：Authorization 头放原始 API key（不带 "Bearer " 前缀）。

import type { UsageReport, UsageWindow, WindowKind } from './shared/api'

interface GlmEnvelope<T> {
  code: number
  msg?: string
  data?: T
}

interface GlmMcpToolUsage {
  modelCode: string
  usage: number
}

interface GlmLimit {
  /** 原始 type，如 "TOKENS_LIMIT" */
  type?: string
  /** 服务端 [0,100] */
  percentage?: number
  currentValue?: number
  usage?: number
  usageDetails?: GlmMcpToolUsage[]
  /** Unix 毫秒 */
  nextResetTime?: number
}

interface GlmQuotaLimitPayload {
  level?: string
  limits?: GlmLimit[]
}

function kindOf(rawType: string | undefined): WindowKind {
  if (rawType === 'TOKENS_LIMIT') return 'fiveHourTokens'
  if (rawType === 'TIME_LIMIT') return 'monthlyMCP'
  return 'unknown'
}

const LABELS: Record<WindowKind, string> = {
  fiveHourTokens: '5 小时窗口',
  monthlyMCP: '本月 MCP',
  unknown: '其他',
}

export function mapPayload(payload: GlmQuotaLimitPayload, fetchedAt: number): UsageReport {
  const windows: UsageWindow[] = (payload.limits ?? []).map((limit) => {
    const kind = kindOf(limit.type)
    return {
      kind,
      percentage: Math.min(1, Math.max(0, (limit.percentage ?? 0) / 100)),
      currentUsage: limit.currentValue ?? 0,
      total: limit.usage ?? 0,
      label: LABELS[kind],
      mcpToolBreakdown: kind === 'monthlyMCP'
        ? (limit.usageDetails ?? []).map((item) => ({ tool: item.modelCode, count: Math.round(item.usage) }))
        : undefined,
      resetsAt: limit.nextResetTime,
    }
  })
  return {
    providerId: 'glm',
    planTier: payload.level ?? '',
    fetchedAt,
    windows,
  }
}

export class QuotaCatError extends Error {
  constructor(message: string, readonly kind: 'unauthorized' | 'network' | 'server' | 'empty' = 'server') {
    super(message)
    this.name = 'QuotaCatError'
  }
}

/** 近 24 小时（整点对齐）MCP 工具调用量 —— Swift 版 fetchToolUsage 的移植。 */
export interface ToolUsage24h {
  networkSearches: number
  webReads: number
  zreadCalls: number
}

interface GlmToolUsagePayload {
  totalUsage?: {
    totalNetworkSearchCount?: number
    totalWebReadMcpCount?: number
    totalZreadMcpCount?: number
  }
}

/** "YYYY-MM-DD HH:mm:ss"，与 Swift 版 twentyFourHourWindow 一致（整点对齐的 24h 窗口）。 */
function windowParam(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export async function fetchGlmToolUsage(apiKey: string, baseURL: string, timeoutMs = 15000): Promise<ToolUsage24h> {
  const base = baseURL.replace(/\/+$/, '')
  const hourStart = new Date()
  hourStart.setMinutes(0, 0, 0)
  const start = new Date(hourStart.getTime() - 24 * 3600_000)
  const end = new Date(hourStart.getTime() + 3600_000 - 1000)
  const url = `${base}/api/monitor/usage/tool-usage?startTime=${encodeURIComponent(windowParam(start))}&endTime=${encodeURIComponent(windowParam(end))}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let resp: Response
  try {
    resp = await fetch(url, {
      headers: {
        Authorization: apiKey,
        'Accept-Language': 'en-US,en',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
  } catch (e) {
    throw new QuotaCatError(`网络错误：${(e as Error).message}`, 'network')
  } finally {
    clearTimeout(timer)
  }
  if (resp.status === 401 || resp.status === 403) {
    throw new QuotaCatError('API Key 无效或未授权（401/403）', 'unauthorized')
  }
  if (!(resp.status >= 200 && resp.status < 300)) {
    throw new QuotaCatError(`HTTP ${resp.status}`)
  }
  const envelope = (await resp.json().catch(() => null)) as GlmEnvelope<GlmToolUsagePayload> | null
  if (envelope === null) throw new QuotaCatError('tool-usage 响应不是合法 JSON', 'server')
  if (envelope.code !== 0 && envelope.code !== 200) {
    throw new QuotaCatError(`tool-usage 服务端错误 code=${envelope.code}`, 'server')
  }
  const t = envelope.data?.totalUsage ?? {}
  return {
    networkSearches: Math.round(t.totalNetworkSearchCount ?? 0),
    webReads: Math.round(t.totalWebReadMcpCount ?? 0),
    zreadCalls: Math.round(t.totalZreadMcpCount ?? 0),
  }
}

/** 拉取并映射 GLM 用量报告。 */
export async function fetchGlmUsage(apiKey: string, baseURL: string, timeoutMs = 15000): Promise<UsageReport> {
  const url = `${baseURL.replace(/\/+$/, '')}/api/monitor/usage/quota/limit`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let resp: Response
  try {
    resp = await fetch(url, {
      headers: {
        // CRITICAL: 原始 token，无 Bearer 前缀（与 Swift 版验证一致）
        Authorization: apiKey,
        'Accept-Language': 'en-US,en',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
  } catch (e) {
    throw new QuotaCatError(`网络错误：${(e as Error).message}`, 'network')
  } finally {
    clearTimeout(timer)
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new QuotaCatError('API Key 无效或未授权（401/403）', 'unauthorized')
  }
  if (!(resp.status >= 200 && resp.status < 300)) {
    const body = await resp.text().catch(() => '')
    throw new QuotaCatError(`HTTP ${resp.status}: ${body.slice(0, 200)}`)
  }

  const envelope = (await resp.json().catch(() => null)) as GlmEnvelope<GlmQuotaLimitPayload> | null
  if (envelope === null) throw new QuotaCatError('响应不是合法 JSON', 'server')
  if (envelope.code !== 0 && envelope.code !== 200) {
    throw new QuotaCatError(`服务端错误 code=${envelope.code} msg=${envelope.msg ?? ''}`, 'server')
  }
  if (envelope.data === null || envelope.data === undefined) {
    throw new QuotaCatError('响应缺少 data', 'empty')
  }
  return mapPayload(envelope.data, Date.now())
}
