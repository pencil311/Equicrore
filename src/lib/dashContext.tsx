'use client'
import { createContext, useContext } from 'react'
import type { PortfolioHolding, TradeRecord } from '@/lib/portfolio'
import type { WatchlistItem } from '@/lib/mockData'
import type { LivePrice } from '@/hooks/useLivePrices'
import type { BrokerId } from '@/lib/brokers'

export interface DashState {
  holdings:        PortfolioHolding[]
  liveHoldings:    PortfolioHolding[]
  cash:            number
  startingCapital: number
  txns:            TradeRecord[]
  wl:              WatchlistItem[]
  liveWl:          WatchlistItem[]
  prices:          Record<string, LivePrice>
  loading:         boolean
  portfolioValue:  number
  marketValue:     number
  totalPL:         number
  totalPLpct:      number
  todayPL:         number
  todayPct:        number
  assets:          WatchlistItem[]
  activeBroker:    BrokerId
  setActiveBroker: (b: BrokerId) => void
  openTrade:       (asset?: WatchlistItem) => void
}

export const DashContext = createContext<DashState | null>(null)

export function useDash(): DashState {
  const ctx = useContext(DashContext)
  if (!ctx) throw new Error('useDash must be used inside DashboardLayout')
  return ctx
}
