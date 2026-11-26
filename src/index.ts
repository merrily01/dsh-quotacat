// dsh-quotacat — host 侧入口。
//
// 职责：
//   1. 定时/按需拉取 GLM Coding Plan 用量并缓存
//   2. 暴露 /api/quotacat/* HTTP 路由给浏览器面板
//   3. 注册 quota agent 工具（对话里直接问额度）

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { fetchGlmUsage, fetchGlmToolUsage, QuotaCatError, type ToolUsage24h } from './glm.ts'
import './server-types.d.ts'
import {
  API,
  type ReportResponse,
  type SettingsInfo,
  type ThresholdAlert,
  type UsageReport,
} from './shared/api.ts'
import { canPersistPluginSettings, persistPluginSettings } from './settingsPersistence.ts'
export { Config } from './config.ts'

export const name = 'dsh-quotacat'
export const inject = ['webServer', 'tools']

interface CredentialsService {
  resolve(ref: never): Promise<{ value?: string } | undefined>
  describe?(ref: never): Promise<{ configured: boolean; source?: string; masked?: string } | undefined>
  set?(ref: never, value: string): Promise<void>
  unset?(ref: never): Promise<void>
}

/** 依次尝试从宿主 credentials 服务解析这些凭据名（DSH 登录 GLM Coding Plan 时自动存入）。 */
const CREDENTIAL_REFS = ['QUOTACAT_API_KEY', 'GLM_API_KEY', 'ZAI_CODING_CN_API_KEY']

interface Config {
  apiKey?: string
  refreshMinutes?: number | LiveConfig<number>
  baseURL?: string
  notificationEnabled?: boolean | LiveConfig<boolean>
  notificationThreshold?: number | LiveConfig<number>
}

interface LiveConfig<T> {
  get(): T
}

function isLiveConfig<T>(value: unknown): value is LiveConfig<T> {
  return typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function'
}

function liveValue<T>(value: T | LiveConfig<T> | undefined, fallback: T): T {
  return isLiveConfig<T>(value)
    ? value.get()
    : (value as T | undefined) ?? fallback
}

interface State {
  report?: UsageReport
  toolUsage24h?: ToolUsage24h
  error?: string
  fetchedAt: number
  inflight?: Promise<void>
  /** 阈值提醒是否已触发（回落到阈值下方后复位，避免重复打扰） */
  thresholdTriggered?: boolean
}

