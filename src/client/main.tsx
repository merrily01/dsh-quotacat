// client 侧装配点：注册词典与 composer dock 额度 pill。

import { getReact } from './runtime'
import type { ClientContext } from './types'
import { NS, zh, en } from './i18n'
import { ensureCss } from './styles'
import { registerQuota, registerQuotaToast } from './registerQuota'
import { QuotaCatFooter } from './QuotaCatFooter'
import { QuotaAlertToast } from './QuotaAlertToast'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  const React = getReact()

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-quotacat: dictionaries')
  const t = ctx.locale.bind(NS) as (key: string, ...args: unknown[]) => string

  ensureCss()
  registerQuota(ctx, t, React, QuotaCatFooter)
  registerQuotaToast(ctx, React, QuotaAlertToast)
}
