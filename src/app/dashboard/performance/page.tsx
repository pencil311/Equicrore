'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { inr } from '@/lib/format'
import { Ico } from '@/components/dashboard/DashLayout'
import type { TradeRecord } from '@/lib/portfolio'
import { recalculateHoldings, saveHoldings, saveCash, getStartingCapital } from '@/lib/portfolio'
import { getUserData, saveUserData } from '@/lib/userStorage'

const JOURNAL_ICON  = 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z'
const CHEVRON       = 'M6 9l6 6 6-6'
const DOWNLOAD_ICON = 'M12 15V3M12 15l-4-4M12 15l4-4M3 19h18'
const TRASH_ICON    = 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'

const CATS        = ['All', 'Equities', 'FNO', 'Commodities', 'Crypto', 'Forex'] as const
const QUICK_TIMES = ['1W', '1M', '3M', '6M', 'Max'] as const
type QuickTime = typeof QUICK_TIMES[number]
type TimeKey   = QuickTime | 'custom'

function fmtDate(iso: string) {
  if (!iso) return '—'
  const today = new Date().toISOString().split('T')[0]
  const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (iso === today) return 'Today'
  if (iso === yest)  return 'Yesterday'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function cutoffForQuick(key: QuickTime): string | null {
  if (key === 'Max') return null
  const days: Record<QuickTime, number> = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, 'Max': 0 }
  const d = new Date()
  d.setDate(d.getDate() - days[key])
  return d.toISOString().split('T')[0]
}

function plStr(val: number) {
  if (val === 0) return '₹0'
  return `${val > 0 ? '+' : '−'}${inr(Math.abs(val))}`
}

/* ---- HTML report helpers ---- */
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

/* ---- Sub-components ---- */

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

const dateInputStyle: React.CSSProperties = {
  flex: 1, border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
  padding: '7px 10px', fontSize: 13, fontFamily: 'var(--sans)',
  color: 'var(--ink)', background: 'var(--bg)', outline: 'none',
  boxSizing: 'border-box',
}

/* ---- Page ---- */
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
    /* Rebuild holdings + cash from remaining records */
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

  /* filteredWithIdx keeps original array index so delete targets the right record */
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

  const filtered = filteredWithIdx.map(x => x.r)

  /* Summary stats from filtered set */
  const netPL      = filtered.reduce((s, r) => s + (Number(r.profit) || 0), 0)
  const realisedPL = filtered.filter(r => r.type === 'SELL' && r.profit > 0).reduce((s, r) => s + r.profit, 0)

  const stats = [
    { label: 'Net P/L',        val: plStr(netPL),            color: netPL > 0 ? 'var(--gain)' : netPL < 0 ? 'var(--loss)' : '' },
    { label: 'Realised P/L',   val: plStr(realisedPL),       color: realisedPL > 0 ? 'var(--gain)' : realisedPL < 0 ? 'var(--loss)' : '' },
    { label: 'Unrealised P/L', val: '₹0',                    color: '', sub: 'Live tracking soon' },
    { label: 'Trades',         val: String(filtered.length), color: '', sub: `of ${records.length} total` },
  ]

  const catLabel  = cat === 'All' ? 'Category' : cat
  const timeLabel = time === 'custom' ? 'Custom' : time === 'Max' ? 'All time' : time

  function downloadReport() {
    const dateStr = new Date().toISOString().split('T')[0]
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
      <div className="page-head">
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Positions</b></div>
          <h1>Positions</h1>
          <div className="sub" style={{ marginTop: 2 }}></div>
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
                ? 'Click Record on any asset to log your first trade'
                : 'Try a different category or time range'}
            </div>
          </div>
        ) : (
          <div className="list">
            {filteredWithIdx.map(({ r, i: origIdx }, dispIdx) => {
              const up   = r.profit > 0
              const zero = r.profit === 0
              return (
                <div className="lrow" key={dispIdx} style={{ alignItems: 'center', minHeight: 50 }}>
                  <span style={{ flex: '0 0 108px', fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                    {fmtDate(r.date)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{r.instrument || r.sym}</b>
                    {r.instrument && r.instrument !== r.sym && (
                      <div className="muted" style={{ fontSize: 12 }}>{r.sym}</div>
                    )}
                  </div>
                  <span style={{ flex: '0 0 90px', flexShrink: 0, fontSize: 12.5, color: 'var(--muted)' }}>
                    {r.category || 'Equities'}
                  </span>
                  <span style={{ flex: '0 0 72px', flexShrink: 0 }}>
                    <span className={`txtype ${r.type === 'BUY' ? 'buy' : 'sell'}`}>
                      {r.type === 'BUY' ? 'CALL' : 'PUT'}
                    </span>
                  </span>
                  <div style={{
                    flex: '0 0 128px', textAlign: 'right', flexShrink: 0,
                    fontWeight: 700, fontSize: '13.5px',
                    color: zero ? 'var(--muted)' : up ? 'var(--gain)' : 'var(--loss)',
                  }}>
                    {zero ? '₹0' : `${up ? '+' : '−'}${inr(Math.abs(r.profit))}`}
                  </div>
                  <div style={{
                    flex: 1, paddingLeft: 16, fontSize: 13,
                    color: 'var(--muted)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                  }}>
                    {r.status || <span style={{ color: 'var(--faint)' }}>—</span>}
                  </div>
                  <div style={{ flexShrink: 0, paddingLeft: 8 }}>
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
        )}
      </div>
    </div>
  )
}
