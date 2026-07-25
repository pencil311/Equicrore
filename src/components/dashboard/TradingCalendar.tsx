'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { inr, localDateISO } from '@/lib/format'
import type { TradeRecord } from '@/lib/portfolio'
import { Ico } from './DashLayout'

/* ---- Icons ---- */
const CHEV_LEFT  = 'M15 18l-6-6 6-6'
const CHEV_RIGHT = 'M9 18l6-6-6-6'
const CLOSE_ICON = 'M18 6L6 18M6 6l12 12'
const CLOCK_ICON = 'M12 6v6l4 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z'
const ARROW_ICON = 'M5 12h14M13 6l6 6-6 6'

/* ---- Constants ---- */
const SEGMENTS = ['All', 'Equities', 'FNO', 'Commodities', 'Crypto', 'Forex'] as const
const PL_MODES = [
  { v: 'combined', l: 'Combined' },
  { v: 'profit',   l: 'Profit only' },
  { v: 'loss',     l: 'Loss only' },
] as const
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
/* Day detail grid — mirrors the trade log row layout, minus date & actions */
const DAY_COL = 'minmax(150px, 1.2fr) 64px 92px 120px minmax(110px, 1fr)'
/* Year heatmap cell geometry */
const CELL = 13
const GAP  = 3

type PLMode = typeof PL_MODES[number]['v']
type ViewMode = 'month' | 'all'

interface Filters {
  segment: string
  pl:      PLMode
  symbol:  string
  from:    string
  to:      string
}

const EMPTY_FILTERS: Filters = { segment: 'All', pl: 'combined', symbol: '', from: '', to: '' }

/* ---- Helpers ---- */
function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Parse YYYY-MM-DD as a local date (never UTC — avoids off-by-one days) */
function parseISO(s: string): Date {
  return new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)))
}

function plStr(val: number): string {
  if (val === 0) return '₹0'
  return `${val > 0 ? '+' : '−'}${inr(Math.abs(val))}`
}

function plColor(val: number): string {
  return val > 0 ? 'var(--gain)' : val < 0 ? 'var(--loss)' : 'var(--muted)'
}

/** Alpha steps: small / medium / large, scaled against the biggest |P&L| in view */
function alphaFor(ratio: number): number {
  return ratio > 0.66 ? 0.6 : ratio > 0.33 ? 0.35 : 0.15
}

function cellBg(pl: number, ratio: number, has: boolean): string {
  if (!has) return 'transparent'
  if (pl === 0) return 'var(--bg-2)'
  const a = alphaFor(ratio)
  return pl > 0 ? `rgba(0,154,81,${a})` : `rgba(192,73,47,${a})`
}

/* ---- Filter field shell — outlined box with a floating label ---- */
function Field({ label, width, children }: { label: string; width?: number; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', width }}>
      <span style={{
        position: 'absolute', top: -6, left: 10, padding: '0 5px', zIndex: 1,
        background: 'var(--paper)', fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)',
        pointerEvents: 'none',
      }}>{label}</span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, height: 40,
        border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
        padding: '0 11px', background: 'var(--paper)',
      }}>
        {children}
      </div>
    </div>
  )
}

const bareInput: React.CSSProperties = {
  border: 'none', outline: 'none', background: 'transparent',
  fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink)',
  width: '100%', minWidth: 0, padding: 0,
}

function NavBtn({ d, onClick, disabled }: { d: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: '50%',
        border: '1.5px solid var(--line)', background: 'transparent',
        color: disabled ? 'var(--faint)' : 'var(--muted)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all .13s var(--ease)',
      }}
    >
      <Ico d={d} s={14} />
    </button>
  )
}

