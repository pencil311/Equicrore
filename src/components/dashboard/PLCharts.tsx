'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { inr } from '@/lib/format'
import { Ico } from './DashLayout'
import { allSymbols, watchCategories, type WatchSymbol } from '@/lib/watchlists'
import { SYM_GROUP, toTicker, toYahooSymbol } from '@/lib/symbolMap'
import { type Theme } from '@/hooks/useTheme'
import CandleChart from '@/components/ui/CandleChart'

export const CHART_ICON = 'M3 3v18h18M7 14l3.5-4.5 3.2 2.6L21 6'
const CLOSE_ICON = 'M18 6L6 18M6 6l12 12'
/* Fullscreen top bar height — the chart area is sized against this */
const TOPBAR_H = 96

export const fieldStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--line)',
  borderRadius: 'var(--r-sm)', padding: '8px 12px',
  fontSize: 14, fontFamily: 'var(--sans)',
  color: 'var(--ink)', background: 'var(--bg)',
  outline: 'none', boxSizing: 'border-box',
}

function plStr(val: number) {
  if (val === 0) return '₹0'
  return `${val > 0 ? '+' : '−'}${inr(Math.abs(val))}`
}

/* ---- Searchable instrument picker (also used by the Positions modals) ---- */
export function InstrumentPicker({ value, onChange }: {
  value: WatchSymbol | null
  onChange: (s: WatchSymbol) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)

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

/* ---- Quick-access chip for an instrument the user has traded ---- */
function SymbolChip({ s, onClick }: { s: WatchSymbol; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  const color = SYM_GROUP[s.sym]?.color ?? 'var(--green)'
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={`Open ${s.name} chart`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%',
        padding: '8px 13px', borderRadius: 100, textAlign: 'left',
        border: `1.5px solid ${hov ? color : 'var(--line)'}`,
        background: hov ? 'var(--bg)' : 'var(--paper)',
        fontFamily: 'var(--sans)', cursor: 'pointer',
        transition: 'all .13s var(--ease)',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {toTicker(s.sym)}
      </span>
      <span style={{
        fontSize: 11.5, color: 'var(--faint)', minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{s.name}</span>
    </button>
  )
}

/* ---- Category tab ---- */
function Tab({ label, count, active, color, onClick }: {
  label: string; count: number; active: boolean; color?: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
        padding: '7px 15px', borderRadius: 100,
        border: `1.5px solid ${active ? (color ?? 'var(--forest)') : 'var(--line)'}`,
        background: active ? (color ?? 'var(--forest)') : 'transparent',
        color: active ? '#fff' : 'var(--ink)',
        fontSize: 12.5, fontWeight: active ? 700 : 500, fontFamily: 'var(--sans)',
        cursor: 'pointer', transition: 'all .13s var(--ease)', whiteSpace: 'nowrap',
      }}
    >
      {label}
      <span style={{
        padding: '1px 7px', borderRadius: 100, fontSize: 11, fontWeight: 700,
        background: active ? 'rgba(255,255,255,.22)' : 'var(--bg)',
        color: active ? '#fff' : 'var(--faint)',
      }}>{count}</span>
    </button>
  )
}

/* ---- P&L Charts panel — browse every instrument and open its live chart ---- */
export function PLChartsPanel({ traded, onOpen }: {
  traded: WatchSymbol[]
  onOpen: (s: WatchSymbol) => void
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab]     = useState<string>('all')

  /* Tabs: All, one per watchlist group, plus Traded when the user has records */
  const tabs = useMemo(() => {
    const base = [
      { id: 'all', label: 'All', count: allSymbols.length, color: undefined as string | undefined },
      ...watchCategories.map(c => ({
        id: c.id, label: c.label, count: c.symbols.length, color: c.color,
      })),
    ]
    return traded.length > 0
      ? [{ id: 'traded', label: 'Traded', count: traded.length, color: 'var(--green)' }, ...base]
      : base
  }, [traded.length])

  /* Searching looks across every instrument regardless of the active tab, so a
     query always finds what you typed instead of silently hiding it. */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pool = q
      ? allSymbols
      : tab === 'all'    ? allSymbols
      : tab === 'traded' ? traded
      : (watchCategories.find(c => c.id === tab)?.symbols ?? allSymbols)

    if (!q) return pool
    return pool.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.sym.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    )
  }, [query, tab, traded])

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="panel-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', color: 'var(--green)' }}><Ico d={CHART_ICON} s={16} /></span>
          <h3>P&amp;L Charts</h3>
        </div>
        <span className="sub">
          {results.length} instrument{results.length === 1 ? '' : 's'}
          {query.trim() ? ' matched' : ''}
        </span>
      </div>

      {/* Search */}
      <input
        value={query}
        placeholder="Search any instrument — RELIANCE, Bitcoin, EURUSD, Gold…"
        onChange={e => setQuery(e.target.value)}
        style={{ ...fieldStyle, maxWidth: 440 }}
      />

      {/* Category tabs */}
      <div
        className="eq-chiprow"
        style={{ display: 'flex', gap: 7, overflowX: 'auto', margin: '14px 0 12px', paddingBottom: 6 }}
      >
        {tabs.map(t => (
          <Tab
            key={t.id}
            label={t.label}
            count={t.count}
            color={t.color}
            active={tab === t.id && !query.trim()}
            onClick={() => { setQuery(''); setTab(t.id) }}
          />
        ))}
      </div>

      {/* Scrollable instrument grid — click any to open its chart */}
      {results.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: 13.5 }}>
          No instrument matches &ldquo;{query.trim()}&rdquo;
        </div>
      ) : (
        <div
          className="eq-symgrid"
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
            gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 4,
          }}
        >
          {results.map(s => (
            <SymbolChip key={s.sym} s={s} onClick={() => onOpen(s)} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- Fullscreen chart viewer ---- */
export function FullscreenChart({ symbol, todayPL, realisedPL, unrealisedPL, theme, onClose }: {
  symbol:       WatchSymbol
  todayPL:      number
  realisedPL:   number
  unrealisedPL: number
  theme:        Theme
  onClose:      () => void
}) {
  /* ESC to close + lock body scroll while open */
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const yahoo = toYahooSymbol(symbol.sym)
  const color = SYM_GROUP[symbol.sym]?.color ?? 'var(--green)'
  const up    = todayPL >= 0

  const miniLabel: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '.06em', color: 'var(--faint)',
  }
  const miniVal = (v: number): React.CSSProperties => ({
    fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
    color: v === 0 ? 'var(--muted)' : v > 0 ? 'var(--gain)' : 'var(--loss)',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
      animation: 'eqFsIn .22s var(--ease)',
    }}>
      <style>{`
        @keyframes eqFsIn {
          from { opacity: 0; transform: scale(.995); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Top bar — fixed height so the chart area below can be sized exactly */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '0 22px', borderBottom: '1px solid var(--line)',
        height: TOPBAR_H, boxSizing: 'border-box', flexShrink: 0,
      }}>
        {/* Instrument */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 22, fontWeight: 800, letterSpacing: '-.01em',
              color: 'var(--ink)', lineHeight: 1.15,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {toTicker(symbol.sym)}
            </div>
            <div style={{
              fontSize: 12.5, color: 'var(--muted)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {symbol.name}
            </div>
          </div>
          <span style={{
            flexShrink: 0, padding: '3px 11px', borderRadius: 100,
            fontSize: 11, fontWeight: 700, letterSpacing: '.03em',
            color, background: `${color}1a`, border: `1px solid ${color}40`,
            whiteSpace: 'nowrap',
          }}>
            {symbol.category}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Account-wide today's P&L */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={miniLabel}>Today&rsquo;s P&amp;L</div>
          <div style={{
            fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 700, lineHeight: 1.15,
            fontVariantNumeric: 'tabular-nums', marginTop: 2,
            color: todayPL === 0 ? 'var(--ink)' : up ? 'var(--gain)' : 'var(--loss)',
          }}>
            {plStr(todayPL)}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginTop: 5 }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={miniLabel}>Realised</span>
              <span style={miniVal(realisedPL)}>{plStr(realisedPL)}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={miniLabel}>Unrealised</span>
              <span style={miniVal(unrealisedPL)}>{plStr(unrealisedPL)}</span>
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          title="Close (Esc)"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: '50%',
            border: '1.5px solid var(--line)', background: 'var(--paper)',
            color: 'var(--muted)', cursor: 'pointer', transition: 'all .13s var(--ease)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = 'var(--bg)'
            e.currentTarget.style.borderColor = 'var(--loss)'
            e.currentTarget.style.color       = 'var(--loss)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = 'var(--paper)'
            e.currentTarget.style.borderColor = 'var(--line)'
            e.currentTarget.style.color       = 'var(--muted)'
          }}
        >
          <Ico d={CLOSE_ICON} s={19} />
        </button>
      </div>

      {/* Chart fills the rest of the viewport.
          Explicit height rather than flex:1 — a percentage/flex chain can resolve
          to 0px before layout settles, which left the canvas invisible. */}
      <div style={{ flex: 1, minHeight: 0, height: `calc(100vh - ${TOPBAR_H}px)` }}>
        <CandleChart symbol={yahoo} name={symbol.name} theme={theme} fill />
      </div>
    </div>
  )
}
