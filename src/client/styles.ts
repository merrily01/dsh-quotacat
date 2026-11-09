// 内联样式表：一次性注入 <style>，类名前缀 qc- 避免冲突。

const CSS = `
/* ---- composer.dock 统计条 pill（对齐宿主 StatsPills.module.css 规格） ---- */
.qc-pill-anchor {
  position: relative; order: 1; min-width: 0; display: inline-flex;
  font-size: calc(var(--dsh-content-font-size-secondary, 13px) - 1px);
  line-height: calc(20px + var(--dsh-content-font-delta-secondary, 0px));
}
.qc-pill {
  box-sizing: border-box; border-radius: var(--dsw-radius-sm); max-width: 100%;
  color: var(--dsw-alias-label-tertiary); font: inherit; font-variant-numeric: tabular-nums;
  line-height: inherit; white-space: nowrap; background: 0 0; border: none;
  align-items: center; gap: 6px; padding: 1px 8px; display: inline-flex; cursor: pointer;
}
.qc-pill svg { flex: none; width: 14px; height: 14px; }
@media (hover: hover) {
  button.qc-pill:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
}
button.qc-pill[aria-expanded="true"] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); }
.qc-pill-label { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.qc-pill-value { font-variant-numeric: tabular-nums; font-weight: 500; }

/* ---- 详情弹框（对齐宿主 stat-dialog.module.css；由插件自行 portal 并定位） ---- */
.qc-dialog {
  position: fixed; z-index: 1100; box-sizing: border-box;
  width: max-content;
  min-width: min(300px, calc(100vw - 24px), var(--dsh-anchored-max-width, 100vw));
  max-width: min(440px, calc(100vw - 24px), var(--dsh-anchored-max-width, 100vw));
  max-height: var(--dsh-anchored-max-height, none);
  overflow: hidden auto;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-specific-menu);
  backdrop-filter: var(--dsw-menu-backdrop-filter);
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l1);
  box-shadow: var(--dsw-elevation-prominent);
  color: var(--dsw-alias-label-secondary);
  cursor: default; border: 0; padding: 16px; font-size: 12px; line-height: 18px;
}
.qc-d-title {
  color: var(--dsw-alias-label-primary); justify-content: space-between; gap: 16px;
  margin-bottom: 8px; font-weight: 500; display: flex; align-items: center;
}
.qc-d-label { align-items: center; gap: 6px; min-width: 0; display: inline-flex; }
.qc-d-label svg { flex: none; width: 14px; height: 14px; }
.qc-d-value { font-variant-numeric: tabular-nums; }
.qc-d-rule { border-top: .5px solid var(--dsw-alias-border-l2); margin-bottom: 10px; }
.qc-d-details {
  color: var(--dsw-alias-label-tertiary);
  grid-template-columns: minmax(64px, auto) minmax(0, 1fr);
  gap: 6px 16px; margin: 0; display: grid;
}
.qc-d-details dt, .qc-d-details dd { min-width: 0; margin: 0; }
.qc-d-details dd { color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; text-align: right; }
.qc-d-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 10px; padding-top: 8px; border-top: .5px solid var(--dsw-alias-border-l2);
  font-size: 11px; color: var(--dsw-alias-label-tertiary);
}
.qc-d-refresh {
  border: none; background: 0 0; color: var(--dsw-alias-label-tertiary);
  font: inherit; font-size: 11px; cursor: pointer; padding: 0 2px;
}
.qc-d-refresh:hover { color: var(--dsw-alias-label-secondary); }
.qc-d-note { color: var(--dsw-alias-label-tertiary); }
`

export function ensureCss(): void {
  if (document.getElementById('dsh-quotacat-css') !== null) return
  const style = document.createElement('style')
  style.id = 'dsh-quotacat-css'
  style.textContent = CSS
  document.head.append(style)
}
