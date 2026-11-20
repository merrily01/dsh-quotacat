// composer.dock 统计条上的额度 pill。
// 详情面板 portal 到 body，从 pill 左边缘向右展开，并在视口边缘内收。

import { getReact, getReactDOM, tryRequire } from './runtime'
import { placePanel } from './anchoredPosition'
import { fetchReport, fetchSettings, saveSettings, fetchStatus, type Model, type Settings } from './model'

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

/** 重置时刻显示：当天只显示 HH:MM，跨天显示 MM-DD HH:MM。 */
function formatReset(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return sameDay ? hm : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${hm}`
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
  const [view, setView] = useState<'quota' | 'settings'>('quota')
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
          // 优先最近活跃 provider；无近期数据时，仅当 activeProvider 仍新鲜才采用，
          // 陈旧数据不用于变暗（activeFresh 缺省视为新鲜，兼容旧 host）
          const stale = s.activeFresh === false
          const provider = recent[0]?.provider ?? (stale ? undefined : s.activeProvider)
          setActive({ provider, model: stale ? undefined : s.activeModel })
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
      if (v) {
        setPos(undefined)
        setView('quota')
      }
      return !v
    })
  }

  return React.createElement(
    'span',
    { ref: rootRef, className: 'qc-pill-anchor', 'data-qc-version': '17-24h' },
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
      renderDialog(React, model, dim, active, panelRef, pos, view, setView, () => {
        fetchReport(true).then(setModel).catch(() => {})
      }),
      document.body,
    ),
  )
}

/** 刷新频率选项。 */
const REFRESH_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: '1 分钟', minutes: 1 },
  { label: '5 分钟', minutes: 5 },
  { label: '10 分钟', minutes: 10 },
  { label: '30 分钟', minutes: 30 },
  { label: '1 小时', minutes: 60 },
  { label: '仅按需', minutes: 0 },
]

/** iOS 风格开关。 */
function Switch(props: { checked: boolean; onChange: (v: boolean) => void, label?: string }): any {
  const React = getReact()
  return React.createElement(
    'button',
    {
      type: 'button',
      role: 'switch',
      'aria-checked': props.checked,
      'aria-label': props.label,
      className: `qc-switch${props.checked ? ' qc-switch-on' : ''}`,
      onClick: () => props.onChange(!props.checked),
    },
    React.createElement('span', { className: 'qc-switch-knob' }),
  )
}

/** 设置表单。密钥全自动获取（宿主登录凭据/环境变量），用户无需感知。 */
function SettingsForm(props: { onDone: () => void }): any {
  const React = getReact()
  const { useState, useEffect } = React

  const [info, setInfo] = useState<Settings | undefined>(undefined)
  const [refreshMinutes, setRefreshMinutes] = useState(10)
  const [notify, setNotify] = useState(true)
  const [threshold, setThreshold] = useState(0.8)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    fetchSettings().then((s) => {
      if (!alive || s.ok !== true) return
      setInfo(s)
      setRefreshMinutes(s.refreshMinutes)
      setNotify(s.notificationEnabled)
      setThreshold(s.notificationThreshold)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const save = () => {
    if (saving) return
    setSaving(true)
    setSaved(false)
    saveSettings({
      refreshMinutes,
      notificationEnabled: notify,
      notificationThreshold: threshold,
    }).then((r) => {
      setSaving(false)
      if (r.ok) {
        setSaved(true)
        props.onDone()
      }
    }).catch(() => setSaving(false))
  }

  const keyReady = info?.key !== undefined && info.key.source !== 'none'

  return React.createElement(
    'div', { className: 'qc-settings' },
    // ---- 刷新频率 ----
    React.createElement('div', { className: 'qc-s-group' },
      React.createElement('div', { className: 'qc-s-head' },
        React.createElement('span', { className: 'qc-s-name' }, '自动刷新'),
        React.createElement('span', { className: 'qc-s-hint' },
          refreshMinutes === 0 ? '仅按需' : `每 ${refreshMinutes} 分钟`),
      ),
      React.createElement('div', { className: 'qc-s-options' },
        REFRESH_OPTIONS.map((o) =>
          React.createElement('button', {
            key: o.minutes,
            className: `qc-s-option${refreshMinutes === o.minutes ? ' is-active' : ''}`,
            type: 'button',
            onClick: () => setRefreshMinutes(o.minutes),
          }, o.label),
        ),
      ),
    ),
    // ---- 阈值提醒 ----
    React.createElement('div', { className: 'qc-s-group' },
      React.createElement('div', { className: 'qc-s-head' },
        React.createElement('span', { className: 'qc-s-name' }, '额度阈值提醒'),
        React.createElement(Switch, {
          checked: notify,
          onChange: setNotify,
          label: '额度阈值提醒',
        }),
      ),
      notify
        ? React.createElement('div', { className: 'qc-s-slider' },
            React.createElement('input', {
              className: 'qc-s-range',
              type: 'range',
              min: 0.5,
              max: 0.95,
              step: 0.05,
              value: threshold,
              onChange: (e: any) => setThreshold(Number(e.target.value)),
              style: { '--qc-range-fill': `${((threshold - 0.5) / 0.45) * 100}%` } as any,
            }),
            React.createElement(
              'div', { className: 'qc-s-slider-marks' },
              React.createElement('span', { className: threshold <= 0.52 ? 'is-on' : undefined }, '50%'),
              React.createElement('span', { className: 'is-on qc-s-slider-now' }, `${Math.round(threshold * 100)}%`),
              React.createElement('span', { className: threshold >= 0.93 ? 'is-on' : undefined }, '95%'),
            ),
            React.createElement('div', { className: 'qc-s-hint' }, '5h 用量达到阈值时提醒一次，回落到阈值下方后恢复'),
          )
        : null,
    ),
    // ---- 数据来源（只读，密钥全自动） ----
    React.createElement('div', { className: 'qc-s-group qc-s-plain' },
      React.createElement('div', { className: 'qc-s-head' },
        React.createElement('span', { className: 'qc-s-name' }, '数据来源'),
        React.createElement('span', { className: `qc-s-badge${keyReady ? ' is-ok' : ' is-warn'}` },
          keyReady ? '已连接' : '未连接'),
      ),
      React.createElement('div', { className: 'qc-s-hint' }, 'GLM Coding Plan 凭据随宿主自动获取，无需手动配置'),
    ),
    // ---- 保存 ----
    React.createElement('button', {
      className: 'qc-s-save', type: 'button',
      disabled: saving || info === undefined,
      onClick: save,
    }, saving ? '保存中…' : saved ? '已保存 ✓' : '保存'),
  )
}

function renderDialog(
  React: typeof import('react'),
  model: Model,
  dim: boolean,
  active: { provider?: string; model?: string },
  panelRef: { current: unknown },
  pos: { left: number; bottom: number } | undefined,
  view: 'quota' | 'settings',
  setView: (v: 'quota' | 'settings') => void,
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
      ...(model.toolUsage24h !== undefined
        ? [
            React.createElement('dt', { key: 's24' }, '24h 搜索'),
            React.createElement('dd', { key: 's24v' }, `${model.toolUsage24h.networkSearches} 次`),
            React.createElement('dt', { key: 'w24' }, '24h 网页'),
            React.createElement('dd', { key: 'w24v' }, `${model.toolUsage24h.webReads} 次`),
            ...(model.toolUsage24h.zreadCalls > 0
              ? [
                  React.createElement('dt', { key: 'z24' }, '24h zread'),
                  React.createElement('dd', { key: 'z24v' }, `${model.toolUsage24h.zreadCalls} 次`),
                ]
              : []),
          ]
        : []),
    )
    for (const w of r.windows) {
      const p = Math.round(w.percentage * 100)
      rows.push(
        React.createElement('dt', { key: `${w.label}-k` }, w.label),
        React.createElement(
          'dd',
          { key: `${w.label}-v`, style: { color: severity(p) } },
          `${p}%${w.resetsAt !== undefined ? ` · ${formatReset(w.resetsAt)} 重置` : ''}`,
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

  const headValue = view === 'settings'
    ? '—'
    : dim
      ? '—'
      : r !== undefined
        ? `${Math.round((r.windows.find((w) => w.kind === 'fiveHourTokens')?.percentage ?? 0) * 100)}%`
        : '—'

  const body = view === 'settings'
    ? React.createElement(SettingsForm, { onDone: () => setView('quota') })
    : React.createElement(
        'div',
        null,
        model.threshold?.triggered === true
          ? React.createElement(
              'div',
              { className: 'qc-d-alert', role: 'alert' },
              `⚠ 5h 用量已达 ${Math.round(model.threshold.pct * 100)}%（阈值 ${Math.round(model.threshold.value * 100)}%），注意安排用量`,
            )
          : null,
        React.createElement('dl', { className: 'qc-d-details' }, rows),
      )

  return React.createElement(
    'div',
    {
      ref: panelRef,
      className: 'qc-dialog',
      role: 'dialog',
      'aria-label': view === 'settings' ? '额度设置' : '额度',
      style: pos !== undefined
        ? { left: `${pos.left}px`, bottom: `${pos.bottom}px` }
        : { visibility: 'hidden', left: '0px', bottom: '0px' },
    },
    React.createElement(
      'div',
      { className: 'qc-d-title' },
      React.createElement('span', { className: 'qc-d-label' }, GaugeIcon(), view === 'settings' ? '额度设置' : '额度'),
      React.createElement('span', { className: 'qc-d-value' }, headValue),
    ),
    React.createElement('div', { className: 'qc-d-rule', 'aria-hidden': true }),
    body,
    React.createElement(
      'div',
      { className: 'qc-d-foot' },
      React.createElement('span', null, view === 'quota' && r !== undefined ? `更新于 ${new Date(r.fetchedAt).toLocaleTimeString()}` : ''),
      view === 'settings'
        ? React.createElement('button', { className: 'qc-d-refresh', onClick: () => setView('quota') }, '返回')
        : React.createElement(
            'span',
            { className: 'qc-d-footbtns' },
            React.createElement('button', {
              className: 'qc-d-refresh',
              title: '设置',
              'aria-label': '设置',
              onClick: () => setView('settings'),
            }, '⚙'),
            React.createElement('button', { className: 'qc-d-refresh', onClick: refresh },
              model.loading === true ? '刷新中…' : '刷新'),
          ),
    ),
  )
}
