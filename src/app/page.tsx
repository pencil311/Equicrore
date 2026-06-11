'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Nav from '@/components/layout/Nav'
import HeroSparkline from '@/components/ui/HeroSparkline'
import FeatChart from '@/components/ui/FeatChart'

const portfolio = [
  { rank: 1, name: 'Reliance Industries', symbol: 'RELIANCE', value: '₹4,82,350', ret: '+18.4%', gain: true },
  { rank: 2, name: 'HDFC Bank', symbol: 'HDFCBANK', value: '₹2,14,800', ret: '+12.1%', gain: true },
  { rank: 3, name: 'Tata Consultancy Services', symbol: 'TCS', value: '₹1,93,200', ret: '+9.7%', gain: true },
  { rank: 4, name: 'Infosys', symbol: 'INFY', value: '₹1,42,600', ret: '−3.2%', gain: false },
  { rank: 5, name: 'Bitcoin', symbol: 'BTC', value: '₹89,400', ret: '+31.5%', gain: true },
]

const markets = [
  { flag: '🇮🇳', name: 'Indian Markets', desc: 'NSE & BSE listed equities, F&O, and indices. Nifty 50, Sensex, and beyond.', tickers: ['NIFTY 50', 'SENSEX', 'RELIANCE', 'HDFC', 'TCS'], delay: '0s' },
  { flag: '🇺🇸', name: 'US Markets', desc: 'NYSE and NASDAQ stocks. Track S&P 500 components and major tech companies.', tickers: ['S&P 500', 'NASDAQ', 'AAPL', 'GOOGL', 'MSFT'], delay: '.08s' },
  { flag: '₿', name: 'Crypto', desc: 'Top cryptocurrencies by market cap. BTC, ETH, and leading altcoins in INR.', tickers: ['BTC', 'ETH', 'SOL', 'ADA', 'MATIC'], delay: '.16s' },
]

const steps = [
  { n: '01', title: 'Add your holdings', body: 'Enter your stocks, ETFs, and crypto positions once. The dashboard remembers everything.' },
  { n: '02', title: 'Prices update live', body: 'Real-time feeds from Yahoo Finance and CoinGecko keep your P&L accurate at all times.' },
  { n: '03', title: 'Analyse at a glance', body: 'Charts, allocation breakdowns, and sector views reveal the full picture instantly.' },
  { n: '04', title: 'Track performance', body: 'Absolute returns, XIRR, and daily moves — formatted in ₹ with Indian number conventions.' },
]

