'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

const PTS = [22, 30, 26, 38, 34, 46, 42, 58, 52, 49, 63, 72, 68, 80, 88]
const H = 96

export default function HeroSparkline() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(360)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth || 360))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max = Math.max(...PTS), min = Math.min(...PTS)
  const X = (i: number) => (i / (PTS.length - 1)) * w
  const Y = (v: number) => H - ((v - min) / (max - min)) * (H - 12) - 6
  let d = `M0 ${Y(PTS[0])}`
  for (let i = 1; i < PTS.length; i++) {
    const cx = (X(i) + X(i - 1)) / 2
    d += ` C ${cx} ${Y(PTS[i - 1])}, ${cx} ${Y(PTS[i])}, ${X(i)} ${Y(PTS[i])}`
  }
  const area = d + ` L ${w} ${H} L 0 ${H} Z`
  const ease = [0.22, 0.61, 0.36, 1] as const

  return (
    <div ref={ref} style={{ margin: '18px 0 4px' }}>
      <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--green)" stopOpacity=".26" />
            <stop offset="1" stopColor="var(--green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area} fill="url(#hg)"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, delay: 0.9, ease }}
        />
        <motion.path
          d={d} fill="none" stroke="var(--green)" strokeWidth={2.5} strokeLinecap="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.7, delay: 0.2, ease }}
        />
      </svg>
    </div>
  )
}
