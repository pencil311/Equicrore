'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import '@/styles/markets.css'
import { allSymbols, watchCategories, toTVUrl, type WatchSymbol } from '@/lib/watchlists'
import { RecordModal } from '@/components/dashboard/DashPanels'

const WL_KEY = 'eq-watchlist'

const CAT_COLORS: Record<string, string> = {
  indices:     '#7a3ec2',
  indian:      '#009A51',
  crypto:      '#d39021',
  forex:       '#1a73c7',
  commodities: '#b98a2e',
}

function Ico({ d, s = 18 }: { d: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export default function WatchlistPage() {
  const [syms, setSyms]   = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [tradeModal, setTradeModal] = useState<{ open: boolean; sym: string; name: string; color: string }>({ open: false, sym: '', name: '', color: '' })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WL_KEY)
      if (raw) setSyms(JSON.parse(raw) as string[])
    } catch {}
    setReady(true)
  }, [])

  function removeFromWatchlist(sym: string) {
    setSyms(prev => {
      const next = prev.filter(s => s !== sym)
      localStorage.setItem(WL_KEY, JSON.stringify(next))
      return next
    })
  }

  const items = syms
    .map(sym => {
      const found = allSymbols.find(s => s.sym === sym)
      const cat   = found ? watchCategories.find(c => c.symbols.some(x => x.sym === sym)) : undefined
      return found ? { ...found, catId: cat?.id ?? '' } : null
    })
    .filter((s): s is WatchSymbol & { catId: string } => Boolean(s))

  if (!ready) return null

  return (
    <div className="content fade">
      <div className="page-head">
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Watchlist</b></div>
          <h1>Watchlist</h1>
        </div>
        {items.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--faint)', alignSelf: 'center' }}>
            {items.length} symbol{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 52, lineHeight: 1, color: 'var(--faint)' }}>☆</div>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
            No stocks in your watchlist yet
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
            Go to Markets and star any symbol to add it here
          </p>
          <Link href="/dashboard/markets" className="btn btn-solid btn-mini" style={{ marginTop: 8 }}>
            Go to Markets
          </Link>
        </div>
      ) : (
        <div className="panel">
          <div className="inst-table">
            <div className="inst-head" style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 160px', gap:12, padding:'12px 20px' }}>
              <span>Symbol</span>
              <span>Name</span>
              <span>Category</span>
              <span style={{ textAlign:'right' }}>Actions</span>
            </div>
            {items.map(s => {
              const short = s.sym.includes(':') ? s.sym.split(':')[1] : s.sym
              const color = CAT_COLORS[s.catId] ?? '#888'
              const tvUrl = toTVUrl(s.sym)
              return (
                <div
                  key={s.sym}
                  className="inst-row"
                  style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 160px', gap:12, alignItems:'center', padding:'13px 20px', cursor:'pointer' }}
                  onClick={() => window.open(tvUrl, '_blank', 'noreferrer')}
                >
                  <div className="inst-asset">
                    <span className="inst-tk" style={{ background: color }}>{short.slice(0,2)}</span>
                    <div className="inst-nm"><b>{short}</b></div>
                  </div>
                  <div style={{ fontSize:13.5, color:'var(--muted)' }}>{s.name}</div>
                  <div>
                    <span style={{ fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:999, background:'var(--bg-2)', color:'var(--faint)' }}>
                      {s.category}
                    </span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:8 }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn-xs solid"
                      onClick={() => setTradeModal({ open: true, sym: short, name: s.name, color: CAT_COLORS[s.catId] ?? '#888' })}
                    >
                      Record
                    </button>
                    <button
                      onClick={() => removeFromWatchlist(s.sym)}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 6px', fontSize:18, color:'#f5a623', transition:'transform 0.15s', lineHeight:1 }}
                      title="Remove from watchlist"
                    >
                      ★
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
