import { NextRequest, NextResponse } from 'next/server'
import { resolvePriceSymbol } from '@/lib/priceSymbols'

/* ============================================================
   GET /api/prices?symbols=RELIANCE.NS,NIFTY,CRUDEOIL1!,AAPL,BTC
   Returns real-time prices for Indian/US stocks, indices,
   commodities, forex and crypto.

   Symbols are resolved via lib/priceSymbols: bare NSE tickers,
   TradingView bases (NIFTY, CRUDEOIL1!), display names and
   pre-formatted Yahoo symbols all work. Crypto goes to CoinGecko.
   Response is keyed by the requested symbol (.NS/.BO stripped).
   ============================================================ */

const CACHE: Record<string, { price: number; chg: number; chgPct: number; ts: number }> = {}
const CACHE_TTL = 15_000 // 15 seconds

/* The v7 quote API needs a cookie+crumb handshake (401 without it), so we
   quote via the public v8 chart endpoint instead — one request per symbol,
   fetched in parallel and softened by the 15 s cache. */
async function fetchYahooOne(symbol: string): Promise<any | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=false`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      next: { revalidate: 15 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta || meta.regularMarketPrice == null) return null
    const price = meta.regularMarketPrice
    const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price
    return {
      price,
      chg:    price - prev,
      chgPct: prev ? ((price - prev) / prev) * 100 : 0,
      name:   meta.shortName || meta.symbol,
      currency: meta.currency || 'INR',
    }
  } catch {
    return null
  }
}

async function fetchYahoo(symbols: string[]): Promise<Record<string, any>> {
  if (!symbols.length) return {}
  const results = await Promise.all(
    symbols.map(async s => [s, await fetchYahooOne(s)] as const)
  )
  const out: Record<string, any> = {}
  for (const [s, d] of results) if (d) out[s] = d
  return out
}

async function fetchCoinGecko(coinIds: string[]): Promise<Record<string, any>> {
  if (!coinIds.length) return {}
  const ids = encodeURIComponent(coinIds.join(','))
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=inr,usd&include_24hr_change=true`

  try {
    const res = await fetch(url, { next: { revalidate: 15 } })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('symbols') || ''
  if (!raw) return NextResponse.json({})

  const entries = raw.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => resolvePriceSymbol(s))

  const now = Date.now()
  const uncached = entries.filter(e => !CACHE[e.key] || now - CACHE[e.key].ts > CACHE_TTL)

  const yahooSyms = Array.from(new Set(uncached.filter(e => e.yahoo).map(e => e.yahoo!)))
  const coinIds   = Array.from(new Set(uncached.filter(e => e.coingecko).map(e => e.coingecko!)))

  const [yahooData, cgData] = await Promise.all([
    yahooSyms.length ? fetchYahoo(yahooSyms) : Promise.resolve({} as Record<string, any>),
    coinIds.length ? fetchCoinGecko(coinIds) : Promise.resolve({} as Record<string, any>),
  ])

  for (const e of uncached) {
    if (e.yahoo && yahooData[e.yahoo]) {
      const d = yahooData[e.yahoo]
      CACHE[e.key] = { price: d.price, chg: d.chg, chgPct: d.chgPct, ts: now }
    } else if (e.coingecko && cgData[e.coingecko]) {
      const d = cgData[e.coingecko]
      CACHE[e.key] = {
        price: d.inr ?? d.usd ?? 0,
        chg: 0,
        chgPct: d.inr_24h_change ?? d.usd_24h_change ?? 0,
        ts: now,
      }
    }
  }

  const result: Record<string, any> = {}
  for (const e of entries) {
    if (CACHE[e.key]) result[e.key] = CACHE[e.key]
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=15' }
  })
}
