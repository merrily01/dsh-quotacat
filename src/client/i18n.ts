// zh / en 词典。

export const NS = 'dsh-quotacat'

export const zh = {
  panelTitle: 'QuotaCat',
  footerLabel: '额度',
  refresh: '刷新',
  refreshing: '刷新中…',
  missingKey: '未配置 GLM API Key',
  missingKeyHint: '在插件的 cordis.patch.yml 里填 apiKey，或设置 QUOTACAT_API_KEY 环境变量，然后重启 DSH。',
  planTier: '套餐',
  updated: '更新于',
  fetchFailed: '查询失败',
  noData: '暂无数据',
  resetsAt: '重置于',
  used: '已用',
}

export const en = {
  panelTitle: 'QuotaCat',
  footerLabel: 'Quota',
  refresh: 'Refresh',
  refreshing: 'Refreshing…',
  missingKey: 'GLM API key not configured',
  missingKeyHint: 'Set apiKey in the plugin cordis.patch.yml, or the QUOTACAT_API_KEY env var, then restart DSH.',
  planTier: 'Plan',
  updated: 'Updated',
  fetchFailed: 'Fetch failed',
  noData: 'No data yet',
  resetsAt: 'Resets',
  used: 'Used',
}
