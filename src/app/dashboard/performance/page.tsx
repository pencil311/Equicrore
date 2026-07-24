'use client'
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { inr, localDateISO } from '@/lib/format'
import { Ico } from '@/components/dashboard/DashLayout'
import type { TradeRecord } from '@/lib/portfolio'
import { recalculateHoldings, saveHoldings, saveCash, getStartingCapital } from '@/lib/portfolio'
import { getUserData, saveUserData } from '@/lib/userStorage'
import { allSymbols, type WatchSymbol } from '@/lib/watchlists'
import { useLivePrices, type LivePrice } from '@/hooks/useLivePrices'

/* ---- Icons ---- */
const JOURNAL_ICON  = 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z'
const CHEVRON       = 'M6 9l6 6 6-6'
const DOWNLOAD_ICON = 'M12 15V3M12 15l-4-4M12 15l4-4M3 19h18'
const TRASH_ICON    = 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'
const PLUS_ICON     = 'M12 5v14M5 12h14'
const EDIT_ICON     = 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'
const CLOSE_ICON    = 'M18 6L6 18M6 6l12 12'

/* ---- Types ---- */
interface OpenPosition {
  id: string
  sym: string
  instrument: string
  tvSym: string
  side: 'long' | 'short'
  qty: number
  entryPrice: number
  openedAt: string
  category: string
}

/* ---- Constants ---- */
const CATS        = ['All', 'Equities', 'FNO', 'Commodities', 'Crypto', 'Forex'] as const
const POS_CATS    = ['Equities', 'FNO', 'Commodities', 'Crypto', 'Forex'] as const
const QUICK_TIMES = ['1W', '1M', '3M', '6M', 'Max'] as const
type QuickTime = typeof QUICK_TIMES[number]
type TimeKey   = QuickTime | 'custom'
const OPEN_POS_KEY = 'eq-open-positions'
/* Trade log grid — one record per row */
const LOG_COL = '96px minmax(150px, 1.2fr) 92px 64px 120px minmax(110px, 1fr) 64px'

/* ---- Shared styles ---- */
const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 999,
  background: 'rgba(0,0,0,.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}
const MODAL: React.CSSProperties = {
  background: 'var(--paper)', borderRadius: 'var(--r)',
  boxShadow: 'var(--sh-lg)', width: '100%', maxWidth: 460,
  animation: 'eqFadeUp .18s var(--ease)',
}
const fieldStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--line)',
  borderRadius: 'var(--r-sm)', padding: '8px 12px',
  fontSize: 14, fontFamily: 'var(--sans)',
  color: 'var(--ink)', background: 'var(--bg)',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.06em',
  color: 'var(--faint)', marginBottom: 5, marginTop: 14,
}

/* ---- Helpers ---- */
function toPriceSym(tvSym: string): string {
  const base = tvSym.includes(':') ? tvSym.split(':')[1] : tvSym
  return base.endsWith('USDT') ? base.slice(0, -4) : base
}

function readOpenPositions(): OpenPosition[] {
  try { return JSON.parse(localStorage.getItem(OPEN_POS_KEY) || '[]') } catch { return [] }
}

function writeOpenPositions(pos: OpenPosition[]): void {
  try { localStorage.setItem(OPEN_POS_KEY, JSON.stringify(pos)) } catch {}
}

