/* ============================================================
   Symbol resolution for the /api/prices route.
   Maps app symbols (TradingView-style bases, display names,
   bare NSE tickers) to Yahoo Finance symbols or CoinGecko ids.
   Built from the watchlists so every pickable instrument resolves.
   ============================================================ */

import { watchCategories } from './watchlists'

/* CoinGecko ids for every coin in the crypto watchlist */
export const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', MATIC: 'matic-network',
  DOT: 'polkadot', AVAX: 'avalanche-2', LINK: 'chainlink', UNI: 'uniswap',
  LTC: 'litecoin', ATOM: 'cosmos', TRX: 'tron', NEAR: 'near', XLM: 'stellar',
  VET: 'vechain', ICP: 'internet-computer', FLOW: 'flow', EGLD: 'elrond-erd-2',
  XTZ: 'tezos', SHIB: 'shiba-inu', PEPE: 'pepe', FLOKI: 'floki', BONK: 'bonk',
  WIF: 'dogwifcoin', TRUMP: 'official-trump', CRV: 'curve-dao-token',
  SUSHI: 'sushi', RUNE: 'thorchain', LDO: 'lido-dao', GRT: 'the-graph',
  INJ: 'injective-protocol', DYDX: 'dydx-chain', '1INCH': '1inch',
  ORAI: 'oraichain-token', AXS: 'axie-infinity', SAND: 'the-sandbox',
  MANA: 'decentraland', GALA: 'gala', ALICE: 'my-neighbor-alice',
  ENJ: 'enjincoin', CHZ: 'chiliz', RENDER: 'render-token', FET: 'fetch-ai',
  TAO: 'bittensor', JUP: 'jupiter-exchange-solana', STRK: 'starknet',
  PNUT: 'peanut-the-squirrel', AUDIO: 'audius', CHR: 'chromia',
  POND: 'marlin', ROSE: 'oasis-network', DGB: 'digibyte',
}

/* Indices, futures and commodities — TradingView base → Yahoo symbol.
   MCX contracts have no Yahoo feed, so they proxy to the global
   equivalent (USD-denominated). */
const EXPLICIT: Record<string, string> = {
  /* Indian indices */
  NIFTY: '^NSEI', 'NIFTY1!': '^NSEI',
  BANKNIFTY: '^NSEBANK', 'BANKNIFTY1!': '^NSEBANK',
  SENSEX: '^BSESN', INDIAVIX: '^INDIAVIX',
  CNXFINANCE: 'NIFTY_FIN_SERVICE.NS',
  NIFTY_MID_SELECT: 'NIFTY_MID_SELECT.NS',
  CNXMIDCAP: 'NIFTY_MIDCAP_100.NS',
  NIFTY_IND_DEFENCE: 'NIFTY_IND_DEFENCE.NS',
  CNXREALTY: '^CNXREALTY', CNXMEDIA: '^CNXMEDIA', CNXPSUBANK: '^CNXPSUBANK',
  CNXMETAL: '^CNXMETAL', CNXINFRA: '^CNXINFRA', CNXCOMMODITIES: '^CNXCMDT',
  CNXSMALLCAP: '^CNXSC', CNXPHARMA: '^CNXPHARMA', CNXAUTO: '^CNXAUTO',
  CNXIT: '^CNXIT', CNXENERGY: '^CNXENERGY', CNXFMCG: '^CNXFMCG',
  /* Global indices & futures */
  SPX500: '^GSPC', DJI: '^DJI', NDX: '^NDX', VIX: '^VIX', US30USD: '^DJI',
  EUSTX50: '^STOXX50E', CAC40: '^FCHI', DAX: '^GDAXI', NI225: '^N225',
  'YM1!': 'YM=F', 'NQ1!': 'NQ=F', 'VX1!': '^VIX', US10Y: '^TNX',
  /* Commodities (MCX contracts proxy to global futures, USD) */
  'GOLD1!': 'GC=F', XAUUSD: 'GC=F',
  'SILVER1!': 'SI=F', SILVER: 'SI=F', PLATINUM: 'PL=F',
  'CRUDEOIL1!': 'CL=F', USOIL: 'CL=F', 'CL1!': 'CL=F',
  'NATURALGAS1!': 'NG=F', NATURALGAS: 'NG=F',
  /* Currency */
  USDINR: 'USDINR=X',
  /* US stocks used around the app */
  AAPL: 'AAPL', NVDA: 'NVDA', TSLA: 'TSLA', MSFT: 'MSFT',
  AMZN: 'AMZN', GOOGL: 'GOOGL', META: 'META', NFLX: 'NFLX',
}

function stripCryptoSuffix(base: string): string {
  if (base.endsWith('USDT')) return base.slice(0, -4)
  if (base.endsWith('USD')) return base.slice(0, -3)
  return base
}

/* key → Yahoo symbol, plus display-name aliases (holdings created from a
   record store the instrument NAME, e.g. "HDFC Bank" → sym "HDFC BANK") */
const YAHOO: Record<string, string> = { ...EXPLICIT }
const NAME_ALIAS: Record<string, string> = {}

for (const cat of watchCategories) {
  for (const s of cat.symbols) {
    const [ex, base] = s.sym.includes(':')
      ? [s.sym.slice(0, s.sym.indexOf(':')), s.sym.slice(s.sym.indexOf(':') + 1)]
      : ['', s.sym]
    let key = base
    let yahoo: string | null = null
    if (ex === 'BINANCE') {
      key = stripCryptoSuffix(base) // crypto — CoinGecko handles it
    } else if (EXPLICIT[base]) {
      yahoo = EXPLICIT[base]
    } else if (ex === 'FX') {
      yahoo = `${base}=X`
    } else if (ex === 'NSE') {
      yahoo = `${base.replace(/_/g, '-')}.NS`
    }
    if (yahoo) {
      YAHOO[key] = yahoo
      NAME_ALIAS[s.name.toUpperCase()] = key
    } else if (CRYPTO_IDS[key]) {
      NAME_ALIAS[s.name.toUpperCase()] = key
    }
  }
}

export interface ResolvedSymbol {
  /** response/cache key — the requested symbol with .NS/.BO stripped */
  key: string
  yahoo?: string
  coingecko?: string
}

export function resolvePriceSymbol(raw: string): ResolvedSymbol {
  const trimmed = raw.trim()
  const clean = trimmed.replace(/\.(NS|BO)$/i, '')

  /* Already Yahoo-formatted (TCS.NS, ^NSEI, GC=F, BTC-USD) → pass through */
  if (/\.(NS|BO)$/i.test(trimmed)) return { key: clean, yahoo: trimmed }
  if (/[\^=]/.test(trimmed) || /-USD$/.test(trimmed)) return { key: trimmed, yahoo: trimmed }

  const upper = clean.toUpperCase()
  const canonical = NAME_ALIAS[upper] ?? upper

  /* Crypto (accept bare BTC, pair forms BTCUSDT/SOLUSD, and coin names) —
     forex pairs like AUDUSD resolve via YAHOO first so they aren't eaten */
  if (!YAHOO[canonical]) {
    const base = CRYPTO_IDS[canonical] ? canonical
      : CRYPTO_IDS[stripCryptoSuffix(canonical)] ? stripCryptoSuffix(canonical)
      : null
    if (base) return { key: clean, coingecko: CRYPTO_IDS[base] }
  }

  /* Known mapping, else assume NSE stock */
  return { key: clean, yahoo: YAHOO[canonical] ?? `${canonical.replace(/_/g, '-')}.NS` }
}