function sendJson(res: any, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function readBody(req: any, limit = 64 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('payload too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** 注册 webServer 路由并在插件停用时注销（register 返回的 disposer 需显式接入生命周期）。 */
function disposeOnStop(ctx: Context, disposer: (() => void) | void): void {
  if (typeof disposer === 'function') ctx.effect(() => disposer)
}

export function apply(ctx: Context, config: Config): void {
  const logger = ctx.logger(name)
  const cfg = {
    get apiKey() { return config.apiKey ?? '' },
    get refreshMinutes() { return liveValue(config.refreshMinutes, 10) },
    get baseURL() { return config.baseURL ?? 'https://open.bigmodel.cn' },
    get notificationEnabled() { return liveValue(config.notificationEnabled, true) },
    get notificationThreshold() {
      return Math.min(Math.max(liveValue(config.notificationThreshold, 0.8), 0.5), 0.95)
    },
  }
  const state: State = { fetchedAt: 0 }

  /** 最近一次实际模型调用的 provider/model（来自 llm/stream 事件）。 */
  let activeProvider: string | undefined
  let activeModel: string | undefined
  let lastEventAt = 0

  /** 每个会话最近一次对话调用的 provider（sessionId -> {provider, at}）。 */
  const sessionProviders = new Map<string, { provider: string; at: number }>()

  /** 诊断：见过的 provider 调用次数（含辅助调用），用于确认事件是否到达插件。 */
  const seenProviders = new Map<string, { count: number; lastAt: number; lastModel?: string; lastSession?: string }>()

  let listening = false

  const onStream = (options: {
    provider?: string
    model?: string
    sessionId?: string
    purpose?: string
  }, next: () => unknown): unknown => {
    listening = true
    lastEventAt = Date.now()
    const provider = options?.provider
    if (typeof provider === 'string') {
      // 诊断统计（不区分调用目的，任何到达的调用都记）
      const prev = seenProviders.get(provider)
      seenProviders.set(provider, {
        count: (prev?.count ?? 0) + 1,
        lastAt: Date.now(),
        lastModel: options?.model,
        lastSession: typeof options?.sessionId === 'string' ? options.sessionId : undefined,
      })
      activeModel = options?.model
      if (options?.purpose === undefined) {
        activeProvider = provider
        const sid = options?.sessionId
        if (typeof sid === 'string' && sid.length > 0) {
          sessionProviders.set(sid, { provider, at: Date.now() })
        }
      }
    }
    return next()
  }

  /**
   * 注册事件监听。llm 服务光纤重启（如切换/重配模型）会销毁绑在旧实例上的
   * 监听器，因此用心跳式重注册：每 60 秒拆旧挂新，服务重启后 1 分钟内自愈。
   */
  let disposeListener: (() => void) | undefined
  const registerListener = (): void => {
    try {
      const events = ctx as unknown as {
        on: (event: string, fn: typeof onStream) => () => void
      }
      disposeListener?.()
      disposeListener = events.on('llm/stream', onStream) ?? undefined
    } catch {
      // 宿主无 llm 服务时忽略（事件不可用则指示器始终显示 GLM）
    }
  }
  registerListener()
  const heartbeat = setInterval(registerListener, 60 * 1000)
  ctx.effect(() => () => {
    clearInterval(heartbeat)
    disposeListener?.()
  })

  /** 各 provider 最近 10 分钟内的对话活跃情况（供客户端判断）。 */
  function recentProviders(): Array<{ provider: string; at: number }> {
    const cutoff = Date.now() - 10 * 60_000
    const out: Array<{ provider: string; at: number }> = []
    for (const [sid, entry] of sessionProviders) {
      if (entry.at < cutoff) {
        sessionProviders.delete(sid)
        continue
      }
      out.push({ provider: entry.provider, at: entry.at })
    }
    return out.sort((a, b) => b.at - a.at)
  }

  /** 数据新鲜度：30 分钟内没有事件视为陈旧，指示器恢复默认（高亮）。 */
  const FRESH_MS = 30 * 60_000

  /** 当前活跃 provider 是否由我们支持的额度服务覆盖。 */
  function isActiveSupported(): boolean {
    if (activeProvider === undefined) return true // 尚无调用记录，默认显示
    if (Date.now() - lastEventAt > FRESH_MS) return true // 数据陈旧，不再据此变暗
    return /zai|glm|zhipu|bigmodel/i.test(activeProvider)
  }

  /** 每次解析时现取宿主 credentials 服务句柄（插件启动时它可能尚未就绪）。 */
  function getCredentials(): CredentialsService | undefined {
    try {
      const svc = typeof ctx.get === 'function' ? ctx.get('credentials') : undefined
      return svc !== null && svc !== undefined && typeof (svc as CredentialsService).resolve === 'function'
        ? (svc as CredentialsService)
        : undefined
    } catch {
      return undefined
    }
  }

  async function resolveKey(): Promise<string> {
    if (cfg.apiKey.length > 0) return cfg.apiKey
    // 1) 宿主 credentials（DSH 当前登录的服务商 key，零配置）
    const credentials = getCredentials()
    if (credentials !== undefined) {
      for (const ref of CREDENTIAL_REFS) {
        try {
          const resolved = await credentials.resolve(ref as never as never)
          const value = resolved?.value
          if (typeof value === 'string' && value.length > 0) return value
        } catch {
          // 单个凭据名缺失/不可用，继续尝试下一个
        }
      }
    }
    // 2) 环境变量兜底
    return (
      process.env.QUOTACAT_API_KEY ||
      process.env.GLM_API_KEY ||
      process.env.ZHIPU_API_KEY ||
      ''
    )
  }

  async function refresh(): Promise<void> {
    const key = await resolveKey()
    if (key.length === 0) {
      state.error = undefined
      return
    }
    try {
      // 两个接口并行；tool-usage 失败不影响主报告
      const [report, toolResult] = await Promise.all([
        fetchGlmUsage(key, cfg.baseURL),
        fetchGlmToolUsage(key, cfg.baseURL).then(
          (t) => t,
          () => undefined satisfies undefined as ToolUsage24h | undefined,
        ),
      ])
      state.report = report
      state.toolUsage24h = toolResult
      state.fetchedAt = Date.now()
      state.error = undefined
      updateThresholdState()
      logger.info('refreshed GLM usage')
    } catch (e) {
      const err = e as QuotaCatError
      state.error = err.message
      logger.warn('refresh failed: %s', err.message)
    }
  }

  /** 阈值提醒状态机：达到阈值触发一次，回落到阈值下方后复位。 */
  function updateThresholdState(): void {
    const pct = fiveHourPct()
    if (pct === undefined) return
    if (cfg.notificationEnabled && pct >= cfg.notificationThreshold) {
      if (state.thresholdTriggered !== true) {
        state.thresholdTriggered = true
        logger.info('threshold reached: %d%% >= %d%%', Math.round(pct * 100), Math.round(cfg.notificationThreshold * 100))
      }
    } else {
      state.thresholdTriggered = false
    }
  }

  function fiveHourPct(): number | undefined {
    const w = state.report?.windows.find((x) => x.kind === 'fiveHourTokens')
    return w?.percentage
  }

  function thresholdAlert(): ThresholdAlert {
    return {
      enabled: cfg.notificationEnabled,
      value: cfg.notificationThreshold,
      triggered: cfg.notificationEnabled && state.thresholdTriggered === true,
      pct: fiveHourPct() ?? 0,
    }
  }

  function refreshOnce(): Promise<void> {
    state.inflight ??= refresh().finally(() => {
      state.inflight = undefined
    })
    return state.inflight
  }

  async function buildResponse(): Promise<ReportResponse> {
    const key = await resolveKey()
    if (key.length === 0) return { ok: true, missingKey: true }
    return {
      ok: state.error === undefined,
      error: state.error,
      report: state.report,
      toolUsage24h: state.toolUsage24h,
      threshold: thresholdAlert(),
    }
  }

  // 定时刷新（refreshMinutes=0 关闭）；volatile 配置变化时重排下一次刷新。
  let refreshTimer: ReturnType<typeof setTimeout> | undefined
  const scheduleRefresh = (): void => {
    if (refreshTimer !== undefined) clearTimeout(refreshTimer)
    refreshTimer = undefined
    const minutes = cfg.refreshMinutes
    if (minutes <= 0) return
    refreshTimer = setTimeout(() => {
      void refreshOnce().finally(scheduleRefresh)
    }, minutes * 60_000)
  }
  scheduleRefresh()
  if (cfg.refreshMinutes > 0) void refreshOnce()
  const loaderEvents = ctx as unknown as { on(event: string, listener: () => void): unknown }
  loaderEvents.on('loader/volatile-update', () => {
    scheduleRefresh()
    updateThresholdState()
  })
  ctx.effect(() => () => {
    if (refreshTimer !== undefined) clearTimeout(refreshTimer)
  })

  // ---- HTTP 路由 ----
  disposeOnStop(ctx, ctx.webServer.register({
    kind: 'exact',
    path: API.report,
    handler: async (_req, res) => {
      const fresh = Date.now() - state.fetchedAt < 5 * 60_000
      if (!fresh) {
        void refreshOnce().then(async () => sendJson(res, 200, await buildResponse()))
      } else {
        sendJson(res, 200, await buildResponse())
      }
    },
  }))

  disposeOnStop(ctx, ctx.webServer.register({
    kind: 'exact',
    path: API.refresh,
    handler: async (_req, res) => {
      void refreshOnce().then(async () => sendJson(res, 200, await buildResponse()))
    },
  }))

  disposeOnStop(ctx, ctx.webServer.register({
    kind: 'exact',
    path: API.status,
    handler: async (_req, res) => {
      const svc = getCredentials()
      let resolvedRef: string | undefined
      if (svc !== undefined) {
        for (const ref of CREDENTIAL_REFS) {
          try {
            const r = await svc.resolve(ref as never)
            if (typeof r?.value === 'string' && r.value.length > 0) {
              resolvedRef = ref
              break
            }
          } catch {
            /* try next */
          }
        }
      }
      sendJson(res, 200, {
        ok: true,
        hasKey: resolvedRef !== undefined,
        credService: svc !== undefined,
        resolvedRef,
        activeProvider,
        activeModel,
        activeSupported: isActiveSupported(),
        activeFresh: lastEventAt > 0 && Date.now() - lastEventAt <= FRESH_MS,
        refreshMinutes: cfg.refreshMinutes,
        recent: recentProviders(),
        listening,
        seen: [...seenProviders.entries()].map(([provider, v]) => ({ provider, ...v })),
        configKey: cfg.apiKey.length > 0,
        baseURL: cfg.baseURL,
      })
    },
  }))

  // ---- 设置路由 ----

  /** 密钥当前来源（不回传明文）。 */
  async function describeKey(): Promise<SettingsInfo['key']> {
    if (cfg.apiKey.length > 0) return { source: 'config', masked: `${cfg.apiKey.slice(0, 5)}…${cfg.apiKey.slice(-4)}` }
    const credentials = getCredentials()
    if (credentials !== undefined) {
      for (const ref of CREDENTIAL_REFS) {
        try {
          if (credentials.describe === undefined) break
          const d = await credentials.describe(ref as never)
          if (d?.configured === true) {
            return {
              source: 'credentials',
              masked: d.masked,
            }
          }
        } catch {
          /* try next */
        }
      }
    }
    if (resolveKeyEnvOnly() !== '') return { source: 'env' }
    return { source: 'none' }
  }

  function resolveKeyEnvOnly(): string {
    return (
      process.env.QUOTACAT_API_KEY ||
      process.env.GLM_API_KEY ||
      process.env.ZHIPU_API_KEY ||
      ''
    )
  }

  disposeOnStop(ctx, ctx.webServer.register({
    kind: 'exact',
    path: API.settings,
    handler: async (req, res) => {
      if (req.method === 'GET') {
        const key = await describeKey().catch(() => undefined)
        sendJson(res, 200, {
          ok: true,
          refreshMinutes: cfg.refreshMinutes,
          baseURL: cfg.baseURL,
          notificationEnabled: cfg.notificationEnabled,
          notificationThreshold: cfg.notificationThreshold,
          key,
          editable: canPersistPluginSettings(ctx),
        } satisfies SettingsInfo)
        return
      }
      if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method not allowed' })
        return
      }

      let payload: {
        refreshMinutes?: unknown
        baseURL?: unknown
        notificationEnabled?: unknown
        notificationThreshold?: unknown
      }
      try {
        payload = JSON.parse(await readBody(req)) as typeof payload
      } catch {
        sendJson(res, 400, { ok: false, error: 'invalid JSON body' })
        return
      }

      // 校验
      let refreshMinutes: number | undefined
      if (payload.refreshMinutes !== undefined) {
        const n = Number(payload.refreshMinutes)
        if (!Number.isFinite(n) || n < 0 || n > 1440 || !Number.isInteger(n)) {
          sendJson(res, 400, { ok: false, error: 'refreshMinutes 需为 0–1440 的整数分钟' })
          return
        }
        refreshMinutes = n
      }
      let baseURL: string | undefined
      if (payload.baseURL !== undefined) {
        if (typeof payload.baseURL !== 'string' || payload.baseURL.length === 0) {
          sendJson(res, 400, { ok: false, error: 'baseURL 不能为空' })
          return
        }
        try {
          const u = new URL(payload.baseURL)
          if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol')
        } catch {
          sendJson(res, 400, { ok: false, error: 'baseURL 不是合法的 http(s) 地址' })
          return
        }
        baseURL = payload.baseURL.replace(/\/+$/, '')
      }
      let notificationEnabled: boolean | undefined
      if (payload.notificationEnabled !== undefined) {
        if (typeof payload.notificationEnabled !== 'boolean') {
          sendJson(res, 400, { ok: false, error: 'notificationEnabled 需为布尔值' })
          return
        }
        notificationEnabled = payload.notificationEnabled
      }
      let notificationThreshold: number | undefined
      if (payload.notificationThreshold !== undefined) {
        const t = Number(payload.notificationThreshold)
        if (!Number.isFinite(t) || t < 0.5 || t > 0.95) {
          sendJson(res, 400, { ok: false, error: 'notificationThreshold 需在 0.5–0.95 之间' })
          return
        }
        notificationThreshold = Math.round(t * 20) / 20
      }

      const patch: Record<string, unknown> = {}
      if (refreshMinutes !== undefined) patch.refreshMinutes = refreshMinutes
      if (baseURL !== undefined) patch.baseURL = baseURL
      if (notificationEnabled !== undefined) patch.notificationEnabled = notificationEnabled
      if (notificationThreshold !== undefined) patch.notificationThreshold = notificationThreshold

      try {
        await persistPluginSettings(ctx, patch)
        sendJson(res, 200, { ok: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn('save settings failed: %s', message)
        sendJson(res, 500, { ok: false, error: message })
      }
    },
  }))

  // ---- agent 工具 ----
  ctx.tools.register(
    defineTool({
      name: 'quota',
      description:
        '查询 GLM Coding Plan 的用量额度：5 小时 token 窗口、本月 MCP 工具用量、套餐等级。' +
        '当用户询问“额度/用量还剩多少”“5h 窗口什么时候重置”时使用。返回各窗口的百分比、' +
        '已用/总量与重置时间。',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, value: string) => [{ type: 'text' as const, text: value }],
      },
      async execute() {
        const key = await resolveKey()
        if (key.length === 0) {
          return '未配置 GLM API Key。请点击底栏额度面板中的“设置”保存密钥，或设置 QUOTACAT_API_KEY 环境变量。'
        }
        // 缓存 3 分钟内直接用
        if (Date.now() - state.fetchedAt > 3 * 60_000 || state.error !== undefined) {
          await refreshOnce()
        }
        const resp = await buildResponse()
        if (resp.error !== undefined) return `查询失败：${resp.error}`
        const r = resp.report
        if (r === undefined) return '暂无数据'
        const lines = [
          `GLM Coding Plan（${r.planTier}）· 更新于 ${new Date(r.fetchedAt).toLocaleString()}`,
          ...r.windows.map((w) => {
            const pct = `${Math.round(w.percentage * 100)}%`
            const reset = w.resetsAt !== undefined ? `，重置于 ${new Date(w.resetsAt).toLocaleTimeString()}` : ''
            const detail = w.kind === 'fiveHourTokens' ? `（已用 ${w.currentUsage}/${w.total} tokens）` : ''
            const mcp = w.mcpToolBreakdown?.length
              ? ` [${w.mcpToolBreakdown.map((m) => `${m.tool}:${m.count}`).join(', ')}]`
              : ''
            return `- ${w.label}：${pct}${detail}${reset}${mcp}`
          }),
        ]
        return lines.join('\n')
      },
    }),
  )
}
