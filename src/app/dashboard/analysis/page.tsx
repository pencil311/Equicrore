'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts'
import { pct, localDateISO } from '@/lib/format'
import { allSymbols, type WatchSymbol } from '@/lib/watchlists'
import { SYM_GROUP, toTicker, toYahooSymbol } from '@/lib/symbolMap'
import { useCountUp } from '@/hooks/useCountUp'
import { dashItem, dashGroup } from '@/components/dashboard/DashPanels'
import { RANGES, RANGE_PHRASE, rangeStart, buildChart, type Range, type BenchClose } from '@/lib/analysis'

const PCT_KEY       = 'eq-analysis-portfolio-pct'
const BENCHMARK_KEY = 'eq-analysis-benchmark'
const DEFAULT_BENCH = allSymbols.find(s => s.sym === 'NSE:NIFTY') ?? allSymbols[0]

const IC = {
  chevron: 'M6 9l6 6 6-6',
  search:  'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  info:    'M12 16v-4M12 8h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z',
  up:      'M22 7 13.5 15.5l-5-5L2 17M16 7h6v6',
  down:    'M22 17 13.5 8.5l-5 5L2 7M16 17h6v-6',
  pencil:  'M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z',
}
function Icon({ d, s = 16 }: { d: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

function readLS<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v != null ? JSON.parse(v) : fb } catch { return fb }
}

