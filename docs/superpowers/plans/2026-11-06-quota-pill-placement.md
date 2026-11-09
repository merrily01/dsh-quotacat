# Quota Pill Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace QuotaCat's duplicate floating entry with one native-style composer dock pill whose details panel opens from the pill's left edge and stays inside the viewport.

**Architecture:** Remove the legacy `shell.overlay` registration and component. Extract viewport-clamped placement into a pure helper, then render the dock dialog through a `document.body` portal and keep its fixed coordinates synchronized with the trigger and panel dimensions.

**Tech Stack:** TypeScript, React 18 runtime injection, React DOM portal, Node built-in test runner, tsdown.

**Spec:** `docs/superpowers/specs/2026-11-06-quota-pill-placement-design.md`

## Global Constraints

- Preserve quota fetching, provider detection, labels, thresholds, refresh behavior, Escape handling, and outside-click dismissal.
- Do not alter DeepSeek Harness native controls or styles.
- Do not rely on the unavailable third-party `useAnchoredPosition` runtime export.
- The working directory has no Git metadata, so commit steps are replaced by verification checkpoints.

## Review Focus

- A trigger near the right viewport edge must shift the panel left without switching to right-edge anchoring.
- A panel wider than the usable viewport must remain at the configured left margin and rely on its CSS width cap.
- Resizing, scrolling, or panel content changes while open must recompute placement.
- Clicking inside the portaled panel must not be treated as an outside click.
- The legacy floating cat entry must not be registered after the change.

---

### Task 1: Viewport-clamped panel placement

**Files:**
- Create: `src/client/anchoredPosition.ts`
- Create: `tests/anchoredPosition.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `placePanel(anchor: Pick<DOMRect, 'left' | 'top'>, panelWidth: number, viewport: { width: number; height: number }, margin?: number, gap?: number): { left: number; bottom: number }`.

- [x] **Step 1: Write failing placement tests**

Cover an ordinary left-aligned trigger, a trigger near the right edge, and a panel wider than the usable viewport. Assert a 12 px default margin and 8 px default vertical gap.

- [x] **Step 2: Run the test and verify it fails**

Run: `npm test`

Expected: FAIL because `src/client/anchoredPosition.ts` does not exist.

- [x] **Step 3: Implement the pure placement helper**

Clamp `left` to `[margin, viewport.width - margin - panelWidth]`, with the upper bound never below `margin`; calculate `bottom` as `viewport.height - anchor.top + gap`.

- [x] **Step 4: Run the placement tests**

Run: `npm test`

Expected: all placement tests pass.

### Task 2: Single dock entry with portaled dialog

**Files:**
- Modify: `src/client/main.tsx`
- Modify: `src/client/QuotaCatFooter.ts`
- Modify: `src/client/runtime.ts`
- Modify: `src/client/styles.ts`
- Delete: `src/client/QuotaCatPanel.ts`

**Interfaces:**
- Consumes: `placePanel(...)` from Task 1.
- Produces: one `conversation.composer.dock` registration and a `document.body`-portaled `.qc-dialog` whose fixed `left` and `bottom` positions are synchronized while open.

- [x] **Step 1: Add React DOM runtime injection**

Add `provideReactDOM()` and `getReactDOM()` to `runtime.ts`; inject `react-dom` from `src/client.tsx` so `QuotaCatFooter` can call `createPortal` without bundling React DOM.

- [x] **Step 2: Remove the legacy overlay registration and component**

Delete the `shell.overlay` registration/import from `main.tsx` and remove `QuotaCatPanel.ts`.

- [x] **Step 3: Portal and position the quota dialog**

Give the panel its own ref. While open, measure trigger and panel in a layout effect, call `placePanel`, and update on window resize, capture-phase scroll, and panel resize. Render through `createPortal(..., document.body)` and keep it hidden until the first measurement resolves.

- [x] **Step 4: Preserve dismissal behavior across the portal**

Treat both trigger root and panel ref as inside targets for pointer dismissal; preserve Escape close and refresh behavior.

- [x] **Step 5: Update dialog positioning styles and comments**

Keep `.qc-dialog` fixed and viewport-capped, remove stale claims about `useAnchoredPosition`, and use an explicit hidden measurement style before coordinates resolve.

- [x] **Step 6: Run all automated checks**

Run: `npm test && npm run check`

Expected: placement tests pass, TypeScript reports no errors, and both production bundles build successfully.

- [x] **Step 7: Verify in DeepSeek Harness**

After rebuilding/reloading the plugin, confirm there is no fixed cat button, the dock has one quota pill before the context meter, the panel opens from its left edge, and narrow/right-edge layouts remain within the viewport.
