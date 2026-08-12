'use client'
import { useEffect, useState } from 'react'

/* ============================================================
   Live USD → INR rate, shared by every consumer.

   One module-level cache + one in-flight request no matter how many
   components subscribe — the rate barely moves, so refetching per
   component would be pure waste. Refreshed every 5 minutes.
   ============================================================ */

/** Used until the first successful fetch, and if the API is unreachable. */
export const FALLBACK_USD_INR = 83

const REFRESH_MS = 5 * 60 * 1000

export interface UsdInr {
  rate: number
  /** false while still on the fallback — callers can flag it in the UI */
  live: boolean
}

let cache: UsdInr = { rate: FALLBACK_USD_INR, live: false }
let fetchedAt = 0
let inflight: Promise<void> | null = null
const subscribers = new Set<(v: UsdInr) => void>()

function publish(next: UsdInr) {
  cache = next
  subscribers.forEach(fn => fn(next))
}

function refresh(): Promise<void> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch('/api/prices?symbols=USDINR')
      if (res.ok) {
        const data = await res.json() as Record<string, { price?: number }>
        const p = data.USDINR?.price
        if (typeof p === 'number' && p > 0) {
          fetchedAt = Date.now()
          publish({ rate: p, live: true })
        }
      }
    } catch {
      /* keep whatever we have — fallback or last good rate */
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export function useUsdInr(): UsdInr {
  const [value, setValue] = useState<UsdInr>(cache)

  useEffect(() => {
    subscribers.add(setValue)
    setValue(cache)
    if (Date.now() - fetchedAt > REFRESH_MS) refresh()

    const id = setInterval(refresh, REFRESH_MS)
    return () => {
      subscribers.delete(setValue)
      clearInterval(id)
    }
  }, [])

  return value
}
