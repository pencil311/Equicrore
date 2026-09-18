'use client'
import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

const DATA = [40, 44, 42, 50, 48, 56, 53, 62, 60, 71, 69, 78, 84, 82, 92]

export default function FeatChart() {
  const ref = useRef<HTMLCanvasElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  const progress = useRef(0)

  function draw(p: number) {
    const cv = ref.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    const w = cv.clientWidth, h = 120
    cv.width = w * dpr; cv.height = h * dpr
    cv.style.width = '100%'; cv.style.height = h + 'px'
    const ctx = cv.getContext('2d')!
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h)
    const max = Math.max(...DATA), min = Math.min(...DATA)
    const X = (i: number) => (i / (DATA.length - 1)) * (w - 8) + 4
    const Y = (v: number) => h - ((v - min) / (max - min)) * (h - 22) - 10
    const css = getComputedStyle(document.documentElement)
    const g = css.getPropertyValue('--green').trim() || '#009A51'
    const line = css.getPropertyValue('--line').trim() || 'rgba(0,60,32,.10)'
    ctx.strokeStyle = line; ctx.lineWidth = 1
    for (let i = 0; i < 4; i++) {
      const y = 10 + i * ((h - 20) / 3)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    if (p <= 0) return
    // draw the series up to fractional index p * (n - 1)
    const end = p * (DATA.length - 1)
    const last = Math.floor(end)
    const tipX = last < DATA.length - 1 ? X(last) + (X(last + 1) - X(last)) * (end - last) : X(last)
    const tipY = last < DATA.length - 1 ? Y(DATA[last]) + (Y(DATA[last + 1]) - Y(DATA[last])) * (end - last) : Y(DATA[last])
    const trace = () => {
      ctx.beginPath(); ctx.moveTo(X(0), Y(DATA[0]))
      for (let i = 1; i <= last; i++) ctx.lineTo(X(i), Y(DATA[i]))
      ctx.lineTo(tipX, tipY)
    }
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, g + '40'); grad.addColorStop(1, g + '00')
    trace(); ctx.lineTo(tipX, h); ctx.lineTo(X(0), h); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()
    trace()
    ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke()
    ctx.beginPath(); ctx.arc(tipX, tipY, 4, 0, 7)
    ctx.fillStyle = g; ctx.fill()
  }

  useEffect(() => {
    draw(progress.current)
    const onResize = () => draw(progress.current)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!inView) return
    if (reduce) { progress.current = 1; draw(1); return }
    const ctl = animate(0, 1, {
      duration: 1.4, ease: [0.22, 0.61, 0.36, 1],
      onUpdate: v => { progress.current = v; draw(v) },
    })
    return () => ctl.stop()
  }, [inView, reduce])

  return <canvas ref={ref} height={120} style={{ width: '100%', display: 'block' }} />
}
