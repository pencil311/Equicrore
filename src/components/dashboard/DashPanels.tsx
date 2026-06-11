'use client'
import { useState, useEffect } from 'react'
import AreaChart from '@/components/charts/AreaChart'
import Donut from '@/components/charts/Donut'
import { useCountUp } from '@/hooks/useCountUp'
import { inr, inrShort, pct } from '@/lib/format'
import { perfData, leaderboard, type WatchlistItem } from '@/lib/mockData'
import { type PortfolioHolding, type TradeRecord } from '@/lib/portfolio'
import { saveUserData } from '@/lib/userStorage'
import { Ico } from './DashLayout'

const I = {
  bag: 'M6 7V6a4 4 0 0 1 8 0v1M4 7h16l-1 13H5z',
  chart: 'M3 3v18h18M7 14l4-4 3 3 5-6',
  spark: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
  wallet: 'M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 13h.01M3 9V7a2 2 0 0 1 2-2h11',
  arrowUp: 'M7 17 17 7M17 7H9M17 7v8',
  arrowDown: 'M7 7l10 10M17 17H9M17 17V9',
  check: 'M20 6 9 17l-5-5',
  lock: 'M6 10V7a6 6 0 1 1 12 0v3M5 10h14v11H5z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z',
}

/* ---- StatCard ---- */
interface StatCardProps {
  icon: string
  k: string
  value: number
  dec?: number
  isCur?: boolean
  change?: string
  changeUp?: boolean
  sub?: string
}

export function StatCard({ icon, k, value, dec = 0, isCur = true, change, changeUp, sub }: StatCardProps) {
  const v = useCountUp(value, 1200)
  return (
    <div className="scard">
      <div className="k">
        <span className="si"><Ico d={icon} s={16} /></span>
        {k}
      </div>
      <div className="v num">{isCur ? inr(v, dec) : Math.round(v)}</div>
      {change != null && (
        <div className={`d ${changeUp ? 'up' : 'down'}`}>
          <span className={`pillchg ${changeUp ? 'up' : 'down'}`}>
            <Ico d={changeUp ? I.arrowUp : I.arrowDown} s={12} />
            {change}
          </span>
          {sub && <span className="muted" style={{ fontWeight: 500 }}>{sub}</span>}
        </div>
      )}
    </div>
  )
}

/* ---- PerfPanel ---- */
interface PerfPanelProps {
  portfolioValue: number
  totalPL: number
  totalPLpct: number
}

export function PerfPanel({ portfolioValue, totalPL, totalPLpct }: PerfPanelProps) {
  const [tf, setTf] = useState('1Y')
  const s = perfData[tf]
  const up = totalPL >= 0
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Portfolio performance</h3>
          <div className="sub">Personal portfolio · all-time</div>
        </div>
        <div className="tfbar">
          {['1D', '1W', '1M', '1Y', 'All'].map(t => (
            <button key={t} className={tf === t ? 'on' : ''} onClick={() => setTf(t)}>{t}</button>
          ))}
        </div>
      </div>
      <div className="perf-top">
        <div className="perf-val num">{inr(portfolioValue)}</div>
        <div className={`perf-sub ${up ? 'up' : 'down'}`}>
          {up ? '▲ ' : '▼ '}{inr(Math.abs(totalPL))}  ({pct(totalPLpct)}) all-time
        </div>
      </div>
      <AreaChart data={s.data} labels={s.labels} key={tf} />
    </div>
  )
}

/* ---- AllocationPanel ---- */
interface AllocationPanelProps {
  holdings: PortfolioHolding[]
  cash: number
  portfolioValue: number
}

