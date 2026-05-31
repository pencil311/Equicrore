'use client'
import { useState, useRef, useEffect, useMemo } from 'react'

interface AreaChartProps {
  data: number[]
  labels: string[]
  height?: number
}

function inrShort(n: number): string {
  const neg = n < 0; n = Math.abs(n)
  if (n >= 10_000_000) return (neg ? '−' : '') + '₹' + (n / 10_000_000).toFixed(2) + ' Cr'
  if (n >= 100_000) return (neg ? '−' : '') + '₹' + (n / 100_000).toFixed(2) + ' L'
  return (neg ? '−' : '') + '₹' + Math.round(n).toLocaleString('en-IN')
}

export default function AreaChart({ data, labels, height = 232 }: AreaChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(640)
  const [hover, setHover] = useState<number | null>(null)
  const green = '#009A51'

  useEffect(() => {
    const ro = new ResizeObserver(es => {
      for (const e of es) setW(e.contentRect.width)
    })
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const pad = { l: 6, r: 6, t: 14, b: 22 }
  const W = w, H = height
  const min = Math.min(...data), max = Math.max(...data)
  const span = (max - min) || 1
  const X = (i: number) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r)
  const Y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b)

  const linePath = useMemo(() => {
    let d = `M${X(0)} ${Y(data[0])}`
    for (let i = 1; i < data.length; i++) {
      const cx = (X(i) + X(i - 1)) / 2
      d += ` C ${cx} ${Y(data[i - 1])}, ${cx} ${Y(data[i])}, ${X(i)} ${Y(data[i])}`
    }
    return d
  }, [data, w])

  const areaPath = `${linePath} L ${X(data.length - 1)} ${H - pad.b} L ${X(0)} ${H - pad.b} Z`

  function onMove(e: React.MouseEvent) {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    let i = Math.round(((x - pad.l) / (W - pad.l - pad.r)) * (data.length - 1))
    i = Math.max(0, Math.min(data.length - 1, i))
    setHover(i)
  }

  return (
    <div
      className="chart-wrap"
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      style={{ height: H }}
    >
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={green} stopOpacity={0.24} />
            <stop offset="100%" stopColor={green} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
          <line
            key={i}
            x1={pad.l} x2={W - pad.r}
            y1={pad.t + g * (H - pad.t - pad.b)}
            y2={pad.t + g * (H - pad.t - pad.b)}
            stroke="var(--line)" strokeWidth={1}
          />
        ))}
        <path d={areaPath} fill="url(#areaG)" />
        <path d={linePath} fill="none" stroke={green} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        {hover != null && (
          <g>
            <line x1={X(hover)} x2={X(hover)} y1={pad.t} y2={H - pad.b} stroke={green} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
            <circle cx={X(hover)} cy={Y(data[hover])} r={5.5} fill={green} stroke="var(--paper)" strokeWidth={2.5} />
          </g>
        )}
      </svg>
      {hover != null && (
        <div
          className="chart-tip"
          style={{ left: `${(X(hover) / W) * 100}%`, top: Y(data[hover]) }}
        >
          {inrShort(data[hover])}
          <span className="d">  {labels[Math.round(hover / (data.length - 1) * (labels.length - 1))] || ''}</span>
        </div>
      )}
    </div>
  )
}
