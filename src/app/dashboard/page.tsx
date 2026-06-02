'use client'
import { useState, useEffect } from 'react'
import '@/styles/dashboard.css'
import { Sidebar, TopBar, Ico } from '@/components/dashboard/DashLayout'
import { StatCard, PerfPanel, AllocationPanel, HoldingsPanel, WatchlistPanel, TransactionsPanel, PerformanceSummaryPanel, TradeModal } from '@/components/dashboard/DashPanels'
import { holdings as initHoldings, watchlist as initWatchlist, transactions as initTxns, CAPITAL, type Holding, type WatchlistItem, type Transaction } from '@/lib/mockData'
import { useTheme } from '@/hooks/useTheme'
import { useLivePrices, mergeWatchlist, mergeHoldings } from '@/hooks/useLivePrices'
import { pct } from '@/lib/format'

const I = {
  bag:    'M6 7V6a4 4 0 0 1 8 0v1M4 7h16l-1 13H5z',
  chart:  'M3 3v18h18M7 14l4-4 3 3 5-6',
  spark:  'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  wallet: 'M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 13h.01M3 9V7a2 2 0 0 1 2-2h11',
  plus:   'M12 5v14M5 12h14',
}

export default function DashboardPage() {
  const [active, setActive]     = useState('dashboard')
  const { theme, toggleTheme }  = useTheme()
  const [holdings, setHoldings] = useState<Holding[]>(initHoldings.map(h => ({ ...h })))
  const [cash, setCash]         = useState(7_399_000)
  const [txns, setTxns]         = useState<Transaction[]>(initTxns.map(t => ({ ...t })))
  const [wl, setWl]             = useState<WatchlistItem[]>(initWatchlist.map(w => ({ ...w })))
  const [modal, setModal]       = useState<{ open: boolean; asset: WatchlistItem | null }>({ open: false, asset: null })

  // All unique symbols across holdings + watchlist
  const allSymbols = [...new Set([...holdings.map(h => h.sym), ...wl.map(w => w.sym)])]
  const { prices, loading } = useLivePrices(allSymbols, 15000)

  // Merge live prices in
  const liveWl       = mergeWatchlist(wl, prices)
  const liveHoldings = mergeHoldings(holdings, prices)

  const marketValue    = liveHoldings.reduce((s, h) => s + h.qty * h.price, 0)
  const portfolioValue = cash + marketValue
  const totalPL        = portfolioValue - CAPITAL
  const totalPLpct     = (totalPL / CAPITAL) * 100

  // Today P/L: sum of (livePrice - prevClose) * qty using chgPct
  const todayPL  = liveHoldings.reduce((s, h) => {
    const p = prices[h.sym]
    if (!p) return s
    const prevClose = h.price / (1 + p.chgPct / 100)
    return s + (h.price - prevClose) * h.qty
  }, 0)
  const todayPct = portfolioValue > 0 ? (todayPL / (portfolioValue - todayPL)) * 100 : 0

  const assets: WatchlistItem[] = (() => {
    const map: Record<string, WatchlistItem> = {}
    liveHoldings.forEach(h => map[h.sym] = h as any)
    liveWl.forEach(w => { if (!map[w.sym]) map[w.sym] = w })
    return Object.values(map)
  })()

  function openTrade(asset?: WatchlistItem) {
    setModal({ open: true, asset: asset || null })
  }

  function doTrade({ side, sym, qty, price, meta }: { side: string; sym: string; qty: number; price: number; meta: WatchlistItem }) {
    setHoldings(prev => {
      const idx  = prev.findIndex(h => h.sym === sym)
      const next = [...prev]
      if (side === 'buy') {
        if (idx >= 0) {
          const h = next[idx]; const tot = h.qty + qty
          next[idx] = { ...h, avg: (h.avg * h.qty + price * qty) / tot, qty: tot }
        } else {
          next.push({ sym, name: meta.name, type: meta.type as any, qty, avg: price, price, color: meta.color })
        }
      } else {
        if (idx >= 0) {
          const h = next[idx]; const left = +(h.qty - qty).toFixed(4)
          if (left <= 0) next.splice(idx, 1); else next[idx] = { ...h, qty: left }
        }
      }
      return next
    })
    setCash(c => side === 'buy' ? c - price * qty : c + price * qty)
    setTxns(prev => [{ type: side.toUpperCase() as 'BUY' | 'SELL', sym, qty, price, when: 'Just now' }, ...prev])
  }

  return (
    <div className="app">
      <Sidebar active={active} setActive={setActive} cash={portfolioValue} />
      <div className="main">
        <TopBar onTrade={() => openTrade()} theme={theme} toggleTheme={toggleTheme} />
        <div className="content fade" key={active}>

          <div className="page-head">
            <div>
              <div className="crumb">Dashboard <span>·</span> <b>Personal Portfolio</b></div>
              <h1>Good morning, Yeshwanth
                {loading && <span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 400, marginLeft: 12 }}>Fetching live prices…</span>}
              </h1>
            </div>
            <button className="btn btn-solid" onClick={() => openTrade()}>
              <Ico d={I.plus} s={16} /> New trade
            </button>
          </div>

          <div className="stats">
            <StatCard icon={I.bag}    k="Portfolio value" value={portfolioValue} change={pct(totalPLpct)} changeUp={totalPL >= 0}   sub="all-time" />
            <StatCard icon={I.chart}  k="Total returns"   value={totalPL}        change={pct(totalPLpct)} changeUp={totalPL >= 0} />
            <StatCard icon={I.spark}  k="Today's P/L"     value={Math.abs(todayPL)} change={pct(Math.abs(todayPct))} changeUp={todayPL >= 0} />
            <StatCard icon={I.wallet} k="Cash available"  value={cash} sub="ready to invest" />
          </div>

          <div className="grid-2">
            <PerfPanel portfolioValue={portfolioValue} totalPL={totalPL} totalPLpct={totalPLpct} />
            <AllocationPanel holdings={liveHoldings} cash={cash} portfolioValue={portfolioValue} />
          </div>

          <div className="grid-2">
            <HoldingsPanel holdings={liveHoldings} onTrade={openTrade} />
            <PerformanceSummaryPanel />
          </div>

          <div className="grid-2">
            <WatchlistPanel items={liveWl} onTrade={openTrade} />
            <TransactionsPanel txns={txns} />
          </div>

        </div>
      </div>

      <TradeModal
        open={modal.open}
        asset={modal.asset}
        assets={assets}
        cash={cash}
        holdings={liveHoldings}
        onClose={() => setModal({ open: false, asset: null })}
        onSubmit={doTrade}
      />
    </div>
  )
}
