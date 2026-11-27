// DeepSeek API 余额查询（API 计费账户）。
//
// 端点：GET https://api.deepseek.com/user/balance
// 鉴权：Authorization: Bearer <api key>
// 说明：仅适用于 API key 计费账户；订阅（deepseek-account 登录）无公开余额接口，
// 未配置 key 时本 provider 静默不启用。

import { QuotaCatError } from './glm'

export interface DeepseekBalance {
  /** 账户是否可用（欠费/冻结时为 false） */
  isAvailable: boolean
  /** 货币，如 "CNY" */
  currency: string
  /** 总余额（含赠送金），字符串转数字 */
  totalBalance: number
  /** 赠送金余额 */
  grantBalance: number
}

interface BalanceEnvelope {
  is_available?: boolean
  balance_infos?: Array<{
    currency?: string
    total_balance?: string
    grant_balance?: string
  }>
}

function num(value: string | undefined): number {
  const n = Number.parseFloat(value ?? '')
  return Number.isFinite(n) ? n : 0
}

export async function fetchDeepseekBalance(apiKey: string, timeoutMs = 15000): Promise<DeepseekBalance> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let resp: Response
  try {
    resp = await fetch('https://api.deepseek.com/user/balance', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    })
  } catch (e) {
    throw new QuotaCatError(`DeepSeek 网络错误：${(e as Error).message}`, 'network')
  } finally {
    clearTimeout(timer)
  }
  if (resp.status === 401 || resp.status === 403) {
    throw new QuotaCatError('DeepSeek API Key 无效（401/403）', 'unauthorized')
  }
  if (!(resp.status >= 200 && resp.status < 300)) {
    throw new QuotaCatError(`DeepSeek HTTP ${resp.status}`)
  }
  const data = (await resp.json().catch(() => null)) as BalanceEnvelope | null
  if (data === null) throw new QuotaCatError('DeepSeek 响应不是合法 JSON', 'server')
  const info = data.balance_infos?.[0] ?? {}
  return {
    isAvailable: data.is_available ?? true,
    currency: info.currency ?? 'CNY',
    totalBalance: num(info.total_balance),
    grantBalance: num(info.grant_balance),
  }
}
