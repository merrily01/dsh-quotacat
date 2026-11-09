export interface PanelViewport {
  width: number
  height: number
}

export interface PanelPosition {
  left: number
  bottom: number
}

export function placePanel(
  anchor: Pick<DOMRect, 'left' | 'top'>,
  panelWidth: number,
  viewport: PanelViewport,
  margin = 12,
  gap = 8,
): PanelPosition {
  const rightmostLeft = Math.max(margin, viewport.width - margin - panelWidth)
  return {
    left: Math.max(margin, Math.min(anchor.left, rightmostLeft)),
    bottom: viewport.height - anchor.top + gap,
  }
}
