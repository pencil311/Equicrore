/* ============================================================
   Mock data for development (Phase 2 & 3)
   Replace with real API calls in Phase 5.
   ============================================================ */

export const CAPITAL = 10_000_000 // ₹1 crore starting capital

export interface Holding {
  sym: string
  name: string
  type: string
  qty: number
  avg: number
  price: number
  color: string
}

export interface WatchlistItem {
  sym: string
  name: string
  type: string
  price: number
  chg: number
  color: string
  flash?: string
}

export interface Transaction {
  type: 'BUY' | 'SELL'
  sym: string
  instrument?: string
  profit: number
  date: string
  status?: string
}

export interface LeaderboardEntry {
  rank: number
  name: string
  team: string
  av: string
  color: string
  value: number
  ret: number
  you?: boolean
}

export const holdings: Holding[] = [
  { sym: 'RELIANCE',  name: 'Reliance Industries',    type: 'Equity',      qty: 240,    avg: 2680,    price: 3012,    color: '#1a73c7' },
  { sym: 'TCS',       name: 'Tata Consultancy',       type: 'Equity',      qty: 140,    avg: 3640,    price: 3935,    color: '#7a3ec2' },
  { sym: 'INFY',      name: 'Infosys',                type: 'Equity',      qty: 300,    avg: 1485,    price: 1622,    color: '#0b8f6a' },
  { sym: 'NIFTYBEES', name: 'Nippon Nifty 50 ETF',    type: 'ETF',         qty: 900,    avg: 248,     price: 271,     color: '#c2762e' },
  { sym: 'PPFAS',     name: 'Parag Parikh Flexi Cap', type: 'Mutual Fund', qty: 3200,   avg: 74.2,    price: 81.6,    color: '#2e9c8e' },
  { sym: 'BTC',       name: 'Bitcoin (paper)',         type: 'Crypto',      qty: 0.42,   avg: 5420000, price: 5180000, color: '#d39021' },
]

export const watchlist: WatchlistItem[] = [
  { sym: 'HDFCBANK',   name: 'HDFC Bank',       type: 'Equity', price: 1712.4,  chg: 0.84,  color: '#1f55b5' },
  { sym: 'TATAMOTORS', name: 'Tata Motors',     type: 'Equity', price: 984.6,   chg: -1.22, color: '#3a6fb0' },
  { sym: 'ETH',        name: 'Ethereum',        type: 'Crypto', price: 298400,  chg: 2.41,  color: '#5b6ad0' },
  { sym: 'GOLDBEES',   name: 'Gold ETF',        type: 'ETF',    price: 68.9,    chg: 0.36,  color: '#c2962e' },
  { sym: 'ZOMATO',     name: 'Zomato',          type: 'Equity', price: 241.8,   chg: 3.05,  color: '#c2402e' },
  { sym: 'AAPL',       name: 'Apple Inc.',      type: 'Equity', price: 21340,   chg: 0.62,  color: '#555555' },
  { sym: 'NVDA',       name: 'NVIDIA Corp.',    type: 'Equity', price: 89200,   chg: 1.87,  color: '#76b900' },
]

export const transactions: Transaction[] = [
  { type: 'BUY',  sym: 'INFY',       profit: 13700,   date: '2026-06-03' },
  { type: 'SELL', sym: 'WIPRO',      profit: -6150,   date: '2026-06-03' },
  { type: 'BUY',  sym: 'NIFTYBEES', profit: 20700,   date: '2026-06-02' },
  { type: 'BUY',  sym: 'BTC',        profit: 650400,  date: '2026-06-02' },
  { type: 'SELL', sym: 'TATAMOTORS', profit: -3780,   date: '2026-05-31' },
]

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Aarav K.',  team: 'The Compounders', av: 'AK', color: '#1a73c7', value: 13420000, ret: 34.2 },
  { rank: 2, name: 'You',       team: 'Team Bullseye',   av: 'YS', color: '#009A51', value: 11840000, ret: 18.4, you: true },
  { rank: 3, name: 'Meera R.',  team: 'Dividend Club',   av: 'MR', color: '#7a3ec2', value: 11590000, ret: 15.9 },
  { rank: 4, name: 'Dev V.',    team: 'Team Bullseye',   av: 'DV', color: '#c2762e', value: 10910000, ret: 9.1  },
  { rank: 5, name: 'Sara P.',   team: 'The Compounders', av: 'SP', color: '#2e9c8e', value: 9870000,  ret: -1.3 },
]

/** Generate a realistic performance series for a given timeframe */
function series(points: number, start: number, end: number, vol: number): number[] {
  const arr: number[] = []
  let v = start
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const trend = start + (end - start) * t
    v = trend + Math.sin(i * 0.7) * vol * 0.5 + (Math.random() - 0.5) * vol
    arr.push(Math.max(v, start * 0.9))
  }
  arr[0] = start
  arr[points - 1] = end
  return arr.map(Math.round)
}

const NOW = 11_840_000

export const perfData: Record<string, { labels: string[]; data: number[] }> = {
  '1D': { labels: ['9:15','10:30','11:45','1:00','2:15','3:30'], data: series(26, 11_760_000, NOW, 38_000) },
  '1W': { labels: ['Mon','Tue','Wed','Thu','Fri'],               data: series(30, 11_420_000, NOW, 70_000) },
  '1M': { labels: ['Wk1','Wk2','Wk3','Wk4'],                    data: series(34, 10_980_000, NOW, 95_000) },
  '1Y': { labels: ['Jun','Aug','Oct','Dec','Feb','Apr'],         data: series(40, 10_000_000, NOW, 180_000) },
  'All':{ labels: ['Start','','','','Now'],                      data: series(44, 10_000_000, NOW, 150_000) },
}
