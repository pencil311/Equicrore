'use client'
import { useState, useMemo, useEffect } from 'react'
import '@/styles/markets.css'
import { watchCategories, allSymbols, toTVUrl, type WatchSymbol } from '@/lib/watchlists'
import { RecordModal } from '@/components/dashboard/DashPanels'
import { useTheme } from '@/hooks/useTheme'

function Ico({ d, s = 18 }: { d: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  x:      'M6 6l12 12M18 6 6 18',
  ext:    'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
}

const CAT_COLORS: Record<string, string> = {
  indices:     '#7a3ec2',
  indian:      '#009A51',
  crypto:      '#d39021',
  forex:       '#1a73c7',
  commodities: '#b98a2e',
}

const WL_KEY = 'eq-watchlist'

function loadWatchlist(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(WL_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function saveWatchlist(wl: Set<string>) {
  localStorage.setItem(WL_KEY, JSON.stringify(Array.from(wl)))
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return <>
    {text.slice(0, idx)}
    <mark style={{ background: 'var(--green-soft)', color: 'var(--green-deep)', borderRadius: 3, padding: '0 1px' }}>
      {text.slice(idx, idx + query.length)}
    </mark>
    {text.slice(idx + query.length)}
  </>
}

export default function MarketsPage() {
  const [activeTab, setActiveTab] = useState('indian')
  const [subFilter, setSubFilter] = useState('All')
  const [query, setQuery]         = useState('')
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set())
  const [tradeModal, setTradeModal] = useState<{ open: boolean; sym: string; name: string; color: string }>({ open: false, sym: '', name: '', color: '' })
  const { theme } = useTheme()

  useEffect(() => {
    setWatchlist(loadWatchlist())
  }, [])

  function toggleWatchlist(sym: string) {
    setWatchlist(prev => {
      const next = new Set(prev)
      next.has(sym) ? next.delete(sym) : next.add(sym)
      saveWatchlist(next)
      return next
    })
  }

  const activeCat = watchCategories.find(c => c.id === activeTab)!

  const subCats = useMemo(() => {
    const cats = Array.from(new Set(activeCat.symbols.map(s => s.category)))
    return ['All', ...cats]
  }, [activeTab])

  const filtered = useMemo(() => {
    let list = activeCat.symbols
    if (subFilter !== 'All') list = list.filter(s => s.category === subFilter)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(s =>
        s.sym.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      )
    }
    return list
  }, [activeTab, subFilter, query])

  const globalSearch = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allSymbols.filter(s =>
      s.sym.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
    ).slice(0, 40)
  }, [query])

  function openTrade(sym: string, name: string, color: string) {
    setTradeModal({ open: true, sym, name, color })
  }

  const isSearching = query.trim().length > 0

  return (
    <div className="mkts-wrap">
      {/* Hero */}
      <div className="mkts-hero" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div className="wrap">
          <h1 style={{ marginBottom: 12 }}>Markets</h1>
          <div className="mkt-search" style={{ maxWidth: 560 }}>
            <Ico d={ICONS.search} s={18} />
            <input
              placeholder="Search any symbol or name across all markets…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(234,255,242,.5)', padding:0 }}>
                <Ico d={ICONS.x} s={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global search results */}
      {isSearching ? (
        <div className="mkt-content">
          <div style={{ marginBottom:16, fontSize:13.5, color:'var(--muted)', fontWeight:500 }}>
            {globalSearch.length} results for <b style={{ color:'var(--ink)' }}>"{query}"</b> across all markets
          </div>
          {globalSearch.length === 0 ? (
            <div className="mkt-empty">
              <Ico d={ICONS.search} s={40} />
              <h3>No results for "{query}"</h3>
              <p>Try a different symbol or name</p>
            </div>
          ) : (
            <div className="inst-table">
              <div className="inst-head inst-cols">
                <span>Symbol</span>
                <span>Name</span>
                <span>Category</span>
                <span style={{ textAlign:'right' }}>Actions</span>
              </div>
              {globalSearch.map(s => {
                const cat = watchCategories.find(c => c.symbols.some(x => x.sym === s.sym))
                return (
                  <SymbolRow key={s.sym} sym={s}
                    catColor={cat ? CAT_COLORS[cat.id] : '#888'}
                    catLabel={cat?.label || ''}
                    catId={cat?.id || ''}
                    query={query}
                    watchlist={watchlist} onToggle={toggleWatchlist}
                    onTrade={openTrade}
                  />
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Sub-category filters */}
          <div className="mkt-filters">
            <span className="mkt-filter-label">Filter</span>
            {subCats.map(s => (
              <button key={s} className={`fchip${subFilter === s ? ' on' : ''}`} onClick={() => setSubFilter(s)}>{s}</button>
            ))}
            <div className="mkt-sort" style={{ marginLeft:'auto', color:'var(--faint)', fontSize:13 }}>
              {filtered.length} symbols
            </div>
          </div>

          {/* Symbols table */}
          <div className="mkt-content">
            <div className="inst-table">
              <div className="inst-head" style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 52px 190px', gap:12, padding:'12px 20px' }}>
                <span>Symbol</span>
                <span>Name</span>
                <span>Category</span>
                <span></span>
                <span style={{ textAlign:'right' }}>Actions</span>
              </div>
              {filtered.map(s => (
                <SymbolRow key={s.sym} sym={s}
                  catColor={CAT_COLORS[activeTab]}
                  catLabel={activeCat.label}
                  catId={activeTab}
                  query={''}
                  watchlist={watchlist} onToggle={toggleWatchlist}
                  onTrade={openTrade}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <RecordModal
        open={tradeModal.open}
        sym={tradeModal.sym}
        name={tradeModal.name}
        color={tradeModal.color}
        onClose={() => setTradeModal({ open: false, sym: '', name: '', color: '' })}
        onSubmit={() => setTradeModal({ open: false, sym: '', name: '', color: '' })}
      />
    </div>
  )
}

function SymbolRow({
  sym, catColor, catLabel, catId, query, watchlist, onToggle, onTrade,
}: {
  sym: WatchSymbol; catColor: string; catLabel: string; catId: string; query: string
  watchlist: Set<string>; onToggle: (sym: string) => void
  onTrade: (sym: string, name: string, color: string) => void
}) {
  const short  = sym.sym.includes(':') ? sym.sym.split(':')[1] : sym.sym
  const tvUrl  = toTVUrl(sym.sym)
  const inWl   = watchlist.has(sym.sym)
  const [bumped, setBumped] = useState(false)

  function handleStar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onToggle(sym.sym)
    setBumped(true)
    setTimeout(() => setBumped(false), 200)
  }

  function handleTrade(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onTrade(short, sym.name, catColor)
  }

  return (
    <div
      className="inst-row"
      style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 52px 190px', gap:12, alignItems:'center', padding:'13px 20px', cursor:'pointer' }}
      onClick={() => window.open(tvUrl, '_blank', 'noreferrer')}
    >
      <div className="inst-asset">
        <span className="inst-tk" style={{ background: catColor }}>{short.slice(0,2)}</span>
        <div className="inst-nm">
          <b><Highlight text={short} query={query} /></b>
        </div>
      </div>
      <div style={{ fontSize:13.5, color:'var(--muted)' }}>
        <Highlight text={sym.name} query={query} />
      </div>
      <div>
        <span style={{ fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:999, background:'var(--bg-2)', color:'var(--faint)' }}>
          {sym.category}
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        <button
          onClick={handleStar}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
            fontSize: 20, lineHeight: 1,
            color: inWl ? '#f5a623' : 'var(--faint)',
            transform: bumped ? 'scale(1.4)' : 'scale(1)',
            transition: 'transform 0.15s, color 0.15s',
          }}
        >
          {inWl ? '★' : '☆'}
        </button>
      </div>
      <div style={{ textAlign:'right', display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
        <button className="btn-xs solid" onClick={handleTrade}>
          Record
        </button>
        <span className="btn-xs" style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
          <Ico d={ICONS.ext} s={12} />
          Chart
        </span>
      </div>
    </div>
  )
}
