'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Ico } from './DashLayout'
import { allSymbols, watchCategories, type WatchSymbol } from '@/lib/watchlists'
import { SYM_GROUP, toTicker, toYahooSymbol, marketCurrency } from '@/lib/symbolMap'
import {
  CHART_LAYOUTS, DEFAULT_LAYOUT, layoutById, paneArea, gridStyle, thumbRects,
  readSavedLayout, writeSavedLayout, type ChartLayout, type PaneState,
} from '@/lib/chartLayouts'
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

/* ---- Indian-style P&L formatting ---- */

/** Compact, for the header pill: +₹62.59K · −₹1.34L · +₹1.2Cr */
function abbrPL(n: number): string {
  const a = Math.abs(n)
  if (a < 0.005) return '₹0'
  const trim = (v: number, suffix: string) =>
    v.toFixed(2).replace(/\.?0+$/, '') + suffix
  const body = a >= 1e7 ? trim(a / 1e7, 'Cr')
             : a >= 1e5 ? trim(a / 1e5, 'L')
             : a >= 1e3 ? trim(a / 1e3, 'K')
             : a.toFixed(2)
  return `${n > 0 ? '+' : '−'}₹${body}`
}

/** Full precision with Indian comma grouping: +₹62,586.40 */
function fullPL(n: number): string {
  if (Math.abs(n) < 0.005) return '₹0.00'
  const body = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
  return `${n > 0 ? '+' : '−'}₹${body}`
}

function plColor(n: number): string {
  return Math.abs(n) < 0.005 ? 'var(--muted)' : n > 0 ? 'var(--pl-gain)' : 'var(--pl-loss)'
}

/* ---- Broker-style today's P&L: header pill + expandable card ---- */

export interface PLBreakdown {
  /** Today's realised P&L from trade records (active broker) */
  realisedToday:       number
  /** Live P&L across currently open positions */
  positionsUnrealised: number
  /** Mark-to-market gain/loss on portfolio holdings */
  holdingsUnrealised:  number
}

const PL_NOTE = 'This is your total P&L including holdings, open positions, and today’s recorded trades'

/* Navigation targets. Orders and Positions both live on the Positions page —
   the hash scrolls to the right section (see the anchors on that page). */
const PL_NAV = [
  { label: 'Holdings',  href: '/dashboard/portfolio' },
  { label: 'Orders',    href: '/dashboard/performance#trade-log' },
  { label: 'Positions', href: '/dashboard/performance#open-positions' },
] as const

/* ---- Layout picker: thumbnails drawn from the same grid spec as the panes ---- */
const GRID_ICON = 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'

function LayoutThumb({ layout, active }: { layout: ChartLayout; active: boolean }) {
  const S = 26
  const stroke = active ? 'var(--green)' : 'var(--faint)'
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ display: 'block' }}>
      {thumbRects(layout, S, 2.5).map((r, i) => (
        <rect
          key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={1.5}
          fill={active ? 'var(--green)' : 'transparent'}
          fillOpacity={active ? 0.18 : 1}
          stroke={stroke} strokeWidth={1.3}
        />
      ))}
    </svg>
  )
}

