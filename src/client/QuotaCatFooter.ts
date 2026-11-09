// composer.dock 统计条上的额度 pill。
// 详情面板 portal 到 body，从 pill 左边缘向右展开，并在视口边缘内收。

import { getReact, getReactDOM, tryRequire } from './runtime'
import { placePanel } from './anchoredPosition'
import { fetchReport, fetchStatus, type Model } from './model'

const prim = tryRequire('@deepseek-ai/dsh-client-ui-primitives')

const PROVIDER_LABELS: Array<{ match: RegExp; label: string }> = [
  { match: /zai|glm|zhipu|bigmodel/i, label: 'GLM' },
  { match: /deepseek/i, label: 'DeepSeek' },
  { match: /claude|anthropic/i, label: 'Claude' },
  { match: /openai|gpt/i, label: 'OpenAI' },
]

function providerLabel(provider: string | undefined): string {
  if (provider === undefined) return ''
  for (const p of PROVIDER_LABELS) if (p.match.test(provider)) return p.label
  return provider.slice(0, 10)
}

function severity(pct: number): string {
  return pct < 60 ? '#22c55e' : pct < 85 ? '#eab308' : '#ef4444'
}

function GaugeIcon(): any {
  if (prim !== undefined && typeof prim.IconGaugeOutlineRegular !== 'undefined') {
    return getReact().createElement(prim.IconGaugeOutlineRegular)
  }
  const React = getReact()
  return React.createElement(
    'svg',
    { viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
    React.createElement('circle', { cx: 8, cy: 8, r: 6, stroke: 'currentColor', strokeWidth: 1.5, strokeOpacity: 0.55 }),
    React.createElement('path', { d: 'M8 8 L11.5 5.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
  )
}

export function QuotaCatFooter(_props: { t: (key: string) => string }): any {
  const React = getReact()
  const { useState, useEffect, useLayoutEffect, useRef } = React

  const [model, setModel] = useState<Model>({ loading: true })
  const [active, setActive] = useState<{ provider?: string; model?: string }>({})
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; bottom: number } | undefined>(undefined)
  const rootRef = useRef(null)
  const panelRef = useRef(null)

  const isGlmLike = (p: string | undefined): boolean =>
    p === undefined ? true : /zai|glm|zhipu|bigmodel/i.test(p)

  useEffect(() => {
    let alive = true
    const loadReport = () => {
      fetchReport(false)
        .then((m) => { if (alive) setModel(m) })
        .catch(() => {})
    }
    const loadStatus = () => {
      fetchStatus()
        .then((s) => {
          if (!alive) return
          const recent = s.recent ?? []
          setActive({ provider: recent[0]?.provider ?? s.activeProvider, model: s.activeModel })
        })
        .catch(() => {})
    }
    loadReport()
    loadStatus()
    const t1 = setInterval(loadReport, 5 * 60_000)
    const t2 = setInterval(loadStatus, 15 * 1000)
    return () => {
      alive = false
      clearInterval(t1)
      clearInterval(t2)
    }
  }, [])

  // Esc / 点击外部关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: PointerEvent) => {
      const root = rootRef.current as HTMLElement | null
      const panel = panelRef.current as HTMLElement | null
      const target = e.target as Node
      if (root?.contains(target) !== true && panel?.contains(target) !== true) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const root = rootRef.current as HTMLElement | null
    const panel = panelRef.current as HTMLElement | null
    if (root === null || panel === null) return

    const update = () => {
      const anchor = root.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const next = placePanel(anchor, panelRect.width, {
        width: window.innerWidth,
        height: window.innerHeight,
      })
      setPos((current) => current?.left === next.left && current.bottom === next.bottom ? current : next)
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    resize?.observe(root)
    resize?.observe(panel)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      resize?.disconnect()
    }
  }, [open])

  const fiveHour = model.report?.windows.find((w) => w.kind === 'fiveHourTokens')
  const pct = fiveHour !== undefined ? Math.round(fiveHour.percentage * 100) : undefined
  const dim = !isGlmLike(active.provider)

  const pillText = dim
    ? '额度'
    : '额度'

  const toggle = () => {
    setOpen((v: boolean) => {
      if (v) setPos(undefined)
      return !v
    })
  }

  return React.createElement(
    'span',
    { ref: rootRef, className: 'qc-pill-anchor', 'data-qc-version': '16' },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'qc-pill',
        style: dim ? { opacity: 0.55 } : undefined,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        title: dim ? `当前模型 ${active.model ?? active.provider ?? ''} 暂无额度服务` : `GLM 5 小时窗口 ${pct ?? '—'}%`,
        onClick: toggle,
      },
      GaugeIcon(),
      React.createElement('span', { className: 'qc-pill-label' }, pillText),
      !dim && pct !== undefined
        ? React.createElement('span', { className: 'qc-pill-value', style: { color: severity(pct) } }, `${pct}%`)
        : null,
    ),
    open && getReactDOM().createPortal(
      renderDialog(React, model, dim, active, panelRef, pos, () => {
        fetchReport(true).then(setModel).catch(() => {})
      }),
      document.body,
    ),
  )
}

