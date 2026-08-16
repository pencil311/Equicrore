'use client'
import { useRef } from 'react'

/* ============================================================
   Date input displayed as dd/mm/yyyy.

   A native <input type="date"> always renders in the browser/OS locale — a
   US-configured browser shows mm/dd/yyyy, and no CSS property, attribute or
   `lang` value changes that. So the native input is kept (for its calendar
   picker, keyboard support and validation) but made transparent, and the
   dd/mm/yyyy text is drawn underneath it.

   The value stays ISO (yyyy-mm-dd) in and out, so this is a drop-in swap for
   an existing <input type="date"> — nothing downstream needs to change.
   ============================================================ */

export interface DateFieldProps {
  value: string
  onChange: (iso: string) => void
  /** Applied to the wrapper, so it can inherit the surrounding input styling */
  style?: React.CSSProperties
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  title?: string
}

export function toDisplayDate(iso: string, placeholder = 'dd/mm/yyyy'): string {
  if (!iso) return placeholder
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : placeholder
}

export default function DateField({
  value, onChange, style, placeholder = 'dd/mm/yyyy', min, max, disabled, title,
}: DateFieldProps) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div
      title={title}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      <span style={{
        color: value ? 'inherit' : 'var(--faint)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        pointerEvents: 'none',
      }}>
        {toDisplayDate(value, placeholder)}
      </span>

      {/* Invisible, but on top — it owns the clicks and opens the native picker */}
      <input
        ref={ref}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        onClick={() => { try { (ref.current as any)?.showPicker?.() } catch {} }}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          opacity: 0, border: 'none', padding: 0, margin: 0,
          background: 'transparent',
          cursor: disabled ? 'default' : 'pointer',
        }}
      />
    </div>
  )
}
