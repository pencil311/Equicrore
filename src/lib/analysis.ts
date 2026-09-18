/* ============================================================
   Analysis page maths — real benchmark return vs a typed portfolio %.
   Pure, no React.
   ============================================================ */

import { localDateISO } from './format'

export type Range = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL'
export const RANGES: Range[] = ['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL']
const MONTHS: Record<Exclude<Range, 'ALL'>, number> = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60 }
export const RANGE_PHRASE: Record<Range, string> = {
  '1M': 'over the last month', '3M': 'over the last 3 months', '6M': 'over the last 6 months',
  '1Y': 'over the last year', '3Y': 'over the last 3 years', '5Y': 'over the last 5 years',
  ALL: 'over the full period',
}

/** First date (YYYY-MM-DD, local) of the range; null for ALL (= all benchmark history). */
export function rangeStart(range: Range, today = new Date()): string | null {
  if (range === 'ALL') return null
  const d = new Date(today)
  d.setMonth(d.getMonth() - MONTHS[range])
  return localDateISO(d)
}

export interface BenchClose { date: string; close: number }
export interface ChartPoint { t: number; date: string; portfolio: number | null; benchmark: number | null }

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/** Benchmark as real cumulative % return from 0 at the range start; the portfolio
 *  as an illustrative eased curve from 0 to `portfolioPct` over the same dates. */
export function buildChart(opts: {
  bench: BenchClose[]
  start: string | null
  today: string
  portfolioPct: number | null
}): { points: ChartPoint[]; benchmarkPct: number | null; from: string } {
  const { today, portfolioPct } = opts
  /* One close per day (Yahoo can repeat the last session as a live bar); keep the latest */
  const byDate = new Map<string, number>()
  for (const b of opts.bench) if (b.close > 0 && b.date <= today && (!opts.start || b.date >= opts.start)) byDate.set(b.date, b.close)
  const bench = Array.from(byDate, ([date, close]) => ({ date, close })).sort((a, b) => a.date.localeCompare(b.date))
  const from = opts.start ?? bench[0]?.date ?? today
  const b0 = bench[0]?.close ?? null

  /* Dates: the benchmark's own trading days, or an even grid when it has none */
  let dates = bench.map(b => b.date)
  if (dates.length < 2) {
    const a = new Date(from + 'T00:00:00').getTime(), z = new Date(today + 'T00:00:00').getTime()
    dates = Array.from({ length: 60 }, (_, i) => localDateISO(new Date(a + ((z - a) * i) / 59)))
  }

  const t0 = new Date(dates[0] + 'T00:00:00').getTime()
  const tN = new Date(dates[dates.length - 1] + 'T00:00:00').getTime()
  const points = dates.map((date, i) => {
    const t = new Date(date + 'T00:00:00').getTime()
    const x = tN > t0 ? (t - t0) / (tN - t0) : 1
    return {
      t, date,
      portfolio: portfolioPct == null ? null : portfolioPct * ease(x),
      benchmark: b0 && bench.length > 1 ? (bench[i].close / b0 - 1) * 100 : null,
    }
  })

  return {
    points,
    benchmarkPct: b0 && bench.length > 1 ? (bench[bench.length - 1].close / b0 - 1) * 100 : null,
    from,
  }
}