/** "8.55", "+4", "-3.2", "−3.2%" → number; "" → null (clears); anything else → undefined (rejected) */
function parsePct(raw: string): number | null | undefined {
  const s = raw.replace(/[−–]/g, '-').replace(/[%\s,]/g, '')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

const fmtAxisPct = (v: number) =>
  v === 0 ? '0%' : `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(Math.abs(v) < 10 && !Number.isInteger(v) ? 1 : 0)}%`

/* ---------- Benchmark history (10y of daily closes, sliced per range client-side) ---------- */
function useBenchmark(sym: string) {
  const [state, setState] = useState<{ data: BenchClose[]; loading: boolean; error: boolean }>({ data: [], loading: true, error: false })
  useEffect(() => {
    let live = true
    setState(s => ({ ...s, loading: true, error: false }))
    fetch(`/api/candles?symbol=${encodeURIComponent(toYahooSymbol(sym))}&tf=1D`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(j => {
        if (!live) return
        const data: BenchClose[] = (j.candles ?? []).map((c: { time: number; close: number }) => ({
          date: localDateISO(new Date(c.time * 1000)), close: c.close,
        }))
        setState({ data, loading: false, error: data.length === 0 })
      })
      .catch(() => { if (live) setState({ data: [], loading: false, error: true }) })
    return () => { live = false }
  }, [sym])
  return state
}

/* ---------- Compare-with picker ---------- */
function BenchmarkPicker({ value, onChange }: { value: WatchSymbol; onChange: (s: WatchSymbol) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const n = q.trim().toLowerCase()
    const list = n
      ? allSymbols.filter(s => s.name.toLowerCase().includes(n) || s.sym.toLowerCase().includes(n) || s.category.toLowerCase().includes(n))
      : allSymbols
    return list.slice(0, 60)
  }, [q])

  useEffect(() => { setActive(0) }, [q])
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  function pick(s: WatchSymbol) { onChange(s); setOpen(false); setQ('') }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && results[active]) pick(results[active])
  }

  return (
    <div ref={ref} className="an-picker">
      <button className="an-compare" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="an-compare-k">Compare with</span>
        <span className="an-compare-v">{value.name}</span>
        <Icon d={IC.chevron} s={15} />
      </button>
      {open && (
        <div className="an-pop" role="dialog" aria-label="Choose a benchmark">
          <div className="an-search">
            <Icon d={IC.search} s={15} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
              placeholder="Search any index, stock, coin, pair…" aria-label="Search instruments" />
          </div>
          <div className="an-list" role="listbox">
            {results.length === 0 && <div className="an-empty">No instruments match “{q}”</div>}
            {results.map((s, i) => (
              <button
                key={s.sym} role="option" aria-selected={s.sym === value.sym}
                className={`an-opt${i === active ? ' act' : ''}${s.sym === value.sym ? ' sel' : ''}`}
                onMouseEnter={() => setActive(i)} onClick={() => pick(s)}
              >
                <span className="an-dot" style={{ background: SYM_GROUP[s.sym]?.color ?? 'var(--faint)' }} />
                <span className="an-opt-name">{s.name}</span>
                <span className="an-opt-meta">{toTicker(s.sym)} · {s.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Click-to-edit portfolio % (a typed number, never calculated) ---------- */
function EditablePct({ value, onSave }: { value: number | null; onSave: (n: number | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const cancelled = useRef(false)
  const shown = useCountUp(value ?? 0, 700)

  function start() { setDraft(value == null ? '' : String(value)); cancelled.current = false; setEditing(true) }
  function commit() {
    setEditing(false)
    if (cancelled.current) return
    const n = parsePct(draft)
    if (n !== undefined && n !== value) onSave(n)
  }

  if (editing) {
    return (
      <span className="an-pct-edit">
        <input
          className="an-pct-input num" autoFocus inputMode="decimal" value={draft} placeholder="0.00"
          onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') { cancelled.current = true; (e.target as HTMLInputElement).blur() }
          }}
          aria-label="Your portfolio return in percent"
        />
        <span className="an-pct-sign">%</span>
      </span>
    )
  }
  return (
    <button
      className={`an-pct an-pct-btn num ${value == null ? 'empty' : value > 0 ? 'up' : value < 0 ? 'down' : 'flat'}`}
      onClick={start} title="Click to enter your return"
    >
      {value == null ? 'Enter %' : pct(shown)}
      <span className="an-pct-pen"><Icon d={IC.pencil} s={14} /></span>
    </button>
  )
}

/* ---------- Chart tooltip ---------- */
function ChartTip({ active, payload, benchName }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="an-tip">
      <div className="an-tip-date">{new Date(p.t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      {p.portfolio != null && (
        <div className="an-tip-row"><span className="an-sw" style={{ background: 'var(--green)' }} />Your portfolio<b className="num">{pct(p.portfolio)}</b></div>
      )}
      {p.benchmark != null && (
        <div className="an-tip-row"><span className="an-sw" style={{ background: 'var(--gold)' }} />{benchName}<b className="num">{pct(p.benchmark)}</b></div>
      )}
    </div>
  )
}

const fmtTick = (span: number) => (t: number) =>
  new Date(t).toLocaleDateString('en-IN', span > 400 * 864e5 ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' })

/* ================================================================ */
export default function AnalysisPage() {
  const reduce = useReducedMotion()

  const [range, setRange] = useState<Range>('ALL')
  const [bench, setBench] = useState<WatchSymbol>(DEFAULT_BENCH)
  const [myPct, setMyPct] = useState<number | null>(null)

  useEffect(() => {
    const savedSym = readLS<string | null>(BENCHMARK_KEY, null)
    const found = savedSym && allSymbols.find(s => s.sym === savedSym)
    if (found) setBench(found)
    const saved = readLS<number | null>(PCT_KEY, null)
    if (typeof saved === 'number' && Number.isFinite(saved)) setMyPct(saved)
  }, [])

  function chooseBench(s: WatchSymbol) {
    setBench(s)
    try { localStorage.setItem(BENCHMARK_KEY, JSON.stringify(s.sym)) } catch {}
  }
  function savePct(n: number | null) {
    setMyPct(n)
    try { n == null ? localStorage.removeItem(PCT_KEY) : localStorage.setItem(PCT_KEY, JSON.stringify(n)) } catch {}
  }

  const hist = useBenchmark(bench.sym)
  const today = localDateISO()
  const chart = useMemo(
    () => buildChart({ bench: hist.data, start: rangeStart(range), today, portfolioPct: myPct }),
    [hist.data, range, today, myPct],
  )

  const benchPct = hist.loading ? null : chart.benchmarkPct
  const diff = benchPct == null || myPct == null ? null : myPct - benchPct
  const beating = diff != null && diff >= 0
  const bVal = useCountUp(benchPct ?? 0, 900)
  const pts = chart.points
  const span = pts.length > 1 ? pts[pts.length - 1].t - pts[0].t : 0
  const fromLabel = new Date(chart.from + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <motion.div className="content an" initial="hidden" animate="show" variants={dashGroup(0.07)}>
      <style>{`
        .an .page-head { align-items: center; gap: 16px; flex-wrap: wrap; }
        .an-picker { position: relative; margin-left: auto; }
        .an-compare {
          display: inline-flex; align-items: center; gap: 10px; cursor: pointer;
          padding: 9px 14px 9px 16px; border-radius: 999px; font-family: var(--sans);
          background: var(--paper); border: 1px solid var(--line); color: var(--ink);
          box-shadow: var(--sh-sm); transition: border-color .15s var(--ease), box-shadow .15s var(--ease);
        }
        .an-compare:hover { border-color: var(--line-strong); box-shadow: var(--sh); }
        .an-compare:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
        .an-compare-k { font-size: 12.5px; color: var(--faint); font-weight: 600; }
        .an-compare-v { font-size: 14px; font-weight: 700; }
        .an-pop {
          position: absolute; right: 0; top: calc(100% + 8px); z-index: 60; width: min(380px, 86vw);
          background: var(--paper); border: 1px solid var(--line); border-radius: var(--r);
          box-shadow: var(--sh-lg); overflow: hidden; animation: eqFadeUp .18s var(--ease);
        }
        .an-search { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-bottom: 1px solid var(--line); color: var(--faint); }
        .an-search input { flex: 1; border: none; outline: none; background: transparent; font: 500 14px var(--sans); color: var(--ink); }
        .an-list { max-height: 320px; overflow-y: auto; padding: 6px; }
        .an-opt {
          display: grid; grid-template-columns: 10px 1fr; column-gap: 10px; width: 100%; text-align: left;
          padding: 8px 10px; border: none; border-radius: var(--r-sm); background: transparent; cursor: pointer;
        }
        .an-opt.act { background: var(--bg); }
        .an-opt.sel .an-opt-name { color: var(--green); }
        .an-dot { width: 8px; height: 8px; border-radius: 50%; grid-row: span 2; align-self: center; }
        .an-opt-name { font-size: 13.5px; font-weight: 600; color: var(--ink); }
        .an-opt-meta { font-size: 11.5px; color: var(--faint); }
        .an-empty { padding: 18px 12px; font-size: 13px; color: var(--faint); text-align: center; }

        .an-panel { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh); padding: 26px 28px 20px; }
        .an-duel { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        .an-side { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
        .an-side.bench { align-items: flex-end; text-align: right; }
        .an-bar { width: 34px; height: 4px; border-radius: 99px; margin-bottom: 6px; }
        .an-label { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--muted); }
        .an-pct { font-family: var(--serif); font-size: clamp(30px, 4vw, 42px); font-weight: 500; letter-spacing: -.02em; line-height: 1.05; }
        .an-pct.up { color: var(--gain); } .an-pct.down { color: var(--loss); } .an-pct.flat { color: var(--ink); }
        .an-pct.empty { color: var(--faint); font-style: italic; }
        .an-pct-btn {
          display: inline-flex; align-items: center; gap: 10px; cursor: text; background: transparent; border: none;
          padding: 0 8px; margin-left: -8px; border-radius: 10px; transition: background .15s var(--ease);
        }
        .an-pct-btn:hover { background: var(--bg); }
        .an-pct-btn:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
        .an-pct-pen { color: var(--faint); opacity: 0; transition: opacity .15s var(--ease); display: inline-flex; }
        .an-pct-btn:hover .an-pct-pen, .an-pct-btn:focus-visible .an-pct-pen, .an-pct.empty .an-pct-pen { opacity: 1; }
        .an-pct-edit { display: inline-flex; align-items: baseline; gap: 4px; }
        .an-pct-input {
          font-family: var(--serif); font-size: clamp(30px, 4vw, 42px); font-weight: 500; letter-spacing: -.02em; line-height: 1.05;
          width: 5.2ch; padding: 0 8px; margin-left: -8px; color: var(--ink); background: var(--bg);
          border: 1.5px solid var(--green); border-radius: 10px; outline: none;
        }
        .an-pct-sign { font-family: var(--serif); font-size: 26px; color: var(--muted); }
        .an-info { position: relative; display: inline-flex; color: var(--faint); cursor: help; }
        .an-info .an-bubble {
          position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%) translateY(4px);
          width: 260px; padding: 10px 12px; border-radius: var(--r-sm); background: var(--forest); color: #eafff2;
          font-size: 12px; font-weight: 500; line-height: 1.5; text-align: left; box-shadow: var(--sh);
          opacity: 0; pointer-events: none; transition: opacity .15s var(--ease), transform .15s var(--ease); z-index: 5;
        }
        .an-info:hover .an-bubble, .an-info:focus-visible .an-bubble { opacity: 1; transform: translateX(-50%); }
        .an-sub { font-size: 11.5px; color: var(--faint); }

        .an-banner {
          display: flex; align-items: center; gap: 12px; margin-top: 20px; padding: 12px 16px;
          border-radius: var(--r); font-size: 13.5px; font-weight: 600; line-height: 1.45;
        }
        .an-banner.win  { background: var(--green-soft); color: var(--gain); }
        .an-banner.lose { background: rgba(185,138,46,.12); color: var(--gold); }
        .an-banner .an-ico { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; background: currentColor; }
        .an-banner .an-ico svg { color: var(--paper); }
        .an-banner b { font-family: var(--serif); font-size: 15px; }
        .an-banner.muted { background: var(--bg); color: var(--muted); font-weight: 500; }

        .an-chart-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 24px 0 6px; flex-wrap: wrap; }
        .an-legend { display: flex; gap: 16px; font-size: 12.5px; font-weight: 600; color: var(--muted); }
        .an-legend span { display: inline-flex; align-items: center; gap: 6px; }
        .an-legend em { font-style: normal; font-weight: 500; color: var(--faint); }
        .an-sw { width: 10px; height: 3px; border-radius: 2px; display: inline-block; }
        .an-chart { position: relative; height: 320px; }
        .an-tip {
          background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-sm);
          box-shadow: var(--sh-lg); padding: 10px 12px; min-width: 200px; font-family: var(--sans);
        }
        .an-tip-date { font-size: 11.5px; font-weight: 700; color: var(--faint); margin-bottom: 6px; letter-spacing: .02em; }
        .an-tip-row { display: grid; grid-template-columns: 14px 1fr auto; align-items: center; column-gap: 8px; font-size: 12.5px; color: var(--muted); padding: 2px 0; }
        .an-tip-row b { color: var(--ink); font-family: var(--serif); font-size: 13.5px; }
        .an-note { font-size: 12px; color: var(--faint); margin-top: 8px; }
        .an-shimmer {
          position: absolute; inset: 0; border-radius: var(--r);
          background: linear-gradient(100deg, var(--bg) 20%, var(--paper-2) 40%, var(--bg) 60%);
          background-size: 220% 100%; animation: anShimmer 1.2s linear infinite;
        }
        .an-sk { display: inline-block; width: 120px; height: 38px; border-radius: 8px; position: relative; overflow: hidden; }
        @keyframes anShimmer { from { background-position: 120% 0 } to { background-position: -120% 0 } }
        @media (max-width: 720px) {
          .an-panel { padding: 20px 18px 16px; }
          .an-duel { gap: 16px; }
          .an-chart { height: 260px; }
          .an-picker { margin-left: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .an-shimmer { animation: none; } }
      `}</style>

      <motion.div className="page-head" variants={dashItem}>
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Analysis</b></div>
          <h1>Analysis</h1>
        </div>
        <BenchmarkPicker value={bench} onChange={chooseBench} />
      </motion.div>

      <motion.section className="an-panel" variants={dashItem} aria-label="Portfolio versus benchmark">
        <div className="an-duel">
          <div className="an-side">
            <span className="an-bar" style={{ background: 'var(--green)' }} />
            <span className="an-label">
              Your Portfolio
              <span className="an-info" tabIndex={0} aria-label="About this comparison">
                <Icon d={IC.info} s={14} />
                <span className="an-bubble" role="tooltip">
                  Your % is the return you type in. The green line is an illustrative path to it, not your trade history. {bench.name}&apos;s line is its real price return over the same period.
                </span>
              </span>
            </span>
            <EditablePct value={myPct} onSave={savePct} />
            <span className="an-sub">{myPct == null ? 'Click to enter your return' : ''}</span>
          </div>

          <div className="an-side bench">
            <span className="an-bar" style={{ background: 'var(--gold)' }} />
            <span className="an-label">{bench.name}</span>
            {hist.loading ? (
              <span className="an-sk"><span className="an-shimmer" /></span>
            ) : benchPct == null ? (
              <span className="an-pct flat">—</span>
            ) : (
              <span className={`an-pct num ${benchPct > 0 ? 'up' : benchPct < 0 ? 'down' : 'flat'}`}>{pct(bVal)}</span>
            )}
            <span className="an-sub">{toTicker(bench.sym)} · price return</span>
          </div>
        </div>

        {hist.error ? (
          <div className="an-banner muted">Couldn&apos;t load price history for {bench.name}. Try another benchmark, or check back in a moment.</div>
        ) : !hist.loading && benchPct == null ? (
          <div className="an-banner muted">{bench.name} has no price history in this period. Try a longer range.</div>
        ) : myPct == null ? (
          <div className="an-banner muted">Enter your portfolio&apos;s return to see how it stacks up against {bench.name}.</div>
        ) : diff != null && (
          <motion.div
            key={`${bench.sym}-${range}-${beating}`}
            className={`an-banner ${beating ? 'win' : 'lose'}`}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <span className="an-ico"><Icon d={beating ? IC.up : IC.down} s={15} /></span>
            <span>
              {beating ? 'Beating' : 'Trailing'} the benchmark ({bench.name}) by <b className="num">{Math.abs(diff).toFixed(2)}%</b> {RANGE_PHRASE[range]}
            </span>
          </motion.div>
        )}

        <div className="an-chart-head">
          <div className="an-legend">
            <span><i className="an-sw" style={{ background: 'var(--green)' }} />Your portfolio <em></em></span>
            <span><i className="an-sw" style={{ background: 'var(--gold)' }} />{bench.name}</span>
          </div>
          <div className="tfbar" role="group" aria-label="Time range">
            {RANGES.map(r => (
              <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)} aria-pressed={range === r}>{r}</button>
            ))}
          </div>
        </div>

        <div className="an-chart">
          {hist.loading ? (
            <span className="an-shimmer" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pts} margin={{ top: 12, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="anPortFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--green)" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="var(--green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']}
                  tickFormatter={fmtTick(span)} minTickGap={48}
                  tick={{ fill: 'var(--faint)', fontSize: 11 }} axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtAxisPct} width={52} domain={['auto', 'auto']}
                  tick={{ fill: 'var(--faint)', fontSize: 11 }} axisLine={false} tickLine={false}
                />
                <ReferenceLine y={0} stroke="var(--line-strong)" />
                <Tooltip content={<ChartTip benchName={bench.name} />} cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '4 4' }} />
                <Area
                  dataKey="portfolio" type="monotone" stroke="var(--green)" strokeWidth={2.4}
                  fill="url(#anPortFill)" baseValue={0} connectNulls
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--paper)' }}
                  isAnimationActive={!reduce} animationDuration={900}
                />
                <Line
                  dataKey="benchmark" type="monotone" stroke="var(--gold)" strokeWidth={2} dot={false}
                  connectNulls activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--paper)' }}
                  isAnimationActive={!reduce} animationDuration={900}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="an-note">
          
        </p>
      </motion.section>
    </motion.div>
  )
}
