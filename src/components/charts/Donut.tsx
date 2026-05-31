'use client'

interface Segment {
  label: string
  value: number
  color: string
}

interface DonutProps {
  segments: Segment[]
  size?: number
  thick?: number
}

export default function Donut({ segments, size = 170, thick = 22 }: DonutProps) {
  const r = (size - thick) / 2
  const c = size / 2
  const circ = 2 * Math.PI * r
  let acc = 0
  const total = segments.reduce((s, x) => s + x.value, 0)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={thick} />
        {segments.map((s, i) => {
          const frac = s.value / total
          const dash = frac * circ
          const el = (
            <circle
              key={i}
              cx={c} cy={c} r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thick}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-acc * circ}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray .8s var(--ease)' }}
            />
          )
          acc += frac
          return el
        })}
      </svg>
    </div>
  )
}