async function fetchLivePrice(sym: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/prices?symbols=${encodeURIComponent(sym)}`)
    if (!res.ok) return null
    const data = await res.json() as Record<string, { price?: number }>
    return data[sym]?.price ?? null
  } catch { return null }
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const today = localDateISO()
  const yest  = localDateISO(new Date(Date.now() - 86400000))
  if (iso === today) return 'Today'
  if (iso === yest)  return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function cutoffForQuick(key: QuickTime): string | null {
  if (key === 'Max') return null
  const days: Record<QuickTime, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, 'Max': 0 }
  const d = new Date()
  d.setDate(d.getDate() - days[key])
  return localDateISO(d)
}

function plStr(val: number) {
  if (val === 0) return '₹0'
  return `${val > 0 ? '+' : '−'}${inr(Math.abs(val))}`
}

function esc(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtN(n: number): string {
  return '&#8377;' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function plCell(n: number): string {
  if (n === 0) return '<span style="color:#999">&#8377;0</span>'
  const c = n > 0 ? '#009A51' : '#d94f4f'
  return `<span style="color:${c};font-weight:700">${n > 0 ? '+' : '&minus;'}${fmtN(n)}</span>`
}

function buildHTML(
  rows: TradeRecord[],
  netPL: number,
  realisedPL: number,
  activeCat: string,
  activeTime: TimeKey,
  timeLabel: string,
  fromDate: string,
  toDate: string,
): string {
  const today    = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const period   = activeTime === 'custom' ? `${fromDate || '—'} to ${toDate || '—'}` : timeLabel
  const netColor = netPL > 0 ? '#009A51' : netPL < 0 ? '#d94f4f' : '#1a2a1a'
  const relColor = realisedPL > 0 ? '#009A51' : realisedPL < 0 ? '#d94f4f' : '#1a2a1a'
  const calls    = rows.filter(r => r.type === 'BUY').length
  const puts     = rows.filter(r => r.type === 'SELL').length

  const rowsHtml = rows.map((r, i) => {
    const bg        = i % 2 === 0 ? '#ffffff' : '#f0f7f0'
    const typeBg    = r.type === 'BUY' ? '#e8f7ee' : '#fff0f0'
    const typeCol   = r.type === 'BUY' ? '#009A51' : '#c2412e'
    const typeLabel = r.type === 'BUY' ? 'CALL' : 'PUT'
    const instrMain = esc(r.instrument || r.sym)
    const instrSub  = r.instrument && r.instrument !== r.sym
      ? `<br><small style="color:#888;font-weight:400">${esc(r.sym)}</small>` : ''
    const dateStr   = r.date
      ? new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—'
    return `
    <tr style="background:${bg}">
      <td>${esc(dateStr)}</td>
      <td><strong>${instrMain}</strong>${instrSub}</td>
      <td><span style="display:inline-block;padding:2px 10px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:.03em;background:${typeBg};color:${typeCol}">${typeLabel}</span></td>
      <td>${esc(r.category || 'Equities')}</td>
      <td style="text-align:right">${plCell(r.profit)}</td>
      <td style="color:#666">${esc(r.status) || '<span style="color:#bbb">—</span>'}</td>
    </tr>`
  }).join('\n')

  const totalPL = rows.reduce((s, r) => s + r.profit, 0)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Equicrore — Trade Performance Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#eef2ec;color:#1a2a1a;padding:40px 24px}
  .page{max-width:920px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(0,60,30,.12)}
  .hdr{background:#003C20;padding:32px 40px 26px}
  .brand{font-size:26px;font-weight:800;color:#fff;letter-spacing:.1em;font-family:Georgia,serif}
  .tagline{color:#6fcf97;font-size:13px;margin-top:5px;letter-spacing:.03em}
  .meta{display:flex;gap:28px;flex-wrap:wrap;margin-top:18px}
  .meta span{font-size:12px;color:#a8d5b5}.meta b{color:#e0f5e9}
  .bar{height:3px;background:linear-gradient(to right,#009A51 40%,#003C20)}
  .body{padding:32px 40px 40px}
  .sum{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:32px}
  .sbox{border:1.5px solid #d0e8d0;border-radius:10px;padding:18px 20px;background:#f8fbf8}
  .slbl{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#5a8a5a;margin-bottom:8px}
  .sval{font-size:24px;font-weight:800;font-family:Georgia,serif;line-height:1}
  .ssub{font-size:11px;color:#999;margin-top:6px}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#5a8a5a;padding:10px 12px;border-bottom:2px solid #d0e8d0;font-weight:700}
  td{padding:11px 12px;border-bottom:1px solid #edf5ed;vertical-align:middle}
  .tfoot td{border-top:2px solid #d0e8d0;border-bottom:none;font-weight:700;font-size:14px;background:#f0f7f0}
  .foot{padding:20px 40px;background:#f8fbf8;border-top:1px solid #d0e8d0;text-align:center}
  .foot p{font-size:11.5px;color:#5a8a5a;line-height:2}
  .foot .copy{font-weight:700;color:#003C20}
  @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="brand">EQUICRORE</div>
    <div class="tagline">Trade Performance Report</div>
    <div class="meta">
      <span>Generated: <b>${today}</b></span>
      <span>Category: <b>${esc(activeCat)}</b></span>
      <span>Period: <b>${esc(period)}</b></span>
      <span>Records: <b>${rows.length}</b></span>
    </div>
  </div>
  <div class="bar"></div>
  <div class="body">
    <div class="sum">
      <div class="sbox">
        <div class="slbl">Net P&amp;L</div>
        <div class="sval" style="color:${netColor}">${plCell(netPL)}</div>
        <div class="ssub">Across ${rows.length} trade(s)</div>
      </div>
      <div class="sbox">
        <div class="slbl">Realised P&amp;L</div>
        <div class="sval" style="color:${relColor}">${plCell(realisedPL)}</div>
        <div class="ssub">Closed (PUT) trades only</div>
      </div>
      <div class="sbox">
        <div class="slbl">Total Trades</div>
        <div class="sval" style="color:#003C20">${rows.length}</div>
        <div class="ssub">${calls} CALL &nbsp;·&nbsp; ${puts} PUT</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Instrument</th><th>Type</th><th>Category</th>
          <th style="text-align:right">Profit / Loss</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr class="tfoot">
          <td colspan="4">Total (${rows.length} records)</td>
          <td style="text-align:right">${plCell(totalPL)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div class="foot">
    <p class="copy">&copy; Equicrore &mdash; Personal Trading &amp; Investment Portfolio</p>
    <p>This is a personal record and not financial advice.</p>
  </div>
</div>
</body>
</html>`
}

/* ---- Chip ---- */
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: 100, fontSize: 12.5,
        fontWeight: active ? 700 : 500, fontFamily: 'var(--sans)',
        border: active ? 'none' : '1.5px solid var(--line)',
        background: active ? 'var(--forest)' : 'transparent',
        color: active ? '#fff' : 'var(--ink)',
        cursor: 'pointer', transition: 'all 0.13s var(--ease)',
        whiteSpace: 'nowrap' as const, lineHeight: 1.4,
      }}
    >{label}</button>
  )
}

/* ---- DropBtn ---- */
function DropBtn({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 100,
        border: `1.5px solid ${open ? 'var(--forest)' : 'var(--line)'}`,
        background: open ? 'var(--forest)' : 'var(--paper)',
        color: open ? '#fff' : 'var(--ink)',
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
        cursor: 'pointer', transition: 'all 0.13s var(--ease)',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
      <span style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
        <Ico d={CHEVRON} s={13} />
      </span>
    </button>
  )
}

/* ---- DropPanel ---- */
function DropPanel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0,
      zIndex: 50, minWidth: 240,
      background: 'var(--paper)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)',
      padding: 14,
    }}>
      {children}
    </div>
  )
}

/* ---- EditBtn ---- */
function EditBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center',
        color: hov ? 'var(--green)' : 'var(--faint)',
        transition: 'color 0.13s',
      }}
    >
      <Ico d={EDIT_ICON} s={14} />
    </button>
  )
}

/* ---- DelBtn ---- */
function DelBtn({ pending, onDelete, onConfirm, onCancel }: {
  pending: boolean
  onDelete: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const [hov, setHov] = useState(false)
  if (pending) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          onClick={onConfirm}
          style={{
            background: 'none', border: '1px solid var(--gain)', borderRadius: 4,
            color: 'var(--gain)', fontWeight: 700, fontSize: 11,
            cursor: 'pointer', padding: '2px 7px', lineHeight: 1.6,
          }}
        >✓</button>
        <button
          onClick={onCancel}
          style={{
            background: 'none', border: '1px solid var(--line)', borderRadius: 4,
            color: 'var(--muted)', fontWeight: 700, fontSize: 11,
            cursor: 'pointer', padding: '2px 7px', lineHeight: 1.6,
          }}
        >✗</button>
      </div>
    )
  }
  return (
    <button
      onClick={onDelete}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center',
        color: hov ? 'var(--loss)' : 'var(--faint)',
        transition: 'color 0.13s',
      }}
    >
      <Ico d={TRASH_ICON} s={14} />
    </button>
  )
}

