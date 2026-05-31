'use client'
import { useState, useEffect } from 'react'
import '@/styles/dashboard.css'
import { Sidebar, TopBar, Ico } from '@/components/dashboard/DashLayout'
import { StatCard, PerfPanel, AllocationPanel, HoldingsPanel, WatchlistPanel, TransactionsPanel, PerformanceSummaryPanel, TradeModal } from '@/components/dashboard/DashPanels'
import { holdings as initHoldings, watchlist as initWatchlist, transactions as initTxns, CAPITAL, type Holding, type WatchlistItem, type Transaction } from '@/lib/mockData'
import { useTheme } from '@/hooks/useTheme'
import { pct } from '@/lib/format'

const I = {
  bag: 'M6 7V6a4 4 0 0 1 8 0v1M4 7h16l-1 13H5z',
  chart: 'M3 3v18h18M7 14l4-4 3 3 5-6',
  spark: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  wallet: 'M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 13h.01M3 9V7a2 2 0 0 1 2-2h11',
  plus: 'M12 5v14M5 12h14',
}

export default function DashboardPage() {
  const [active, setActive] = useState('dashboard')
  const { theme, toggleTheme } = useTheme()
  const [holdings, setHoldings] = useState<Holding[]>(initHoldings.map(h => ({ ...h })))
  const [cash, setCash] = useState(7_399_000)
  const [txns, setTxns] = useState<Transaction[]>(initTxns.map(t => ({ ...t })))
  const [wl, setWl] = useState<WatchlistItem[]>(initWatchlist.map(w => ({ ...w })))
  const [modal, setModal] = useState<{ open: boolean; asset: WatchlistItem | null }>({ open: false, asset: null })

  // Tick watchlist and holding prices
  useEffect(() => {
    const id = setInterval(() => {
      setWl(prev => prev.map(w => {
        const drift = (Math.random() - 0.48) * 0.004
        const np = +(w.price * (1 + drift)).toFixed(2)
        return { ...w, price: np, chg: +(w.chg + drift * 100).toFixed(2), flash: np >= w.price ? 'flash-up' : 'flash-down' }
      }))
      setHoldings(prev => prev.map(h => {
        const drift = (Math.random() - 0.48) * 0.003
        return { ...h, price: +(h.price * (1 + drift)).toFixed(2) }
      }))
    }, 2200)
    return () => clearInterval(id)
  }, [])

  const marketValue = holdings.reduce((s, h) => s + h.qty * h.price, 0)
  const portfolioValue = cash + marketValue
  const totalPL = portfolioValue - CAPITAL
  const totalPLpct = (totalPL / CAPITAL) * 100
  const todayPL = 62_400, todayPct = 0.53

  const assets: WatchlistItem[] = (() => {
    const map: Record<string, WatchlistItem> = {}
    holdings.forEach(h => map[h.sym] = h as any)
    wl.forEach(w => { if (!map[w.sym]) map[w.sym] = w })
    return Object.values(map)
  })()

  function openTrade(asset?: WatchlistItem) {
    setModal({ open: true, asset: asset || null })
  }

  function doTrade({ side, sym, qty, price, meta }: { side: string; sym: string; qty: number; price: number; meta: WatchlistItem }) {
    setHoldings(prev => {
      const idx = prev.findIndex(h => h.sym === sym)
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
          {/* Page header */}
          <div className="page-head">
            <div>
              <div className="crumb">Dashboard <span>·</span> <b>Personal Portfolio</b></div>
              <h1>Good morning, Yeshwanth</h1>
            </div>
            <button className="btn btn-solid" onClick={() => openTrade()}>
              <Ico d={I.plus} s={16} />
              New trade
            </button>
          </div>

          {/* Stat cards */}
          <div className="stats">
            <StatCard icon={I.bag}    k="Portfolio value" value={portfolioValue} change={pct(totalPLpct)} changeUp={totalPL >= 0} sub="all-time" />
            <StatCard icon={I.chart}  k="Total returns"   value={totalPL}        change={pct(totalPLpct)} changeUp={totalPL >= 0} />
            <StatCard icon={I.spark}  k="Today's P/L"     value={todayPL}        change={pct(todayPct)}   changeUp={true} />
            <StatCard icon={I.wallet} k="Cash available"  value={cash}           sub="ready to invest" />
          </div>

          {/* Performance + Allocation */}
          <div className="grid-2">
            <PerfPanel portfolioValue={portfolioValue} totalPL={totalPL} totalPLpct={totalPLpct} />
            <AllocationPanel holdings={holdings} cash={cash} portfolioValue={portfolioValue} />
          </div>

          {/* Holdings + Performance summary */}
          <div className="grid-2">
            <HoldingsPanel holdings={holdings} onTrade={openTrade} />
            <PerformanceSummaryPanel />
          </div>

          {/* Watchlist + Transactions */}
          <div className="grid-2">
            <WatchlistPanel items={wl} onTrade={openTrade} />
            <TransactionsPanel txns={txns} />
          </div>
        </div>
      </div>

      <TradeModal
        open={modal.open}
        asset={modal.asset}
        assets={assets}
        cash={cash}
        holdings={holdings}
        onClose={() => setModal({ open: false, asset: null })}
        onSubmit={doTrade}
      />
    </div>
  )
}
