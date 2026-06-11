'use client'
import { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol: string
  market: string
  exchange?: string
  theme?: 'light' | 'dark'
}

const FUTURES_MAP: Record<string, string> = {
  'CL=F': 'NYMEX:CL1!', 'BZ=F': 'ICEUS:BZ1!', 'GC=F': 'COMEX:GC1!',
  'SI=F': 'COMEX:SI1!', 'NG=F': 'NYMEX:NG1!', 'ES=F': 'CME:ES1!',
  'NQ=F': 'CME:NQ1!',   'YM=F': 'CBOT:YM1!',  'ZC=F': 'CBOT:ZC1!',
  'ZW=F': 'CBOT:ZW1!',
}

const CRYPTO_COINBASE = new Set(['BTC-USD', 'ETH-USD', 'SOL-USD'])

function toTVSymbol(sym: string, market: string, exchange = ''): string {
  if (sym.includes('=F')) {
    return FUTURES_MAP[sym] ?? `NYMEX:${sym.replace('=F', '1!')}`
  }
  if (market === 'Crypto' || sym.includes('-USD')) {
    if (CRYPTO_COINBASE.has(sym)) return `COINBASE:${sym.replace('-USD', 'USD')}`
    if (sym.includes('-USD')) return `BINANCE:${sym.replace('-USD', '')}USDT`
    return `BINANCE:${sym.replace('-', '')}`
  }
  if (sym.endsWith('.NS')) return `NSE:${sym.slice(0, -3)}`
  if (sym.endsWith('.BO')) return `BSE:${sym.slice(0, -3)}`
  if (market === 'IN') return `NSE:${sym}`
  if (sym.endsWith('.L'))  return `LSE:${sym.slice(0, -2)}`
  if (sym.endsWith('.T'))  return `TSE:${sym.slice(0, -2)}`
  if (sym.endsWith('.DE')) return `XETRA:${sym.slice(0, -3)}`
  const ex = exchange.toUpperCase()
  return ['NMS', 'NGM', 'NCM'].includes(ex) ? `NASDAQ:${sym}` : `NYSE:${sym}`
}

export default function TradingViewChart({ symbol, market, exchange, theme = 'light' }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tvSym = toTVSymbol(symbol, market, exchange)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSym,
      interval: 'D',
      timezone: 'Asia/Kolkata',
      theme: theme,
      style: '1',
      locale: 'en',
      backgroundColor: theme === 'dark' ? '#0e2017' : '#fbfdfb',
      gridColor: theme === 'dark' ? 'rgba(180,240,200,0.06)' : 'rgba(0,60,32,0.06)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    })

    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [tvSym, theme])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: '100%', height: '100%' }}
    />
  )
}
