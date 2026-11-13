// 宿主 HTTP 路由与客户端 fetch 共用的常量与类型。

export const API_BASE = '/api/quotacat'

export const API = {
  /** GET：最近一次用量报告（带缓存） */
  report: `${API_BASE}/report`,
  /** GET?refresh=1：强制刷新后返回 */
  refresh: `${API_BASE}/refresh`,
  /** GET：配置状态（是否已设置 key） */
  status: `${API_BASE}/status`,
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
}

export interface ToolUsage24h {
  networkSearches: number
  webReads: number
  zreadCalls: number
}
