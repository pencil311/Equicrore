'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { sanitizeString } from '@/lib/sanitize'
import '@/styles/dashboard.css'
import { Sidebar, TopBar } from '@/components/dashboard/DashLayout'
import { RecordModal } from '@/components/dashboard/DashPanels'
import { DashContext } from '@/lib/dashContext'
import {
  type PortfolioHolding,
  type TradeRecord,
  saveStartingCapital,
  processRecord,
} from '@/lib/portfolio'
import {
  watchlist as initWatchlist,
  type WatchlistItem,
} from '@/lib/mockData'
import { useTheme } from '@/hooks/useTheme'
import { useLivePrices, mergeWatchlist, mergeHoldings } from '@/hooks/useLivePrices'
import { loadAllUserData, saveUserData } from '@/lib/userStorage'
import { type BrokerId, brokerKeys, getActiveBroker } from '@/lib/brokers'

function readLS<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback
    const r = localStorage.getItem(key)
    return r !== null ? (JSON.parse(r) as T) : fallback
  } catch { return fallback }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession() as any
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()

  const [activeBroker, setActiveBrokerState] = useState<BrokerId>(() => getActiveBroker())
  const activeBrokerRef = useRef<BrokerId>(activeBroker)

  const [holdings, setHoldings]           = useState<PortfolioHolding[]>([])
  const [cash, setCash]                   = useState(0)
  const [startingCapital, setStartingCapital] = useState(0)
  const [txns, setTxns]                   = useState<TradeRecord[]>([])
  const [clientsTotal, setClientsTotal]   = useState(0)
  const [wl, setWl]                       = useState<WatchlistItem[]>(initWatchlist.map(w => ({ ...w })))
  const [modal, setModal]                 = useState<{ open: boolean; asset: WatchlistItem | null }>({ open: false, asset: null })
  const [sidebarOpen, setSidebarOpen]     = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [editOpen, setEditOpen]           = useState(false)
  const [editInput, setEditInput]         = useState('')
  const [nameInput, setNameInput]         = useState('')
  const [nameSaving, setNameSaving]       = useState(false)

  /* Keep ref in sync so event callbacks always see the current broker */
  useEffect(() => { activeBrokerRef.current = activeBroker }, [activeBroker])

  /* Redirect if unauthenticated */
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  /* Poll session every 5 minutes — redirect on expiry */
  useEffect(() => {
    const id = setInterval(() => {
      getSession().then(s => { if (!s) router.push('/login') })
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [router])

  /* Load all user data from MongoDB on login */
  useEffect(() => {
    if (status !== 'authenticated') return
    loadAllUserData().then(data => {
      if (typeof window !== 'undefined') {
        /* Seed Dhan broker keys from MongoDB if they don't exist yet */
        if (!localStorage.getItem('eq-holdings-dhan'))
          localStorage.setItem('eq-holdings-dhan', JSON.stringify(data.holdings))
        if (!localStorage.getItem('eq-cash-dhan'))
          localStorage.setItem('eq-cash-dhan', JSON.stringify(data.cash))
        /* Trade records live in the single 'eq-records' store (same one the Positions page manages) */
        if (Array.isArray(data.records) && data.records.length > 0 && !localStorage.getItem('eq-records'))
          localStorage.setItem('eq-records', JSON.stringify(data.records))
        localStorage.setItem('eq-starting-capital', JSON.stringify(data.startingCapital))
        localStorage.setItem('eq-clients',          JSON.stringify(data.clients))
      }
      const cur = activeBrokerRef.current
      const keys = brokerKeys(cur)
      setHoldings(readLS(keys.holdings, []))
      setCash(readLS(keys.cash, 0))
      setTxns(readLS('eq-records', []))
      setStartingCapital(data.startingCapital)
      setClientsTotal(data.clients.reduce((s: number, c: any) => s + (c.clientAmount || 0), 0))
    })
  }, [status])

  /* Reload data when broker changes */
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('eq-active-broker', activeBroker)
    const keys = brokerKeys(activeBroker)
    setHoldings(readLS(keys.holdings, []))
    setCash(readLS(keys.cash, 0))
  }, [activeBroker])

  /* Refresh state from localStorage when any component writes a record */
  useEffect(() => {
    const refresh = () => {
      const keys = brokerKeys(activeBrokerRef.current)
      setHoldings(readLS(keys.holdings, []))
      setCash(readLS(keys.cash, 0))
      setTxns(readLS('eq-records', []))
      setStartingCapital(readLS<number>('eq-starting-capital', 0))
      setClientsTotal(readLS<any[]>('eq-clients', []).reduce((s: number, c: any) => s + (c.clientAmount || 0), 0))
    }
    window.addEventListener('eq-record-added', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('eq-record-added', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  function setActiveBroker(b: BrokerId) {
    setActiveBrokerState(b)
  }

  const allSymbols = Array.from(new Set([...holdings.map(h => h.sym), ...wl.map(w => w.sym)]))
  const { prices, loading } = useLivePrices(allSymbols, 15000)

  const liveWl       = mergeWatchlist(wl, prices)
  const liveHoldings = mergeHoldings(holdings, prices)

  const marketValue    = liveHoldings.reduce((s, h) => s + h.qty * h.price, 0)
  const portfolioValue = clientsTotal

  const totalPL    = txns.reduce((s, r) => s + (Number(r.profit) || 0), 0)
  const totalPLpct = portfolioValue > 0 ? (totalPL / portfolioValue) * 100 : 0

  const _today  = new Date().toISOString().split('T')[0]
  const todayPL  = txns.filter(r => r.date === _today).reduce((s, r) => s + (Number(r.profit) || 0), 0)
  const todayPct = portfolioValue > 0 ? (todayPL / portfolioValue) * 100 : 0

  const assets: WatchlistItem[] = (() => {
    const map: Record<string, WatchlistItem> = {}
    liveHoldings.forEach(h => { map[h.sym] = h as unknown as WatchlistItem })
    liveWl.forEach(w => { if (!map[w.sym]) map[w.sym] = w })
    return Object.values(map)
  })()

  function openTrade(asset?: WatchlistItem) {
    setModal({ open: true, asset: asset ?? null })
  }

  function doRecord(rec: TradeRecord) {
    const { holdings: newH, cash: newC } = processRecord(rec, holdings, cash)
    setHoldings(newH)
    setCash(newC)
    const keys = brokerKeys(activeBroker)
    localStorage.setItem(keys.holdings, JSON.stringify(newH))
    localStorage.setItem(keys.cash,     JSON.stringify(newC))
    saveUserData('holdings', newH).catch(() => {})
    saveUserData('cash', newC).catch(() => {})
  }

  function openEditPortfolio() {
    setEditInput(startingCapital > 0 ? String(Math.round(startingCapital)) : '')
    setEditOpen(true)
  }

  function saveCapital() {
    const val = parseFloat(editInput.replace(/,/g, ''))
    if (!isNaN(val) && val > 0) {
      saveStartingCapital(val)
      setStartingCapital(val)
      saveUserData('starting-capital', val).catch(() => {})
      const newCash = Math.max(0, val - marketValue)
      const keys = brokerKeys(activeBroker)
      localStorage.setItem(keys.cash, JSON.stringify(newCash))
      setCash(newCash)
      saveUserData('cash', newCash).catch(() => {})
    }
    setEditOpen(false)
  }

  async function saveName() {
    const name = sanitizeString(nameInput, 100)
    if (!name) return
    setNameSaving(true)
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    await update({ name })
    setNameSaving(false)
  }

  function toggleSidebar() {
    if (sidebarPinned) {
      setSidebarPinned(false)
      setSidebarOpen(false)
    } else {
      setSidebarPinned(true)
      setSidebarOpen(true)
    }
  }

  const EASE = 'cubic-bezier(.22,.61,.36,1)'

  if (status === 'loading') return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--faint)', fontSize: 14, fontFamily: 'var(--sans)',
    }}>
      Loading…
    </div>
  )
  if (!session) return null

  return (
    <DashContext.Provider value={{
      holdings, liveHoldings, cash, startingCapital, txns, wl, liveWl, prices, loading,
      portfolioValue, marketValue, totalPL, totalPLpct, todayPL, todayPct,
      assets, activeBroker, setActiveBroker, openTrade,
    }}>
      {/* Hover trigger zone */}
      <div
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 8, zIndex: 50 }}
        onMouseEnter={() => { if (!sidebarPinned) setSidebarOpen(true) }}
      />

      {/* Sidebar toggle pill */}
      <button
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        style={{
          position: 'fixed', left: sidebarOpen ? 242 : 0, top: '50%',
          transform: 'translateY(-50%)', transition: `left 0.3s ${EASE}`,
          zIndex: 60, width: 20, height: 64,
          background: 'var(--forest)', color: '#eafff2',
          border: 'none', borderRadius: '0 8px 8px 0',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 0, flexShrink: 0,
        }}
      >
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={sidebarOpen ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
        </svg>
      </button>

      <div className="app">
        <div
          style={{
            width: sidebarOpen ? 242 : 0, height: '100vh', flexShrink: 0,
            overflow: 'hidden', transition: `width 0.3s ${EASE}`,
          }}
          onMouseLeave={() => { if (!sidebarPinned) setSidebarOpen(false) }}
        >
          <Sidebar cash={portfolioValue} onEditPortfolio={openEditPortfolio} />
        </div>

        <div className="main">
          <TopBar onTrade={openTrade} theme={theme} toggleTheme={toggleTheme} />
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {children}
          </div>
        </div>
      </div>

      {/* Set starting capital modal */}
      <div className={`ov${editOpen ? ' show' : ''}`} onClick={() => setEditOpen(false)}>
        <div className="modal" style={{ width: 380 }} onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--r)',
              background: 'var(--green)', display: 'grid', placeItems: 'center',
              color: '#fff', flexShrink: 0,
            }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--ink)' }}>Set starting capital</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Your initial portfolio value for P&amp;L tracking</div>
            </div>
          </div>
          <div className="modal-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Starting capital (₹)
              </label>
              <input
                type="number"
                value={editInput}
                onChange={e => setEditInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveCapital() }}
                autoFocus={editOpen}
                placeholder="e.g. 1000000"
                style={{
                  border: '1.5px solid var(--line)', borderRadius: 'var(--r)',
                  padding: '10px 14px', fontSize: 16, background: 'var(--bg)',
                  color: 'var(--ink)', outline: 'none', width: '100%',
                  fontFamily: 'var(--serif)', boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>
                Used as the baseline for calculating all-time P&amp;L
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button className="btn btn-ghost btn-mini" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn btn-solid btn-mini" onClick={saveCapital}>Save</button>
            </div>
          </div>
        </div>
      </div>

      {/* Name prompt — shown for accounts without a display name */}
      {status === 'authenticated' && !session?.user?.name && (
        <div className="ov show" style={{ zIndex: 200 }}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--r)',
                background: 'var(--green)', display: 'grid', placeItems: 'center',
                color: '#fff', flexShrink: 0,
              }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--ink)' }}>What's your name?</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Used to personalise your dashboard</div>
              </div>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Display name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName() }}
                  autoFocus
                  placeholder="e.g. Alex Kumar"
                  style={{
                    border: '1.5px solid var(--line)', borderRadius: 'var(--r)',
                    padding: '10px 14px', fontSize: 15, background: 'var(--bg)',
                    color: 'var(--ink)', outline: 'none', width: '100%',
                    fontFamily: 'var(--sans)', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button
                  className="btn btn-solid btn-mini"
                  onClick={saveName}
                  disabled={nameSaving || !nameInput.trim()}
                >
                  {nameSaving ? 'Saving…' : 'Save name →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <RecordModal
        open={modal.open}
        sym={modal.asset?.sym ?? ''}
        name={modal.asset?.name ?? ''}
        color={modal.asset?.color ?? 'var(--green)'}
        onClose={() => setModal({ open: false, asset: null })}
        onSubmit={doRecord}
      />
    </DashContext.Provider>
  )
}
