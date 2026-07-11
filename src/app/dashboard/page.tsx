'use client'
import { Ico } from '@/components/dashboard/DashLayout'
import { StatCard, PerfPanel, AllocationPanel, HoldingsPanel, TransactionsPanel, PerformanceSummaryPanel } from '@/components/dashboard/DashPanels'
import { useDash } from '@/lib/dashContext'
import { pct } from '@/lib/format'

const I = {
  bag:    'M6 7V6a4 4 0 0 1 8 0v1M4 7h16l-1 13H5z',
  chart:  'M3 3v18h18M7 14l4-4 3 3 5-6',
  spark:  'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  wallet: 'M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 13h.01M3 9V7a2 2 0 0 1 2-2h11',
  plus:   'M12 5v14M5 12h14',
}

export default function DashboardPage() {
  const { liveHoldings, liveWl, cash, txns, loading,
          portfolioValue, totalPL, totalPLpct, todayPL, todayPct, openTrade } = useDash()

  return (
    <div className="content fade">
      <div className="page-head">
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Personal Portfolio</b></div>
          <h1> Welcome to equicrore
            {loading && <span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 400, marginLeft: 12 }}>Fetching live prices…</span>}
          </h1>
        </div>
        <button className="btn btn-solid" onClick={() => openTrade()}>
          <Ico d={I.plus} s={16} /> New record
        </button>
      </div>

      <div className="stats">
        <StatCard icon={I.spark}  k="Today's P/L"     value={Math.abs(todayPL)} change={pct(Math.abs(todayPct))} changeUp={todayPL >= 0} />
        <StatCard icon={I.chart}  k="Total returns"   value={totalPL}        change={pct(totalPLpct)} changeUp={totalPL >= 0} />
        <StatCard icon={I.bag}    k="Portfolio value" value={portfolioValue} change={pct(totalPLpct)} changeUp={totalPL >= 0}        sub="all-time" />
        <StatCard icon={I.wallet} k="Cash available"  value={cash} sub="ready to invest" />
      </div>

      <div className="grid-2">
        <HoldingsPanel holdings={liveHoldings} onTrade={openTrade} />
        <PerformanceSummaryPanel />
      </div>

      <div className="grid-2">
        <PerfPanel portfolioValue={portfolioValue} totalPL={totalPL} totalPLpct={totalPLpct} />
        <AllocationPanel holdings={liveHoldings} cash={cash} portfolioValue={portfolioValue} />
      </div>

      <TransactionsPanel txns={txns} />
    </div>
  )
}
