'use client'
import { useEffect, useRef, useState } from 'react'
import {
  motion, useScroll, useSpring, useTransform, useMotionValueEvent, useInView,
} from 'motion/react'
import { useReducedMotionMounted } from './LoopVideo'

interface Stat { num: string; label: string }

const clamp = (v: number) => Math.min(1, Math.max(0, v))
const seg = (v: number, a: number, b: number) => clamp((v - a) / (b - a))
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/* Scroll timeline (0..1 across the pinned section):
   0.00-0.42  the chart card opens to full bleed while the clip dives into one candle
   0.42-0.62  the frame is solid forest, held
   0.62-0.80  the forest frame closes down into the stats band's exact shape
   0.78+      the stats arrive, then the band releases with the page */
export default function ZoomBridge({ stats }: { stats: Stat[] }) {
  const reduce = useReducedMotionMounted()
  const section = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const band = useRef<HTMLDivElement>(null)
  const near = useInView(section, { margin: '600px' })
  const [shown, setShown] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 32, restDelta: 0.0005 })

  useMotionValueEvent(smooth, 'change', v => {
    const el = video.current
    if (el && el.readyState >= 1 && el.duration) {
      el.currentTime = seg(v, 0.02, 0.52) * (el.duration - 0.04)
    }
    if (v > 0.78 && !shown) setShown(true)
  })

  const clipPath = useTransform(smooth, v => {
    if (typeof window === 'undefined') return 'none'
    const w = window.innerWidth, h = window.innerHeight
    const bh = band.current?.offsetHeight ?? 170
    const cardX = Math.max(24, w / 2 - 300), cardY = h * 0.2
    const bandX = Math.max(24, (w - 1112) / 2)
    const bandTop = h * 0.58 - bh / 2, bandBot = h - bandTop - bh
    const e = easeOut(seg(v, 0, 0.42))
    const c = easeInOut(seg(v, 0.62, 0.8))
    const x = lerp(lerp(cardX, 0, e), bandX, c)
    const t = lerp(lerp(cardY, 0, e), bandTop, c)
    const b = lerp(lerp(cardY, 0, e), bandBot, c)
    const r = lerp(lerp(30, 0, e), 30, c)
    return `inset(${t}px ${x}px ${b}px ${x}px round ${r}px)`
  })
  const bandOpacity = useTransform(smooth, [0.76, 0.8], [0, 1])

  if (reduce) {
    return (
      <div ref={section} className="wrap">
        <div className="stats-band">
          {stats.map(s => (
            <div key={s.label} className="stat">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={section} className="zoom-bridge">
      <div className="zoom-stage">
        <motion.div className="zoom-frame" style={mounted ? { clipPath } : undefined}>
          <video
            ref={video}
            src={near ? '/assets/videos/zoom.mp4' : undefined}
            poster="/assets/videos/zoom.jpg"
            muted playsInline preload="auto" aria-hidden tabIndex={-1}
          />
        </motion.div>
        <div className="wrap zoom-band-slot">
          <motion.div
            ref={band}
            className="stats-band"
            style={{ opacity: bandOpacity }}
            initial="hidden"
            animate={shown ? 'show' : 'hidden'}
            variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
          >
            {stats.map(s => (
              <motion.div
                key={s.label}
                className="stat"
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } },
                }}
              >
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
