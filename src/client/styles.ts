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
.qc-d-footbtns { display: inline-flex; gap: 6px; align-items: center; }
.qc-d-settings {
  width: 26px; height: 26px; padding: 0; border: none; border-radius: var(--dsw-radius-sm);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--dsw-alias-label-tertiary); background: transparent; cursor: pointer;
}
.qc-d-settings svg { width: 16px; height: 16px; }
.qc-d-settings:hover { color: var(--dsw-alias-label-secondary); background: var(--dsw-alias-interactive-bg-hover); }
.qc-d-settings:focus-visible { outline: 2px solid var(--dsw-alias-focus-border, #4c9aff); outline-offset: 1px; }

/* ---- 设置表单：原版 QuotaCat 的分组层级，DSH 的材质与控件 ---- */
.qc-settings { display: flex; flex-direction: column; gap: 14px; min-width: 300px; }
.qc-s-section { display: flex; flex-direction: column; gap: 6px; }
.qc-s-section-label {
  padding: 0 2px; color: var(--dsw-alias-label-tertiary);
  font-size: 10px; font-weight: 600; letter-spacing: .04em;
}
.qc-s-surface {
  overflow: hidden; border: .5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md, 8px);
  background: color-mix(in srgb, var(--dsw-specific-menu) 92%, var(--dsw-alias-label-primary) 8%);
}
.qc-s-row {
  min-height: 38px; box-sizing: border-box; padding: 8px 10px;
  display: grid; grid-template-columns: minmax(0, 1fr) 104px;
  align-items: center; gap: 12px; white-space: nowrap;
}
.qc-s-name {
  color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 500;
}
.qc-s-hint {
  color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 15px;
}
.qc-s-select {
  width: 104px; min-width: 0; box-sizing: border-box; justify-self: end;
  color: var(--dsw-alias-label-secondary); background: var(--dsw-specific-menu);
  border: .5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm);
  font: inherit; font-size: 11px; padding: 4px 7px; outline: none;
}
.qc-s-select:focus-visible,
.qc-switch:focus-visible,
.qc-s-range:focus-visible,
.qc-s-action:focus-visible {
  outline: 2px solid var(--dsw-alias-focus-border, #4c9aff); outline-offset: 2px;
}
.qc-s-select:disabled { opacity: .55; }
.qc-s-threshold {
  display: flex; flex-direction: column; gap: 7px;
  padding: 10px; border-top: .5px solid var(--dsw-alias-border-l2);
}
.qc-s-threshold-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.qc-s-value {
  color: var(--dsw-alias-label-secondary); font-size: 11px;
  font-weight: 600; font-variant-numeric: tabular-nums;
}
/* iOS 风格开关 */
.qc-switch {
  position: relative; width: 34px; height: 20px; flex: none;
  justify-self: end;
  border-radius: 999px; border: none; cursor: pointer; padding: 0;
  background: var(--dsw-alias-border-l2);
  transition: background .15s ease;
}
.qc-switch-on { background: #22c55e; }
.qc-switch-knob {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / 25%);
  transition: transform .15s ease;
}
.qc-switch-on .qc-switch-knob { transform: translateX(14px); }
/* 渐变填充滑块 */
.qc-s-range {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 4px; border-radius: 999px; outline: none;
  background: linear-gradient(
    to right,
    var(--dsw-alias-focus-border, #4c9aff) 0%,
    var(--dsw-alias-focus-border, #4c9aff) var(--qc-range-fill, 67%),
    var(--dsw-alias-border-l2) var(--qc-range-fill, 67%),
    var(--dsw-alias-border-l2) 100%
  );
}
.qc-s-range::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; border: none;
  box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
  cursor: pointer; transition: transform .1s ease;
}
.qc-s-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
.qc-s-actions {
  min-height: 30px; display: flex; align-items: center;
  justify-content: flex-end; gap: 10px;
}
.qc-s-feedback { color: #22c55e; font-size: 10px; margin-right: auto; }
.qc-s-feedback.is-error { color: #ef4444; }
.qc-s-action {
  font: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  min-width: 64px; padding: 6px 12px; border-radius: var(--dsw-radius-sm);
}
.qc-s-cancel {
  color: var(--dsw-alias-label-secondary); border: .5px solid var(--dsw-alias-border-l2);
  background: transparent;
}
.qc-s-cancel:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.qc-s-save {
  min-width: 76px;
  color: #fff; border: none; border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-focus-border, #4c9aff);
  transition: filter .12s ease;
}
.qc-s-save:hover:not(:disabled) { filter: brightness(1.08); }
.qc-s-action:disabled { opacity: 0.55; cursor: default; }

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
