'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, useInView, useReducedMotion, type MotionStyle } from 'motion/react'

/* Tracks <html data-theme> so a themed clip swaps when the theme toggles */
export function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const read = () => setDark(el.getAttribute('data-theme') === 'dark')
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

/* useReducedMotion, but false until mounted so server and client markup agree */
export function useReducedMotionMounted() {
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted && !!reduce
}

interface Props {
  /** file stem in /public/assets/videos */
  name: string
  /** has -light / -dark variants rendered on white / black, blended onto the page background */
  themed?: boolean
  className?: string
  style?: MotionStyle
}

/* Background loop: loads only near the viewport, pauses off-screen, and shows the
   poster frame alone under prefers-reduced-motion. Themed clips are blended, so the
   parent must paint var(--bg) and set isolation: isolate. */
export default function LoopVideo({ name, themed = false, className, style }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const near = useInView(ref, { margin: '300px' })
  const reduce = useReducedMotion()
  const dark = useIsDark()
  const [armed, setArmed] = useState(false)
  const base = `/assets/videos/${name}${themed ? (dark ? '-dark' : '-light') : ''}`

  useEffect(() => { if (near && !reduce) setArmed(true) }, [near, reduce])

  useEffect(() => {
    const v = ref.current
    if (!v || !armed) return
    if (near && !reduce) v.play().catch(() => {})
    else v.pause()
  }, [near, reduce, armed, base])

  const blend: CSSProperties = themed ? { mixBlendMode: dark ? 'screen' : 'multiply' } : {}

  return (
    <motion.video
      ref={ref}
      className={className}
      src={armed ? `${base}.mp4` : undefined}
      poster={`${base}.jpg`}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      tabIndex={-1}
      style={{ objectFit: 'cover', pointerEvents: 'none', ...blend, ...style }}
    />
  )
}
