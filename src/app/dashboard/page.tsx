'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Ico } from '@/components/dashboard/DashLayout'
import { StatCard, PerfPanel, AllocationPanel, HoldingsPanel, TransactionsPanel, PerformanceSummaryPanel } from '@/components/dashboard/DashPanels'
import { useDash } from '@/lib/dashContext'
import { pct, inr } from '@/lib/format'
import { BROKERS, type Broker, type BrokerId } from '@/lib/brokers'

const I = {
  bag:    'M6 7V6a4 4 0 0 1 8 0v1M4 7h16l-1 13H5z',
  chart:  'M3 3v18h18M7 14l4-4 3 3 5-6',
  spark:  'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  wallet: 'M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 13h.01M3 9V7a2 2 0 0 1 2-2h11',
  plus:   'M12 5v14M5 12h14',
  check:  'M20 6L9 17l-5-5',
  chevron:'M6 9l6 6 6-6',
}

function readLSSnapshot<T>(key: string, fb: T): T {
  try { const r = localStorage.getItem(key); return r !== null ? JSON.parse(r) : fb } catch { return fb }
}

function BrokerLogo({ broker, size = 24 }: { broker: Broker; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const initials = (
    <span style={{
      width: size, height: size, borderRadius: 6,
      background: broker.color, color: '#fff',
      display: 'grid', placeItems: 'center',
      fontSize: size * 0.4, fontWeight: 800, flexShrink: 0,
      fontFamily: 'var(--sans)',
    }}>
      {broker.name.slice(0, 2).toUpperCase()}
    </span>
  )
  if (!broker.logo || imgError) return initials
  return (
    <img
      src={broker.logo}
      width={size}
      height={size}
      alt={broker.name}
      style={{ borderRadius: 6, objectFit: 'contain', flexShrink: 0 }}
      onError={() => setImgError(true)}
    />
  )
}

function BrokerDropdown() {
  const { activeBroker, setActiveBroker } = useDash()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  /* Compute per-broker totals when dropdown opens */
  const brokerTotals = useMemo(() => {
    return BROKERS.map(b => {
      const holdings = readLSSnapshot<{ qty: number; price: number }[]>(`eq-holdings-${b.id}`, [])
      const cash     = readLSSnapshot<number>(`eq-cash-${b.id}`, 0)
      const total    = holdings.reduce((s, h) => s + h.qty * h.price, 0) + cash
      return { id: b.id, total }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const active = BROKERS.find(b => b.id === activeBroker)!

  function pick(id: BrokerId) {
    setActiveBroker(id)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 999,
          border: '1px solid var(--line)', background: 'var(--paper)',
          cursor: 'pointer', fontSize: 13.5,
          fontFamily: 'var(--sans)', fontWeight: 500,
          color: 'var(--ink)', transition: 'border-color .15s',
        }}
      >
        <BrokerLogo broker={active} size={24} />
        {active.name}
        <Ico d={I.chevron} s={14} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', boxShadow: 'var(--sh-lg)',
          minWidth: 250, padding: 5, zIndex: 50,
          animation: 'eqFadeUp .2s var(--ease)',
        }}>
          {BROKERS.map(b => {
            const bv    = brokerTotals.find(v => v.id === b.id)
            const isSel = b.id === activeBroker
            return (
              <button
                key={b.id}
                onClick={() => pick(b.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  width: '100%', padding: '9px 11px',
                  borderRadius: 'calc(var(--r) - 2px)',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: isSel ? 'var(--bg)' : 'transparent',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
                onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <BrokerLogo broker={b} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{b.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {bv && bv.total > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--faint)' }}>{inr(bv.total)}</span>
                  )}
                  {isSel && (
                    <span style={{ color: 'var(--green)' }}>
                      <Ico d={I.check} s={15} />
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { liveHoldings, liveWl, cash, txns, loading, activeBroker,
          portfolioValue, totalPL, totalPLpct, todayPL, todayPct, openTrade } = useDash()

  const activeBrokerObj = BROKERS.find(b => b.id === activeBroker)!

  /* Re-trigger fade animation when broker switches */
  const [fadeKey, setFadeKey] = useState(0)
  const prevBroker = useRef(activeBroker)
  useEffect(() => {
    if (prevBroker.current !== activeBroker) {
      prevBroker.current = activeBroker
      setFadeKey(k => k + 1)
    }
  }, [activeBroker])

  return (
    <div key={fadeKey} className="content fade">
      <div className="page-head" style={{ alignItems: 'center' }}>
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Personal Portfolio</b></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Welcome to equicrore
              {loading && <span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 400, marginLeft: 12 }}>Fetching live prices…</span>}
            </h1>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--paper)', border: '1px solid var(--line)',
              borderRadius: 999, padding: '6px 12px', flexShrink: 0,
            }}>
              <BrokerLogo broker={activeBrokerObj} size={20} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--sans)' }}>
                {activeBrokerObj.name}
              </span>
            </div>
          </div>
        </div>
        <BrokerDropdown />
        <button className="btn btn-solid" onClick={() => openTrade()}>
          <Ico d={I.plus} s={16} /> New record
        </button>
      </div>

      <div className="stats">
        <StatCard icon={I.spark}  k="Today's P/L"     value={Math.abs(todayPL)} change={pct(Math.abs(todayPct))} changeUp={todayPL >= 0} />
        <StatCard icon={I.chart}  k="Total returns"   value={totalPL}        change={pct(totalPLpct)} changeUp={totalPL >= 0} />
        <StatCard icon={I.bag}    k="Portfolio value" value={portfolioValue} change={pct(totalPLpct)} changeUp={totalPL >= 0} sub="all-time" />
        <StatCard icon={I.wallet} k="Cash available"  value={cash} sub="ready to invest" />
      </div>

      <div className="grid-2">
        <PerformanceSummaryPanel />
        <HoldingsPanel holdings={liveHoldings} onTrade={openTrade} />
      </div>

      <div className="grid-2">
        <PerfPanel portfolioValue={portfolioValue} records={txns} />
        <AllocationPanel holdings={liveHoldings} cash={cash} portfolioValue={portfolioValue} />
      </div>

      <TransactionsPanel txns={txns} />
    </div>
  )
}
