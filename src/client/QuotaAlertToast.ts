import { fetchReport } from './model.ts'
import { getReact, tryRequire } from './runtime.ts'
import { advanceThresholdLatch } from './thresholdLatch.ts'
import { OPEN_QUOTA_EVENT, DATA_UPDATED_EVENT } from './events.ts'

interface AlertNotice {
  seq: number
  pct: number
  threshold: number
}

const POLL_MS = 60_000

/** Global DSH warning Toast for a newly crossed quota threshold. */
export function QuotaAlertToast(): any {
  const React = getReact()
  const { useEffect, useRef, useState } = React
  const [notice, setNotice] = useState<AlertNotice | null>(null)
  const latched = useRef(false)
  const sequence = useRef(0)

  useEffect(() => {
    let alive = true
    const poll = () => {
      fetchReport(false).then((model) => {
        if (!alive) return
        // 广播最新报告，pill/dialog 立即跟进，避免提醒与显示不同步
        window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT, { detail: model }))
        const threshold = model.threshold
        const next = advanceThresholdLatch(latched.current, threshold?.triggered === true)
        latched.current = next.latched
        if (!next.notify || threshold === undefined) return
        sequence.current += 1
        setNotice({
          seq: sequence.current,
          pct: Math.round(threshold.pct * 100),
          threshold: Math.round(threshold.value * 100),
        })
      }).catch(() => {})
    }
    poll()
    const timer = setInterval(poll, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const primitives = tryRequire('@deepseek-ai/dsh-client-ui-primitives')
  const Toast = primitives?.Toast
  if (notice === null || Toast === undefined) return null

  const dismiss = () => setNotice(null)
  const openQuota = () => {
    dismiss()
    window.dispatchEvent(new CustomEvent(OPEN_QUOTA_EVENT))
  }
  const icon = primitives.IconWarningOutlineRegular !== undefined
    ? React.createElement(primitives.IconWarningOutlineRegular)
    : undefined

  return React.createElement(Toast, {
    key: notice.seq,
    text: `5 小时额度已使用 ${notice.pct}%，已达到 ${notice.threshold}% 提醒阈值`,
    icon,
    holdMs: 8_000,
    actions: [{ label: '查看额度', onClick: openQuota }],
    onDone: dismiss,
  })
}
