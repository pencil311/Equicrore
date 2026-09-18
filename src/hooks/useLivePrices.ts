'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { WatchlistItem } from '@/lib/mockData'

export interface LivePrice {
  price: number
  chg: number
  chgPct: number
}

export function useLivePrices(symbols: string[], intervalMs = 15000) {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({})
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchPrices = useCallback(async () => {
    if (!symbols.length) return
    // The API resolves app symbols server-side (see lib/priceSymbols)
    const querySyms = symbols.join(',')
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(querySyms)}`)
      if (!res.ok) return
      const data = await res.json()
      if (!mountedRef.current) return
      // Re-key back to our symbol names
      const mapped: Record<string, LivePrice> = {}
      for (const sym of symbols) {
        const key = sym // our symbol (RELIANCE, BTC, etc.)
        if (data[key]) {
          mapped[key] = data[key]
        }
      }
      setPrices(mapped)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [symbols.join(',')])

  useEffect(() => {
    mountedRef.current = true
    fetchPrices()
    const id = setInterval(fetchPrices, intervalMs)
    return () => { mountedRef.current = false; clearInterval(id) }
  }, [fetchPrices, intervalMs])

  return { prices, loading }
}

/** Merge live prices into watchlist items */
export function mergeWatchlist(items: WatchlistItem[], prices: Record<string, LivePrice>): WatchlistItem[] {
  return items.map(item => {
    const p = prices[item.sym]
    if (!p || p.price === 0) return item
    const flash = p.price > item.price ? 'flash-up' : p.price < item.price ? 'flash-down' : undefined
    return { ...item, price: p.price, chg: p.chgPct, flash }
  })
}

/* F&O and MCX holdings are recorded at contract/premium prices, but the feed only
   quotes the underlying (NIFTY options → index points, MCX crude → global crude),
   so a live quote for them is in the wrong unit and must not be applied. */
const NO_LIVE_TYPES = new Set(['FNO', 'Commodities'])

/** A live price comparable to the holding's own price, or null if there is none. */
export function livePriceFor(
  item: { sym: string; type?: string },
  prices: Record<string, LivePrice>,
): number | null {
  if (item.type && NO_LIVE_TYPES.has(item.type)) return null
  const p = prices[item.sym]
  return p && p.price > 0 ? p.price : null
}

/** Merge live prices into holdings (generic so it works with any holding shape) */
export function mergeHoldings<T extends { sym: string; price: number; type?: string }>(
  items: T[],
  prices: Record<string, LivePrice>,
): T[] {
  return items.map(item => {
    const lp = livePriceFor(item, prices)
    return lp == null ? item : { ...item, price: lp }
  })
}
