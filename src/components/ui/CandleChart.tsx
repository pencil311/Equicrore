'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface CandleChartProps {
  symbol: string      // Yahoo Finance symbol e.g. RELIANCE.NS, AAPL, CL=F, BTC-USD
  name:   string
  theme?: 'light' | 'dark'
}

const TFS = ['1D','1W','1M','3M','1Y','5Y'] as const
type TF = typeof TFS[number]

function fmt(n: number, currency: string): string {
  if (!n) return '—'
  if (currency === 'INR') {
    if (n >= 10_000_000) return '₹' + (n/10_000_000).toFixed(2) + ' Cr'
    if (n >= 100_000)    return '₹' + (n/100_000).toFixed(2) + ' L'
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }
  if (currency === 'USD') return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + currency
}

export default function CandleChart({ symbol, name, theme = 'light' }: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<any>(null)
  const candleRef    = useRef<any>(null)
  const volRef       = useRef<any>(null)
  const [tf, setTf]          = useState<TF>('1M')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [currency, setCurrency] = useState('INR')
  const [tooltip, setTooltip]   = useState<{ o:number;h:number;l:number;c:number;v:number;t:number } | null>(null)
  const [livePrice, setLivePrice] = useState<number | null>(null)

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

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: 380,
      layout: { background: { color: bg }, textColor: text },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
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
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    })
    ro.observe(containerRef.current)

    return () => { ro.disconnect() }
  }, [theme, bg, grid, text, border])

  const loadCandles = useCallback(async () => {
    if (!candleRef.current) return
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}`)
      const data = await res.json()
      if (data.error || !data.candles?.length) { setError('No data available for this symbol.'); setLoading(false); return }

      setCurrency(data.currency || 'INR')
      if (data.regularMarketPrice) setLivePrice(data.regularMarketPrice)

      const candles = data.candles.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
      const volumes = data.candles.map((c: any) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? green + '88' : red + '88' }))

      candleRef.current.setData(candles)
      volRef.current.setData(volumes)
      chartRef.current?.timeScale().fitContent()
    } catch {
      setError('Failed to load chart data.')
    }
    setLoading(false)
  }, [symbol, tf])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    initChart().then(fn => { cleanup = fn; loadCandles() })
    return () => { cleanup?.(); if (chartRef.current) { chartRef.current.remove(); chartRef.current = null } }
  }, [symbol, theme])

  useEffect(() => { if (candleRef.current) loadCandles() }, [tf])

  // Poll live price every 15s and update last candle
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/prices?symbols=${encodeURIComponent(symbol)}`)
        const d = await r.json()
        const cleanSym = symbol.replace(/\.(NS|BO|L|T|DE)$/, '')
        const p = d[cleanSym]?.price || d[symbol]?.price
        if (p && candleRef.current) setLivePrice(p)
      } catch {}
    }, 15000)
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
        {/* TF buttons */}
        <div style={{ display:'flex', gap:4 }}>
          {TFS.map(t => (
            <button key={t} onClick={() => setTf(t)} style={{
              fontFamily:'var(--sans)', fontSize:12, fontWeight:600, padding:'5px 10px',
              borderRadius:999, border:'none', cursor:'pointer', transition:'all .18s',
              background: tf===t ? '#009A51' : 'transparent',
              color: tf===t ? '#fff' : text,
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
      </div>

      {/* Chart container */}
      <div style={{ position:'relative', flex:1 }}>
        <div ref={containerRef} style={{ width:'100%', height:380 }} />
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
