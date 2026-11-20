// composer.dock 统计条上的额度 pill。
// 详情面板 portal 到 body，从 pill 左边缘向右展开，并在视口边缘内收。

import { getReact, getReactDOM, tryRequire } from './runtime'
import { placePanel } from './anchoredPosition'
import { fetchReport, fetchSettings, saveSettings, validateKey, fetchStatus, type Model, type Settings } from './model'

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

/** 密钥来源的可读标签。 */
function keySourceLabel(s: Settings['key']): string {
  if (s === undefined) return '未知'
  if (s.source === 'credentials') return `已保存（凭据存储${s.masked !== undefined ? ` ${s.masked}` : ''}）`
  if (s.source === 'config') return `插件配置${s.masked !== undefined ? ` ${s.masked}` : ''}`
  if (s.source === 'env') return '环境变量'
  return '未配置'
}

/** 设置表单（真正的组件，可用 hooks）。 */
/** 刷新频率选项（对齐原版 QuotaCat 的 Picker 设计）。 */
const REFRESH_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: '1 分钟', minutes: 1 },
  { label: '5 分钟', minutes: 5 },
  { label: '10 分钟', minutes: 10 },
  { label: '30 分钟', minutes: 30 },
  { label: '1 小时', minutes: 60 },
  { label: '仅按需', minutes: 0 },
]

/** 设置表单（真正的组件，可用 hooks）。产品结构对齐原版 macOS QuotaCat：
 *  API Key（显示/隐藏 + 验证）、刷新频率（选项化）、阈值提醒（开关 + 滑块）、支持作者。 */