function LayoutPicker({ value, onChange }: {
  value: ChartLayout
  onChange: (l: ChartLayout) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  /* Grouped by pane count, matching the rows in the picker */
  const groups = useMemo(() => {
    const by = new Map<number, ChartLayout[]>()
    CHART_LAYOUTS.forEach(l => {
      if (!by.has(l.panes)) by.set(l.panes, [])
      by.get(l.panes)!.push(l)
    })
    return Array.from(by.entries()).sort((a, b) => a[0] - b[0])
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Chart layout"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 38, height: 38, borderRadius: '50%',
          border: `1.5px solid ${open ? 'var(--green)' : 'var(--line)'}`,
          background: open ? 'var(--bg)' : 'var(--paper)',
          color: open ? 'var(--green)' : 'var(--muted)',
          cursor: 'pointer', transition: 'all .13s var(--ease)',
        }}
      >
        <Ico d={GRID_ICON} s={17} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 20,
          padding: '12px 14px 14px', background: 'var(--paper)',
          border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--sh-lg)', animation: 'eqFadeUp .16s var(--ease)',
        }}>
          {groups.map(([count, items]) => (
            <div key={count} style={{ marginBottom: 10 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.06em', color: 'var(--faint)', marginBottom: 6,
              }}>
                {count} chart{count === 1 ? '' : 's'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {items.map(l => {
                  const active = l.id === value.id
                  return (
                    <button
                      key={l.id}
                      onClick={() => { onChange(l); setOpen(false) }}
                      title={l.label}
                      style={{
                        display: 'flex', padding: 5, borderRadius: 7, cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--green)' : 'var(--line)'}`,
                        background: active ? 'var(--bg)' : 'transparent',
                        transition: 'all .13s var(--ease)',
                      }}
                    >
                      <LayoutThumb layout={l} active={active} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- One chart pane: its own instrument picker + its own CandleChart ---- */
function ChartPane({ pane, index, onChange, theme, compact, delayMs }: {
  pane:     PaneState
  index:    number
  onChange: (next: PaneState) => void
  theme:    Theme
  compact:  boolean
  delayMs:  number
}) {
  const [picking, setPicking] = useState(false)
  const sym = pane.sym ? allSymbols.find(s => s.sym === pane.sym) ?? null : null

  return (
    <div style={{
      gridArea: paneArea(index),
      display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0,
      borderLeft: '1px solid var(--line)', borderTop: '1px solid var(--line)',
      overflow: 'hidden',
    }}>
      {/* Pane header — compact instrument selector */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
        borderBottom: '1px solid var(--line)', background: 'var(--paper)', flexShrink: 0,
      }}>
        {picking || !sym ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <InstrumentPicker
              value={sym}
              onChange={s => { onChange({ ...pane, sym: s.sym }); setPicking(false) }}
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => setPicking(true)}
              title="Change instrument"
              style={{
                display: 'flex', alignItems: 'baseline', gap: 7, minWidth: 0,
                padding: '3px 8px', borderRadius: 7, cursor: 'pointer',
                border: '1px solid transparent', background: 'transparent',
                fontFamily: 'var(--sans)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                {toTicker(sym.sym)}
              </span>
              <span style={{
                fontSize: 11, color: 'var(--faint)', minWidth: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{sym.name}</span>
              <span style={{ fontSize: 9, color: 'var(--faint)' }}>▾</span>
            </button>
            <div style={{ flex: 1 }} />
          </>
        )}
      </div>

      {/* Chart, or an empty-pane prompt */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {sym ? (
          <CandleChart
            key={sym.sym}
            symbol={toYahooSymbol(sym.sym)}
            name={sym.name}
            theme={theme}
            currency={marketCurrency(sym.sym)}
            initialTf={pane.tf}
            onTfChange={tf => onChange({ ...pane, tf })}
            startDelayMs={delayMs}
            minChartHeight={compact ? 90 : 320}
            compact={compact}
            fill
          />
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'var(--faint)', fontSize: 13, background: 'var(--bg)',
          }}>
            <Ico d={CHART_ICON} s={26} />
            Select instrument
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Top-bar navigation: Holdings | Orders | Positions ---- */
function PLNav() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {PL_NAV.map((n, i) => (
        <span key={n.label} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && (
            <span style={{ color: 'var(--line)', margin: '0 9px', fontSize: 13 }}>|</span>
          )}
          <Link
            href={n.href}
            style={{
              fontFamily: 'var(--roboto)', fontWeight: 700, fontSize: 13,
              color: 'var(--ink)', textDecoration: 'none', whiteSpace: 'nowrap',
              transition: 'color .13s var(--ease)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--pl-gain)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink)' }}
          >
            {n.label}
          </Link>
        </span>
      ))}
    </div>
  )
}

function PLSummary({ breakdown, open, onToggle }: {
  breakdown: PLBreakdown
  open:      boolean
  onToggle:  () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  /* The collapsed pill mirrors the dashboard's "Today's P/L" stat exactly:
     realised only. Unrealised lives inside the card, never in this number. */
  const headline = breakdown.realisedToday

  const realised   = breakdown.realisedToday
  const unrealised = breakdown.positionsUnrealised + breakdown.holdingsUnrealised
  const total      = realised + unrealised

  /* Close on outside click */
  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onToggle])

  const label: React.CSSProperties = {
    fontFamily: 'var(--roboto)', fontWeight: 500, fontSize: 14, color: 'var(--muted)',
  }
  const num = (v: number, size = 14): React.CSSProperties => ({
    fontFamily: 'var(--roboto)', fontWeight: 700, fontSize: size,
    fontVariantNumeric: 'tabular-nums', color: plColor(v), textAlign: 'right',
  })

  /* Row labels are bold + ink; only the note and the pill prefix stay secondary */
  const rowLabel: React.CSSProperties = {
    fontFamily: 'var(--roboto)', fontWeight: 700, fontSize: 14, color: 'var(--ink)',
  }

  const Row = ({ k, v }: { k: string; v: number }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 24, padding: '7px 0' }}>
      <span style={rowLabel}>{k}</span>
      <span style={num(v)} title={fullPL(v)}>{fullPL(v)}</span>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={onToggle}
        title={`Today's realised P&L ${fullPL(headline)}`}
        style={{
          display: 'flex', alignItems: 'baseline', gap: 8,
          padding: '7px 14px', borderRadius: 10,
          border: `1px solid ${open ? 'var(--line)' : 'transparent'}`,
          background: open ? 'var(--bg)' : 'transparent',
          cursor: 'pointer', transition: 'all .13s var(--ease)',
        }}
      >
        <span style={{ ...label, fontSize: 13 }}>P&amp;L:</span>
        <span style={{
          fontFamily: 'var(--roboto)', fontWeight: 700, fontSize: 25,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, color: plColor(headline),
        }}>
          {abbrPL(headline)}
        </span>
        <span style={{
          color: 'var(--muted)', fontSize: 11, lineHeight: 1,
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s var(--ease)',
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 10,
          width: 340, background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)',
          animation: 'eqFadeUp .16s var(--ease)', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 18px 16px' }}>
            <div style={{
              fontFamily: 'var(--roboto)', fontWeight: 700, fontSize: 14.5,
              color: 'var(--ink)', letterSpacing: '-.01em',
            }}>
              Overall P&amp;L
            </div>
            <div style={{
              fontFamily: 'var(--roboto)', fontWeight: 700, fontSize: 12.5,
              color: 'var(--ink)', marginTop: 3,
            }}>
              Total P&amp;L
            </div>

            <div style={{ marginTop: 8, borderTop: '1px solid var(--line)' }}>
              <Row k="Realised"   v={realised} />
              <Row k="Unrealised" v={unrealised} />
            </div>

            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 24, paddingTop: 9, borderTop: '1px solid var(--line)',
            }}>
              <span style={rowLabel}>Total</span>
              <span style={num(total, 15.5)} title={fullPL(total)}>{fullPL(total)}</span>
            </div>

            {/* Explanatory note — regular weight, secondary */}
            <div style={{
              marginTop: 14, padding: '9px 12px',
              border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
              background: 'var(--bg)',
              fontFamily: 'var(--roboto)', fontWeight: 400, fontSize: 11.5,
              fontStyle: 'italic', color: 'var(--faint)', lineHeight: 1.5,
            }}>
              {PL_NOTE}
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
export function FullscreenChart({ symbol, breakdown, theme, onClose }: {
  symbol:       WatchSymbol
  breakdown:    PLBreakdown
  theme:        Theme
  onClose:      () => void
}) {
  const [plOpen, setPlOpen] = useState(false)

  /* Split-screen layout. Pane 0 always starts on the instrument that was
     opened; the rest restore from the saved layout, or start empty. */
  const [layout, setLayout] = useState<ChartLayout>(DEFAULT_LAYOUT)
  const [panes, setPanes]   = useState<PaneState[]>([{ sym: symbol.sym, tf: '1D' }])

  useEffect(() => {
    const saved = readSavedLayout()
    const l = saved ? layoutById(saved.layout) : DEFAULT_LAYOUT
    setLayout(l)
    setPanes(Array.from({ length: l.panes }, (_, i) => {
      if (i === 0) return { sym: symbol.sym, tf: saved?.panes?.[0]?.tf ?? '1D' }
      return saved?.panes?.[i] ?? { sym: null, tf: '1D' }
    }))
    /* Pane 0 follows whichever instrument was opened, so this intentionally
       re-seeds when the user opens a different symbol. */
  }, [symbol.sym])

  /* Persist layout + per-pane symbol/timeframe */
  useEffect(() => {
    writeSavedLayout({ layout: layout.id, panes })
  }, [layout, panes])

  function changeLayout(next: ChartLayout) {
    setLayout(next)
    setPanes(prev => Array.from({ length: next.panes }, (_, i) =>
      prev[i] ?? { sym: null, tf: '1D' }
    ))
  }

  function updatePane(i: number, next: PaneState) {
    setPanes(prev => prev.map((p, idx) => (idx === i ? next : p)))
  }

  const isSplit = layout.panes > 1

  /* ESC closes the P&L card first, then the overlay. Body scroll locked while open. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (plOpen) setPlOpen(false)
      else onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, plOpen])

  const yahoo    = toYahooSymbol(symbol.sym)
  const color    = SYM_GROUP[symbol.sym]?.color ?? 'var(--green)'
  const currency = marketCurrency(symbol.sym)

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

        {/* Section navigation, left of the P&L pill */}
        <PLNav />
        <span style={{
          width: 1, height: 22, background: 'var(--line)', flexShrink: 0, margin: '0 -6px',
        }} />

        {/* Account-wide today's P&L — from the user's records, not this instrument */}
        <PLSummary
          breakdown={breakdown}
          open={plOpen}
          onToggle={() => setPlOpen(o => !o)}
        />

        <LayoutPicker value={layout} onChange={changeLayout} />

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

      {/* Charts fill the rest of the viewport.
          Explicit height rather than flex:1 — a percentage/flex chain can resolve
          to 0px before layout settles, which left the canvas invisible. */}
      <div style={{ flex: 1, minHeight: 0, height: `calc(100vh - ${TOPBAR_H}px)` }}>
        {!isSplit ? (
          /* Single layout keeps the original behaviour exactly: no pane header,
             instrument comes from the top bar. */
          <CandleChart symbol={yahoo} name={symbol.name} theme={theme} currency={currency} fill />
        ) : (
          <div style={{
            ...gridStyle(layout),
            height: '100%', width: '100%',
            /* Panes draw their own top/left rules, so trim the outer edges */
            marginTop: -1, marginLeft: -1,
          }}>
            {panes.slice(0, layout.panes).map((p, i) => (
              <ChartPane
                key={`${layout.id}-${i}`}
                pane={p}
                index={i}
                onChange={next => updatePane(i, next)}
                theme={theme}
                compact
                /* Stagger startup ~400ms apart so the panes don't burst-request
                   /api/candles and /api/prices and trip Yahoo's rate limit. */
                delayMs={i * 400}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
