'use client'
import { useEffect, useRef } from 'react'

export default function HeroSparkline() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function draw() {
      if (!ref.current) return
      const w = ref.current.clientWidth || 360
      const h = 96
      const pts = [22, 30, 26, 38, 34, 46, 42, 58, 52, 49, 63, 72, 68, 80, 88]
      const max = Math.max(...pts), min = Math.min(...pts)
      const X = (i: number) => (i / (pts.length - 1)) * w
      const Y = (v: number) => h - ((v - min) / (max - min)) * (h - 12) - 6
      let d = `M0 ${Y(pts[0])}`
      for (let i = 1; i < pts.length; i++) {
        const cx = (X(i) + X(i - 1)) / 2
        d += ` C ${cx} ${Y(pts[i - 1])}, ${cx} ${Y(pts[i])}, ${X(i)} ${Y(pts[i])}`
      }
      const area = d + ` L ${w} ${h} L 0 ${h} Z`
      const g = getComputedStyle(document.documentElement).getPropertyValue('--green').trim() || '#009A51'
      ref.current.innerHTML = `
        <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="display:block">
          <defs>
            <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="${g}" stop-opacity=".26"/>
              <stop offset="1" stop-color="${g}" stop-opacity="0"/>
            </linearGradient>
            <style>@keyframes eqDraw{to{stroke-dashoffset:0}}</style>
          </defs>
          <path d="${area}" fill="url(#hg)"/>
          <path d="${d}" fill="none" stroke="${g}" stroke-width="2.5" stroke-linecap="round"
            style="stroke-dasharray:1400;stroke-dashoffset:1400;animation:eqDraw 1.7s cubic-bezier(.22,.61,.36,1) forwards .2s"/>
        </svg>`
    }
    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [])

  return <div ref={ref} style={{ margin: '18px 0 4px' }} />
}
