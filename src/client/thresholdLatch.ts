export interface ThresholdLatchResult {
  latched: boolean
  notify: boolean
}

/** Only the false-to-true edge produces a notification. */
export function advanceThresholdLatch(latched: boolean, triggered: boolean): ThresholdLatchResult {
  return {
    latched: triggered,
    notify: triggered && !latched,
  }
}
