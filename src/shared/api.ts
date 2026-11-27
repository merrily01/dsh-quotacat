// 宿主 HTTP 路由与客户端 fetch 共用的常量与类型。

export const API_BASE = '/api/quotacat'

export const API = {
  /** GET：最近一次用量报告（带缓存） */
  report: `${API_BASE}/report`,
  /** GET?refresh=1：强制刷新后返回 */
  refresh: `${API_BASE}/refresh`,
  /** GET：配置状态（是否已设置 key） */
  status: `${API_BASE}/status`,
  /** GET：设置项当前值；POST：保存设置 */
  settings: `${API_BASE}/settings`,
} as const

export type WindowKind = 'fiveHourTokens' | 'monthlyMCP' | 'unknown'

export interface McpToolUsage {
  tool: string
  count: number
}

export interface UsageWindow {
  kind: WindowKind
  /** [0,1] */
  percentage: number
  currentUsage: number
  total: number
  label: string
  mcpToolBreakdown?: McpToolUsage[]
  /** Unix ms */
  resetsAt?: number
}

export interface UsageReport {
  providerId: string
  planTier: string
  /** Unix ms */
  fetchedAt: number
  windows: UsageWindow[]
}

export interface ReportResponse {
  ok: boolean
  error?: string
  /** 未配置 API key 时 missingKey=true */
  missingKey?: boolean
  report?: UsageReport
  /** 近 24 小时 MCP 工具调用（独立接口，失败时省略） */
  toolUsage24h?: ToolUsage24h
  /** DeepSeek API 余额（未配置 key 时省略） */
  deepseek?: DeepseekInfo
  /** 阈值提醒状态（5h 窗口用量达到阈值时 triggered=true，回落到阈值下方后自动复位） */
  threshold?: ThresholdAlert
}

export interface ThresholdAlert {
  enabled: boolean
  /** 阈值，[0,1] */
  value: number
  /** 5h 窗口当前占比是否达到阈值（达到后到回落前只报一次） */
  triggered: boolean
  /** 达到阈值时的 5h 占比 */
  pct: number
}

export interface ToolUsage24h {
  networkSearches: number
  webReads: number
  zreadCalls: number
}

/** DeepSeek API 余额信息（API key 计费账户）。 */
export interface DeepseekInfo {
  balance?: {
    isAvailable: boolean
    currency: string
    totalBalance: number
    grantBalance: number
  }
  error?: string
}

/** GET /settings 返回：设置项当前值（不含密钥明文） */
export interface SettingsInfo {
  ok: boolean
  /** 自动刷新间隔分钟；0 = 仅按需（打开面板/调用工具时） */
  refreshMinutes: number
  baseURL: string
  /** 额度阈值提醒开关 */
  notificationEnabled: boolean
  /** 阈值 [0.5, 0.95] */
  notificationThreshold: number
  /** 密钥状态：来自宿主 credentials 或环境变量 */
  key?: {
    /** 'credentials' = 宿主凭据存储；'env' = 环境变量；'none' = 未配置 */
    source: 'credentials' | 'env' | 'none'
    /** credentials 服务返回的掩码预览（如 sk-12…ef，可选） */
    masked?: string
  }
  /** 保存能力是否可用（configEditor / credentials 服务缺失时为 false） */
  editable: boolean
  error?: string
}

/** POST /settings 请求体：只提交需要修改的字段 */
export interface SettingsPayload {
  refreshMinutes?: number
  baseURL?: string
  notificationEnabled?: boolean
  notificationThreshold?: number
}
