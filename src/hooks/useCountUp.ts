'use client'
import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from its previous value to `target` over `duration` ms.
 * Ported from the Equicrore design handoff (dash-ui.jsx).
 * Includes a safety timeout so values are always correct even in throttled tabs.
 */
export function useCountUp(target: number, duration = 1100): number {
  const [val, setVal] = useState(target)
  const ref = useRef<{ val: number; raf: number }>({ val: target, raf: 0 })

  useEffect(() => {
    cancelAnimationFrame(ref.current.raf)
    const from = ref.current.val
    const to = target
    const t0 = performance.now()

    function tick(t: number) {
      const p = Math.min((t - t0) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3) // cubic ease-out
      const cur = from + (to - from) * e
      ref.current.val = cur
      setVal(cur)
      if (p < 1) ref.current.raf = requestAnimationFrame(tick)
    }

    ref.current.raf = requestAnimationFrame(tick)
    const safety = setTimeout(() => {
      ref.current.val = to
      setVal(to)
    }, duration + 260)

    return () => {
      cancelAnimationFrame(ref.current.raf)
      clearTimeout(safety)
    }
  }, [target, duration])

  return val
}
