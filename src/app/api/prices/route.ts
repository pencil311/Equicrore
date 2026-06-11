import { NextRequest, NextResponse } from 'next/server'

/* ============================================================
   GET /api/prices?symbols=RELIANCE.NS,TCS.NS,AAPL,BTC
   Returns real-time prices for Indian stocks, US stocks, crypto.

   Indian stocks: append .NS (NSE) or .BO (BSE) for Yahoo Finance
   US stocks: just the ticker (AAPL, NVDA, TSLA)
   Crypto: use coin IDs prefixed with crypto: (crypto:bitcoin)
   ============================================================ */

const CACHE: Record<string, { price: number; chg: number; chgPct: number; ts: number }> = {}
const CACHE_TTL = 15_000 // 15 seconds

// CoinGecko coin ID map for common cryptos
const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', MATIC: 'matic-network',
  DOT: 'polkadot', AVAX: 'avalanche-2', LINK: 'chainlink', UNI: 'uniswap',
  LTC: 'litecoin', ATOM: 'cosmos', TRX: 'tron',
}

async function fetchYahoo(symbols: string[]): Promise<Record<string, any>> {
  if (!symbols.length) return {}
  const joined = symbols.join(',')
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${joined}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,shortName,currency`

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      next: { revalidate: 15 },
    })
    if (!res.ok) return {}
    const data = await res.json()
    const quotes = data?.quoteResponse?.result || []
    const out: Record<string, any> = {}
    for (const q of quotes) {
      out[q.symbol] = {
        price:  q.regularMarketPrice ?? 0,
        chg:    q.regularMarketChange ?? 0,
        chgPct: q.regularMarketChangePercent ?? 0,
        name:   q.shortName || q.symbol,
        currency: q.currency || 'INR',
      }
    }
    return out
  } catch {
    return {}
  }
}

async function fetchCoinGecko(coinIds: string[]): Promise<Record<string, any>> {
  if (!coinIds.length) return {}
  const ids = coinIds.join(',')
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

  const symbols = raw.split(',').map(s => s.trim()).filter(Boolean)
  const now = Date.now()

  // Separate crypto vs stock symbols
  const cryptoSyms: string[] = []
  const stockSyms: string[] = []

  for (const sym of symbols) {
    if (CRYPTO_IDS[sym]) cryptoSyms.push(sym)
    else stockSyms.push(sym)
  }

  // Check cache
  const uncachedStocks = stockSyms.filter(s => !CACHE[s] || now - CACHE[s].ts > CACHE_TTL)
  const uncachedCrypto = cryptoSyms.filter(s => !CACHE[s] || now - CACHE[s].ts > CACHE_TTL)

  // Fetch in parallel
  const [yahooData, cgData] = await Promise.all([
    uncachedStocks.length ? fetchYahoo(uncachedStocks) : Promise.resolve({} as Record<string, any>),
    uncachedCrypto.length ? fetchCoinGecko(uncachedCrypto.map(s => CRYPTO_IDS[s])) : Promise.resolve({} as Record<string, any>),
  ])

  // Update cache for stocks
  for (const [sym, d] of Object.entries(yahooData) as [string, any][]) {
    // Strip .NS/.BO suffix for cache key
    const key = sym.replace(/\.(NS|BO)$/, '')
    CACHE[key] = { price: d.price, chg: d.chg, chgPct: d.chgPct, ts: now }
  }

  // Update cache for crypto
  for (const sym of uncachedCrypto) {
    const id = CRYPTO_IDS[sym]
    const d = cgData[id]
    if (d) {
      CACHE[sym] = {
        price: d.inr ?? d.usd ?? 0,
        chg: 0,
        chgPct: d.inr_24h_change ?? d.usd_24h_change ?? 0,
        ts: now,
      }
    }
  }

  // Build response
  const result: Record<string, any> = {}
  for (const sym of symbols) {
    const cleanSym = sym.replace(/\.(NS|BO)$/, '')
    if (CACHE[cleanSym]) {
      result[cleanSym] = CACHE[cleanSym]
    }
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=15' }
  })
}
