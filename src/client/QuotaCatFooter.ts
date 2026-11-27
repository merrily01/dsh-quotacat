// composer.dock 统计条上的额度 pill。
// 详情面板 portal 到 body，从 pill 左边缘向右展开，并在视口边缘内收。

import { getReact, getReactDOM, tryRequire } from './runtime.ts'
import { placePanel } from './anchoredPosition.ts'
import { fetchReport, fetchSettings, saveSettings, fetchStatus, type Model, type Settings } from './model.ts'
import { OPEN_QUOTA_EVENT, DATA_UPDATED_EVENT } from './events.ts'
export { advanceThresholdLatch } from './thresholdLatch.ts'

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

function SettingsIcon(): any {
  const React = getReact()
  return React.createElement(
    'svg',
    { viewBox: '0 0 20 20', fill: 'none', 'aria-hidden': 'true' },
    React.createElement('path', {
      d: 'M8.8 4.32h2.4l.44 1.72c.34.13.67.32.96.55l1.7-.5 1.2 2.08-1.27 1.22c.03.2.05.4.05.61s-.02.42-.05.62l1.27 1.22-1.2 2.08-1.7-.5c-.29.23-.62.42-.96.55l-.44 1.72H8.8l-.44-1.72a4.6 4.6 0 0 1-.96-.55l-1.7.5-1.2-2.08 1.27-1.22a3.8 3.8 0 0 1 0-1.23L4.5 8.17l1.2-2.08 1.7.5c.29-.23.62-.42.96-.55l.44-1.72Z',
      stroke: 'currentColor', strokeWidth: 1.4, strokeLinejoin: 'round',
    }),
    React.createElement('circle', { cx: 10, cy: 10, r: 2.05, stroke: 'currentColor', strokeWidth: 1.4 }),
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
    let reportTimer: ReturnType<typeof setInterval> | undefined
    let reportIntervalMs = 5 * 60_000
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
          // 数据轮询跟随 host 配置的刷新频率（缺省 5 分钟，下限 15 秒防打爆）
          const minutes = Math.max(0.25, s.refreshMinutes ?? 5)
          const next = minutes * 60_000
          if (next !== reportIntervalMs) {
            reportIntervalMs = next
            if (reportTimer !== undefined) clearInterval(reportTimer)
            reportTimer = setInterval(loadReport, next)
          }
        })
        .catch(() => {})
    }
    loadReport()
    loadStatus()
    reportTimer = setInterval(loadReport, reportIntervalMs)
    const t2 = setInterval(loadStatus, 15 * 1000)
    return () => {
      alive = false
      if (reportTimer !== undefined) clearInterval(reportTimer)
      clearInterval(t2)
    }
  }, [])

  useEffect(() => {
    const openQuota = () => {
      setView('quota')
      setPos(undefined)
      setOpen(true)
    }
    window.addEventListener(OPEN_QUOTA_EVENT, openQuota)
    return () => window.removeEventListener(OPEN_QUOTA_EVENT, openQuota)
  }, [])

  // Toast 广播的新报告：立即更新 pill/弹框显示，与提醒保持同步
  useEffect(() => {
    const onData = (e: Event) => {
      const detail = (e as CustomEvent).detail as Model | undefined
      if (detail !== undefined && detail.report !== undefined) setModel(detail)
    }
    window.addEventListener(DATA_UPDATED_EVENT, onData)
    return () => window.removeEventListener(DATA_UPDATED_EVENT, onData)
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
  const isDeepseek = active.provider !== undefined && /deepseek/i.test(active.provider)
  const dsBalance = model.deepseek?.balance
  // DeepSeek 活跃且有余额数据 → 显示余额；有 key 但查询失败也保持高亮并显示错误；
  // 未配置 key → 置灰
  const dim = isDeepseek
    ? model.deepseek === undefined
    : !isGlmLike(active.provider)

  const pillValue = isDeepseek
    ? dsBalance !== undefined
      ? `${dsBalance.totalBalance.toFixed(2)} ${dsBalance.currency === 'CNY' ? '¥' : dsBalance.currency}`
      : undefined
    : pct !== undefined
      ? `${pct}%`
      : undefined
  const pillValueColor = isDeepseek ? 'inherit' : severity(pct ?? 0)
  const pillTitle = isDeepseek
    ? dim
      ? 'DeepSeek API key 未配置（余额监控未启用）'
      : dsBalance !== undefined
        ? `DeepSeek API 余额 ${pillValue}`
        : `DeepSeek 查询中/失败：${model.deepseek?.error ?? ''}`
    : dim
      ? `当前模型 ${active.model ?? active.provider ?? ''} 暂无额度服务`
      : `GLM 5 小时窗口 ${pct ?? '—'}%`

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
        title: pillTitle,
        onClick: toggle,
      },
      GaugeIcon(),
      React.createElement('span', { className: 'qc-pill-label' }, '额度'),
      !dim && pillValue !== undefined
        ? React.createElement('span', { className: 'qc-pill-value', style: { color: pillValueColor } }, pillValue)
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

/** 设置表单。密钥随宿主自动获取，因此这里只呈现用户可操作项。 */
export function SettingsForm(props: { onCancel: () => void, onSaved: () => void }): any {
  const React = getReact()
  const { useState, useEffect } = React

  const [info, setInfo] = useState<Settings | undefined>(undefined)
  const [refreshMinutes, setRefreshMinutes] = useState(10)
  const [notify, setNotify] = useState(true)
  const [threshold, setThreshold] = useState(0.8)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)

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

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 1600)
    return () => clearTimeout(timer)
  }, [saved])

  const markChanged = () => {
    setSaved(false)
    setSaveError(false)
  }

  const save = () => {
    if (saving) return
    setSaving(true)
    setSaved(false)
    setSaveError(false)
    saveSettings({
      refreshMinutes,
      notificationEnabled: notify,
      notificationThreshold: threshold,
    }).then((r) => {
      setSaving(false)
      if (r.ok) {
        setSaved(true)
        props.onSaved()
      } else {
        setSaveError(true)
      }
    }).catch(() => {
      setSaving(false)
      setSaveError(true)
    })
  }

  return React.createElement(
    'div', { className: 'qc-settings' },
    // ---- 刷新频率 ----
    React.createElement('section', { className: 'qc-s-section' },
      React.createElement('div', { className: 'qc-s-section-label' }, '刷新'),
      React.createElement('div', { className: 'qc-s-surface' },
        React.createElement('label', { className: 'qc-s-row' },
          React.createElement('span', { className: 'qc-s-name' }, '自动刷新'),
          React.createElement('select', {
            className: 'qc-s-select',
            value: refreshMinutes,
            disabled: info === undefined,
            'aria-label': '自动刷新频率',
            onChange: (e: any) => {
              setRefreshMinutes(Number(e.target.value))
              markChanged()
            },
          }, REFRESH_OPTIONS.map((o) =>
            React.createElement('option', { key: o.minutes, value: o.minutes }, o.label),
          )),
        ),
      ),
    ),
    // ---- 阈值提醒 ----
    React.createElement('section', { className: 'qc-s-section' },
      React.createElement('div', { className: 'qc-s-section-label' }, '通知'),
      React.createElement('div', { className: 'qc-s-surface' },
        React.createElement('div', { className: 'qc-s-row' },
          React.createElement('span', { className: 'qc-s-name' }, '额度阈值提醒'),
          React.createElement(Switch, {
            checked: notify,
            onChange: (value: boolean) => {
              setNotify(value)
              markChanged()
            },
            label: '额度阈值提醒',
          }),
        ),
        notify
          ? React.createElement('div', { className: 'qc-s-threshold' },
            React.createElement('div', { className: 'qc-s-threshold-head' },
              React.createElement('span', { className: 'qc-s-name' }, '触发阈值'),
              React.createElement('span', { className: 'qc-s-value' }, `${Math.round(threshold * 100)}%`),
            ),
            React.createElement('input', {
              className: 'qc-s-range',
              type: 'range',
              min: 0.5,
              max: 0.95,
              step: 0.05,
              value: threshold,
              'aria-label': '额度提醒触发阈值',
              onChange: (e: any) => {
                setThreshold(Number(e.target.value))
                markChanged()
              },
              style: { '--qc-range-fill': `${((threshold - 0.5) / 0.45) * 100}%` } as any,
            }),
            React.createElement('div', { className: 'qc-s-hint' }, '5h 用量达到阈值时提醒一次，回落后可再次触发'),
          )
          : null,
      ),
    ),
    React.createElement('div', { className: 'qc-s-actions' },
      React.createElement('span', {
        className: `qc-s-feedback${saveError ? ' is-error' : ''}`,
        role: 'status',
      }, saved ? '已保存' : saveError ? '保存失败，请重试' : ''),
      React.createElement('button', {
        className: 'qc-s-action qc-s-cancel', type: 'button',
        disabled: saving,
        onClick: props.onCancel,
      }, '取消'),
      React.createElement('button', {
        className: 'qc-s-action qc-s-save', type: 'button',
        disabled: saving || info === undefined,
        onClick: save,
      }, saving ? '保存中…' : '保存更改'),
    ),
  )
}

