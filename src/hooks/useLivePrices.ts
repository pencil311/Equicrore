'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { WatchlistItem } from '@/lib/mockData'

// Map our symbols to Yahoo Finance format
const YAHOO_MAP: Record<string, string> = {
  // Indian stocks (NSE)
  RELIANCE:   'RELIANCE.NS',
  TCS:        'TCS.NS',
  INFY:       'INFY.NS',
  HDFCBANK:   'HDFCBANK.NS',
  TATAMOTORS: 'TATAMOTORS.NS',
  NIFTYBEES:  'NIFTYBEES.NS',
  PPFAS:      'PPFAS.NS',
  WIPRO:      'WIPRO.NS',
  ZOMATO:     'ZOMATO.NS',
  GOLDBEES:   'GOLDBEES.NS',
  ICICIBANK:  'ICICIBANK.NS',
  BAJFINANCE: 'BAJFINANCE.NS',
  // US stocks (no suffix)
  AAPL: 'AAPL', NVDA: 'NVDA', TSLA: 'TSLA',
  MSFT: 'MSFT', AMZN: 'AMZN', GOOGL: 'GOOGL',
  META: 'META', NFLX: 'NFLX',
  // Crypto (direct symbol, CoinGecko handles these)
  BTC: 'BTC', ETH: 'ETH', SOL: 'SOL',
  BNB: 'BNB', XRP: 'XRP', ADA: 'ADA',
  DOGE: 'DOGE', MATIC: 'MATIC',
}

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
    // Build query string with Yahoo-mapped symbols
    const querySyms = symbols.map(s => YAHOO_MAP[s] || s).join(',')
    try {
      const res = await fetch(`/api/prices?symbols=${querySyms}`)
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

/** Merge live prices into holdings (generic so it works with any holding shape) */
export function mergeHoldings<T extends { sym: string; price: number }>(
  items: T[],
  prices: Record<string, LivePrice>,
): T[] {
  return items.map(item => {
    const p = prices[item.sym]
    if (!p || p.price === 0) return item
    return { ...item, price: p.price }
  })
}
