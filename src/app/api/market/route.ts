// Phase 5: Wire up CoinGecko + Yahoo Finance here
// GET /api/market?type=crypto|stocks-in|stocks-us&symbol=BTC

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const symbol = searchParams.get('symbol')

  // TODO Phase 5:
  // if (type === 'crypto') return fetchCoinGecko(symbol)
  // if (type === 'stocks-in') return fetchYahooFinanceIN(symbol)
  // if (type === 'stocks-us') return fetchYahooFinanceUS(symbol)

  return Response.json({ message: 'Market data API — Phase 5', type, symbol })
}