/* ---- Day detail — the records booked on one date ---- */
function DayDetail({ iso, recs }: { iso: string; recs: TradeRecord[] }) {
  const net = recs.reduce((s, r) => s + (Number(r.profit) || 0), 0)
  const label = parseISO(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div style={{
      marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)',
      animation: 'eqFadeUp .18s var(--ease)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, color: plColor(net) }}>
          {plStr(net)}
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: DAY_COL, gap: 12, padding: '0 0 8px',
        fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase' as const,
        letterSpacing: '.06em', color: 'var(--faint)', borderBottom: '1px solid var(--line)',
      }}>
        <span>Instrument</span>
        <span>Type</span>
        <span>Category</span>
        <span style={{ textAlign: 'right' }}>P&amp;L</span>
        <span>Notes</span>
      </div>
      <div className="list">
        {recs.map((r, i) => {
          const up   = r.profit > 0
          const zero = r.profit === 0
          return (
            <div className="lrow" key={i} style={{ gridTemplateColumns: DAY_COL, minHeight: 44 }}>
              <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{r.instrument || r.sym}</b>
                {r.instrument && r.instrument !== r.sym && (
                  <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{r.sym}</span>
                )}
              </div>
              <span>
                <span className={`txtype ${r.type === 'BUY' ? 'buy' : 'sell'}`}>{r.type}</span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.category || 'Equities'}</span>
              <div style={{
                textAlign: 'right', whiteSpace: 'nowrap' as const,
                fontWeight: 700, fontSize: '13.5px',
                color: zero ? 'var(--muted)' : up ? 'var(--gain)' : 'var(--loss)',
              }}>
                {zero ? '₹0' : `${up ? '+' : '−'}${inr(Math.abs(r.profit))}`}
              </div>
              <div style={{
                minWidth: 0, fontSize: 13, color: 'var(--muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              }}>
                {r.status || <span style={{ color: 'var(--faint)' }}>—</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================
   Trading Calendar — month heatmap + all-time contribution grid
   ================================================================ */
export function TradingCalendar({ records }: { records: TradeRecord[] }) {
  const today = localDateISO()
  const [ty, tm] = today.split('-').map(Number)

  const [view, setView]       = useState<ViewMode>('month')
  const [cursor, setCursor]     = useState<{ y: number; m: number }>({ y: ty, m: tm - 1 })
  const [selDay, setSelDay]     = useState<string | null>(null)
  const [draft, setDraft]       = useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied]   = useState<Filters>(EMPTY_FILTERS)
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  /* Years offered in the month/year picker — from the earliest record up to now */
  const years = useMemo(() => {
    let min = ty
    for (const r of records) {
      if (!r.date) continue
      const y = Number(r.date.slice(0, 4))
      if (y && y < min) min = y
    }
    const out: number[] = []
    for (let y = min; y <= ty; y++) out.push(y)
    return out
  }, [records, ty])

  /* Jump to a month/year, never past the current month */
  function goTo(y: number, m: number) {
    if (y > ty || (y === ty && m > tm - 1)) { y = ty; m = tm - 1 }
    setSelDay(null)
    setCursor({ y, m })
  }

  /* Close the picker on outside click */
  useEffect(() => {
    if (!showPicker) return
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showPicker])

  /* Close the picker when switching away from month view */
  useEffect(() => { if (view !== 'month') setShowPicker(false) }, [view])

  /* Records surviving every applied filter */
  const filtered = useMemo(() => {
    const q = applied.symbol.trim().toLowerCase()
    return records.filter(r => {
      if (applied.segment !== 'All' && (r.category || 'Equities') !== applied.segment) return false
      if (applied.pl === 'profit' && !(r.profit > 0)) return false
      if (applied.pl === 'loss'   && !(r.profit < 0)) return false
      if (applied.from && r.date < applied.from) return false
      if (applied.to   && r.date > applied.to)   return false
      if (q && !(
        (r.sym || '').toLowerCase().includes(q) ||
        (r.instrument || '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [records, applied])

  /* Records grouped by their YYYY-MM-DD date field */
  const byDay = useMemo(() => {
    const map = new Map<string, TradeRecord[]>()
    for (const r of filtered) {
      if (!r.date) continue
      const list = map.get(r.date)
      if (list) list.push(r)
      else map.set(r.date, [r])
    }
    return map
  }, [filtered])

  /* --- Month view --- */
  const month = useMemo(() => {
    const { y, m } = cursor
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const lead = (new Date(y, m, 1).getDay() + 6) % 7   // Monday-first
    const days: Array<{ d: number; iso: string; pl: number; count: number }> = []
    let net = 0, traded = 0, profit = 0, loss = 0, maxAbs = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const iso  = isoOf(y, m, d)
      const recs = byDay.get(iso)
      const pl   = recs ? recs.reduce((s, r) => s + (Number(r.profit) || 0), 0) : 0
      if (recs && recs.length) {
        traded++
        net += pl
        if (pl > 0) profit++
        else if (pl < 0) loss++
        maxAbs = Math.max(maxAbs, Math.abs(pl))
      }
      days.push({ d, iso, pl, count: recs ? recs.length : 0 })
    }
    return { days, lead, net, traded, profit, loss, maxAbs }
  }, [byDay, cursor])

  /* --- All view: one self-contained mini-grid per month, blocks separated by a gap --- */
  type YearCell = { iso: string; pl: number; count: number; has: boolean } | null
  const year = useMemo(() => {
    const end   = applied.to   ? parseISO(applied.to)   : new Date()
    const start = applied.from ? parseISO(applied.from) : new Date(end.getFullYear(), end.getMonth() - 11, 1)
    const startISO = localDateISO(start)
    const endISO   = localDateISO(end)

    const months: Array<{ key: string; y: number; m: number; label: string; cells: YearCell[] }> = []
    let net = 0, traded = 0, profit = 0, loss = 0, maxAbs = 0, trades = 0
    let best: { iso: string; pl: number } | null = null
    let worst: { iso: string; pl: number } | null = null

    const iter = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)
    while (iter <= last && months.length < 60) {
      const y = iter.getFullYear(), m = iter.getMonth()
      const daysInMonth = new Date(y, m + 1, 0).getDate()
      const lead  = (new Date(y, m, 1).getDay() + 6) % 7   // Monday-first
      const cells: YearCell[] = Array.from({ length: lead }, () => null)

      for (let d = 1; d <= daysInMonth; d++) {
        const iso     = isoOf(y, m, d)
        const inRange = iso >= startISO && iso <= endISO
        const recs    = inRange ? byDay.get(iso) : undefined
        const pl      = recs ? recs.reduce((s, r) => s + (Number(r.profit) || 0), 0) : 0
        const has     = !!(inRange && recs && recs.length)
        if (has) {
          traded++
          trades += recs!.length
          net += pl
          if (pl > 0) profit++
          else if (pl < 0) loss++
          maxAbs = Math.max(maxAbs, Math.abs(pl))
          if (!best  || pl > best.pl)  best  = { iso, pl }
          if (!worst || pl < worst.pl) worst = { iso, pl }
        }
        cells.push(inRange ? { iso, pl, count: recs ? recs.length : 0, has } : null)
      }

      months.push({
        key: `${y}-${m}`,
        y, m,
        label: new Date(y, m, 1).toLocaleDateString('en-IN', { month: 'short' }),
        cells,
      })
      iter.setMonth(iter.getMonth() + 1)
    }

    return { months, net, traded, profit, loss, maxAbs, trades, best, worst, startISO, endISO }
  }, [byDay, applied.from, applied.to])

  /* Drop the expanded day if its records disappear (edit / delete elsewhere) */
  useEffect(() => {
    if (selDay && !byDay.has(selDay)) setSelDay(null)
  }, [byDay, selDay])

  function step(delta: number) {
    setSelDay(null)
    setCursor(c => {
      const d = new Date(c.y, c.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function pickDay(iso: string) {
    setSelDay(cur => (cur === iso ? null : iso))
    const d = parseISO(iso)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  const atCurrentMonth = cursor.y === ty && cursor.m === tm - 1
  const monthLabel = new Date(cursor.y, cursor.m, 1)
    .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const active  = view === 'month' ? month : year
  const winRate = active.traded > 0 ? Math.round((active.profit / active.traded) * 100) : 0
  const selRecs = selDay ? byDay.get(selDay) ?? [] : []
  const dirty   = JSON.stringify(draft) !== JSON.stringify(EMPTY_FILTERS)
    || JSON.stringify(applied) !== JSON.stringify(EMPTY_FILTERS)

  function clearFilters() {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
  }

  return (
    <div>
      {/* Filters + view toggle */}
      <div style={{
        display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 14,
        paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid var(--line)',
      }}>
        <Field label="Segment" width={150}>
          <select
            value={draft.segment}
            onChange={e => setDraft(d => ({ ...d, segment: e.target.value }))}
            style={{ ...bareInput, cursor: 'pointer' }}
          >
            {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="P&L" width={150}>
          <select
            value={draft.pl}
            onChange={e => setDraft(d => ({ ...d, pl: e.target.value as PLMode }))}
            style={{ ...bareInput, cursor: 'pointer' }}
          >
            {PL_MODES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
        </Field>

        <Field label="Symbol" width={160}>
          <input
            value={draft.symbol}
            placeholder="eg: INFY"
            onChange={e => setDraft(d => ({ ...d, symbol: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') setApplied(draft) }}
            style={bareInput}
          />
        </Field>

        <Field label="Date range" width={252}>
          <input
            type="date"
            value={draft.from}
            onChange={e => setDraft(d => ({ ...d, from: e.target.value }))}
            style={bareInput}
          />
          <span style={{ color: 'var(--faint)', fontSize: 13 }}>~</span>
          <input
            type="date"
            value={draft.to}
            onChange={e => setDraft(d => ({ ...d, to: e.target.value }))}
            style={bareInput}
          />
        </Field>

        <button
          onClick={() => setApplied(draft)}
          title="Apply filters"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, borderRadius: 'var(--r-sm)',
            border: 'none', background: 'var(--green)', color: '#fff', cursor: 'pointer',
          }}
        >
          <Ico d={ARROW_ICON} s={17} />
        </button>

        {dirty && (
          <button
            onClick={clearFilters}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600, color: 'var(--faint)',
            }}
          >Clear</button>
        )}

        <div style={{ flex: 1 }} />

        {/* Month / All toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 999, padding: 3 }}>
          {(['month', 'all'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 16px', borderRadius: 999, border: 'none',
                background: view === v ? 'var(--forest)' : 'transparent',
                color: view === v ? '#eafff2' : 'var(--muted)',
                fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', transition: 'all .18s var(--ease)',
              }}
            >{v === 'month' ? 'Month' : 'All'}</button>
          ))}
        </div>
      </div>

      {/* ---------- Month view ---------- */}
      {view === 'month' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            <NavBtn d={CHEV_LEFT} onClick={() => step(-1)} />
            <div ref={pickerRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPicker(v => !v)}
                title="Choose month & year"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                  fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 500,
                  color: 'var(--ink)', minWidth: 136, justifyContent: 'center',
                }}
              >
                {monthLabel}
                <span style={{
                  color: 'var(--faint)', transform: showPicker ? 'rotate(180deg)' : 'none',
                  transition: 'transform .15s', display: 'flex',
                }}>
                  <Ico d="M6 9l6 6 6-6" s={14} />
                </span>
              </button>

              {showPicker && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                  zIndex: 60, display: 'flex', gap: 8,
                  background: 'var(--paper)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r)', boxShadow: 'var(--sh-lg)', padding: 8,
                }}>
                  {/* Months — scrolls independently */}
                  <div className="eq-picker-col" style={{ width: 118, maxHeight: 208, overflowY: 'auto' }}>
                    {MONTH_NAMES.map((name, i) => {
                      const isFuture = cursor.y === ty && i > tm - 1
                      const on = i === cursor.m
                      return (
                        <button
                          key={name}
                          ref={on ? (el => el?.scrollIntoView({ block: 'nearest' })) : undefined}
                          onClick={() => { if (!isFuture) goTo(cursor.y, i) }}
                          disabled={isFuture}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '7px 12px', borderRadius: 'var(--r-sm)', border: 'none', marginBottom: 2,
                            background: on ? 'var(--forest)' : 'transparent',
                            color: isFuture ? 'var(--faint)' : on ? '#eafff2' : 'var(--ink)',
                            fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: on ? 700 : 500,
                            cursor: isFuture ? 'default' : 'pointer', opacity: isFuture ? 0.4 : 1,
                          }}
                        >{name}</button>
                      )
                    })}
                  </div>
                  {/* Years — scrolls independently */}
                  <div className="eq-picker-col" style={{ width: 78, maxHeight: 208, overflowY: 'auto' }}>
                    {years.map(y => {
                      const on = y === cursor.y
                      return (
                        <button
                          key={y}
                          ref={on ? (el => el?.scrollIntoView({ block: 'nearest' })) : undefined}
                          onClick={() => goTo(y, cursor.m)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'center',
                            padding: '7px 10px', borderRadius: 'var(--r-sm)', border: 'none', marginBottom: 2,
                            background: on ? 'var(--forest)' : 'transparent',
                            color: on ? '#eafff2' : 'var(--ink)',
                            fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: on ? 700 : 500,
                            fontVariantNumeric: 'tabular-nums', cursor: 'pointer',
                          }}
                        >{y}</button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <NavBtn d={CHEV_RIGHT} onClick={() => step(1)} disabled={atCurrentMonth} />
          </div>

          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
              letterSpacing: '.06em', color: 'var(--faint)', textAlign: 'center' as const,
              marginBottom: 6,
            }}>
              {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
              {Array.from({ length: month.lead }, (_, i) => <div key={`lead-${i}`} />)}
              {month.days.map(({ d, iso, pl, count }) => {
                const has     = count > 0
                const ratio   = month.maxAbs > 0 ? Math.abs(pl) / month.maxAbs : 0
                const isToday = iso === today
                const isSel   = iso === selDay
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`eq-calday${has ? ' has' : ''}`}
                    disabled={!has}
                    title={has ? `${count} trade${count === 1 ? '' : 's'} · ${plStr(pl)}` : undefined}
                    onClick={() => has && pickDay(iso)}
                    style={{
                      height: 40, borderRadius: 10, border: 'none', padding: 0,
                      background: cellBg(pl, ratio, has),
                      color: has ? 'var(--ink)' : 'var(--faint)',
                      fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      cursor: has ? 'pointer' : 'default',
                      outline: isSel
                        ? '2px solid var(--green)'
                        : isToday ? '1.5px solid rgba(0,154,81,.45)' : 'none',
                      outlineOffset: isSel ? 1 : -1.5,
                    }}
                  >{d}</button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ---------- All view — contribution-style grid ---------- */}
      {view === 'all' && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
            fontSize: 12, color: 'var(--faint)', marginBottom: 10,
          }}>
            <Ico d={CLOCK_ICON} s={13} />
            {year.startISO} to {year.endISO}
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, minWidth: 'min-content' }}>
              {year.months.map(mo => (
                <div key={mo.key}>
                  <div style={{
                    display: 'grid', gap: GAP,
                    gridTemplateRows: `repeat(7, ${CELL}px)`,
                    gridAutoFlow: 'column',
                  }}>
                    {mo.cells.map((c, i) => {
                      if (!c) return <div key={i} style={{ width: CELL, height: CELL }} />
                      const { iso, pl, count, has } = c
                      const ratio = year.maxAbs > 0 ? Math.abs(pl) / year.maxAbs : 0
                      const isSel = iso === selDay
                      return (
                        <button
                          key={iso}
                          type="button"
                          className={`eq-yearday${has ? ' has' : ''}`}
                          disabled={!has}
                          title={has ? `${iso} · ${count} trade${count === 1 ? '' : 's'} · ${plStr(pl)}` : iso}
                          onClick={() => has && pickDay(iso)}
                          style={{
                            width: CELL, height: CELL, padding: 0, borderRadius: 3, border: 'none',
                            background: has ? cellBg(pl, ratio, true) : 'var(--bg-2)',
                            cursor: has ? 'pointer' : 'default',
                            outline: isSel ? '2px solid var(--green)' : 'none',
                            outlineOffset: 1,
                          }}
                        />
                      )
                    })}
                  </div>
                  <div style={{
                    marginTop: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const,
                    letterSpacing: '.06em', color: 'var(--faint)', whiteSpace: 'nowrap' as const,
                  }}>
                    {mo.label}{mo.m === 0 ? ` ’${String(mo.y).slice(2)}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 6, marginTop: 14, fontSize: 11.5, color: 'var(--faint)',
          }}>
            <span>Loss</span>
            {[0.6, 0.35, 0.15].map(a => (
              <span key={a} style={{ width: CELL, height: CELL, borderRadius: 3, background: `rgba(192,73,47,${a})` }} />
            ))}
            <span style={{ width: CELL, height: CELL, borderRadius: 3, background: 'var(--bg-2)' }} />
            {[0.15, 0.35, 0.6].map(a => (
              <span key={a} style={{ width: CELL, height: CELL, borderRadius: 3, background: `rgba(0,154,81,${a})` }} />
            ))}
            <span>Profit</span>
          </div>
        </>
      )}

      {/* ---------- Summary ---------- */}
      {view === 'month' ? (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)', textAlign: 'center' as const }}>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 500, letterSpacing: '-.02em',
            color: plColor(month.net),
          }}>
            {plStr(month.net)}
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center',
            gap: 4, marginTop: 8, fontSize: 12, color: 'var(--muted)',
          }}>
            <span>Traded On: <b style={{ color: 'var(--ink)' }}>{month.traded} day{month.traded === 1 ? '' : 's'}</b></span>
            <span style={{ color: 'var(--faint)' }}>·</span>
            <span>In-Profit Days: <b style={{ color: 'var(--gain)' }}>{month.profit}</b></span>
            <span style={{ color: 'var(--faint)' }}>·</span>
            <span>Loss Days: <b style={{ color: 'var(--loss)' }}>{month.loss}</b></span>
            <span style={{ color: 'var(--faint)' }}>·</span>
            <span>Win rate: <b style={{ color: 'var(--ink)' }}>{winRate}%</b></span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 6 }}>
            {month.traded === 0
              ? 'No trades recorded this month'
              : `Profitable on ${month.profit} of ${month.traded} traded day${month.traded === 1 ? '' : 's'}`}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 18,
          marginTop: 20, padding: '20px 24px',
          background: 'var(--bg)', borderRadius: 'var(--r)',
        }}>
          {[
            { k: 'Net P&L',    v: plStr(year.net),                        c: plColor(year.net) },
            { k: 'Trades',     v: String(year.trades),                    c: 'var(--ink)', s: `${year.traded} traded day${year.traded === 1 ? '' : 's'}` },
            { k: 'Win rate',   v: `${winRate}%`,                          c: 'var(--ink)', s: `${year.profit} up · ${year.loss} down` },
            { k: 'Best day',   v: year.best  ? plStr(year.best.pl)  : '—', c: 'var(--gain)', s: year.best?.iso },
            { k: 'Worst day',  v: year.worst ? plStr(year.worst.pl) : '—', c: 'var(--loss)', s: year.worst?.iso },
          ].map(st => (
            <div key={st.k}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '.06em', color: 'var(--faint)', marginBottom: 6,
              }}>{st.k}</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: st.c }}>{st.v}</div>
              {st.s && <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 3 }}>{st.s}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ---------- Day detail ---------- */}
      {selDay && selRecs.length > 0 && <DayDetail iso={selDay} recs={selRecs} />}
    </div>
  )
}

/* ================================================================
   Modal wrapper — opened from the top bar
   ================================================================ */
export function TradingCalendarModal({ open, onClose, records }: {
  open: boolean
  onClose: () => void
  records: TradeRecord[]
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ov show" style={{ zIndex: 150, padding: 24 }} onClick={onClose}>
      <div
        className="modal"
        style={{ width: 'min(1120px, 96vw)', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '20px 24px 16px', borderBottom: '1px solid var(--line)',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Trading Calendar</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Daily P&amp;L across your trade log</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', padding: 4, display: 'flex' }}
          >
            <Ico d={CLOSE_ICON} s={18} />
          </button>
        </div>
        <div style={{ padding: '22px 24px 26px' }}>
          <TradingCalendar records={records} />
        </div>
      </div>
    </div>
  )
}
