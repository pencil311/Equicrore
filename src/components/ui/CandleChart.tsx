'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface CandleChartProps {
  symbol: string      // Yahoo Finance symbol e.g. RELIANCE.NS, AAPL, CL=F, BTC-USD
  name:   string
  theme?: 'light' | 'dark'
  /** Stretch the chart to its container's height instead of the fixed 380px */
  fill?:  boolean
  /** Override Yahoo's reported currency. Yahoo reports the *proxy feed's*
   *  currency — MCX crude maps to NYMEX CL=F, so it reports USD — which is
   *  wrong for the market the user picked. Callers pass the intended one. */
  currency?: 'INR' | 'USD' | 'NONE'
}

/* Timeframes mirror /api/candles RANGE_MAP. Intraday first, then daily+ */
const TF_INTRADAY = ['1m','2m','5m','15m','30m','1h'] as const
const TF_DAILY    = ['1D','1W','1M','MAX'] as const
const TFS = [...TF_INTRADAY, ...TF_DAILY] as const
type TF = typeof TFS[number]

const INTRADAY = new Set<string>(TF_INTRADAY)

/* How many bars to show on load. The rest stays scrollable to the left. */
const VISIBLE_BARS = 160

function fmt(n: number, currency: string): string {
  if (!n) return '—'
  /* Forex pairs are rates, not amounts — no symbol, extra precision */
  if (currency === 'NONE') {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 })
  }
  if (currency === 'INR') {
    if (n >= 10_000_000) return '₹' + (n/10_000_000).toFixed(2) + ' Cr'
    if (n >= 100_000)    return '₹' + (n/100_000).toFixed(2) + ' L'
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + currency
}

