import { NextRequest, NextResponse } from 'next/server'

/* ============================================================
   GET /api/candles?symbol=RELIANCE.NS&tf=15m
   Fetches OHLCV historical data from Yahoo Finance
   Works for: NSE/BSE stocks, US stocks, crypto, futures, forex, ETFs

   Ranges below are the largest each interval actually returns, measured
   against the live endpoint rather than taken from the documented limits:
     1m   7d   -> ~2.6k bars      1h   730d -> ~5.1k bars
     2m   60d  -> ~6.4k bars      1d   10y  -> ~2.5k bars
     5m   60d  -> ~4.5k bars      1wk  10y  -> ~520 bars
     15m  60d  -> ~1.5k bars      1mo  full -> back to listing (1995 for RELIANCE)

   NOTE: `range=max` is NOT used. Yahoo collapses it to ~369 rows no matter
   which interval is asked for (max+1d, max+1wk and max+1mo all returned 369
   for RELIANCE.NS). Explicit ranges return far more — 10y+1d gives 2472 —
   and period1=0 gives true full history while still honouring the interval.
   ============================================================ */

interface TFSpec {
  interval: string
  range?:   string   // Yahoo `range` param
  full?:    boolean  // use period1=0..now instead of a range
  label:    string
}

const RANGE_MAP: Record<string, TFSpec> = {
  /* Intraday */
  '1m':  { range: '7d',   interval: '1m',  label: '1 minute'   },
  '2m':  { range: '60d',  interval: '2m',  label: '2 minutes'  },
  '5m':  { range: '60d',  interval: '5m',  label: '5 minutes'  },
  '15m': { range: '60d',  interval: '15m', label: '15 minutes' },
  '30m': { range: '60d',  interval: '30m', label: '30 minutes' },
  '1h':  { range: '730d', interval: '1h',  label: '1 hour'     },
  /* Daily and above */
  '1D':  { range: '10y',  interval: '1d',  label: '1 day'      },
  '1W':  { range: '10y',  interval: '1wk', label: '1 week'     },
  '1M':  { range: '10y',  interval: '1mo', label: '1 month'    },
  'MAX': { full: true,    interval: '1mo', label: 'All time'   },

  /* Legacy keys kept so older callers keep working */
  '3M':  { range: '3mo',  interval: '1d',  label: '1 day'      },
  '6M':  { range: '6mo',  interval: '1d',  label: '1 day'      },
  '1Y':  { range: '1y',   interval: '1d',  label: '1 day'      },
  '5Y':  { range: '5y',   interval: '1wk', label: '1 week'     },
}

/* Finest → coarsest. When a fine interval comes back empty (weekend, market
   closed, or an instrument with no intraday feed) we walk down this chain. */
const FALLBACK_ORDER = ['1m', '2m', '5m', '15m', '30m', '1h', '1D', '1W', '1M', 'MAX']
const MAX_FALLBACKS  = 3

interface Candle {
  time: number; open: number; high: number; low: number; close: number; volume: number
}

interface ChartFetch {
  candles: Candle[]
  currency: string
  exchangeName: string
  regularMarketPrice: number
}

async function fetchChart(symbol: string, spec: TFSpec): Promise<ChartFetch | null> {
  const params = spec.full
    ? `period1=0&period2=${Math.floor(Date.now() / 1000)}&interval=${spec.interval}`
    : `range=${spec.range}&interval=${spec.interval}`

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${params}&includePrePost=false`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 60 },
  })
  if (!res.ok) return null

  const data   = await res.json()
  const result = data?.chart?.result?.[0]
  if (!result) return null

  const timestamps = result.timestamp || []
  const ohlcv      = result.indicators?.quote?.[0] || {}
  const { open, high, low, close, volume } = ohlcv

  const candles: Candle[] = timestamps
    .map((t: number, i: number) => ({
      time:   t,
      open:   open?.[i]   ?? null,
      high:   high?.[i]   ?? null,
      low:    low?.[i]    ?? null,
      close:  close?.[i]  ?? null,
      volume: volume?.[i] ?? 0,
    }))
    .filter((c: Candle) => c.open != null && c.close != null)

  const meta = result.meta || {}
  return {
    candles,
    currency:           meta.currency || 'INR',
    exchangeName:       meta.exchangeName || '',
    regularMarketPrice: meta.regularMarketPrice || 0,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')?.trim()
  const tf     = searchParams.get('tf') || '1D'

  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 })
  if (!RANGE_MAP[tf]) return NextResponse.json({ error: `unknown tf "${tf}"` }, { status: 400 })

  /* Walk the fallback chain until something returns candles. Instruments differ:
     forex and crypto carry intraday data through the weekend, cash equities do not. */
  const startIdx = FALLBACK_ORDER.indexOf(tf)
  const chain    = startIdx === -1
    ? [tf]
    : [tf, ...FALLBACK_ORDER.slice(startIdx + 1, startIdx + 1 + MAX_FALLBACKS)]

  try {
    for (let i = 0; i < chain.length; i++) {
      const key  = chain[i]
      const spec = RANGE_MAP[key]
      if (!spec) continue

      const out = await fetchChart(symbol, spec)
      if (out && out.candles.length > 0) {
        return NextResponse.json({
          ...out,
          tf:          key,
          requestedTf: tf,
          fellBack:    key !== tf,
          interval:    spec.interval,
          intervalLabel: spec.label,
          range:       spec.full ? 'full' : spec.range,
        })
      }
    }
    return NextResponse.json({ candles: [], tf, requestedTf: tf, fellBack: false })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
