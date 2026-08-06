/* ============================================================
   Symbol translation helpers shared by the Positions and
   P&L Charts pages. Pure functions — no React.
   ============================================================ */

import { allSymbols, watchCategories, type WatchSymbol } from './watchlists'
import { resolvePriceSymbol, lookupYahoo } from './priceSymbols'

/* TradingView symbol → watchlist group (used for badge / dot colour) */
export const SYM_GROUP: Record<string, { color: string; label: string }> = {}
for (const c of watchCategories) {
  for (const s of c.symbols) SYM_GROUP[s.sym] = { color: c.color, label: c.label }
}

/** Bare ticker for display — 'NSE:RELIANCE' → 'RELIANCE' */
export function toTicker(tvSym: string): string {
  return tvSym.includes(':') ? tvSym.slice(tvSym.indexOf(':') + 1) : tvSym
}

/** Symbol used by /api/prices — strips the exchange and the USDT pair suffix */
export function toPriceSym(tvSym: string): string {
  const base = toTicker(tvSym)
  return base.endsWith('USDT') ? base.slice(0, -4) : base
}

const CRYPTO_EX = new Set(['BINANCE', 'COINBASE', 'BITSTAMP', 'KRAKEN', 'BYBIT'])
const US_EX     = new Set(['NASDAQ', 'NYSE', 'AMEX', 'ARCA', 'BATS', 'OTC'])
const FX_EX     = new Set(['FX', 'FX_IDC', 'OANDA', 'FOREXCOM'])
/* Quote currencies stripped off a crypto pair, longest first so USDT beats USD */
const CRYPTO_QUOTES = ['USDT', 'BUSD', 'USDC', 'USD']

/** Watchlist symbol → Yahoo Finance symbol that CandleChart / /api/candles wants.
 *
 *  'NSE:RELIANCE'     → 'RELIANCE.NS'    'BSE:TCS'        → 'TCS.BO'
 *  'BINANCE:BTCUSDT'  → 'BTC-USD'        'BINANCE:ETHUSDT'→ 'ETH-USD'
 *  'NASDAQ:AAPL'      → 'AAPL'           'NSE:NIFTY'      → '^NSEI'
 *  'MCX:CRUDEOIL1!'   → 'CL=F'           'MCX:GOLD1!'     → 'GC=F'
 *  'FX:EURUSD'        → 'EURUSD=X'       'TVC:XAUUSD'     → 'GC=F'
 *
 *  Order matters: the explicit table wins over exchange conventions so that
 *  index/futures tickers ('NSE:NIFTY', 'MCX:GOLD1!') don't get a '.NS' suffix.
 *  Unknown symbols on a non-NSE exchange are returned bare rather than guessed
 *  as '.NS' — a wrong guess produces a broken request ('BTC.D.NS'), whereas the
 *  bare symbol at least fails cleanly and shows the "not available" message. */
export function toYahooSymbol(tvSym: string): string {
  const hasEx = tvSym.includes(':')
  const ex    = hasEx ? tvSym.slice(0, tvSym.indexOf(':')).toUpperCase() : ''
  const base  = toTicker(tvSym)

  /* 1. Crypto pairs → Yahoo's COIN-USD form */
  if (CRYPTO_EX.has(ex)) {
    const q = CRYPTO_QUOTES.find(q => base.endsWith(q) && base.length > q.length)
    return `${q ? base.slice(0, -q.length) : base}-USD`
  }

  /* 2. Known explicit mapping — indices, futures, commodities, FX, US tickers */
  const known = lookupYahoo(base)
  if (known) return known

  /* 3. Per-exchange conventions */
  if (ex === 'NSE')     return `${base.replace(/_/g, '-')}.NS`
  if (ex === 'BSE')     return `${base.replace(/_/g, '-')}.BO`
  if (US_EX.has(ex))    return base
  if (FX_EX.has(ex))    return `${base}=X`

  /* 4. Unknown exchange → return bare; no exchange → let the resolver guess */
  if (hasEx) return base
  const r = resolvePriceSymbol(base)
  if (r.yahoo)     return r.yahoo
  if (r.coingecko) return `${r.key}-USD`
  return base
}

/** Resolve a trade record back to a watchlist entry so it can be charted.
 *  Falls back to a synthetic entry for instruments no longer in the watchlists. */
export function findWatchSymbol(sym: string, name?: string, category?: string): WatchSymbol {
  const byName = name ? allSymbols.find(s => s.name === name) : undefined
  if (byName) return byName
  const bySym = allSymbols.find(s => toPriceSym(s.sym) === sym)
  if (bySym) return bySym
  return { sym, name: name || sym, category: category || 'Equities' }
}
