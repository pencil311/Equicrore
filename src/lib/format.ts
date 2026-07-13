/* ============================================================
   Currency & number formatting — Indian style (lakh/crore)
   Ported from the Equicrore design handoff (dash-data.jsx)
   ============================================================ */

/** Format a number as Indian Rupees with lakh/crore grouping.
 *  e.g. 1184000 → ₹11,84,000
 *  Uses the minus glyph (U+2212) for negatives, not a hyphen.
 */
export function inr(n: number, dec?: number): string {
  const neg = n < 0
  n = Math.abs(n)
  let s = (dec != null && dec > 0) ? n.toFixed(dec) : Math.round(n).toString()
  let intp = s.includes('.') ? s.split('.')[0] : s
  const frac = s.includes('.') ? '.' + s.split('.')[1] : ''
  if (intp.length > 3) {
    const last3 = intp.slice(-3)
    const rest = intp.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
    intp = rest + ',' + last3
  }
  return (neg ? '−' : '') + '₹' + intp + frac
}

/** Compact Indian Rupee format: ₹1.18 Cr / ₹4.2 L */
export function inrShort(n: number): string {
  const neg = n < 0
  n = Math.abs(n)
  let out: string
  if (n >= 10_000_000) out = (n / 10_000_000).toFixed(2) + ' Cr'
  else if (n >= 100_000) out = (n / 100_000).toFixed(2) + ' L'
  else out = Math.round(n).toLocaleString('en-IN')
  return (neg ? '−' : '') + '₹' + out
}

/** Format percentage with sign. e.g. pct(18.4) → '+18.40%' */
export function pct(n: number): string {
  return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%'
}

/** Local calendar date as YYYY-MM-DD (never UTC — a trade recorded at
 *  1 AM IST must count as the IST day, not the UTC one). */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format large numbers compactly for axis labels */
export function shortNum(n: number): string {
  if (n >= 10_000_000) return (n / 10_000_000).toFixed(1) + 'Cr'
  if (n >= 100_000) return (n / 100_000).toFixed(1) + 'L'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(Math.round(n))
}
