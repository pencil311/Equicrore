import { NextRequest, NextResponse } from 'next/server'

/* ============================================================
   GET /api/candles?symbol=RELIANCE.NS&range=1y&interval=1d
   Fetches OHLCV historical data from Yahoo Finance
   Works for: NSE/BSE stocks, US stocks, crypto, futures, ETFs
   ============================================================ */

const RANGE_MAP: Record<string, { range: string; interval: string }> = {
  '1D': { range: '1d',  interval: '5m'  },
  '1W': { range: '5d',  interval: '15m' },
  '1M': { range: '1mo', interval: '1d'  },
  '3M': { range: '3mo', interval: '1d'  },
  '1Y': { range: '1y',  interval: '1wk' },
  '5Y': { range: '5y',  interval: '1mo' },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol   = searchParams.get('symbol')?.trim()
  const tf       = searchParams.get('tf') || '1M'

  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })

  const { range, interval } = RANGE_MAP[tf] || RANGE_MAP['1M']

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 })

    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return NextResponse.json({ candles: [] })

    const timestamps = result.timestamp || []
    const ohlcv = result.indicators?.quote?.[0] || {}
    const { open, high, low, close, volume } = ohlcv

    const candles = timestamps
      .map((t: number, i: number) => ({
        time:   t,
        open:   open?.[i]   ?? null,
        high:   high?.[i]   ?? null,
        low:    low?.[i]    ?? null,
        close:  close?.[i]  ?? null,
        volume: volume?.[i] ?? 0,
      }))
      .filter((c: any) => c.open != null && c.close != null)

    const meta = result.meta || {}
    return NextResponse.json({
      candles,
      currency:     meta.currency || 'INR',
      exchangeName: meta.exchangeName || '',
      regularMarketPrice: meta.regularMarketPrice || 0,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
