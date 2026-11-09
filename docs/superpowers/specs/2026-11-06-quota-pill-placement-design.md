# Quota pill placement design

## Intent

Make QuotaCat behave like the native composer statistics controls: expose one quota entry in the composer dock and open its details panel from the trigger's left edge toward the right.

## Goals

- Remove the legacy fixed cat button registered in `shell.overlay`.
- Keep the `conversation.composer.dock` quota pill as the only UI entry.
- Keep the quota pill before the host context meter.
- Portal the details panel to `document.body`, anchor its left edge to the pill, and clamp it inside the visible viewport.
- Preserve the current quota data, colors, refresh behavior, Escape handling, and outside-click dismissal.

## Non-goals

- Do not change quota fetching, provider detection, labels, thresholds, or panel contents.
- Do not alter native DeepSeek Harness controls or styles.
- Do not rely on the unavailable third-party `useAnchoredPosition` runtime export.

## Constraints

- DeepSeek Harness makes the composer a containing block for fixed descendants, so the dialog must be portaled to `document.body` for viewport coordinates to be reliable.
- The plugin must provide its own small positioning helper because the host positioning primitive is not reliably resolvable by third-party plugins.
- The current directory is not a Git repository, so this design document cannot be committed here.

## Approaches considered

1. **Keep both entries and only change alignment.** Smallest code edit, but leaves duplicate quota controls and conflicting behavior.
2. **Keep only the dock pill and swap `right` for `left`.** Removes duplication, but a fixed descendant can still be offset by the composer and may overflow on narrow windows.
3. **Keep only the dock pill, portal the panel, and calculate a viewport-clamped left anchor.** Selected because it matches native behavior and remains correct during resizing and narrow layouts.

## Verification

- Add focused tests for left anchoring and right-edge clamping where practical.
- Run TypeScript type checking and the production build.
- Verify in DeepSeek Harness that only one quota entry remains and the panel opens to the right without leaving the viewport.
