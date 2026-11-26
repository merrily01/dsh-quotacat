# QuotaCat Threshold Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show one official DSH warning Toast when quota crosses the configured threshold.

**Architecture:** Register a global overlay component beside the composer pill. The overlay polls the existing report endpoint and uses a small edge-trigger latch to prevent repeated Toasts while the threshold remains exceeded.

**Tech Stack:** TypeScript, React, DSH slots, DSH UI primitives, Node test runner

**Spec:** `docs/superpowers/specs/2026-11-20-threshold-toast-design.md`

## Global Constraints

- Reuse the official DSH Toast component.
- Notify once per false-to-true threshold transition.
- Do not implement operating-system notifications.

## Review Focus

- Persistent true reports must not repeat Toasts.
- A false report must re-arm the next true transition.
- The overlay must remain independent of the composer pill lifecycle.
- Missing UI primitives or failed requests must fail quietly.
- Clicking “查看额度” must open the existing quota detail panel.

---

### Task 1: Global threshold Toast

**Files:**
- Modify: `src/client/main.tsx`
- Modify: `src/client/registerQuota.ts`
- Modify: `src/client/QuotaCatFooter.ts`
- Create: `src/client/QuotaAlertToast.ts`
- Test: `tests/main.test.ts`
- Test: `tests/settings-view.test.ts`

- [ ] Add failing tests for overlay registration and threshold latching.
- [ ] Implement the official Toast overlay and open-detail event.
- [ ] Run targeted and complete verification.