export default function HomePage() {
  const { data: session } = useSession()
  const dashHref = session ? '/dashboard' : '/login'

  useEffect(() => {
    const io = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.rv').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <style>{`
        /* ─── Layout helpers ─────────────────────────────────── */
        .wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }

        /* ─── Nav ────────────────────────────────────────────── */
        .eq-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 64px; padding: 0 24px;
          display: flex; align-items: center;
          transition: background .3s var(--ease), box-shadow .3s var(--ease);
        }
        .eq-nav.scrolled { background: var(--paper); box-shadow: var(--sh); }
        .nav-in { display: flex; align-items: center; width: 100%; gap: 32px; }
        .brand {
          display: flex; align-items: center; gap: 10px; text-decoration: none;
          font-family: var(--serif); font-weight: 700; font-size: 1.1rem;
          color: var(--ink); letter-spacing: -.01em;
        }
        .brand img { height: 28px; width: auto; }
        .nav-links { display: flex; align-items: center; gap: 28px; margin: 0 auto; }
        .nav-links a { text-decoration: none; color: var(--muted); font-size: .92rem; font-weight: 500; transition: color .2s; }
        .nav-links a:hover { color: var(--ink); }
        .nav-cta { display: flex; align-items: center; gap: 10px; }
        .icon-btn {
          background: none; border: none; cursor: pointer; color: var(--muted);
          padding: 7px; border-radius: var(--r-sm); display: flex; align-items: center;
          transition: color .2s, background .2s;
        }
        .icon-btn:hover { color: var(--ink); background: var(--forest-soft); }
        .btn {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 8px 18px; border-radius: var(--r); font-size: .88rem;
          font-weight: 600; font-family: var(--sans); cursor: pointer;
          text-decoration: none; border: none; white-space: nowrap;
          transition: all .2s var(--ease);
        }
        .btn-ghost { background: none; color: var(--ink); border: 1.5px solid var(--line-strong); }
        .btn-ghost:hover { border-color: var(--green); color: var(--green); }
        .btn-solid { background: var(--green); color: #fff; }
        .btn-solid:hover { background: var(--green-deep); }

        /* ─── Reveal animation ───────────────────────────────── */
        .rv {
          opacity: 0; transform: translateY(14px);
          transition: opacity .6s var(--ease), transform .6s var(--ease);
        }
        .rv.visible { opacity: 1; transform: none; }

        /* ─── Hero ───────────────────────────────────────────── */
        .hero {
          padding: 140px 0 80px;
          display: grid; grid-template-columns: 1fr 420px;
          gap: 64px; align-items: center;
        }
        .hero-eyebrow {
          font-size: .75rem; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: var(--green); margin-bottom: 20px;
        }
        .hero-headline {
          font-family: var(--serif);
          font-size: clamp(2.4rem, 4.5vw, 3.6rem);
          line-height: 1.1; color: var(--ink); margin-bottom: 20px;
        }
        .hero-headline em { font-style: italic; color: var(--green); }
        .hero-sub {
          color: var(--muted); font-size: 1.05rem; line-height: 1.65;
          max-width: 480px; margin-bottom: 36px;
        }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .hero-actions .btn { padding: 12px 26px; font-size: .95rem; }

        /* portfolio card */
        .hero-card {
          background: var(--paper); border: 1px solid var(--line);
          border-radius: var(--r-xl); padding: 28px; box-shadow: var(--sh-lg);
        }
        .hero-card-label {
          font-size: .75rem; font-weight: 600; color: var(--muted);
          letter-spacing: .05em; text-transform: uppercase;
        }
        .hero-card-value {
          font-family: var(--serif); font-size: 2.2rem; font-weight: 600;
          color: var(--ink); margin: 6px 0 2px;
        }
        .hero-card-change { font-size: .88rem; font-weight: 600; color: var(--gain); }
        .hero-card-footer {
          display: flex; justify-content: space-between; margin-top: 12px;
          padding-top: 12px; border-top: 1px solid var(--line);
        }
        .hero-card-footer span { font-size: .78rem; }

        /* floating cards */
        .float-card {
          position: absolute; background: var(--paper);
          border: 1px solid var(--line); border-radius: var(--r-lg);
          padding: 14px 18px; box-shadow: var(--sh);
          animation: eqFloat 4s ease-in-out infinite;
        }
        .float-card-a { top: -24px; right: -20px; animation-delay: 0s; }
        .float-card-b { bottom: -20px; left: -24px; animation-delay: -2s; }
        .float-card-name { font-size: .75rem; font-weight: 600; color: var(--muted); }
        .float-card-val { font-family: var(--serif); font-size: 1.1rem; font-weight: 600; color: var(--ink); }
        .float-card-ret { font-size: .8rem; font-weight: 700; }

        /* ─── Stats band ─────────────────────────────────────── */
        .stats-band {
          background: var(--forest); border-radius: var(--r-xl); margin-bottom: 80px;
          padding: 44px 48px; display: grid; grid-template-columns: repeat(4,1fr); gap: 32px;
        }
        .stat { text-align: center; }
        .stat-num { font-family: var(--serif); font-size: 2.4rem; font-weight: 600; color: #fff; }
        .stat-label { font-size: .83rem; color: rgba(255,255,255,.5); margin-top: 4px; }

        /* ─── Section headings ───────────────────────────────── */
        .sec-hd { margin-bottom: 48px; }
        .sec-tag {
          font-size: .75rem; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--green); margin-bottom: 14px;
        }
        .sec-title {
          font-family: var(--serif); font-size: clamp(1.8rem, 3vw, 2.6rem);
          color: var(--ink); line-height: 1.15; margin-bottom: 12px;
        }
        .sec-sub { color: var(--muted); font-size: 1rem; line-height: 1.65; max-width: 500px; }

        /* ─── Markets ────────────────────────────────────────── */
        .markets { padding: 80px 0; }
        .markets-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
        .mkt-card {
          background: var(--paper); border: 1px solid var(--line);
          border-radius: var(--r-xl); padding: 32px; box-shadow: var(--sh);
          transition: box-shadow .25s var(--ease), transform .25s var(--ease);
        }
        .mkt-card:hover { box-shadow: var(--sh-lg); transform: translateY(-3px); }
        .mkt-flag { font-size: 2.2rem; margin-bottom: 16px; display: block; }
        .mkt-name { font-size: 1.1rem; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
        .mkt-desc { font-size: .88rem; color: var(--muted); line-height: 1.55; margin-bottom: 22px; }
        .mkt-tickers { display: flex; flex-wrap: wrap; gap: 7px; }
        .mkt-tick {
          font-size: .73rem; font-weight: 700; padding: 4px 10px; border-radius: 99px;
          background: var(--green-soft); color: var(--green); letter-spacing: .02em;
        }

        /* ─── How it works ───────────────────────────────────── */
        .how { padding: 80px 0; background: var(--paper-2); }
        .how-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 40px; }
        .how-num {
          font-family: var(--serif); font-size: 3rem; font-weight: 300;
          color: var(--line-strong); line-height: 1; margin-bottom: 18px;
        }
        .how-title { font-size: 1rem; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
        .how-body { font-size: .875rem; color: var(--muted); line-height: 1.65; }

        /* ─── Features ───────────────────────────────────────── */
        .feat { padding: 80px 0; }
        .feat-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 20px; }
        .feat-card {
          background: var(--paper); border: 1px solid var(--line);
          border-radius: var(--r-xl); padding: 28px; box-shadow: var(--sh); overflow: hidden;
        }
        .feat-card.lg { grid-column: span 4; }
        .feat-card.sm { grid-column: span 2; }
        .feat-icon {
          width: 42px; height: 42px; background: var(--green-soft);
          border-radius: var(--r); display: flex; align-items: center;
          justify-content: center; margin-bottom: 18px;
        }
        .feat-icon svg { width: 20px; height: 20px; stroke: var(--green); fill: none; }
        .feat-title { font-size: 1rem; font-weight: 700; color: var(--ink); margin-bottom: 8px; }
        .feat-body { font-size: .86rem; color: var(--muted); line-height: 1.65; }

        /* ─── Portfolio table ────────────────────────────────── */
        .port { padding: 80px 0; }
        .port-table {
          background: var(--paper); border: 1px solid var(--line);
          border-radius: var(--r-xl); box-shadow: var(--sh); overflow: hidden;
        }
        .port-head {
          display: grid; grid-template-columns: 44px 1fr 160px 120px;
          padding: 14px 24px; font-size: .72rem; font-weight: 700;
          letter-spacing: .07em; text-transform: uppercase; color: var(--muted);
          border-bottom: 1px solid var(--line);
        }
        .port-row {
          display: grid; grid-template-columns: 44px 1fr 160px 120px;
          padding: 18px 24px; align-items: center;
          border-bottom: 1px solid var(--line);
          transition: background .15s var(--ease);
        }
        .port-row:last-child { border-bottom: none; }
        .port-row:hover { background: var(--forest-soft); }
        .port-rank { font-size: .82rem; font-weight: 700; color: var(--faint); font-family: var(--serif); }
        .port-name { font-weight: 600; font-size: .93rem; color: var(--ink); }
        .port-sym { font-size: .77rem; color: var(--muted); margin-top: 2px; }
        .port-val { font-family: var(--serif); font-size: 1rem; font-weight: 600; color: var(--ink); }
        .port-ret { font-size: .88rem; font-weight: 700; text-align: right; }
        .port-ret.gain { color: var(--gain); }
        .port-ret.loss { color: var(--loss); }

        /* ─── CTA ────────────────────────────────────────────── */
        .cta-section {
          background: var(--forest); border-radius: var(--r-xl); margin-bottom: 80px;
          padding: 72px 48px; text-align: center;
        }
        .cta-title { font-family: var(--serif); font-size: clamp(2rem, 3.5vw, 3rem); color: #fff; margin-bottom: 16px; }
        .cta-sub { color: rgba(255,255,255,.58); font-size: 1.05rem; line-height: 1.65; margin-bottom: 36px; max-width: 480px; margin-left: auto; margin-right: auto; }
        .cta-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-white { background: #fff; color: var(--forest); }
        .btn-white:hover { background: var(--sage, #e7ece5); }
        .btn-outline-white { background: none; color: #fff; border: 1.5px solid rgba(255,255,255,.32); }
        .btn-outline-white:hover { border-color: rgba(255,255,255,.7); }

        /* ─── Footer ─────────────────────────────────────────── */
        .footer { border-top: 1px solid var(--line); padding: 52px 0 32px; }
        .footer-in { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 48px; }
        .footer-brand { font-family: var(--serif); font-size: 1.2rem; font-weight: 700; color: var(--ink); margin-bottom: 10px; }
        .footer-tagline { font-size: .85rem; color: var(--muted); line-height: 1.65; max-width: 240px; }
        .footer-col-title { font-size: .72rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--faint); margin-bottom: 16px; }
        .footer-links { display: flex; flex-direction: column; gap: 10px; }
        .footer-links a { font-size: .87rem; color: var(--muted); text-decoration: none; transition: color .2s; }
        .footer-links a:hover { color: var(--green); }
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 24px; border-top: 1px solid var(--line); }
        .footer-copy { font-size: .8rem; color: var(--faint); }
        .footer-legal { display: flex; gap: 20px; }
        .footer-legal a { font-size: .8rem; color: var(--faint); text-decoration: none; transition: color .2s; }
        .footer-legal a:hover { color: var(--muted); }

        /* ─── Responsive ─────────────────────────────────────── */
        @media (max-width: 960px) {
          .hero { grid-template-columns: 1fr; padding: 120px 0 60px; }
          .hero-right { display: none; }
          .stats-band { grid-template-columns: repeat(2,1fr); padding: 32px; }
          .markets-grid { grid-template-columns: 1fr; max-width: 480px; }
          .how-grid { grid-template-columns: repeat(2,1fr); }
          .feat-card.lg, .feat-card.sm { grid-column: span 6; }
          .footer-in { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .nav-links { display: none; }
          .how-grid { grid-template-columns: 1fr; }
          .port-head, .port-row { grid-template-columns: 32px 1fr 120px 80px; padding: 14px 16px; }
          .footer-in { grid-template-columns: 1fr; gap: 32px; }
          .cta-section { padding: 48px 24px; }
          .footer-bottom { flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      <Nav />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section>
        <div className="wrap">
          <div className="hero">
            <div className="hero-left rv">
              <p className="hero-eyebrow">Personal Investment Dashboard</p>
              <h1 className="hero-headline">
                Track every rupee,{' '}
                <em>across every market</em>
              </h1>
              <p className="hero-sub">
                A unified view of your Indian stocks, US equities, and crypto —
                built for investors who want clarity without complexity.
              </p>
              <div className="hero-actions">
                <a href={dashHref} className="btn btn-solid">
                  {session ? 'Open Dashboard' : 'Sign in →'}
                </a>
                <a href="#markets" className="btn btn-ghost">Explore Markets</a>
              </div>
            </div>

            <div className="hero-right rv" style={{ transitionDelay: '.15s', position: 'relative' }}>
              <div className="hero-card">
                <div className="hero-card-label">Portfolio Value</div>
                <div className="hero-card-value">₹11,22,350</div>
                <div className="hero-card-change">↑ +16.3% this year</div>
                <HeroSparkline />
                <div className="hero-card-footer">
                  <span style={{ color: 'var(--muted)' }}>Indian Stocks</span>
                  <span style={{ fontWeight: 600, color: 'var(--gain)' }}>+14.2%</span>
                </div>
              </div>
              <div className="float-card float-card-a">
                <div className="float-card-name">Bitcoin</div>
                <div className="float-card-val">₹62,14,000</div>
                <div className="float-card-ret up">+4.7%</div>
              </div>
              <div className="float-card float-card-b">
                <div className="float-card-name">TCS</div>
                <div className="float-card-val">₹3,880</div>
                <div className="float-card-ret up">+2.1%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ──────────────────────────────────────── */}
      <div className="wrap">
        <div className="stats-band rv">
          {[
            { num: '500+', label: 'Trackable assets' },
            { num: '3',    label: 'Markets covered' },
            { num: '₹0',  label: 'Platform fees' },
            { num: 'Live', label: 'Price updates' },
          ].map(s => (
            <div key={s.label} className="stat">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Markets ─────────────────────────────────────────── */}
      <section id="markets" className="markets">
        <div className="wrap">
          <div className="sec-hd rv">
            <p className="sec-tag">Markets</p>
            <h2 className="sec-title">Everything under one roof</h2>
            <p className="sec-sub">
              Track indices, individual stocks, and coins — real-time data via
              CoinGecko and Yahoo Finance.
            </p>
          </div>
          <div className="markets-grid">
            {markets.map(m => (
              <div key={m.name} className="mkt-card rv" style={{ transitionDelay: m.delay }}>
                <span className="mkt-flag">{m.flag}</span>
                <div className="mkt-name">{m.name}</div>
                <div className="mkt-desc">{m.desc}</div>
                <div className="mkt-tickers">
                  {m.tickers.map(t => <span key={t} className="mkt-tick">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="how">
        <div className="wrap">
          <div className="sec-hd rv">
            <p className="sec-tag">How it works</p>
            <h2 className="sec-title">Simple by design</h2>
          </div>
          <div className="how-grid">
            {steps.map((s, i) => (
              <div key={s.n} className="how-card rv" style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="how-num">{s.n}</div>
                <div className="how-title">{s.title}</div>
                <div className="how-body">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="feat">
        <div className="wrap">
          <div className="sec-hd rv">
            <p className="sec-tag">Features</p>
            <h2 className="sec-title">Built for serious tracking</h2>
          </div>
          <div className="feat-grid">
            {/* lg card with FeatChart */}
            <div className="feat-card lg rv">
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/>
                </svg>
              </div>
              <div className="feat-title">Interactive Charts</div>
              <div className="feat-body" style={{ marginBottom: '20px' }}>
                Zoom, pan, and inspect historical performance across any timeframe — daily to all-time.
              </div>
              <FeatChart />
            </div>

            <div className="feat-card sm rv" style={{ transitionDelay: '.08s' }}>
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
                </svg>
              </div>
              <div className="feat-title">Live Price Feed</div>
              <div className="feat-body">
                Sub-minute price refresh for stocks and crypto with visual flash indicators on every tick.
              </div>
            </div>

            <div className="feat-card sm rv" style={{ transitionDelay: '.12s' }}>
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div className="feat-title">Indian Number Format</div>
              <div className="feat-body">
                All values shown in ₹ with lakhs and crores — never millions or billions.
              </div>
            </div>

            <div className="feat-card sm rv" style={{ transitionDelay: '.16s' }}>
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <div className="feat-title">Multi-market View</div>
              <div className="feat-body">
                Indian stocks, US equities, and crypto on one screen — no tab-switching required.
              </div>
            </div>

            <div className="feat-card sm rv" style={{ transitionDelay: '.2s' }}>
              <div className="feat-icon">
                <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
                </svg>
              </div>
              <div className="feat-title">Dark Mode</div>
              <div className="feat-body">
                A forest-green dark theme that's easy on the eyes during late-night portfolio reviews.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Portfolio preview ────────────────────────────────── */}
      <section id="portfolio" className="port">
        <div className="wrap">
          <div className="sec-hd rv">
            <p className="sec-tag">Portfolio</p>
            <h2 className="sec-title">Your holdings, ranked</h2>
            <p className="sec-sub">
              A clean table view of every position — sorted by value, updated live.
            </p>
          </div>
          <div className="port-table rv" style={{ transitionDelay: '.08s' }}>
            <div className="port-head">
              <span>#</span>
              <span>Asset</span>
              <span>Value</span>
              <span style={{ textAlign: 'right' }}>Return</span>
            </div>
            {portfolio.map(row => (
              <div key={row.rank} className="port-row">
                <span className="port-rank">{row.rank}</span>
                <div>
                  <div className="port-name">{row.name}</div>
                  <div className="port-sym">{row.symbol}</div>
                </div>
                <span className="port-val">{row.value}</span>
                <span className={`port-ret ${row.gain ? 'gain' : 'loss'}`}>{row.ret}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <div className="wrap">
        <div className="cta-section rv">
          <h2 className="cta-title">Start tracking your wealth today</h2>
          <p className="cta-sub">
            Free to use. No spreadsheets. No subscription. Just a clear view of
            where your money is.
          </p>
          <div className="cta-actions">
            <a href={dashHref} className="btn btn-white">
                  {session ? 'Open Dashboard' : 'Sign in'}
                </a>
            <a href="#markets" className="btn btn-outline-white">Explore Markets</a>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer-in">
            <div>
              <div className="footer-brand">EQUICRORE</div>
              <div className="footer-tagline">
                A personal investment dashboard for tracking Indian stocks, US equities,
                and crypto in one place.
              </div>
            </div>
            <div>
              <div className="footer-col-title">Product</div>
              <div className="footer-links">
                <a href="/dashboard">Dashboard</a>
                <a href="#markets">Markets</a>
                <a href="#portfolio">Portfolio</a>
              </div>
            </div>
            <div>
              <div className="footer-col-title">Markets</div>
              <div className="footer-links">
                <a href="#markets">Indian Stocks</a>
                <a href="#markets">US Stocks</a>
                <a href="#markets">Crypto</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2025 Equicrore</div>
            <div className="footer-legal">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