export default function CandleChart({ symbol, name, theme = 'light', fill = false, currency: currencyOverride }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<any>(null)
  const candleRef    = useRef<any>(null)
  const volRef       = useRef<any>(null)
  const lastCandleRef = useRef<{ time:number;open:number;high:number;low:number;close:number } | null>(null)
  const [tf, setTf]          = useState<TF>('1D')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [apiCurrency, setApiCurrency] = useState('INR')
  /* The caller's market wins; Yahoo's value is only a fallback */
  const currency = currencyOverride ?? apiCurrency
  const [tooltip, setTooltip]   = useState<{ o:number;h:number;l:number;c:number;v:number;t:number } | null>(null)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  /* Set when the API had to serve a coarser interval than the one requested */
  const [fellBackTo, setFellBackTo] = useState<string | null>(null)
  const [barCount, setBarCount]     = useState(0)

  const bg     = theme === 'dark' ? '#0e2017' : '#fbfdfb'
  const grid   = theme === 'dark' ? 'rgba(180,240,200,0.06)' : 'rgba(0,60,32,0.05)'
  const text   = theme === 'dark' ? '#7fa887' : '#5d6b61'
  const border = theme === 'dark' ? 'rgba(180,240,200,0.10)' : 'rgba(0,60,32,0.10)'
  const green  = '#009A51'
  const red    = '#c0492f'

  const initChart = useCallback(async () => {
    if (!containerRef.current) return
    const { createChart, CrosshairMode, LineStyle } = await import('lightweight-charts')

    // Destroy previous
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }

    /* clientHeight can still be 0 on the very first paint — floor it so the
       canvas is never created at zero height and left invisible. */
    const measured = fill ? Math.max(containerRef.current.clientHeight, 320) : 380

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: measured,
      layout: { background: { color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
      /* Explicit so scrolling back through the full fetched history and
         zooming both stay available regardless of library defaults. */
      handleScroll: {
        mouseWheel: true, pressedMouseMove: true,
        horzTouchDrag: true, vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true, mouseWheel: true, pinch: true,
      },
    })

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor:          green, downColor:          red,
      borderUpColor:    green, borderDownColor:    red,
      wickUpColor:      green, wickDownColor:      red,
    })

    // Volume histogram
    const volSeries = chart.addHistogramSeries({
      color: green,
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    chartRef.current = chart; candleRef.current = candleSeries; volRef.current = volSeries

    // Crosshair tooltip
    chart.subscribeCrosshairMove((param: any) => {
      if (!param.time || !param.seriesData) { setTooltip(null); return }
      const d = param.seriesData.get(candleSeries)
      const v = param.seriesData.get(volSeries)
      if (d) setTooltip({ o: d.open, h: d.high, l: d.low, c: d.close, v: v?.value ?? 0, t: param.time as number })
    })

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        ...(fill ? { height: Math.max(containerRef.current.clientHeight, 320) } : {}),
      })
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect() }
  }, [theme, bg, grid, text, border, fill])

  const loadCandles = useCallback(async () => {
    if (!candleRef.current) return
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}`)
      if (!res.ok) { setError('Chart data not available for this instrument.'); setLoading(false); return }
      const data = await res.json()
      if (data.error || !data.candles?.length) { setError('Chart data not available for this instrument.'); setLoading(false); return }

      setApiCurrency(data.currency || 'INR')
      if (data.regularMarketPrice) setLivePrice(data.regularMarketPrice)
      setFellBackTo(data.fellBack ? (data.intervalLabel || data.tf) : null)
      setBarCount(data.candles.length)

      const candles = data.candles.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
      const volumes = data.candles.map((c: any) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? green + '88' : red + '88' }))

      candleRef.current.setData(candles)
      volRef.current.setData(volumes)
      lastCandleRef.current = candles[candles.length - 1] ?? null

      /* Show time-of-day on the axis only where it means something */
      chartRef.current?.applyOptions({
        timeScale: { timeVisible: INTRADAY.has(data.tf || tf), secondsVisible: false },
      })

      const ts = chartRef.current?.timeScale()
      if (ts) {
        ts.fitContent()
        /* With thousands of bars, fitContent alone squeezes them to slivers.
           Open on the most recent window; the full history stays scrollable. */
        if (candles.length > VISIBLE_BARS) {
          ts.setVisibleLogicalRange({
            from: candles.length - VISIBLE_BARS,
            to:   candles.length,
          })
        }
      }
    } catch {
      setError('Chart data not available for this instrument.')
    }
    setLoading(false)
  }, [symbol, tf])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    initChart().then(fn => { cleanup = fn; loadCandles() })
    return () => { cleanup?.(); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null } }
  }, [symbol, theme])

  useEffect(() => { if (candleRef.current) loadCandles() }, [tf])

  // Poll live price every 5s and roll it into the last candle
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/prices?symbols=${encodeURIComponent(symbol)}`)
        const d = await r.json()
        const cleanSym = symbol.replace(/\.(NS|BO|L|T|DE)$/, '')
        const p = d[cleanSym]?.price || d[symbol]?.price
        if (!p) return
        setLivePrice(p)

        /* Extend the most recent bar in place — same `time` replaces it rather
           than appending, so this works on every interval from 1m to 1mo. */
        const lc = lastCandleRef.current
        if (lc && candleRef.current) {
          const next = {
            ...lc,
            close: p,
            high:  Math.max(lc.high, p),
            low:   Math.min(lc.low, p),
          }
          lastCandleRef.current = next
          candleRef.current.update(next)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(id)
  }, [symbol])

  const last = tooltip
  const chg  = last ? last.c - last.o : 0
  const chgP = last && last.o ? ((chg / last.o) * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background: bg }}>
      {/* Chart header */}
      <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${border}`, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, color: theme==='dark'?'#eafff2':'var(--ink)' }}>{symbol.replace(/\.(NS|BO|L|T|DE)$/,'')}</div>
          <div style={{ fontSize:12, color: text }}>{name}</div>
        </div>
        {livePrice && (
          <div style={{ fontFamily:'var(--serif)', fontSize:22, fontWeight:500, color: theme==='dark'?'#eafff2':'var(--ink)' }}>
            {fmt(livePrice, currency)}
          </div>
        )}
        {/* TF buttons — intraday group, divider, daily+ group */}
        <div
          className="eq-tfrow"
          style={{ display:'flex', gap:4, alignItems:'center', overflowX:'auto', maxWidth:'100%' }}
        >
          {TF_INTRADAY.map(t => (
            <button key={t} onClick={() => setTf(t)} title={`${t} candles`} style={{
              fontFamily:'var(--sans)', fontSize:12, fontWeight:600, padding:'5px 10px',
              borderRadius:999, border:'none', cursor:'pointer', transition:'all .18s',
              background: tf===t ? green : 'transparent',
              color: tf===t ? '#fff' : text, flexShrink:0,
            }}>{t}</button>
          ))}
          <span style={{ width:1, height:16, background:border, flexShrink:0, margin:'0 3px' }} />
          {TF_DAILY.map(t => (
            <button key={t} onClick={() => setTf(t)} title={`${t} candles`} style={{
              fontFamily:'var(--sans)', fontSize:12, fontWeight:600, padding:'5px 10px',
              borderRadius:999, border:'none', cursor:'pointer', transition:'all .18s',
              background: tf===t ? green : 'transparent',
              color: tf===t ? '#fff' : text, flexShrink:0,
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* OHLCV tooltip bar */}
      <div style={{ padding:'6px 18px', borderBottom:`1px solid ${border}`, fontSize:12, display:'flex', gap:16, flexWrap:'wrap', minHeight:30 }}>
        {last ? (
          <>
            <span style={{ color: text }}>O <b style={{ color: theme==='dark'?'#eafff2':'var(--ink)' }}>{fmt(last.o, currency)}</b></span>
            <span style={{ color: text }}>H <b style={{ color: green }}>{fmt(last.h, currency)}</b></span>
            <span style={{ color: text }}>L <b style={{ color: red }}>{fmt(last.l, currency)}</b></span>
            <span style={{ color: text }}>C <b style={{ color: theme==='dark'?'#eafff2':'var(--ink)' }}>{fmt(last.c, currency)}</b></span>
            <span style={{ color: chg >= 0 ? green : red, fontWeight:700 }}>{chg >= 0 ? '+' : ''}{fmt(chg, currency)} ({chg >= 0 ? '+' : ''}{chgP.toFixed(2)}%)</span>
            {last.v > 0 && <span style={{ color: text }}>Vol <b style={{ color: theme==='dark'?'#eafff2':'var(--ink)' }}>{last.v > 1e7 ? (last.v/1e7).toFixed(1)+'Cr' : last.v > 1e5 ? (last.v/1e5).toFixed(1)+'L' : last.v.toLocaleString()}</b></span>}
          </>
        ) : (
          <span style={{ color: text }}>Hover over chart to see OHLCV data</span>
        )}
        <span style={{ flex:1 }} />
        {fellBackTo && (
          <span style={{ color:'#c08a2f', whiteSpace:'nowrap' }} title={`No ${tf} data available for ${symbol}`}>
            {tf} unavailable — showing {fellBackTo}
          </span>
        )}
        {barCount > 0 && (
          <span style={{ color: text, whiteSpace:'nowrap', opacity:.75 }}>
            {barCount.toLocaleString()} bars
          </span>
        )}
      </div>

      {/* Chart container */}
      <div style={{ position:'relative', flex:1, minHeight: fill ? 320 : 0 }}>
        <div ref={containerRef} style={{ width:'100%', height: fill ? '100%' : 380, minHeight: fill ? 320 : undefined }} />
        {loading && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background: bg + 'cc', flexDirection:'column', gap:12 }}>
            <span style={{ width:28, height:28, border:`3px solid ${grid}`, borderTopColor: green, borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />
            <span style={{ color: text, fontSize:13 }}>Loading {symbol} chart…</span>
          </div>
        )}
        {error && !loading && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background: bg, flexDirection:'column', gap:10 }}>
            <span style={{ fontSize:32 }}>📊</span>
            <span style={{ color: text, fontSize:13, textAlign:'center', maxWidth:260, lineHeight:1.5 }}>{error}</span>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .eq-tfrow::-webkit-scrollbar { height: 0; }
      `}</style>
    </div>
  )
}
