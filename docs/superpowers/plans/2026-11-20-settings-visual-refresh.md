# QuotaCat Settings Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the heavy card-and-chip settings UI with a compact QuotaCat-style form that contains only actionable DSH settings.

**Architecture:** Extract the settings markup into an exported React component that keeps the existing fetch/save boundary. Render refresh as a native select and notification controls as one grouped surface; preserve the existing dialog and server API. CSS remains namespaced in the plugin stylesheet.

**Tech Stack:** TypeScript, React 18 via the DSH runtime loader, inline CSS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-20-settings-visual-refresh-design.md`

## Global Constraints

- Do not add runtime dependencies.
- Do not change the composer pill, quota detail view, credentials flow, or server settings API.
- Do not render API-key controls, credential-source status, or author-support links.
- Keep dark/light theme support through DSH CSS variables.

## Review Focus

- Settings loading: controls remain disabled or stable until data arrives.
- Save failure: the user stays on the settings view and can retry.
- Threshold disabled: threshold controls are visually and semantically inactive.
- Narrow dialog: labels and controls do not overflow the existing anchored panel.
- Keyboard use: select, switch, slider, back, and save retain visible focus states.

---

### Task 1: Compact settings component

**Files:**
- Modify: `src/client/QuotaCatFooter.ts`
- Modify: `src/client/styles.ts`
- Test: `tests/settings-view.test.ts`

**Interfaces:**
- Consumes: existing `fetchSettings()` and `saveSettings(payload)` functions.
- Produces: exported `SettingsForm(props: { onDone?: () => void })` and compact namespaced settings markup.

- [ ] **Step 1: Write failing source-contract tests**

Assert that the settings source contains a select-based refresh control and compact action row, and no longer contains the data-source card, support links, or chip-option class.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/settings-view.test.ts`

Expected: FAIL because the current component still renders chip options/data source and has no select control.

- [ ] **Step 3: Implement the compact component and CSS**

Change refresh selection to `<select>`, combine notification controls into one bordered group, remove the read-only data-source block, keep the form open after save, and add a right-aligned save/status action row.

- [ ] **Step 4: Run targeted and full verification**

Run: `node --test tests/settings-view.test.ts`

Expected: PASS.

Run: `npm test && npm run typecheck && npm run build`

Expected: all commands exit 0.

- [ ] **Step 5: Inspect the diff against the design constraints**

Confirm no support URL/API-key UI was introduced and only the settings presentation changed.
