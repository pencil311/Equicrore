/* ============================================================
   Split-screen chart layouts.

   Every layout is described by a CSS grid-areas matrix, e.g.
     ['a b', 'a c']  →  one tall pane on the left, two stacked on the right.
   Both the real grid and the picker thumbnails are derived from this single
   description, so a layout can never render differently from its own icon.
   ============================================================ */

export interface ChartLayout {
  id:    string
  label: string
  panes: number
  /** One string per grid row; cells separated by spaces. Letters a,b,c… = pane index. */
  areas: string[]
}

export const CHART_LAYOUTS: ChartLayout[] = [
  /* 1 */
  { id: '1',      label: 'Single',            panes: 1, areas: ['a'] },
  /* 2 */
  { id: '2v',     label: 'Two columns',       panes: 2, areas: ['a b'] },
  { id: '2h',     label: 'Two rows',          panes: 2, areas: ['a', 'b'] },
  /* 3 */
  { id: '3lr',    label: 'Left + two right',  panes: 3, areas: ['a b', 'a c'] },
  { id: '3rl',    label: 'Two left + right',  panes: 3, areas: ['a c', 'b c'] },
  { id: '3v',     label: 'Three columns',     panes: 3, areas: ['a b c'] },
  { id: '3h',     label: 'Three rows',        panes: 3, areas: ['a', 'b', 'c'] },
  /* 4 */
  { id: '4grid',  label: 'Grid 2×2',          panes: 4, areas: ['a b', 'c d'] },
  { id: '4v',     label: 'Four columns',      panes: 4, areas: ['a b c d'] },
  { id: '4h',     label: 'Four rows',         panes: 4, areas: ['a', 'b', 'c', 'd'] },
  { id: '4left',  label: 'Big left + three',  panes: 4, areas: ['a b', 'a c', 'a d'] },
  { id: '4top',   label: 'Big top + three',   panes: 4, areas: ['a a a', 'b c d'] },
]

export const DEFAULT_LAYOUT = CHART_LAYOUTS[0]

export function layoutById(id: string): ChartLayout {
  return CHART_LAYOUTS.find(l => l.id === id) ?? DEFAULT_LAYOUT
}

/** Pane index → grid-area letter. */
export function paneArea(i: number): string {
  return String.fromCharCode(97 + i)
}

function gridSize(l: ChartLayout) {
  return { rows: l.areas.length, cols: l.areas[0].trim().split(/\s+/).length }
}

export function gridStyle(l: ChartLayout): React.CSSProperties {
  const { rows, cols } = gridSize(l)
  return {
    display: 'grid',
    gridTemplateAreas:    l.areas.map(r => `"${r}"`).join(' '),
    gridTemplateColumns:  `repeat(${cols}, 1fr)`,
    gridTemplateRows:     `repeat(${rows}, 1fr)`,
  }
}

export interface ThumbRect { x: number; y: number; w: number; h: number }

/** Pane rectangles for the picker thumbnail, in a `size`×`size` box. */
export function thumbRects(l: ChartLayout, size = 26, gap = 2): ThumbRect[] {
  const { rows, cols } = gridSize(l)
  const cellW = (size - gap * (cols - 1)) / cols
  const cellH = (size - gap * (rows - 1)) / rows

  const grid = l.areas.map(r => r.trim().split(/\s+/))

  return Array.from({ length: l.panes }, (_, i) => {
    const letter = paneArea(i)
    let minR = rows, maxR = -1, minC = cols, maxC = -1
    grid.forEach((row, r) => row.forEach((cell, c) => {
      if (cell !== letter) return
      minR = Math.min(minR, r); maxR = Math.max(maxR, r)
      minC = Math.min(minC, c); maxC = Math.max(maxC, c)
    }))
    const spanR = maxR - minR + 1
    const spanC = maxC - minC + 1
    return {
      x: minC * (cellW + gap),
      y: minR * (cellH + gap),
      w: spanC * cellW + (spanC - 1) * gap,
      h: spanR * cellH + (spanR - 1) * gap,
    }
  })
}

/* ---- Persistence ---- */

export const LAYOUT_KEY = 'eq-chart-layout'

export interface PaneState {
  /** TradingView-style watchlist symbol, or null for an empty pane */
  sym: string | null
  tf:  string
}

export interface SavedLayout {
  layout: string
  panes:  PaneState[]
}

export function readSavedLayout(): SavedLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as SavedLayout
    if (!v || typeof v.layout !== 'string' || !Array.isArray(v.panes)) return null
    return v
  } catch { return null }
}

export function writeSavedLayout(v: SavedLayout): void {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(v)) } catch {}
}