export function AllocationPanel({ holdings, cash, portfolioValue }: AllocationPanelProps) {
  const groups: Record<string, number> = {}
  holdings.forEach(h => {
    const mv = h.qty * h.price
    groups[h.type] = (groups[h.type] || 0) + mv
  })
  const colorByType: Record<string, string> = {
    'Equity': '#009A51', 'ETF': '#c2962e', 'Mutual Fund': '#2e9c8e', 'Crypto': '#d39021',
  }
  const segs = Object.keys(groups).map(t => ({ label: t, value: groups[t], color: colorByType[t] || '#888' }))
  segs.push({ label: 'Cash', value: cash, color: '#0a4a2c' })
  const total = segs.reduce((s, x) => s + x.value, 0)

  return (
    <div className="panel">
      <div className="panel-head"><h3>Allocation</h3></div>
      <div className="donut-wrap">
        <div style={{ position: 'relative' }}>
          <Donut segments={segs} />
          <div className="donut-center">
            <div className="dv num">{inrShort(portfolioValue)}</div>
            <div className="dk">TOTAL VALUE</div>
          </div>
        </div>
        <div className="alloc-list">
          {segs.map((sg, i) => (
            <div className="alloc-row" key={i}>
              <span className="sw" style={{ background: sg.color }} />
              <span className="an">{sg.label}</span>
              <span className="ap">{((sg.value / total) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---- HoldingsPanel ---- */
interface HoldingsPanelProps {
  holdings: PortfolioHolding[]
  onTrade: (asset: WatchlistItem) => void
}

export function HoldingsPanel({ holdings, onTrade }: HoldingsPanelProps) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Your holdings</h3>
        <span className="sub">{holdings.length} positions</span>
      </div>
      <div className="lrow hold-row">
        <span className="colh">Asset</span>
        <span className="colh col-r">Qty · Avg</span>
        <span className="colh col-r">Value</span>
        <span className="colh col-r">P/L</span>
      </div>
      <div className="list">
        {holdings.map(h => {
          const mv = h.qty * h.price, cost = h.qty * h.avg, pl = mv - cost
          const plp = (pl / cost) * 100, up = pl >= 0
          return (
            <div className="lrow hold-row" key={h.sym} style={{ cursor: 'pointer' }} onClick={() => onTrade(h as any)}>
              <div className="asset">
                <span className="tk" style={{ background: h.color }}>{h.sym.slice(0, 2)}</span>
                <div className="nm"><b>{h.sym}</b><span className="asset-type">{h.type}</span></div>
              </div>
              <div className="col-r">
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)' }}>{h.qty}</div>
                <div className="muted">{inr(h.avg, h.avg < 1000 ? 2 : 0)}</div>
              </div>
              <div className="col-r">
                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)' }}>{inrShort(mv)}</div>
                <div className="muted">{inr(h.price, h.price < 1000 ? 2 : 0)}</div>
              </div>
              <div className={`col-r ${up ? 'up' : 'down'}`} style={{ fontWeight: 700, fontSize: '13.5px' }}>
                {pct(plp)}
                <div style={{ fontSize: '12px', fontWeight: 600 }}>{(up ? '+' : '−')}{inrShort(Math.abs(pl)).slice(1)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---- WatchlistPanel ---- */
interface WatchlistPanelProps {
  items: WatchlistItem[]
  onTrade: (asset: WatchlistItem) => void
}

export function WatchlistPanel({ items, onTrade }: WatchlistPanelProps) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Watchlist</h3>
        <span className="sub">Live · ticking prices</span>
      </div>
      <div className="list">
        {items.map(it => {
          const up = it.chg >= 0
          return (
            <div className="lrow wl-row" key={it.sym}>
              <div className="asset">
                <span className="tk" style={{ background: it.color }}>{it.sym.slice(0, 2)}</span>
                <div className="nm"><b>{it.sym}</b><span>{it.name}</span></div>
              </div>
              <div className="wl-price">
                <b className={it.flash || ''}>{inr(it.price, it.price < 1000 ? 2 : 0)}</b>
                <span className={`chg ${up ? 'up' : 'down'}`}>{pct(it.chg)}</span>
              </div>
              <button className="btn btn-ghost btn-mini" onClick={() => onTrade(it)}>Record</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---- TransactionsPanel ---- */
function fmtDate(iso: string) {
  const today = new Date().toISOString().split('T')[0]
  const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (iso === today) return 'Today'
  if (iso === yest)  return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function TransactionsPanel({ txns }: { txns: TradeRecord[] }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Recent activity</h3>
        <a className="muted" style={{ fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>View all</a>
      </div>
      <div className="list">
        {txns.slice(0, 8).map((t, i) => (
          <div className="lrow tx-row" key={i}>
            <span className={`txtype ${t.type === 'BUY' ? 'buy' : 'sell'}`}>{t.type === 'BUY' ? 'CALL' : 'PUT'}</span>
            <div>
              <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{t.instrument || t.sym}</b>
              <div className="muted">{fmtDate(t.date)}{t.status ? ` · ${t.status}` : ''}</div>
            </div>
            <div className="col-r">
              {t.profit === 0 ? (
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>₹0</span>
              ) : (
                <span style={{ fontWeight: 700, color: t.profit > 0 ? 'var(--gain)' : 'var(--loss)' }}>
                  {t.profit > 0 ? '+' : '−'}{inr(Math.abs(t.profit))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- LeaderboardPanel (adapted as performance summary) ---- */
export function PerformanceSummaryPanel() {
  const lb = leaderboard
  const you = lb.find(x => x.you)!
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Performance summary</h3>
        <span className="sub">vs. benchmarks</span>
      </div>
      <div className="rankhero">
        <div className="big num">+18.4%</div>
        <div className="rmeta">
          <div className="rl">All-time return</div>
          <b>Top performer · since inception</b>
          <div className="rl" style={{ marginTop: 4 }}>Started with ₹1,00,00,000</div>
        </div>
      </div>
      <div className="lb-mini">
        {[
          { label: 'Your portfolio', ret: 18.4, color: '#009A51', you: true },
          { label: 'Nifty 50',       ret: 12.1, color: '#1a73c7' },
          { label: 'S&P 500 (INR)',  ret: 15.7, color: '#7a3ec2' },
          { label: 'Gold',           ret: 8.3,  color: '#c2962e' },
          { label: 'Fixed Deposit',  ret: 7.0,  color: '#4a9e8a' },
        ].map((p, i) => (
          <div className={`lbm${p.you ? ' you' : ''}`} key={i}>
            <span className="rk">{i + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="av" style={{ background: p.color }}>{p.label.slice(0, 2).toUpperCase()}</span>
              <div className="nm"><b>{p.label}</b></div>
            </div>
            <span className={`ret ${p.ret >= 0 ? 'up' : 'down'}`}>{pct(p.ret)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- RecordModal ---- */
interface RecordModalProps {
  open: boolean
  sym: string
  name: string
  color: string
  onClose: () => void
  onSubmit: (record: TradeRecord) => void
}

export function RecordModal({ open, sym, name, color, onClose, onSubmit }: RecordModalProps) {
  const [date, setDate]             = useState('')
  const [type, setType]             = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity]     = useState('')
  const [price, setPrice]           = useState('')
  const [profit, setProfit]         = useState('')
  const [instrument, setInstrument] = useState('')
  const [category, setCategory]     = useState('Equities')
  const [status, setStatus]         = useState('')
  const [done, setDone]             = useState(false)

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0])
      setType('BUY')
      setQuantity('')
      setPrice('')
      setProfit('')
      setInstrument(sym)
      setCategory('Equities')
      setStatus('')
      setDone(false)
    }
  }, [open, sym])

  if (!open) return null

  const profitNum  = parseFloat(profit) || 0
  const profitUp   = profitNum > 0
  const profitDown = profitNum < 0

  const qtyNum   = parseFloat(quantity) || 0
  const priceNum = parseFloat(price)    || 0
  const costHint = qtyNum > 0 && priceNum > 0 ? qtyNum * priceNum : 0

  function submit() {
    const record: TradeRecord = {
      sym, instrument, category, type,
      quantity: qtyNum, price: priceNum,
      profit: profitNum, date, status,
    }
    try {
      const existing: TradeRecord[] = JSON.parse(localStorage.getItem('eq-records') || '[]')
      existing.unshift(record)
      localStorage.setItem('eq-records', JSON.stringify(existing))
      saveUserData('records', existing).catch(() => {})
      window.dispatchEvent(new CustomEvent('eq-record-added'))
      window.dispatchEvent(new Event('storage'))
    } catch {}
    setDone(true)
    onSubmit(record)
    setTimeout(onClose, 1500)
  }

  return (
    <div className={`ov${open ? ' show' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        {done ? (
          <div className="modal-body">
            <div className="confirm-ok">
              <div className="ok"><Ico d={I.check} s={34} /></div>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Recorded!</h3>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-head">
              <span className="tk" style={{ background: color, width: 42, height: 42, borderRadius: 11 }}>{sym.slice(0, 2)}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{sym}</div>
                <div className="muted">{name}</div>
              </div>
              <button className="tb-icon" style={{ marginLeft: 'auto' }} onClick={onClose}>
                <Ico d="M6 6l12 12M18 6 6 18" s={16} />
              </button>
            </div>
            <div className="modal-body">
              {/* Instrument */}
              <div className="field">
                <label>Instrument</label>
                <input
                  type="text"
                  value={instrument}
                  placeholder="e.g. HDFCBANK, NIFTY, BTC..."
                  onChange={e => setInstrument(e.target.value)}
                  style={{
                    width: '100%', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
                    padding: '10px 12px', fontSize: 14, fontFamily: 'var(--sans)',
                    color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              {/* Category */}
              <div className="field">
                <label>Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{
                    width: '100%', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
                    padding: '10px 12px', fontSize: 14, fontFamily: 'var(--sans)',
                    color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
                    boxSizing: 'border-box' as const, cursor: 'pointer',
                    appearance: 'none' as const,
                  }}
                >
                  {['Equities', 'FNO', 'Commodities', 'Crypto', 'Forex'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{
                    width: '100%', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
                    padding: '10px 12px', fontSize: 14, fontFamily: 'var(--sans)',
                    color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              {/* Type toggle */}
              <div className="field">
                <label>Transaction type</label>
                <div className="seg">
                  <button className={`buy${type === 'BUY' ? ' on' : ''}`} onClick={() => setType('BUY')}>Call</button>
                  <button className={`sell${type === 'SELL' ? ' on' : ''}`} onClick={() => setType('SELL')}>Put</button>
                </div>
              </div>

              {/* Quantity + Price — side by side */}
              <div className="field">
                <label>Quantity &amp; Price per unit (₹)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={quantity}
                    placeholder="Qty"
                    min="0"
                    onChange={e => setQuantity(e.target.value)}
                    style={{
                      flex: 1, border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
                      padding: '10px 12px', fontSize: 14, fontFamily: 'var(--sans)',
                      color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                  <input
                    type="number"
                    value={price}
                    placeholder="Price ₹"
                    min="0"
                    onChange={e => setPrice(e.target.value)}
                    style={{
                      flex: 2, border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
                      padding: '10px 12px', fontSize: 14, fontFamily: 'var(--sans)',
                      color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
                      boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
                {costHint > 0 && (
                  <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--faint)' }}>
                    {type === 'BUY' ? 'Cost' : 'Proceeds'}: <b style={{ color: 'var(--ink)' }}>{inr(costHint)}</b>
                  </div>
                )}
              </div>

              {/* Profit / Loss */}
              <div className="field">
                <label>Profit / Loss (₹)</label>
                <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 8, marginTop: -4 }}>
                  Enter positive for profit, negative for loss (e.g. −500)
                </div>
                <input
                  type="number"
                  value={profit}
                  placeholder="0"
                  onChange={e => setProfit(e.target.value)}
                  style={{
                    width: '100%', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
                    padding: '10px 12px', fontSize: 16, fontFamily: 'var(--serif)',
                    fontWeight: 600, outline: 'none', boxSizing: 'border-box' as const,
                    background: 'var(--paper)',
                    color: profitUp ? 'var(--gain)' : profitDown ? 'var(--loss)' : 'var(--ink)',
                  }}
                />
                {(profitUp || profitDown) && (
                  <div style={{ marginTop: 7, fontSize: 14, fontWeight: 700, color: profitUp ? 'var(--gain)' : 'var(--loss)' }}>
                    {profitUp ? '+' : '−'}{inr(Math.abs(profitNum))}
                  </div>
                )}
              </div>

              {/* Status / Notes */}
              <div className="field">
                <label>Status / Notes</label>
                <textarea
                  value={status}
                  rows={2}
                  placeholder="e.g. Booked profit, Stop loss hit, Holding..."
                  onChange={e => setStatus(e.target.value)}
                  style={{
                    width: '100%', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
                    padding: '10px 12px', fontSize: 14, fontFamily: 'var(--sans)',
                    color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
                    resize: 'none', boxSizing: 'border-box' as const,
                  }}
                />
              </div>

              <button
                className="btn btn-solid"
                style={{ width: '100%', justifyContent: 'center', padding: 14 }}
                onClick={submit}
              >
                Record
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