/* ---- InstrumentPicker ---- */
function InstrumentPicker({ value, onChange }: {
  value: WatchSymbol | null
  onChange: (s: WatchSymbol) => void
}) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const ref                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allSymbols
      .filter(s => s.name.toLowerCase().includes(q) || s.sym.toLowerCase().includes(q))
      .slice(0, 10)
  }, [query])

  const displayVal = query || (value ? value.name : '')

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={displayVal}
        placeholder="Search instrument…"
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setOpen(true); if (value) setQuery('') }}
        style={fieldStyle}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', boxShadow: 'var(--sh-lg)',
          maxHeight: 220, overflowY: 'auto', zIndex: 200,
        }}>
          {results.map(s => (
            <button
              key={s.sym}
              type="button"
              onClick={() => { onChange(s); setQuery(''); setOpen(false) }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', padding: '9px 14px', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{s.name}</span>
              <span style={{ fontSize: 11.5, color: 'var(--faint)', flexShrink: 0 }}>{s.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- PLCell — flashes on price change ---- */
function PLCell({ pl, pct }: { pl: number; pct: number }) {
  const prevRef  = useRef(pl)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (Math.abs(pl - prevRef.current) > 0.001) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setFlash(pl > prevRef.current ? 'up' : 'down')
      timerRef.current = setTimeout(() => setFlash(null), 700)
      prevRef.current = pl
    }
  }, [pl])

  const up      = pl >= 0
  const flashBg = flash === 'up'   ? 'rgba(0,154,81,.14)'
                : flash === 'down' ? 'rgba(217,79,79,.14)'
                : 'transparent'

  return (
    <div style={{
      textAlign: 'right', borderRadius: 6, padding: '3px 8px',
      background: flashBg, transition: 'background .7s ease',
    }}>
      <div style={{
        fontWeight: 700, fontSize: 13.5, fontFamily: 'var(--serif)',
        color: pl === 0 ? 'var(--muted)' : up ? 'var(--gain)' : 'var(--loss)',
      }}>
        {pl === 0 ? '₹0' : `${up ? '+' : '−'}${inr(Math.abs(pl))}`}
      </div>
      {pl !== 0 && (
        <div style={{ fontSize: 11, color: up ? 'var(--gain)' : 'var(--loss)', marginTop: 1 }}>
          {up ? '+' : '−'}{Math.abs(pct).toFixed(2)}%
        </div>
      )}
    </div>
  )
}

/* ---- Modal shell ---- */
function ModalShell({ title, onClose, maxWidth = 460, children }: {
  title: string
  onClose: () => void
  maxWidth?: number
  children: React.ReactNode
}) {
  return (
    <div style={OVERLAY}>
      <div style={{ ...MODAL, maxWidth }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', padding: 4, display: 'flex' }}>
            <Ico d={CLOSE_ICON} s={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---- Open Position Modal ---- */
const OpenPositionModal = memo(function OpenPositionModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (pos: Omit<OpenPosition, 'id'>) => void
}) {
  const [instrument, setInstrument] = useState<WatchSymbol | null>(null)
  const [side, setSide]             = useState<'long' | 'short'>('long')
  const [qty, setQty]               = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [cat, setCat]               = useState('Equities')
  const [fetching, setFetching]     = useState(false)
  const [error, setError]           = useState('')

  const priceSym = instrument ? toPriceSym(instrument.sym) : null

  async function fillLive() {
    if (!priceSym) return
    setFetching(true)
    setError('')
    const p = await fetchLivePrice(priceSym)
    setFetching(false)
    if (p != null) {
      setEntryPrice(String(p))
    } else {
      setError('Could not fetch live price — enter manually')
    }
  }

  function submit() {
    setError('')
    try {
      if (!instrument) { setError('Please select an instrument'); return }
      if (!qty || Number(qty) <= 0) { setError('Please enter a valid quantity'); return }
      if (!entryPrice || Number(entryPrice) <= 0) { setError('Please enter a valid entry price'); return }
      onSave({
        sym: priceSym || instrument.sym.split(':').pop() || instrument.sym,
        instrument: instrument.name,
        tvSym: instrument.sym,
        side,
        qty: Number(qty),
        entryPrice: Number(entryPrice),
        openedAt: localDateISO(),
        category: cat,
      })
      onClose()
    } catch (err) {
      console.error('Failed to open position:', err)
      setError('Failed to open position — please try again')
    }
  }

  const sideBtn = (s: 'long' | 'short', label: string, col: string) => (
    <button
      type="button"
      onClick={() => setSide(s)}
      style={{
        flex: 1, padding: '8px 0', borderRadius: 'var(--r-sm)',
        border: `1.5px solid ${side === s ? col : 'var(--line)'}`,
        background: side === s ? col : 'transparent',
        color: side === s ? '#fff' : 'var(--ink)',
        fontWeight: 600, fontSize: 13.5, fontFamily: 'var(--sans)', cursor: 'pointer',
        transition: 'all .13s',
      }}
    >{label}</button>
  )

  return (
    <ModalShell title="Open Position" onClose={onClose}>
      <div style={{ padding: '4px 22px 18px' }}>
        <label style={labelStyle}>Instrument</label>
        <InstrumentPicker value={instrument} onChange={setInstrument} />

        <label style={labelStyle}>Side</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {sideBtn('long',  'Buy / Long',    'var(--green)')}
          {sideBtn('short', 'Sell / Short',  '#d94f4f')}
        </div>

        <label style={labelStyle}>Quantity</label>
        <input
          type="number" min="0" value={qty}
          onChange={e => { setQty(e.target.value); setError('') }}
          placeholder="0" style={fieldStyle}
        />

        <label style={labelStyle}>Entry Price</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number" min="0" value={entryPrice}
            onChange={e => { setEntryPrice(e.target.value); setError('') }}
            placeholder="0.00"
            style={{ ...fieldStyle, flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-mini"
            style={{ flexShrink: 0, whiteSpace: 'nowrap' as const }}
            onClick={fillLive}
            disabled={!priceSym || fetching}
          >
            {fetching ? '…' : 'Live price'}
          </button>
        </div>

        <label style={labelStyle}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
          {POS_CATS.map(c => (
            <Chip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />
          ))}
        </div>
      </div>
      {error && (
        <div style={{ margin: '0 22px 14px', padding: '8px 12px', background: 'rgba(217,79,79,.08)', border: '1px solid rgba(217,79,79,.25)', borderRadius: 6, color: '#d94f4f', fontSize: 13 }}>
          {error}
        </div>
      )}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-solid"
          onClick={submit}
          disabled={!instrument || !qty || !entryPrice}
        >Open Position</button>
      </div>
    </ModalShell>
  )
})

/* ---- Close Position Modal ---- */
function CloseModal({ pos, livePrice, onClose, onConfirm }: {
  pos: OpenPosition
  livePrice: number | null
  onClose: () => void
  onConfirm: (exitPrice: number, finalPL: number) => void
}) {
  const [exitPrice, setExitPrice] = useState(
    String(livePrice != null ? livePrice : pos.entryPrice)
  )

  const finalPL = useMemo(() => {
    const ep = Number(exitPrice) || 0
    return pos.side === 'long'
      ? (ep - pos.entryPrice) * pos.qty
      : (pos.entryPrice - ep) * pos.qty
  }, [exitPrice, pos.entryPrice, pos.qty, pos.side])

  const up = finalPL >= 0

  return (
    <ModalShell title="Close Position" onClose={onClose} maxWidth={380}>
      <div style={{ padding: '4px 22px 18px' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, marginBottom: 14, lineHeight: 1.6 }}>
          <b>{pos.instrument}</b><br />
          {pos.side === 'long' ? '▲ Long' : '▼ Short'} · {pos.qty} × {inr(pos.entryPrice)}
        </div>

        <label style={labelStyle}>Exit Price</label>
        <input
          type="number" value={exitPrice}
          onChange={e => setExitPrice(e.target.value)}
          style={fieldStyle} autoFocus
        />

        <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--bg)', borderRadius: 'var(--r)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)', marginBottom: 6 }}>
            Final P&amp;L
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--serif)', color: up ? 'var(--gain)' : '#d94f4f' }}>
            {up ? '+' : '−'}{inr(Math.abs(finalPL))}
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          onClick={() => onConfirm(Number(exitPrice), finalPL)}
          disabled={!exitPrice || Number(exitPrice) <= 0}
          style={{
            padding: '8px 20px', borderRadius: 'var(--r-sm)',
            border: '1.5px solid #d94f4f', background: '#d94f4f', color: '#fff',
            fontWeight: 700, fontSize: 13.5, fontFamily: 'var(--sans)',
            cursor: 'pointer', opacity: (!exitPrice || Number(exitPrice) <= 0) ? 0.5 : 1,
          }}
        >Confirm Close</button>
      </div>
    </ModalShell>
  )
}

/* ---- Record Trade Modal — same template as Open Position; pass `initial` to edit ---- */
const RecordTradeModal = memo(function RecordTradeModal({ initial, onClose, onSave }: {
  initial?: TradeRecord
  onClose: () => void
  onSave: (rec: TradeRecord) => void
}) {
  const [instrument, setInstrument] = useState<WatchSymbol | null>(() => initial
    ? (allSymbols.find(s => s.name === initial.instrument || toPriceSym(s.sym) === initial.sym)
       ?? { sym: initial.sym, name: initial.instrument || initial.sym, category: initial.category })
    : null)
  const [type, setType]             = useState<'BUY' | 'SELL'>(initial?.type ?? 'BUY')
  const [qty, setQty]               = useState(initial?.quantity ? String(initial.quantity) : '')
  const [price, setPrice]           = useState(initial?.price ? String(initial.price) : '')
  const [profit, setProfit]         = useState(initial?.profit ? String(initial.profit) : '')
  const [date, setDate]             = useState(() => initial?.date ?? localDateISO())
  const [cat, setCat]               = useState(initial?.category || 'Equities')
  const [status, setStatus]         = useState(initial?.status ?? '')
  const [error, setError]           = useState('')

  const profitNum = Number(profit) || 0

  const typeBtn = (t: 'BUY' | 'SELL', label: string, col: string) => (
    <button
      type="button"
      onClick={() => setType(t)}
      style={{
        flex: 1, padding: '8px 0', borderRadius: 'var(--r-sm)',
        border: `1.5px solid ${type === t ? col : 'var(--line)'}`,
        background: type === t ? col : 'transparent',
        color: type === t ? '#fff' : 'var(--ink)',
        fontWeight: 600, fontSize: 13.5, fontFamily: 'var(--sans)', cursor: 'pointer',
        transition: 'all .13s',
      }}
    >{label}</button>
  )

  function submit() {
    if (!instrument) { setError('Please select an instrument'); return }
    if (!date) { setError('Please pick a date'); return }
    onSave({
      sym: toPriceSym(instrument.sym),
      instrument: instrument.name,
      category: cat,
      type,
      quantity: Number(qty) || 0,
      price: Number(price) || 0,
      profit: profitNum,
      date, status,
    })
    onClose()
  }

  return (
    <ModalShell title={initial ? 'Edit Trade' : 'Record Trade'} onClose={onClose}>
      <div style={{ padding: '4px 22px 18px' }}>
        <label style={labelStyle}>Instrument</label>
        <InstrumentPicker value={instrument} onChange={v => { setInstrument(v); setError('') }} />

        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {typeBtn('BUY',  'Call / Buy',  'var(--green)')}
          {typeBtn('SELL', 'Put / Sell', '#d94f4f')}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Quantity</label>
            <input
              type="number" min="0" value={qty}
              onChange={e => setQty(e.target.value)}
              placeholder="0" style={fieldStyle}
            />
          </div>
          <div style={{ flex: 1.4 }}>
            <label style={labelStyle}>Price per unit (₹)</label>
            <input
              type="number" min="0" value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00" style={fieldStyle}
            />
          </div>
        </div>

        <label style={labelStyle}>Profit / Loss (₹)</label>
        <input
          type="number" value={profit}
          onChange={e => setProfit(e.target.value)}
          placeholder="Positive for profit, negative for loss"
          style={{
            ...fieldStyle,
            fontWeight: 600,
            color: profitNum > 0 ? 'var(--gain)' : profitNum < 0 ? 'var(--loss)' : 'var(--ink)',
          }}
        />

        <label style={labelStyle}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={fieldStyle} />

        <label style={labelStyle}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
          {POS_CATS.map(c => (
            <Chip key={c} label={c} active={cat === c} onClick={() => setCat(c)} />
          ))}
        </div>

        <label style={labelStyle}>Status / Notes</label>
        <input
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder="e.g. Booked profit, Stop loss hit…"
          style={fieldStyle}
        />
      </div>
      {error && (
        <div style={{ margin: '0 22px 14px', padding: '8px 12px', background: 'rgba(217,79,79,.08)', border: '1px solid rgba(217,79,79,.25)', borderRadius: 6, color: '#d94f4f', fontSize: 13 }}>
          {error}
        </div>
      )}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-solid"
          onClick={submit}
          disabled={!instrument || !date}
        >{initial ? 'Save Changes' : 'Record Trade'}</button>
      </div>
    </ModalShell>
  )
})

/* ---- Open Positions Panel ---- */
function OpenPositionsPanel({ positions, livePrices, onAdd, onPositionClose }: {
  positions: OpenPosition[]
  livePrices: Record<string, LivePrice>
  onAdd: () => void
  onPositionClose: (pos: OpenPosition, exitPrice: number, finalPL: number) => void
}) {
  const [closingPos, setClosingPos] = useState<OpenPosition | null>(null)

  const COL = '1fr 80px 60px 110px 110px 140px 72px'

  return (
    <>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3>Open Positions</h3>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--green)', display: 'inline-block',
              animation: 'livePulse 2s infinite',
            }} />
          </div>
          <button className="btn btn-solid btn-mini" style={{ gap: 5 }} onClick={onAdd}>
            <Ico d={PLUS_ICON} s={13} /> Open Position
          </button>
        </div>

        {positions.length === 0 ? (
          <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--faint)', fontSize: 13.5 }}>
            No open positions — open one to track live P&amp;L
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: COL, gap: 8,
              padding: '8px 16px',
              fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: '.06em', color: 'var(--faint)',
              borderBottom: '1px solid var(--line)',
            }}>
              <span>Instrument</span>
              <span>Side</span>
              <span>Qty</span>
              <span>Entry</span>
              <span>Live</span>
              <span style={{ textAlign: 'right' }}>Live P&amp;L</span>
              <span />
            </div>
            <div className="list">
              {positions.map(pos => {
                const lpData   = livePrices[pos.sym]
                const hasPrice = !!lpData && lpData.price > 0
                const liveP    = hasPrice ? lpData.price : 0
                const pl       = hasPrice
                  ? (pos.side === 'long'
                    ? (liveP - pos.entryPrice) * pos.qty
                    : (pos.entryPrice - liveP) * pos.qty)
                  : 0
                const invested = pos.entryPrice * pos.qty
                const plPct    = invested > 0 && hasPrice ? (pl / invested) * 100 : 0

                return (
                  <div key={pos.id} className="lrow" style={{
                    display: 'grid', gridTemplateColumns: COL, gap: 8, alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{pos.instrument}</div>
                      <div style={{ fontSize: 11, color: 'var(--faint)' }}>{pos.category} · {fmtDate(pos.openedAt)}</div>
                    </div>
                    <span>
                      <span className={`txtype ${pos.side === 'long' ? 'buy' : 'sell'}`}>
                        {pos.side === 'long' ? 'LONG' : 'SHORT'}
                      </span>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{pos.qty}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{inr(pos.entryPrice)}</span>
                    <span style={{ fontSize: 13, color: hasPrice ? 'var(--ink)' : 'var(--faint)' }}>
                      {hasPrice ? inr(liveP) : '—'}
                    </span>
                    {hasPrice ? (
                      <PLCell pl={pl} pct={plPct} />
                    ) : (
                      <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--faint)', fontStyle: 'italic' }}>
                        manual close only
                      </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setClosingPos(pos)}
                        style={{
                          padding: '4px 11px', borderRadius: 6,
                          border: '1.5px solid #d94f4f', background: 'transparent',
                          color: '#d94f4f', fontSize: 12, fontWeight: 600,
                          fontFamily: 'var(--sans)', cursor: 'pointer',
                        }}
                      >Close</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {closingPos && (
        <CloseModal
          pos={closingPos}
          livePrice={livePrices[closingPos.sym]?.price ?? null}
          onClose={() => setClosingPos(null)}
          onConfirm={(exitPrice, finalPL) => {
            onPositionClose(closingPos, exitPrice, finalPL)
            setClosingPos(null)
          }}
        />
      )}
    </>
  )
}

/* ---- date input style (used by filter bar) ---- */
const dateInputStyle: React.CSSProperties = {
  flex: 1, border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
  padding: '7px 10px', fontSize: 13, fontFamily: 'var(--sans)',
  color: 'var(--ink)', background: 'var(--bg)', outline: 'none',
  boxSizing: 'border-box',
}

/* ================================================================
   Page
   ================================================================ */
export default function PerformancePage() {
  const [records, setRecords]             = useState<TradeRecord[]>([])
  const [cat, setCat]                     = useState<string>('All')
  const [time, setTime]                   = useState<TimeKey>('Max')
  const [fromDate, setFromDate]           = useState('')
  const [toDate, setToDate]               = useState('')
  const [draftFrom, setDraftFrom]         = useState('')
  const [draftTo, setDraftTo]             = useState('')
  const [openDrop, setOpenDrop]           = useState<'cat' | 'time' | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  /* Open positions */
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([])
  const [showOpenModal, setShowOpenModal] = useState(false)

  /* View tab + record trade modal */
  const [view, setView]                       = useState<'positions' | 'log'>('positions')
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editTrade, setEditTrade]             = useState<{ record: TradeRecord; idx: number } | null>(null)

  const catRef         = useRef<HTMLDivElement>(null)
  const timeRef        = useRef<HTMLDivElement>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Load records from MongoDB on mount, seed localStorage, then subscribe to refresh events */
  useEffect(() => {
    const readLS = () => {
      try { setRecords(JSON.parse(localStorage.getItem('eq-records') || '[]')) } catch {}
    }
    getUserData('records').then(mongo => {
      if (Array.isArray(mongo) && mongo.length > 0) {
        localStorage.setItem('eq-records', JSON.stringify(mongo))
      }
      readLS()
    })

    const refresh = readLS
    window.addEventListener('eq-record-added', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('eq-record-added', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  /* Load open positions on mount */
  useEffect(() => {
    setOpenPositions(readOpenPositions())
  }, [])

  /* Live prices for open positions (5 s interval) */
  const posPriceSyms = useMemo(
    () => Array.from(new Set(openPositions.map(p => p.sym))),
    [openPositions]
  )
  /* Pause polling while a modal is open so it can't interfere with form state */
  const { prices: livePrices } = useLivePrices((showOpenModal || showRecordModal || editTrade) ? [] : posPriceSyms, 5000)

  /* Unrealised P&L */
  const unrealisedPL = useMemo(() => {
    return openPositions.reduce((sum, pos) => {
      const lp = livePrices[pos.sym]?.price
      if (!lp || lp <= 0) return sum
      return sum + (pos.side === 'long'
        ? (lp - pos.entryPrice) * pos.qty
        : (pos.entryPrice - lp) * pos.qty)
    }, 0)
  }, [openPositions, livePrices])

  /* Close dropdowns on outside click */
  useEffect(() => {
    if (!openDrop) return
    function handler(e: MouseEvent) {
      const target = e.target as Node
      if (openDrop === 'cat'  && catRef.current  && !catRef.current.contains(target))  setOpenDrop(null)
      if (openDrop === 'time' && timeRef.current && !timeRef.current.contains(target)) setOpenDrop(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openDrop])

  function toggleDrop(which: 'cat' | 'time') {
    if (openDrop === which) {
      setOpenDrop(null)
    } else {
      if (which === 'time') { setDraftFrom(fromDate); setDraftTo(toDate) }
      setOpenDrop(which)
    }
  }

  function applyCustom() {
    setFromDate(draftFrom)
    setToDate(draftTo)
    setTime('custom')
    setOpenDrop(null)
  }

  function selectQuickTime(t: QuickTime) {
    setTime(t)
    setFromDate('')
    setToDate('')
    setOpenDrop(null)
  }

  function requestDelete(displayIdx: number) {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setPendingDelete(displayIdx)
    deleteTimerRef.current = setTimeout(() => setPendingDelete(null), 3000)
  }

  function confirmDelete(originalIdx: number) {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    const all = [...records]
    all.splice(originalIdx, 1)
    localStorage.setItem('eq-records', JSON.stringify(all))
    saveUserData('records', all).catch(() => {})
    const startingCash = getStartingCapital()
    const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date))
    const { holdings, cash } = recalculateHoldings(sorted, startingCash)
    saveHoldings(holdings)
    saveCash(cash)
    saveUserData('holdings', holdings).catch(() => {})
    saveUserData('cash', cash).catch(() => {})
    window.dispatchEvent(new CustomEvent('eq-record-added'))
    window.dispatchEvent(new Event('storage'))
    setRecords(all)
    setPendingDelete(null)
  }

  /* Stable modal callbacks — useCallback so memo(OpenPositionModal) doesn't re-render on price ticks */
  const handleModalClose  = useCallback(() => setShowOpenModal(false), [])
  const handleRecordClose = useCallback(() => setShowRecordModal(false), [])

  const handleTradeRecorded = useCallback((record: TradeRecord) => {
    let allRec: TradeRecord[] = []
    try { allRec = JSON.parse(localStorage.getItem('eq-records') || '[]') } catch {}
    const updated = [record, ...allRec]
    localStorage.setItem('eq-records', JSON.stringify(updated))
    setRecords(updated)
    saveUserData('records', updated).catch(() => {})

    const startingCash = getStartingCapital()
    const sorted = [...updated].sort((a, b) => a.date.localeCompare(b.date))
    const { holdings, cash } = recalculateHoldings(sorted, startingCash)
    saveHoldings(holdings)
    saveCash(cash)
    saveUserData('holdings', holdings).catch(() => {})
    saveUserData('cash', cash).catch(() => {})

    window.dispatchEvent(new CustomEvent('eq-record-added'))
    window.dispatchEvent(new Event('storage'))
  }, [])

  function handleTradeEdited(idx: number, oldRec: TradeRecord, newRec: TradeRecord) {
    if (idx < 0 || idx >= records.length) return
    const updated = [...records]
    updated[idx] = newRec
    localStorage.setItem('eq-records', JSON.stringify(updated))
    setRecords(updated)
    saveUserData('records', updated).catch(() => {})

    const startingCash = getStartingCapital()
    const sorted = [...updated].sort((a, b) => a.date.localeCompare(b.date))
    const { holdings, cash } = recalculateHoldings(sorted, startingCash)
    saveHoldings(holdings)
    saveCash(cash)
    saveUserData('holdings', holdings).catch(() => {})
    saveUserData('cash', cash).catch(() => {})

    window.dispatchEvent(new CustomEvent('eq-record-added'))
    window.dispatchEvent(new Event('storage'))
  }

  const handlePositionOpened = useCallback((data: Omit<OpenPosition, 'id'>) => {
    const pos: OpenPosition = { ...data, id: Date.now().toString() }
    setOpenPositions(prev => {
      const next = [...prev, pos]
      writeOpenPositions(next)
      return next
    })
  }, [])

  function handlePositionClosed(pos: OpenPosition, exitPrice: number, finalPL: number) {
    const today = localDateISO()
    const record: TradeRecord = {
      type: pos.side === 'long' ? 'BUY' : 'SELL',
      sym: pos.sym,
      instrument: pos.instrument,
      category: pos.category,
      quantity: pos.qty,
      price: exitPrice,
      profit: finalPL,
      date: today,
      status: `Closed @ ${inr(exitPrice)}`,
    }
    let allRec: TradeRecord[] = []
    try { allRec = JSON.parse(localStorage.getItem('eq-records') || '[]') } catch {}
    const updated = [...allRec, record]
    localStorage.setItem('eq-records', JSON.stringify(updated))
    setRecords(updated)
    saveUserData('records', updated).catch(() => {})

    const startingCash = getStartingCapital()
    const sorted = [...updated].sort((a, b) => a.date.localeCompare(b.date))
    const { holdings, cash } = recalculateHoldings(sorted, startingCash)
    saveHoldings(holdings)
    saveCash(cash)
    saveUserData('holdings', holdings).catch(() => {})
    saveUserData('cash', cash).catch(() => {})

    const remaining = openPositions.filter(p => p.id !== pos.id)
    setOpenPositions(remaining)
    writeOpenPositions(remaining)

    window.dispatchEvent(new CustomEvent('eq-record-added'))
    window.dispatchEvent(new Event('storage'))
  }

  /* filteredWithIdx keeps original array index for delete */
  const filteredWithIdx = useMemo(() => {
    const cutoff = time !== 'custom' ? cutoffForQuick(time) : null
    return records.reduce<Array<{ r: TradeRecord; i: number }>>((acc, r, i) => {
      if (cat !== 'All' && (r.category || 'Equities') !== cat) return acc
      if (time === 'custom') {
        if (fromDate && r.date < fromDate) return acc
        if (toDate   && r.date > toDate)   return acc
      } else {
        if (cutoff && r.date < cutoff) return acc
      }
      acc.push({ r, i })
      return acc
    }, [])
  }, [records, cat, time, fromDate, toDate])

  const filtered    = filteredWithIdx.map(x => x.r)
  const netPL       = filtered.reduce((s, r) => s + (Number(r.profit) || 0), 0)
  const realisedPL  = filtered.filter(r => r.type === 'SELL' && r.profit > 0).reduce((s, r) => s + r.profit, 0)

  const stats = [
    { label: 'Net P/L',         val: plStr(netPL),           color: netPL > 0 ? 'var(--gain)' : netPL < 0 ? 'var(--loss)' : '' },
    { label: 'Realised P/L',    val: plStr(realisedPL),      color: realisedPL > 0 ? 'var(--gain)' : realisedPL < 0 ? 'var(--loss)' : '' },
    { label: 'Unrealised P/L',  val: plStr(unrealisedPL),    color: unrealisedPL > 0 ? 'var(--gain)' : unrealisedPL < 0 ? 'var(--loss)' : '',
      sub: openPositions.length > 0 ? `${openPositions.length} open position${openPositions.length === 1 ? '' : 's'}` : 'No open positions' },
    { label: 'Trades',          val: String(filtered.length), color: '', sub: `of ${records.length} total` },
  ]

  const catLabel  = cat === 'All' ? 'Category' : cat
  const timeLabel = time === 'custom' ? 'Custom' : time === 'Max' ? 'All time' : time

  function downloadReport() {
    const dateStr = localDateISO()
    const html    = buildHTML(filtered, netPL, realisedPL, cat, time, timeLabel, fromDate, toDate)
    const blob    = new Blob([html], { type: 'text/html' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href        = url
    a.download    = `Equicrore_Performance_${dateStr}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="content fade">
      <style>{`
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0   rgba(0,154,81,.5); }
          70%  { box-shadow: 0 0 0 7px rgba(0,154,81,0);  }
          100% { box-shadow: 0 0 0 0   rgba(0,154,81,0);  }
        }
      `}</style>

      <div className="page-head">
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Positions</b></div>
          <h1>Positions</h1>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {stats.map((s, i) => (
          <div key={i} className="scard">
            <div className="k">{s.label}</div>
            <div className="v num" style={s.color ? { color: s.color } : {}}>{s.val}</div>
            {s.sub && <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* View tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {([
          ['positions', 'Open Positions', openPositions.length],
          ['log', 'Trade Log', records.length],
        ] as const).map(([key, label, count]) => {
          const active = view === key
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 20px', borderRadius: 100,
                border: `1.5px solid ${active ? 'var(--green)' : 'var(--line)'}`,
                background: active ? 'var(--green)' : 'var(--paper)',
                color: active ? '#fff' : 'var(--muted)',
                fontWeight: 600, fontSize: 13.5, fontFamily: 'var(--sans)',
                cursor: 'pointer', transition: 'all .18s var(--ease)',
              }}
            >
              {label}
              <span style={{
                padding: '1px 8px', borderRadius: 100, fontSize: 11.5, fontWeight: 700,
                background: active ? 'rgba(255,255,255,.22)' : 'var(--bg)',
                color: active ? '#fff' : 'var(--faint)',
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Open Positions Panel */}
      {view === 'positions' && (
        <OpenPositionsPanel
          positions={openPositions}
          livePrices={livePrices}
          onAdd={() => setShowOpenModal(true)}
          onPositionClose={handlePositionClosed}
        />
      )}

      {view === 'log' && (
      <>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>

        <div ref={catRef} style={{ position: 'relative' }}>
          <DropBtn label={catLabel} open={openDrop === 'cat'} onClick={() => toggleDrop('cat')} />
          {openDrop === 'cat' && (
            <DropPanel>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 10 }}>
                Category
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATS.map(c => (
                  <Chip key={c} label={c} active={cat === c} onClick={() => { setCat(c); setOpenDrop(null) }} />
                ))}
              </div>
            </DropPanel>
          )}
        </div>

        <div ref={timeRef} style={{ position: 'relative' }}>
          <DropBtn label={timeLabel} open={openDrop === 'time'} onClick={() => toggleDrop('time')} />
          {openDrop === 'time' && (
            <DropPanel>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 10 }}>
                Quick range
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {QUICK_TIMES.map(t => (
                  <Chip key={t} label={t} active={time === t} onClick={() => selectQuickTime(t)} />
                ))}
              </div>
              <div style={{ borderTop: '1px solid var(--line)', margin: '0 -14px', marginBottom: 14 }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 10 }}>
                Custom range
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 4 }}>From</div>
                  <input type="date" value={draftFrom} onChange={e => setDraftFrom(e.target.value)} style={dateInputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 4 }}>To</div>
                  <input type="date" value={draftTo} onChange={e => setDraftTo(e.target.value)} style={dateInputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-mini" onClick={() => setOpenDrop(null)}>Cancel</button>
                <button className="btn btn-solid btn-mini" disabled={!draftFrom && !draftTo} onClick={applyCustom}>Apply</button>
              </div>
            </DropPanel>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button
          className="btn btn-ghost btn-mini"
          style={{ borderRadius: 100, gap: 6 }}
          onClick={downloadReport}
          disabled={filtered.length === 0}
        >
          <Ico d={DOWNLOAD_ICON} s={14} />
          Export
        </button>

        <button className="btn btn-ghost btn-mini" style={{ borderRadius: 100, gap: 6 }}>
          <Ico d={JOURNAL_ICON} s={14} />
          Journal
        </button>
      </div>

      {/* Trade log */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3>Trade log</h3>
            <span className="sub">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
              {(cat !== 'All' || time !== 'Max') && (
                <span style={{ marginLeft: 6, color: 'var(--faint)' }}>
                  {[cat !== 'All' ? cat : '', time !== 'Max' ? (time === 'custom' ? 'custom range' : time) : ''].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
          </div>
          <button className="btn btn-solid btn-mini" style={{ gap: 5 }} onClick={() => setShowRecordModal(true)}>
            <Ico d={PLUS_ICON} s={13} /> Record Trade
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 10, padding: '52px 24px', color: 'var(--faint)',
          }}>
            <Ico d={JOURNAL_ICON} s={44} />
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--muted)', marginTop: 4 }}>
              {records.length === 0 ? 'No trades recorded yet' : 'No trades found for this filter'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', maxWidth: 280 }}>
              {records.length === 0
                ? 'Record a trade to start building your log'
                : 'Try a different category or time range'}
            </div>
            {records.length === 0 && (
              <button className="btn btn-solid btn-mini" style={{ gap: 5, marginTop: 6 }} onClick={() => setShowRecordModal(true)}>
                <Ico d={PLUS_ICON} s={13} /> Record Trade
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: LOG_COL, gap: 12,
              padding: '0 0 8px',
              fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: '.06em', color: 'var(--faint)',
              borderBottom: '1px solid var(--line)',
            }}>
              <span>Date</span>
              <span>Instrument</span>
              <span>Category</span>
              <span>Type</span>
              <span style={{ textAlign: 'right' }}>P&amp;L</span>
              <span>Notes</span>
              <span />
            </div>
            <div className="list">
              {filteredWithIdx.map(({ r, i: origIdx }, dispIdx) => {
                const up   = r.profit > 0
                const zero = r.profit === 0
                return (
                  <div className="lrow" key={dispIdx} style={{ gridTemplateColumns: LOG_COL, minHeight: 50 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' as const }}>
                      {fmtDate(r.date)}
                    </span>
                    <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{r.instrument || r.sym}</b>
                      {r.instrument && r.instrument !== r.sym && (
                        <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{r.sym}</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {r.category || 'Equities'}
                    </span>
                    <span>
                      <span className={`txtype ${r.type === 'BUY' ? 'buy' : 'sell'}`}>
                        {r.type === 'BUY' ? 'CALL' : 'PUT'}
                      </span>
                    </span>
                    <div style={{
                      textAlign: 'right', whiteSpace: 'nowrap' as const,
                      fontWeight: 700, fontSize: '13.5px',
                      color: zero ? 'var(--muted)' : up ? 'var(--gain)' : 'var(--loss)',
                    }}>
                      {zero ? '₹0' : `${up ? '+' : '−'}${inr(Math.abs(r.profit))}`}
                    </div>
                    <div style={{
                      minWidth: 0, fontSize: 13,
                      color: 'var(--muted)', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
                      {r.status || <span style={{ color: 'var(--faint)' }}>—</span>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                      <EditBtn onClick={() => setEditTrade({ record: r, idx: origIdx })} />
                      <DelBtn
                        pending={pendingDelete === dispIdx}
                        onDelete={() => requestDelete(dispIdx)}
                        onConfirm={() => confirmDelete(origIdx)}
                        onCancel={() => {
                          if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
                          setPendingDelete(null)
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      </>
      )}

      {/* Open Position Modal */}
      {showOpenModal && (
        <OpenPositionModal
          onClose={handleModalClose}
          onSave={handlePositionOpened}
        />
      )}

      {/* Record Trade Modal */}
      {showRecordModal && (
        <RecordTradeModal
          onClose={handleRecordClose}
          onSave={handleTradeRecorded}
        />
      )}

      {/* Edit Trade Modal */}
      {editTrade && (
        <RecordTradeModal
          initial={editTrade.record}
          onClose={() => setEditTrade(null)}
          onSave={rec => {
            handleTradeEdited(editTrade.idx, editTrade.record, rec)
            setEditTrade(null)
          }}
        />
      )}
    </div>
  )
}
