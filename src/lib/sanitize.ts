export function sanitizeString(s: string, maxLen = 500): string {
  return String(s).trim().slice(0, maxLen).replace(/<[^>]*>/g, '')
}

export function sanitizeNumber(v: unknown): number | null {
  const n = Number(v)
  return isFinite(n) ? n : null
}
