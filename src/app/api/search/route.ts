import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 1) return NextResponse.json({ results: [] })

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=20&newsCount=0&listsCount=0&enableFuzzyQuery=true&enableCb=false&enableNavLinks=false`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return NextResponse.json({ results: [] })
    const data = await res.json()
    const quotes = data?.quotes || []

    const results = quotes
      .filter((q: any) => q.symbol && q.quoteType)
      .map((q: any) => ({
        sym:      q.symbol,
        name:     q.longname || q.shortname || q.symbol,
        exchange: q.exchange || '',
        exchDisp: q.exchDisp || q.exchange || '',
        type:     q.quoteType,
        typeDisp: q.typeDisp || q.quoteType,
        market:   detectMarket(q.exchange, q.symbol, q.quoteType),
      }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}

function detectMarket(exchange: string, symbol: string, type: string): string {
  const ex  = (exchange || '').toUpperCase()
  const sym = (symbol   || '').toUpperCase()
  if (ex === 'NSE' || ex === 'BSE' || sym.endsWith('.NS') || sym.endsWith('.BO')) return 'IN'
  if (type === 'CRYPTOCURRENCY' || sym.includes('-USD') || sym.includes('USDT'))  return 'Crypto'
  if (['NMS','NYQ','NGM','PCX','BTS','ASE'].includes(ex)) return 'US'
  if (ex === 'LSE'   || sym.endsWith('.L'))  return 'UK'
  if (ex === 'TSE'   || sym.endsWith('.T'))  return 'JP'
  if (ex === 'XETRA' || sym.endsWith('.DE')) return 'DE'
  return exchange || 'Global'
}
