'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/hooks/useTheme'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme }  = useTheme()
  const { data: session }       = useSession()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`eq-nav${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap nav-in">
        <Link href="/" className="brand">
          <img src="/assets/logo.svg" alt="Equicrore" height={30} />
          <b>EQUICRORE</b>
        </Link>
        <div className="nav-links">
          <a href="#markets">Markets</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#about">About</a>
        </div>
        <div className="nav-cta">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>
              </svg>
            )}
          </button>
          {session ? (
            <>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--forest)',
                display: 'grid', placeItems: 'center',
                color: '#eafff2', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {session.user?.name?.charAt(0)?.toUpperCase() ?? 'Y'}
              </div>
              <Link href="/dashboard" className="btn btn-solid">Open dashboard</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Log in</Link>
              <Link href="/login" className="btn btn-solid">Open dashboard</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
