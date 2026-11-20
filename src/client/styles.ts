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
.qc-d-footbtns { display: inline-flex; gap: 10px; align-items: center; }

/* ---- 设置表单 ---- */
.qc-settings { display: flex; flex-direction: column; gap: 10px; }
.qc-s-row {
  display: flex; flex-direction: column; gap: 4px;
  color: var(--dsw-alias-label-tertiary); font-size: 12px;
}
.qc-s-label { color: var(--dsw-alias-label-secondary); }
.qc-s-input {
  box-sizing: border-box; width: 100%; font: inherit; font-size: 12px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-input-bg, var(--dsw-alias-interactive-bg-hover));
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm);
  padding: 4px 8px; outline: none;
}
.qc-s-input:focus { border-color: var(--dsw-alias-focus-border, var(--dsw-alias-label-secondary)); }
.qc-s-input:disabled { opacity: 0.6; }
.qc-s-wide { font-variant-numeric: tabular-nums; }
.qc-s-note { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.qc-s-message { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.qc-s-actions { display: flex; justify-content: flex-end; }
.qc-s-save {
  font: inherit; font-size: 12px; cursor: pointer; padding: 4px 14px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm);
}
.qc-s-save:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-active, var(--dsw-alias-interactive-bg-hover)); }
.qc-s-save:disabled { opacity: 0.6; cursor: default; }

/* ---- 设置表单：产品化分区（对齐原版 macOS QuotaCat） ---- */
.qc-s-section {
  display: flex; flex-direction: column; gap: 8px;
  padding-bottom: 10px; margin-bottom: 10px;
  border-bottom: .5px solid var(--dsw-alias-border-l2);
}
.qc-s-section:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.qc-s-section-title {
  color: var(--dsw-alias-label-primary); font-weight: 500; font-size: 12px;
}
.qc-s-inline { flex-direction: row; align-items: center; gap: 8px; }
.qc-s-mini {
  font: inherit; font-size: 11px; cursor: pointer; padding: 3px 10px; flex: none;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-interactive-bg-hover);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm);
}
.qc-s-mini:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
.qc-s-mini:disabled { opacity: 0.5; cursor: default; }
.qc-s-validation { font-size: 11px; color: var(--dsw-alias-label-secondary); }
.qc-s-validation:empty { display: none; }
.qc-s-options { display: flex; flex-wrap: wrap; gap: 6px; }
.qc-s-option {
  font: inherit; font-size: 11px; cursor: pointer; padding: 3px 10px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-interactive-bg-hover);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px;
}
.qc-s-option-active {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-focus-border, var(--dsw-alias-label-secondary));
  background: var(--dsw-alias-interactive-bg-active, var(--dsw-alias-interactive-bg-hover));
}
.qc-s-toggle {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  color: var(--dsw-alias-label-secondary); font-size: 12px;
}
.qc-s-toggle input { margin: 0; accent-color: var(--dsw-alias-focus-border, #4c9aff); }
.qc-s-slider { display: flex; flex-direction: column; gap: 4px; }
.qc-s-slider-head {
  display: flex; justify-content: space-between;
  color: var(--dsw-alias-label-secondary); font-size: 12px;
}
.qc-s-slider-value { font-variant-numeric: tabular-nums; }
.qc-s-range { width: 100%; accent-color: var(--dsw-alias-focus-border, #4c9aff); }
.qc-s-link {
  display: flex; justify-content: space-between; align-items: center;
  color: var(--dsw-alias-label-secondary); font-size: 12px;
  text-decoration: none; padding: 2px 0; cursor: pointer;
}
.qc-s-link:hover { color: var(--dsw-alias-label-primary); text-decoration: underline; }
.qc-s-chevron { color: var(--dsw-alias-label-tertiary); }
.qc-s-ok { color: #22c55e; }

/* ---- 阈值提醒横幅 ---- */
.qc-d-alert {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 10px; padding: 6px 10px;
  font-size: 11px; line-height: 16px;
  color: #eab308;
  background: color-mix(in srgb, #eab308 12%, transparent);
  border: 1px solid color-mix(in srgb, #eab308 35%, transparent);
  border-radius: var(--dsw-radius-sm);
}
`

export function ensureCss(): void {
  if (document.getElementById('dsh-quotacat-css') !== null) return
  const style = document.createElement('style')
  style.id = 'dsh-quotacat-css'
  style.textContent = CSS
  document.head.append(style)
}