export function renderDialog(
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

  // DeepSeek API 余额（有数据或错误时始终展示，与当前模型无关）
  const ds = model.deepseek
  if (ds !== undefined) {
    if (ds.balance !== undefined) {
      rows.push(
        React.createElement('dt', { key: 'ds-b' }, 'DeepSeek 余额'),
        React.createElement('dd', { key: 'ds-bv' }, `${ds.balance.totalBalance.toFixed(2)} ${ds.balance.currency}`),
        React.createElement('dt', { key: 'ds-g' }, '· 赠送金'),
        React.createElement('dd', { key: 'ds-gv' }, ds.balance.grantBalance.toFixed(2)),
        ...(ds.balance.isAvailable ? [] : [
          React.createElement('dt', { key: 'ds-a' }, '状态'),
          React.createElement('dd', { key: 'ds-av' }, '不可用'),
        ]),
      )
    } else if (ds.error !== undefined) {
      rows.push(
        React.createElement('dt', { key: 'ds-e' }, 'DeepSeek'),
        React.createElement('dd', { key: 'ds-ev' }, `查询失败：${ds.error.slice(0, 40)}`),
      )
    }
  }

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
    ? React.createElement(SettingsForm, {
        onCancel: () => setView('quota'),
        onSaved: () => setView('quota'),
      })
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
    view === 'quota'
      ? React.createElement(
          'div',
          { className: 'qc-d-foot' },
          React.createElement('span', null, r !== undefined ? `更新于 ${new Date(r.fetchedAt).toLocaleTimeString()}` : ''),
          React.createElement(
            'span',
            { className: 'qc-d-footbtns' },
            React.createElement('button', { className: 'qc-d-action qc-d-refresh', onClick: refresh },
              model.loading === true ? '刷新中…' : '刷新'),
            React.createElement('button', {
              className: 'qc-d-action qc-d-settings',
              type: 'button',
              title: '设置',
              'aria-label': '设置',
              onClick: () => setView('settings'),
            }, SettingsIcon()),
          ),
        )
      : null,
  )
}
