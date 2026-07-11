'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useCountUp } from '@/hooks/useCountUp'
import { inr } from '@/lib/format'

const I = {
  home:   'M3 11.5 12 4l9 7.5M5 10v10h14V10',
  bag:    'M6 7V6a4 4 0 0 1 8 0v1M4 7h16l-1 13H5z',
  chart:  'M3 3v18h18M7 14l4-4 3 3 5-6',
  trend:  'M22 7 13.5 15.5l-5-5L2 17',
  star:   'M12 3l2.6 5.6L21 9.3l-4.5 4.2 1.1 6.1L12 16.8 6.4 19.6l1.1-6.1L3 9.3l6.4-.7z',
  list:   'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  search: 'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  moon:   'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  sun:    'M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  plus:   'M12 5v14M5 12h14',

  wallet: 'M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 13h.01M3 9V7a2 2 0 0 1 2-2h11',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  users:  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Ico({ d, s = 19 }: { d: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function MIco({ paths = [], circle, s = 16 }: {
  paths?: string[]
  circle?: { cx: number; cy: number; r: number }
  s?: number
}) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {circle && <circle cx={circle.cx} cy={circle.cy} r={circle.r} />}
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

const nav = [
  { grp: 'Record' },
  { id: 'dashboard',  icon: I.home,  label: 'Dashboard',   href: '/dashboard' },
  { id: 'portfolio',  icon: I.bag,   label: 'Portfolio',    href: '/dashboard/portfolio' },
  { id: 'markets',    icon: I.chart, label: 'Markets',      href: '/dashboard/markets' },
  { id: 'watchlist',  icon: I.star,  label: 'Watchlist',    href: '/dashboard/watchlist' },
  { id: 'orders',     icon: I.trend, label: '',  href: '/dashboard/' },
  { grp: 'Clients' },
  { id: 'clients',    icon: I.users, label: 'Clients',      href: '/dashboard/clients' },
]

interface SidebarProps {
  cash: number
  onEditPortfolio?: () => void
}

export function Sidebar({ cash, onEditPortfolio }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const v = useCountUp(cash, 1000)
  const [showMenu, setShowMenu] = useState(false)
  const [hovering, setHovering] = useState(false)
  const footRef = useRef<HTMLDivElement>(null)

  const userName  = session?.user?.name  || session?.user?.email || 'User'
  const userEmail = session?.user?.email || ''
  const av        = initials(userName)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  useEffect(() => {
    if (!showMenu) return
    function handleOutside(e: MouseEvent) {
      if (footRef.current && !footRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showMenu])

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
            <Link
              key={n.id}
              href={n.href}
              className={`nav-item${isActive(n.href) ? ' on' : ''}`}
            >
              <Ico d={n.icon} />
              <span>{n.label}</span>
            </Link>
          )
        )}
      </nav>

      {/* Profile footer */}
      <div className="side-foot" style={{ position: 'relative' }} ref={footRef}>
        {/* Popup menu */}
        {showMenu && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: 8,
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            boxShadow: 'var(--sh-lg)',
            padding: 8,
            zIndex: 10,
          }}>
            <button
              className="prof-menu-btn"
              onClick={() => { setShowMenu(false); onEditPortfolio?.() }}
            >
              <MIco
                paths={[
                  'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
                  'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
                ]}
                s={15}
              />
              Edit portfolio value
            </button>
            <button className="prof-menu-btn">
              <MIco
                circle={{ cx: 12, cy: 12, r: 3 }}
                paths={['M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']}
                s={15}
              />
              Settings
            </button>
            <div style={{ margin: '6px 0', borderTop: '1px solid var(--line)' }} />
            <button className="prof-menu-btn" style={{ color: '#d94f4f' }} onClick={() => { localStorage.clear(); signOut({ callbackUrl: '/' }) }}>
              <Ico d={I.logout} s={15} />
              Sign out
            </button>
          </div>
        )}

        {/* Profile row — click to toggle menu */}
        <div
          onClick={() => setShowMenu(v => !v)}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}
        >
          <div className="av">{av}</div>
          <div className="nm">
            <b>{userName}</b>
            <span title={userEmail}>{userEmail}</span>
          </div>
          <span style={{
            marginLeft: 'auto',
            fontSize: 14,
            color: 'var(--faint)',
            opacity: hovering || showMenu ? 1 : 0,
            transition: 'opacity 0.15s',
            flexShrink: 0,
          }}>⚙</span>
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
  const { data: session } = useSession()
  const userName = session?.user?.name || session?.user?.email || 'User'
  const av       = initials(userName)
  const firstName = userName.split(' ')[0]

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
      <button className="btn btn-solid btn-mini" onClick={onTrade}>
        <Ico d={I.plus} s={16} />
        New record
      </button>
      <div className="tb-prof">
        <div className="av">{av}</div>
        <span className="nm">{firstName}</span>
      </div>
    </header>
  )
}
