// 面板数据模型：fetch 宿主 HTTP API。

import { API, type ReportResponse, type UsageReport } from '../shared/api'

export interface Model {
  loading?: boolean
  missingKey?: boolean
  error?: string
  report?: UsageReport
}

export interface StatusInfo {
  ok: boolean
  hasKey?: boolean
  activeProvider?: string
  activeModel?: string
  activeSupported?: boolean
  /** activeProvider 是否在 30 分钟新鲜窗口内；false 时客户端不据此变暗 */
  activeFresh?: boolean
  /** 各会话最近 10 分钟内对话调用的 provider，按时间倒序 */
  recent?: Array<{ provider: string; at: number }>
}

export async function fetchStatus(): Promise<StatusInfo> {
  return (await fetch(API.status, { cache: 'no-store' }).then((r) => r.json())) as StatusInfo
}

export async function fetchReport(force = false): Promise<Model> {
  const resp = (await fetch(force ? API.refresh : API.report, { cache: 'no-store' }).then((r) => r.json())) as ReportResponse
  if (resp.missingKey === true) return { loading: false, missingKey: true }
  if (resp.error !== undefined && resp.report === undefined) {
    return { loading: false, error: resp.error }
  }
  return { loading: false, report: resp.report }
}
