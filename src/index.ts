// dsh-quotacat — host 侧入口。
//
// 职责：
//   1. 定时/按需拉取 GLM Coding Plan 用量并缓存
//   2. 暴露 /api/quotacat/* HTTP 路由给浏览器面板
//   3. 注册 quota agent 工具（对话里直接问额度）

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { fetchGlmUsage, QuotaCatError } from './glm'
import './server-types.d.ts'
import { API, type ReportResponse, type UsageReport } from './shared/api'

export const name = 'dsh-quotacat'
export const inject = ['webServer', 'tools']

interface CredentialsService {
  resolve(ref: never): Promise<{ value?: string } | undefined>
}

/** 依次尝试从宿主 credentials 服务解析这些凭据名（DSH 登录 GLM Coding Plan 时自动存入）。 */
const CREDENTIAL_REFS = ['ZAI_CODING_CN_API_KEY', 'GLM_API_KEY', 'QUOTACAT_API_KEY']

interface Config {
  apiKey?: string
  refreshMinutes?: number
  baseURL?: string
}

interface State {
  report?: UsageReport
  error?: string
  fetchedAt: number
  inflight?: Promise<void>
}

function sendJson(res: any, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export function apply(ctx: Context, config: Config): void {
  const logger = ctx.logger(name)
  const cfg = {
    apiKey: config.apiKey ?? '',
    refreshMinutes: config.refreshMinutes ?? 10,
    baseURL: config.baseURL ?? 'https://open.bigmodel.cn',
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
      state.report = await fetchGlmUsage(key, cfg.baseURL)
      state.fetchedAt = Date.now()
      state.error = undefined
      logger.info('refreshed GLM usage')
    } catch (e) {
      const err = e as QuotaCatError
      state.error = err.message
      logger.warn('refresh failed: %s', err.message)
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
    return { ok: state.error === undefined, error: state.error, report: state.report }
  }

  // 定时刷新（refreshMinutes=0 关闭）；不用 ctx.setInterval 以避免宿主接口差异
  if (cfg.refreshMinutes > 0) {
    const timer = setInterval(() => {
      void refreshOnce()
    }, cfg.refreshMinutes * 60_000)
    ctx.effect(() => () => clearInterval(timer))
    // 启动时先拉一次
    void refreshOnce()
  }

  // ---- HTTP 路由 ----
  ctx.webServer.register({
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
  })

  ctx.webServer.register({
    kind: 'exact',
    path: API.refresh,
    handler: async (_req, res) => {
      void refreshOnce().then(async () => sendJson(res, 200, await buildResponse()))
    },
  })

  ctx.webServer.register({
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
        recent: recentProviders(),
        listening,
        seen: [...seenProviders.entries()].map(([provider, v]) => ({ provider, ...v })),
        configKey: cfg.apiKey.length > 0,
        baseURL: cfg.baseURL,
      })
    },
  })

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
          return '未配置 GLM API Key。请在插件 cordis.patch.yml 配置 apiKey，或设置 QUOTACAT_API_KEY 环境变量。'
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
