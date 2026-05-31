'use client'
import { useEffect, useRef } from 'react'

export default function FeatChart() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    function draw() {
      const cv = ref.current
      if (!cv) return
      const dpr = window.devicePixelRatio || 1
      const w = cv.clientWidth, h = 120
      cv.width = w * dpr; cv.height = h * dpr
      cv.style.width = '100%'; cv.style.height = h + 'px'
      const ctx = cv.getContext('2d')!
      ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h)
      const data = [40, 44, 42, 50, 48, 56, 53, 62, 60, 71, 69, 78, 84, 82, 92]
      const max = Math.max(...data), min = Math.min(...data)
      const X = (i: number) => (i / (data.length - 1)) * (w - 8) + 4
      const Y = (v: number) => h - ((v - min) / (max - min)) * (h - 22) - 10
      const g = getComputedStyle(document.documentElement).getPropertyValue('--green').trim() || '#009A51'
      const line = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || 'rgba(0,60,32,.10)'
      ctx.strokeStyle = line; ctx.lineWidth = 1
      for (let i = 0; i < 4; i++) {
        const y = 10 + i * ((h - 20) / 3)
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, g + '40'); grad.addColorStop(1, g + '00')
      ctx.beginPath(); ctx.moveTo(X(0), Y(data[0]))
      data.forEach((v, i) => ctx.lineTo(X(i), Y(v)))
      ctx.lineTo(X(data.length - 1), h); ctx.lineTo(X(0), h); ctx.closePath()
      ctx.fillStyle = grad; ctx.fill()
      ctx.beginPath(); ctx.moveTo(X(0), Y(data[0]))
      data.forEach((v, i) => ctx.lineTo(X(i), Y(v)))
      ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke()
      ctx.beginPath(); ctx.arc(X(data.length - 1), Y(data[data.length - 1]), 4, 0, 7)
      ctx.fillStyle = g; ctx.fill()
    }
    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [])

  return <canvas ref={ref} height={120} style={{ width: '100%', display: 'block' }} />
}
