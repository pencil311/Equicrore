/* Portfolio localStorage utilities — single source of truth for holdings and cash */

export interface PortfolioHolding {
  sym: string
  name: string
  type: string
  qty: number
  avg: number
  price: number
  color: string
}

export interface TradeRecord {
  type: 'BUY' | 'SELL'
  sym: string
  instrument: string
  category: string
  quantity: number
  price: number
  profit: number
  date: string
  status: string
}

const KEYS = {
  records:  'eq-records',
  holdings: 'eq-holdings',
  cash:     'eq-cash',
  capital:  'eq-starting-capital',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function write(key: string, val: unknown): void {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(val))
  } catch {}
}

const COLORS = [
  '#1a73c7','#7a3ec2','#0b8f6a','#c2762e','#d39021',
  '#2e9c8e','#c2402e','#1f55b5','#5b6ad0','#76b900',
  '#4a9e8a','#b84c9e','#6b7280','#d4a522','#3b82f6',
]

function colorFor(sym: string): string {
  let h = 0
  for (const ch of sym) h = (h * 31 + ch.charCodeAt(0)) & 0x7fff
  return COLORS[h % COLORS.length]
}

export function getRecords(): TradeRecord[]           { return read(KEYS.records,  []) }
export function saveRecords(r: TradeRecord[]): void   { write(KEYS.records, r) }

export function getHoldings(): PortfolioHolding[]           { return read(KEYS.holdings, []) }
export function saveHoldings(h: PortfolioHolding[]): void   { write(KEYS.holdings, h) }

export function getCash(): number             { return read(KEYS.cash, 0) }
export function saveCash(n: number): void     { write(KEYS.cash, n) }

export function getStartingCapital(): number          { return read(KEYS.capital, 0) }
export function saveStartingCapital(n: number): void  { write(KEYS.capital, n) }

/**
 * Apply a single trade record onto a holdings + cash snapshot.
 * Pure — does not mutate inputs, does not touch localStorage.
 *
 * BUY  → add/update holding (weighted avg), deduct qty×price from cash
 * SELL → reduce/remove holding, add qty×price proceeds to cash
 */
export function processRecord(
  rec: TradeRecord,
  holdings: PortfolioHolding[],
  cash: number,
): { holdings: PortfolioHolding[]; cash: number } {
  const next     = holdings.map(h => ({ ...h }))
  let   nextCash = cash

  const key   = (rec.instrument || rec.sym).toUpperCase()
  const qty   = rec.quantity ?? 0
  const price = rec.price    ?? 0
  const cost  = qty * price

  if (rec.type === 'BUY') {
    const idx = next.findIndex(h => h.sym.toUpperCase() === key)
    if (idx >= 0) {
      const h        = next[idx]
      const totalQty = h.qty + qty
      const newAvg   = totalQty > 0 ? (h.qty * h.avg + qty * price) / totalQty : price
      next[idx]      = { ...h, qty: totalQty, avg: newAvg, price: price > 0 ? price : h.price }
    } else {
      next.push({
        sym:   key,
        name:  rec.instrument || rec.sym,
        type:  rec.category || 'Equities',
        qty,
        avg:   price,
        price: price,
        color: colorFor(key),
      })
    }
    if (cost > 0) nextCash = Math.max(0, nextCash - cost)
  } else {
    // SELL — reduce holding, add proceeds
    const idx = next.findIndex(h => h.sym.toUpperCase() === key)
    if (idx >= 0) {
      const remaining = next[idx].qty - qty
      if (remaining <= 0) {
        next.splice(idx, 1)
      } else {
        next[idx] = { ...next[idx], qty: remaining }
      }
    }
    if (cost > 0) nextCash += cost
  }

  return { holdings: next, cash: nextCash }
}

/**
 * Rebuild holdings and cash from scratch by replaying every record in order.
 * Used when recalculating after loading from localStorage.
 */
export function recalculateHoldings(
  records: TradeRecord[],
  startingCash: number,
): { holdings: PortfolioHolding[]; cash: number } {
  let h: PortfolioHolding[] = []
  let c = startingCash
  for (const rec of records) {
    ({ holdings: h, cash: c } = processRecord(rec, h, c))
  }
  return { holdings: h, cash: c }
}
