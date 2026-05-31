'use client'
import { useCountUp } from '@/hooks/useCountUp'
import { inr } from '@/lib/format'
import Link from 'next/link'

const I = {
  home: 'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  bag: 'M6 7V6a4 4 0 0 1 8 0v1M4 7h16l-1 13H5z',
  chart: 'M3 3v18h18M7 14l4-4 3 3 5-6',
  star: 'M12 3l2.6 5.6L21 9.3l-4.5 4.2 1.1 6.1L12 16.8 6.4 19.6l1.1-6.1L3 9.3l6.4-.7z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  sun: 'M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  plus: 'M12 5v14M5 12h14',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  wallet: 'M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 13h.01M3 9V7a2 2 0 0 1 2-2h11',
}

export function Ico({ d, s = 19 }: { d: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const nav = [
  { grp: 'Trade' },
  { id: 'dashboard', icon: I.home, label: 'Dashboard' },
  { id: 'portfolio', icon: I.bag, label: 'Portfolio' },
  { id: 'markets', icon: I.chart, label: 'Markets', href: '/markets' },
  { id: 'watchlist', icon: I.star, label: 'Watchlist' },
  { id: 'orders', icon: I.list, label: 'Transactions' },
]

interface SidebarProps {
  active: string
  setActive: (id: string) => void
  cash: number
}

export function Sidebar({ active, setActive, cash }: SidebarProps) {
  const v = useCountUp(cash, 1000)
  return (
    <aside className="side">
      <div className="side-top">
        <Link href="/" className="brand">
          <img src="/assets/logo.svg" alt="" />
          <b>EQUICRORE</b>
        </Link>
      </div>
      <div className="cash-card">
        <div className="ring" />
        <div className="lbl">Portfolio value</div>
        <div className="amt num">{inr(v)}</div>
        <div className="sub">
          <Ico d={I.wallet} s={13} />
          Live tracking
        </div>
      </div>
      <nav className="nav-side">
        {nav.map((n, i) =>
          'grp' in n ? (
            <div className="grp" key={'g' + i}>{n.grp}</div>
          ) : (
            <a
              key={n.id}
              className={`nav-item${active === n.id ? ' on' : ''}`}
              href={n.href || '#'}
              onClick={(e) => { if (!n.href) e.preventDefault(); setActive(n.id); }}
            >
              <Ico d={n.icon} />
              <span>{n.label}</span>
            </a>
          )
        )}
      </nav>
      <div className="side-foot">
        <div className="av">YS</div>
        <div className="nm">
          <b>Yeshwanth S.</b>
          <span>Personal portfolio</span>
        </div>
      </div>
    </aside>
  )
}

interface TopBarProps {
  onTrade: () => void
  theme: string
  toggleTheme: () => void
}

export function TopBar({ onTrade, theme, toggleTheme }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="search">
        <Ico d={I.search} s={16} />
        <input placeholder="Search stocks, funds, crypto…" />
      </div>
      <div className="market-pill">
        <span className="dot" />
        Markets open
      </div>
      <button className="tb-icon" title="Toggle theme" onClick={toggleTheme}>
        <Ico d={theme === 'dark' ? I.sun : I.moon} s={17} />
      </button>
      <button className="tb-icon">
        <Ico d={I.bell} s={18} />
        <span className="badge">3</span>
      </button>
      <button className="btn btn-solid btn-mini" onClick={onTrade}>
        <Ico d={I.plus} s={16} />
        New trade
      </button>
      <div className="tb-prof">
        <div className="av">YS</div>
        <span className="nm">Yeshwanth</span>
      </div>
    </header>
  )
}