function renderDialog(
  React: typeof import('react'),
  model: Model,
  dim: boolean,
  active: { provider?: string; model?: string },
  panelRef: { current: unknown },
  pos: { left: number; bottom: number } | undefined,
  refresh: () => void,
): any {
  const r = model.report
  const rows: any[] = []

  if (dim) {
    rows.push(
      React.createElement('dt', { key: 'p' }, '当前模型'),
      React.createElement('dd', { key: 'pv' }, active.model ?? active.provider ?? '—'),
      React.createElement('dt', { key: 'n' }, '额度服务'),
      React.createElement('dd', { key: 'nv' }, '暂不支持'),
    )
  } else if (r !== undefined) {
    rows.push(
      React.createElement('dt', { key: 'tier' }, '套餐'),
      React.createElement('dd', { key: 'tierv' }, r.planTier.toUpperCase()),
    )
    for (const w of r.windows) {
      const p = Math.round(w.percentage * 100)
      rows.push(
        React.createElement('dt', { key: `${w.label}-k` }, w.label),
        React.createElement(
          'dd',
          { key: `${w.label}-v`, style: { color: severity(p) } },
          `${p}%${w.resetsAt !== undefined ? ` · ${new Date(w.resetsAt).toLocaleTimeString().slice(0, 5)} 重置` : ''}`,
        ),
      )
      for (const m of w.mcpToolBreakdown ?? []) {
        rows.push(
          React.createElement('dt', { key: `${w.label}-${m.tool}` }, `· ${m.tool}`),
          React.createElement('dd', { key: `${w.label}-${m.tool}-v` }, `${m.count} 次`),
        )
      }
    }
  } else if (model.missingKey === true) {
    rows.push(React.createElement('dt', { key: 'mk' }, '密钥'), React.createElement('dd', { key: 'mkv' }, '未配置'))
  } else if (model.error !== undefined) {
    rows.push(React.createElement('dt', { key: 'e' }, '错误'), React.createElement('dd', { key: 'ev' }, model.error))
  } else {
    rows.push(React.createElement('dt', { key: 'nd' }, '数据'), React.createElement('dd', { key: 'ndv' }, '暂无'))
  }

  const headValue = dim
    ? '—'
    : r !== undefined
      ? `${Math.round((r.windows.find((w) => w.kind === 'fiveHourTokens')?.percentage ?? 0) * 100)}%`
      : '—'

  return React.createElement(
    'div',
    {
      ref: panelRef,
      className: 'qc-dialog',
      role: 'dialog',
      'aria-label': '额度',
      style: pos !== undefined
        ? { left: `${pos.left}px`, bottom: `${pos.bottom}px` }
        : { visibility: 'hidden', left: '0px', bottom: '0px' },
    },
    React.createElement(
      'div',
      { className: 'qc-d-title' },
      React.createElement('span', { className: 'qc-d-label' }, GaugeIcon(), '额度'),
      React.createElement('span', { className: 'qc-d-value' }, headValue),
    ),
    React.createElement('div', { className: 'qc-d-rule', 'aria-hidden': true }),
    React.createElement('dl', { className: 'qc-d-details' }, rows),
    React.createElement(
      'div',
      { className: 'qc-d-foot' },
      React.createElement('span', null, r !== undefined ? `更新于 ${new Date(r.fetchedAt).toLocaleTimeString()}` : ''),
      React.createElement('button', { className: 'qc-d-refresh', onClick: refresh },
        model.loading === true ? '刷新中…' : '刷新'),
    ),
  )
}