function SettingsForm(props: { onDone: () => void }): any {
  const React = getReact()
  const { useState, useEffect } = React

  const [info, setInfo] = useState<Settings | undefined>(undefined)
  const [refreshMinutes, setRefreshMinutes] = useState(10)
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [threshold, setThreshold] = useState(0.8)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(false)

  // ---- API Key 验证（原版核心交互：输入即验证，通过后自动保存） ----
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState('')

  useEffect(() => {
    let alive = true
    fetchSettings().then((s) => {
      if (!alive || s.ok !== true) return
      setInfo(s)
      setRefreshMinutes(s.refreshMinutes)
      setNotificationEnabled(s.notificationEnabled)
      setThreshold(s.notificationThreshold)
    }).catch(() => { if (alive) setMessage('读取设置失败') })
    return () => { alive = false }
  }, [])

  const validate = () => {
    if (validating) return
    setValidating(true)
    setValidation('')
    validateKey(apiKey.trim()).then(async (r) => {
      setValidating(false)
      if (r.ok === true) {
        // 验证通过 → 顺手保存这把 key（与原版行为一致：验证即保存）
        if (apiKey.trim().length > 0) await saveSettings({ apiKey: apiKey.trim() }).catch(() => {})
        setApiKey('')
        setValidation(`验证通过 ✓（${(r.planTier ?? '').toUpperCase()} 套餐，5h 已用 ${Math.round((r.fiveHourPct ?? 0) * 100)}%）`)
        props.onDone()
      } else {
        setValidation(`验证失败：${r.error ?? '未知错误'}`)
      }
    }).catch(() => {
      setValidating(false)
      setValidation('验证请求失败')
    })
  }

  const save = () => {
    if (saving) return
    setSaving(true)
    setMessage('')
    const payload: import('../shared/api').SettingsPayload = {
      refreshMinutes,
      notificationEnabled,
      notificationThreshold: threshold,
    }
    if (apiKey.trim().length > 0) payload.apiKey = apiKey.trim()
    saveSettings(payload).then((r) => {
      setSaving(false)
      setApiKey('')
      if (r.ok) {
        setMessage('已保存 ✓ 普通字段变更会重启插件，稍候生效。')
        setMessageOk(true)
        props.onDone()
      } else {
        setMessage(`保存失败：${r.error ?? '未知错误'}`)
        setMessageOk(false)
      }
    }).catch(() => {
      setSaving(false)
      setMessage('保存请求失败')
      setMessageOk(false)
    })
  }

  const section = (title: string, ...children: any[]) =>
    React.createElement(
      'div',
      { className: 'qc-s-section' },
      React.createElement('div', { className: 'qc-s-section-title' }, title),
      ...children,
    )

  const keyStatus = keySourceLabel(info?.key)

  return React.createElement(
    'div',
    { className: 'qc-settings' },
    // ---- GLM API Key ----
    section('GLM API Key',
      React.createElement('div', { className: 'qc-s-row' },
        React.createElement('input', {
          className: 'qc-s-input qc-s-wide',
          type: showKey ? 'text' : 'password',
          value: apiKey,
          placeholder: '粘贴 API Key',
          autocomplete: 'off',
          spellCheck: false,
          onChange: (e: any) => setApiKey(e.target.value),
        }),
        React.createElement('button', {
          className: 'qc-s-mini', type: 'button', onClick: () => setShowKey((v: boolean) => !v),
        }, showKey ? '隐藏' : '显示'),
      ),
      React.createElement('div', { className: 'qc-s-row qc-s-inline' },
        React.createElement('button', {
          className: 'qc-s-mini qc-s-validate', type: 'button',
          disabled: validating || (apiKey.trim().length === 0 && keyStatus === '未配置'),
          onClick: validate,
        }, validating ? '验证中…' : '验证'),
        validation !== '' ? React.createElement('span', { className: validating ? 'qc-s-note' : 'qc-s-validation' }, validation) : null,
      ),
      React.createElement('div', { className: 'qc-s-note' }, `当前密钥：${keyStatus}${apiKey.trim().length === 0 ? '，输入新 Key 后点“验证”即保存' : ''}`),
    ),
    // ---- 刷新频率 ----
    section('刷新频率',
      React.createElement('div', { className: 'qc-s-options' },
        REFRESH_OPTIONS.map((o) =>
          React.createElement('button', {
            key: o.minutes,
            className: `qc-s-option${refreshMinutes === o.minutes ? ' qc-s-option-active' : ''}`,
            type: 'button',
            onClick: () => setRefreshMinutes(o.minutes),
          }, o.label),
        ),
      ),
      React.createElement('div', { className: 'qc-s-note' }, refreshMinutes === 0 ? '仅在打开面板或调用 quota 工具时拉取' : `每 ${refreshMinutes} 分钟自动刷新一次`),
    ),
    // ---- 阈值提醒 ----
    section('阈值提醒',
      React.createElement('label', { className: 'qc-s-toggle' },
        React.createElement('input', {
          type: 'checkbox',
          checked: notificationEnabled,
          onChange: (e: any) => setNotificationEnabled(e.target.checked),
        }),
        React.createElement('span', null, '额度阈值提醒'),
      ),
      notificationEnabled
        ? React.createElement('div', { className: 'qc-s-slider' },
            React.createElement('div', { className: 'qc-s-slider-head' },
              React.createElement('span', null, '触发阈值'),
              React.createElement('span', { className: 'qc-s-slider-value' }, `${Math.round(threshold * 100)}%`),
            ),
            React.createElement('input', {
              className: 'qc-s-range',
              type: 'range',
              min: 0.5,
              max: 0.95,
              step: 0.05,
              value: threshold,
              onChange: (e: any) => setThreshold(Number(e.target.value)),
            }),
            React.createElement('div', { className: 'qc-s-note' }, '5h 用量达到阈值时在面板提醒一次，降到阈值下方后才能再次触发。'),
          )
        : null,
    ),
    // ---- 支持作者 ----
    section('支持作者',
      React.createElement('a', { className: 'qc-s-link', href: 'https://afdian.com/a/merrily01', target: '_blank', rel: 'noreferrer' },
        '爱发电赞助', React.createElement('span', { className: 'qc-s-chevron' }, '›')),
      React.createElement('a', { className: 'qc-s-link', href: 'https://www.bigmodel.cn/glm-coding?ic=8YZATIRSW1', target: '_blank', rel: 'noreferrer' },
        '推荐 GLM Coding Plan', React.createElement('span', { className: 'qc-s-chevron' }, '›')),
      React.createElement('div', { className: 'qc-s-note' }, '通过邀请链接注册，你我都能得奖励'),
    ),
    message !== '' ? React.createElement('div', { className: messageOk ? 'qc-s-message qc-s-ok' : 'qc-s-message' }, message) : null,
    React.createElement(
      'div',
      { className: 'qc-s-actions' },
      React.createElement('button', {
        className: 'qc-s-save',
        type: 'button',
        disabled: saving || info === undefined,
        onClick: save,
      }, saving ? '保存中…' : '保存'),
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
