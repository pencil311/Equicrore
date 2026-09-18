'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { localDateISO } from '@/lib/format'
import { useDash } from '@/lib/dashContext'
import { type WatchSymbol } from '@/lib/watchlists'
import { findWatchSymbol } from '@/lib/symbolMap'
import { useLivePrices, livePriceFor } from '@/hooks/useLivePrices'
import { type Theme } from '@/hooks/useTheme'
import { PLChartsPanel, FullscreenChart } from '@/components/dashboard/PLCharts'

const OPEN_POS_KEY = 'eq-open-positions'

interface OpenPosition {
  id: string
  sym: string
  side: 'long' | 'short'
  qty: number
  entryPrice: number
}

function readOpenPositions(): OpenPosition[] {
  try { return JSON.parse(localStorage.getItem(OPEN_POS_KEY) || '[]') } catch { return [] }
}

export default function ChartsPage() {
  /* Trade records come from the dashboard context — already broker-aware and
     kept in sync with the 'eq-record-added' / storage events. */
  const { txns: records, holdings, prices } = useDash()

  const [openPositions, setOpenPositions]       = useState<OpenPosition[]>([])
  const [fullscreenSymbol, setFullscreenSymbol] = useState<WatchSymbol | null>(null)
  const [chartTheme, setChartTheme]             = useState<Theme>('light')

  useEffect(() => {
    const load = () => setOpenPositions(readOpenPositions())
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  /* Live prices for open positions (5 s interval) — drives the unrealised figure */
  const posPriceSyms = useMemo(
    () => Array.from(new Set(openPositions.map(p => p.sym))),
    [openPositions]
  )
  const { prices: livePrices } = useLivePrices(posPriceSyms, 5000)

  const unrealisedPL = useMemo(() => (
    openPositions.reduce((sum, pos) => {
      const lp = livePrices[pos.sym]?.price
      if (!lp || lp <= 0) return sum
      return sum + (pos.side === 'long'
        ? (lp - pos.entryPrice) * pos.qty
        : (pos.entryPrice - lp) * pos.qty)
    }, 0)
  ), [openPositions, livePrices])

  /* Mark-to-market on portfolio holdings. Only holdings with a comparable live quote
     count: a holding's fallback price is just its last recorded trade price, which
     would report a fake gain or loss. */
  const holdingsUnrealised = useMemo(
    () => holdings.reduce((s, h) => {
      const lp = livePriceFor(h, prices)
      return lp == null ? s : s + h.qty * (lp - h.avg)
    }, 0),
    [holdings, prices]
  )

  /* Today's account-wide realised P&L — same source & date basis as the dashboard stat */
  const todayISO = localDateISO()
  const todayRealisedPL = useMemo(
    () => records.filter(r => r.date === todayISO).reduce((s, r) => s + (Number(r.profit) || 0), 0),
    [records, todayISO]
  )

  const breakdown = useMemo(() => ({
    realisedToday:       todayRealisedPL,
    positionsUnrealised: unrealisedPL,
    holdingsUnrealised,
  }), [todayRealisedPL, unrealisedPL, holdingsUnrealised])

  /* Instruments the user has actually traded — quick-access chips */
  const tradedSymbols = useMemo(() => {
    const seen: Record<string, true> = {}
    const out: WatchSymbol[] = []
    for (const r of records) {
      const key = r.sym || r.instrument
      if (!key || seen[key]) continue
      seen[key] = true
      out.push(findWatchSymbol(r.sym, r.instrument, r.category))
    }
    return out
  }, [records])

  /* Read the theme live off <html> — the layout owns the toggle */
  const openFullscreen = useCallback((s: WatchSymbol) => {
    setChartTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    setFullscreenSymbol(s)
  }, [])
  const closeFullscreen = useCallback(() => setFullscreenSymbol(null), [])

  return (
    <div className="content fade">
      <style>{`
        .eq-chiprow::-webkit-scrollbar { height: 6px; }
        .eq-chiprow::-webkit-scrollbar-thumb { background: var(--line); border-radius: 100px; }
        .eq-chiprow::-webkit-scrollbar-track { background: transparent; }
        .eq-symgrid::-webkit-scrollbar { width: 8px; }
        .eq-symgrid::-webkit-scrollbar-thumb { background: var(--line); border-radius: 100px; }
        .eq-symgrid::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="page-head">
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>P&amp;L Charts</b></div>
          <h1>P&amp;L Charts</h1>
        </div>
      </div>

      <PLChartsPanel traded={tradedSymbols} onOpen={openFullscreen} />

      {fullscreenSymbol && (
        <FullscreenChart
          symbol={fullscreenSymbol}
          breakdown={breakdown}
          theme={chartTheme}
          onClose={closeFullscreen}
        />
      )}
    </div>
  )
}
