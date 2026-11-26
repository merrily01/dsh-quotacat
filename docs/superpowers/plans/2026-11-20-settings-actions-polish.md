# QuotaCat Settings Actions Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the settings entry, keep refresh frequency on one line, and replace ambiguous back navigation with cancel/save actions.

**Architecture:** Keep the existing quota/settings subviews. Pass navigation callbacks into `SettingsForm`, render its actions inside the form, and use a dedicated SVG icon button in the quota footer.

**Tech Stack:** TypeScript, React createElement, CSS, Node test runner

**Spec:** `docs/superpowers/specs/2026-11-20-settings-actions-polish-design.md`

## Global Constraints

- Keep refresh frequency as one native select.
- Do not add business capabilities or dependencies.
- Preserve DSH theme variables and keyboard focus behavior.

## Review Focus

- Narrow anchored panels must retain a single-line refresh row.
- Settings must remain accessible by label after replacing the text glyph.
- Cancel must return without calling the settings save API.
- Successful save must return to quota details; failed save must not.
- Quota footer action order must be refresh then settings.

---

### Task 1: Settings actions and entry polish

**Files:**
- Modify: `src/client/QuotaCatFooter.ts`
- Modify: `src/client/styles.ts`
- Test: `tests/settings-view.test.ts`

**Interfaces:**
- Consumes: existing `saveSettings()` and quota/settings view state.
- Produces: `SettingsForm({ onCancel, onSaved })` and an accessible SVG settings button.

- [ ] **Step 1: Write failing structure and ordering tests**
- [ ] **Step 2: Run `node --test tests/settings-view.test.ts` and verify the new assertions fail**
- [ ] **Step 3: Implement callbacks, footer ordering, SVG icon, and single-line sizing**
- [ ] **Step 4: Run the targeted test and full test suite**
- [ ] **Step 5: Run typecheck, build, and diff checks**
