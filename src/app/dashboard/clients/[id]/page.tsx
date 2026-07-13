'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import '@/styles/dashboard.css'
import { inr, localDateISO } from '@/lib/format'
import { Ico } from '@/components/dashboard/DashLayout'
import { type Client, type ClientEntry, loadClients, updateClient } from '@/lib/clients'
import { getUserData, saveUserData } from '@/lib/userStorage'
import { allSymbols } from '@/lib/watchlists'

const PLUS_ICON     = 'M12 5v14M5 12h14'
const CHECK_ICON    = 'M20 6 9 17l-5-5'
const TRASH_ICON    = 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'
const PENCIL_ICON   = 'M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'
const CHEVRON       = 'M6 9l6 6 6-6'
const BACK_ICON     = 'M19 12H5M12 5l-7 7 7 7'
const CAL_ICON      = 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'
const SEARCH_ICON   = 'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z'
const DOWNLOAD_ICON = 'M12 3v12m0 0l-4-4m4 4l4-4M4 20h16'

const QUICK_TIMES = ['All', 'This Month', 'Last 3M', 'This Year'] as const
type QuickTime = typeof QUICK_TIMES[number]
type TimeKey   = QuickTime | 'custom'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
  padding: '10px 12px', fontSize: 14, fontFamily: 'var(--sans)',
  color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
  boxSizing: 'border-box',
}

const dateInputStyle: React.CSSProperties = {
  flex: 1, border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
  padding: '7px 10px', fontSize: 13, fontFamily: 'var(--sans)',
  color: 'var(--ink)', background: 'var(--bg)', outline: 'none',
  boxSizing: 'border-box',
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function cutoffFor(key: QuickTime): string | null {
  if (key === 'All') return null
  const d = new Date()
  if (key === 'This Month') return localDateISO(new Date(d.getFullYear(), d.getMonth(), 1))
  if (key === 'Last 3M')    { d.setMonth(d.getMonth() - 3); return localDateISO(d) }
  if (key === 'This Year')  return `${d.getFullYear()}-01-01`
  return null
}

function plStr(pl: number): string {
  if (pl >= 0) return `+${inr(pl)}`
  return `−${inr(Math.abs(pl))}`
}

/* ---- Sub-components ---- */

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 100, fontSize: 12.5, cursor: 'pointer',
      fontWeight: active ? 700 : 500, fontFamily: 'var(--sans)',
      border: active ? 'none' : '1.5px solid var(--line)',
      background: active ? 'var(--forest)' : 'transparent',
      color: active ? '#fff' : 'var(--ink)',
      transition: 'all 0.13s', whiteSpace: 'nowrap' as const, lineHeight: 1.4,
    }}>{label}</button>
  )
}

function DropBtn({ label, open, onClick, indicator }: {
  label: string; open: boolean; onClick: () => void; indicator?: boolean
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
      borderRadius: 100,
      border: `1.5px solid ${open ? 'var(--forest)' : indicator ? 'var(--green)' : 'var(--line)'}`,
      background: open ? 'var(--forest)' : indicator ? 'rgba(0,154,81,.08)' : 'var(--paper)',
      color: open ? '#fff' : indicator ? 'var(--green)' : 'var(--ink)',
      fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)', cursor: 'pointer',
      transition: 'all 0.13s', whiteSpace: 'nowrap' as const,
    }}>
      {indicator && !open && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
      )}
      {label}
      <span style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
        <Ico d={CHEVRON} s={13} />
      </span>
    </button>
  )
}

function DropPanel({ children, minWidth = 260 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, minWidth,
      background: 'var(--paper)', border: '1px solid var(--line)',
      borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)', padding: 14,
    }}>{children}</div>
  )
}

function DelBtn({ pending, onDelete, onConfirm, onCancel }: {
  pending: boolean; onDelete: () => void; onConfirm: () => void; onCancel: () => void
}) {
  const [hov, setHov] = useState(false)
  if (pending) return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button onClick={onConfirm} style={{
        background: 'none', border: '1px solid var(--gain)', borderRadius: 4,
        color: 'var(--gain)', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: '2px 7px', lineHeight: 1.6,
      }}>✓</button>
      <button onClick={onCancel} style={{
        background: 'none', border: '1px solid var(--line)', borderRadius: 4,
        color: 'var(--muted)', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: '2px 7px', lineHeight: 1.6,
      }}>✗</button>
    </div>
  )
  return (
    <button onClick={onDelete} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
      display: 'flex', alignItems: 'center', color: hov ? 'var(--loss)' : 'var(--faint)', transition: 'color 0.13s',
    }}>
      <Ico d={TRASH_ICON} s={14} />
    </button>
  )
}

function EditBtn({ onClick }: { onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4,
      display: 'flex', alignItems: 'center', color: hov ? 'var(--forest)' : 'var(--faint)', transition: 'color 0.13s',
    }}>
      <Ico d={PENCIL_ICON} s={14} />
    </button>
  )
}

function MarketField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef             = useRef<HTMLDivElement>(null)
  const searchRef           = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => searchRef.current?.focus(), 20)
    function h(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allSymbols
    return allSymbols.filter(s =>
      s.sym.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); if (!open) setSearch('') }}
        style={{
          width: '100%', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
          padding: '11px 14px', fontSize: 14, fontFamily: 'var(--sans)',
          color: value ? 'var(--ink)' : 'var(--faint)', background: 'var(--paper)',
          outline: 'none', cursor: 'pointer', textAlign: 'left' as const,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxSizing: 'border-box' as const,
        }}
      >
        <span>{value || 'Select market...'}</span>
        <span style={{ opacity: 0.6, display: 'flex', flexShrink: 0 }}><Ico d={CHEVRON} s={13} /></span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ico d={SEARCH_ICON} s={13} />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol or name..."
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: 13,
                fontFamily: 'var(--sans)', color: 'var(--ink)', background: 'transparent',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' as const }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--faint)', textAlign: 'center' as const }}>
                No instruments found
              </div>
            ) : filtered.map(s => (
              <div
                key={s.sym}
                onClick={() => { onChange(`${s.sym} — ${s.name}`); setOpen(false); setSearch('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                  fontFamily: 'var(--sans)', background: 'transparent', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.sym}</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Page ---- */
export default function ClientDetailPage() {
  const params = useParams()
  const id     = params.id as string

  const [client, setClient]           = useState<Client | null>(null)
  const [notFound, setNotFound]       = useState(false)

  /* add entry modal */
  const [addOpen, setAddOpen]         = useState(false)
  const [entryDate, setEntryDate]     = useState('')
  const [amount, setAmount]           = useState('')
  const [entryMarket, setEntryMarket] = useState('')
  const [entryNotes, setEntryNotes]   = useState('')
  const [done, setDone]               = useState(false)

  /* edit entry modal */
  const [editOpen, setEditOpen]       = useState(false)
  const [editEntryId, setEditEntryId] = useState('')
  const [editDate, setEditDate]       = useState('')
  const [editAmt, setEditAmt]         = useState('')
  const [editMarket, setEditMarket]   = useState('')
  const [editNotes, setEditNotes]     = useState('')
  const [editDone, setEditDone]       = useState(false)

  /* inline capital edit */
  const [editingCapital, setEditingCapital]   = useState(false)
  const [capitalDraft, setCapitalDraft]       = useState('')
  const capitalInputRef                       = useRef<HTMLInputElement>(null)
  const capitalWrapRef                        = useRef<HTMLDivElement>(null)

  /* time filter */
  const [time, setTime]               = useState<TimeKey>('All')
  const [fromDate, setFromDate]       = useState('')
  const [toDate, setToDate]           = useState('')
  const [draftFrom, setDraftFrom]     = useState('')
  const [draftTo, setDraftTo]         = useState('')
  const [openDrop, setOpenDrop]       = useState(false)
  const dropRef                       = useRef<HTMLDivElement>(null)

  /* notes + market filter */
  const [noteSearch, setNoteSearch]         = useState('')
  const [marketFilter, setMarketFilter]     = useState('')
  const [openSearchDrop, setOpenSearchDrop] = useState(false)
  const searchDropRef                       = useRef<HTMLDivElement>(null)
  const searchInputRef                      = useRef<HTMLInputElement>(null)

  /* delete */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getUserData('clients').then(mongoClients => {
      if (Array.isArray(mongoClients) && mongoClients.length > 0) {
        localStorage.setItem('eq-clients', JSON.stringify(mongoClients))
      }
      const all = loadClients()
      const found = all.find(c => c.id === id)
      if (found) setClient(found)
      else setNotFound(true)
    })
  }, [id])

  /* outside click — time dropdown */
  useEffect(() => {
    if (!openDrop) return
    function h(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpenDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openDrop])

  /* outside click — search dropdown */
  useEffect(() => {
    if (!openSearchDrop) return
    function h(e: MouseEvent) {
      if (searchDropRef.current && !searchDropRef.current.contains(e.target as Node)) setOpenSearchDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openSearchDrop])

  /* outside click — capital inline edit */
  useEffect(() => {
    if (!editingCapital) return
    setTimeout(() => capitalInputRef.current?.focus(), 10)
    function h(e: MouseEvent) {
      if (capitalWrapRef.current && !capitalWrapRef.current.contains(e.target as Node)) setEditingCapital(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [editingCapital])

  useEffect(() => {
    if (openSearchDrop) setTimeout(() => searchInputRef.current?.focus(), 30)
  }, [openSearchDrop])

  /* ---- Handlers ---- */

  function openAdd() {
    setEntryDate(localDateISO())
    setAmount(''); setEntryMarket(''); setEntryNotes(''); setDone(false)
    setAddOpen(true)
  }

  function saveEntry() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0 || !client) return
    const entry: ClientEntry = {
      id: Date.now().toString(),
      date: entryDate || localDateISO(),
      amount: amt, market: entryMarket, notes: entryNotes.trim(),
      createdAt: new Date().toISOString(),
    }
    const updated = { ...client, entries: [entry, ...client.entries] }
    setClient(updated)
    updateClient(updated)
    saveUserData('clients', loadClients()).catch(() => {})
    setDone(true)
    setTimeout(() => setAddOpen(false), 1200)
  }

  function openEditEntry(entry: ClientEntry) {
    setEditEntryId(entry.id)
    setEditDate(entry.date)
    setEditAmt(entry.amount.toString())
    setEditMarket(entry.market || '')
    setEditNotes(entry.notes)
    setEditDone(false)
    setEditOpen(true)
  }

  function saveEditEntry() {
    const amt = parseFloat(editAmt)
    if (!amt || amt <= 0 || !client) return
    const updated = {
      ...client,
      entries: client.entries.map(e => e.id === editEntryId
        ? { ...e, date: editDate, amount: amt, market: editMarket, notes: editNotes.trim() }
        : e
      ),
    }
    setClient(updated)
    updateClient(updated)
    saveUserData('clients', loadClients()).catch(() => {})
    window.dispatchEvent(new CustomEvent('eq-record-added'))
    setEditDone(true)
    setTimeout(() => setEditOpen(false), 1200)
  }

  function startEditCapital() {
    setCapitalDraft((client?.clientAmount || 0).toString())
    setEditingCapital(true)
  }

  function saveCapital() {
    const val = parseFloat(capitalDraft)
    if (!isNaN(val) && val >= 0 && client) {
      const updated = { ...client, clientAmount: val }
      setClient(updated)
      updateClient(updated)
      saveUserData('clients', loadClients()).catch(() => {})
      window.dispatchEvent(new CustomEvent('eq-record-added'))
    }
    setEditingCapital(false)
  }

  function requestDelete(entryId: string) {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setPendingDelete(entryId)
    deleteTimerRef.current = setTimeout(() => setPendingDelete(null), 3000)
  }

  function confirmDelete(entryId: string) {
    if (!client) return
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    const updated = { ...client, entries: client.entries.filter(e => e.id !== entryId) }
    setClient(updated)
    updateClient(updated)
    saveUserData('clients', loadClients()).catch(() => {})
    setPendingDelete(null)
  }

  function selectQuickTime(t: QuickTime) {
    setTime(t); setFromDate(''); setToDate(''); setOpenDrop(false)
  }

  function applyCustom() {
    setFromDate(draftFrom); setToDate(draftTo); setTime('custom'); setOpenDrop(false)
  }

  function downloadReport() {
    if (!client || filteredEntries.length === 0) return

    const reportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    const generatedAt = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const filterParts: string[] = []
    if (time !== 'All') filterParts.push(timeLabel)
    if (noteSearch.trim()) filterParts.push(`Notes: &ldquo;${noteSearch.trim()}&rdquo;`)
    if (marketFilter) filterParts.push(`Market: ${marketFilter.split(' — ')[0]}`)
    const filterDesc = filterParts.join(' &middot; ')

    const plAbs  = Math.abs(pl)
    const plSign = pl >= 0 ? '+' : '−'
    const plCol  = pl >= 0 ? '#009A51' : '#d94f4f'

    const rows = filteredEntries.map((e, i) => {
      const mktSym  = e.market ? e.market.split(' — ')[0] : ''
      const mktName = e.market ? (e.market.split(' — ')[1] || '') : ''
      const rowBg   = i % 2 === 0 ? '#fff' : '#f7faf7'
      return `<tr style="background:${rowBg}">
        <td style="padding:10px 14px;font-size:13px;color:#555;border-bottom:1px solid #e4ece5;white-space:nowrap;">${fmtDate(e.date)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #e4ece5;">
          ${e.market
            ? `<span style="font-weight:700;font-size:12px;background:#eef2ec;color:#003C20;padding:3px 8px;border-radius:100px;margin-right:6px;">${mktSym}</span><span style="font-size:12px;color:#999;">${mktName}</span>`
            : '<span style="color:#ccc;font-size:13px;">—</span>'}
        </td>
        <td style="padding:10px 14px;font-family:Georgia,\'Times New Roman\',serif;font-size:15px;font-weight:600;color:#009A51;text-align:right;border-bottom:1px solid #e4ece5;white-space:nowrap;">${inr(e.amount)}</td>
        <td style="padding:10px 14px;font-size:13px;color:#666;border-bottom:1px solid #e4ece5;max-width:260px;word-break:break-word;">${e.notes ? e.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<span style="color:#ccc;">—</span>'}</td>
      </tr>`
    }).join('\n')

    const tfoot = filteredEntries.length > 1 ? `
      <tfoot>
        <tr style="background:#eef2ec;">
          <td colspan="2" style="padding:12px 14px;font-size:11px;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:.06em;border-top:2px solid #c6d8c8;">Total (${filteredEntries.length} entries)</td>
          <td style="padding:12px 14px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#009A51;text-align:right;border-top:2px solid #c6d8c8;white-space:nowrap;">${inr(totalDeployed)}</td>
          <td style="border-top:2px solid #c6d8c8;"></td>
        </tr>
      </tfoot>` : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Report — ${client.name}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#fff;color:#1a1a1a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{margin:16mm 15mm;size:A4}
  table{border-collapse:collapse;width:100%}
  .stat-card{background:#f7faf7;border:1px solid #dde8de;border-radius:10px;padding:14px 16px}
  .stat-label{font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px}
  .stat-val{font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#1a1a1a}
</style>
</head>
<body style="padding:0;">

  <!-- Header -->
  <div style="background:#003C20;padding:20px 26px;display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;background:#009A51;border-radius:8px;display:grid;place-items:center;">
        <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#fff;line-height:1;">E</span>
      </div>
      <div>
        <div style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#eafff2;letter-spacing:.1em;">EQUICRORE</div>
        <div style="font-size:10px;color:#6ecfa0;letter-spacing:.07em;margin-top:1px;text-transform:uppercase;">Client Investment Report</div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10.5px;color:#6ecfa0;margin-bottom:2px;">Generated on</div>
      <div style="font-family:Georgia,serif;font-size:13px;color:#eafff2;font-weight:600;">${reportDate}</div>
    </div>
  </div>

  <div style="padding:0 4px;">

    <!-- Client row -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
      <div style="width:46px;height:46px;border-radius:50%;background:${bg};flex-shrink:0;display:grid;place-items:center;color:#eafff2;font-weight:700;font-size:16px;">${inits}</div>
      <div>
        <div style="font-family:Georgia,serif;font-size:19px;font-weight:600;color:#1a1a1a;">${client.name}</div>
        <div style="font-size:12px;color:#999;margin-top:3px;display:flex;gap:14px;">
          ${client.phone ? `<span>${client.phone}</span>` : ''}
          ${client.email ? `<span>${client.email}</span>` : ''}
        </div>
      </div>
      ${filterDesc ? `
      <div style="margin-left:auto;background:#eef2ec;border-radius:8px;padding:8px 14px;text-align:right;flex-shrink:0;">
        <div style="font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;">Filtered view</div>
        <div style="font-size:12.5px;color:#003C20;font-weight:600;">${filterDesc}</div>
      </div>` : ''}
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px;">
      <div class="stat-card">
        <div class="stat-label">Client Capital</div>
        <div class="stat-val">${inr(capital)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${anyFilter ? 'Deployed (Filtered)' : 'Total Deployed'}</div>
        <div class="stat-val" style="color:#009A51;">${inr(totalDeployed)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${anyFilter ? 'P&amp;L (Filtered)' : 'P&amp;L'}</div>
        <div class="stat-val" style="color:${plCol};">${plSign}${inr(plAbs)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Entries</div>
        <div class="stat-val">${filteredEntries.length}${client.entries.length !== filteredEntries.length ? `<span style="font-size:12px;color:#aaa;font-family:inherit;font-weight:400;"> / ${client.entries.length}</span>` : ''}</div>
      </div>
    </div>

    <!-- Table -->
    <div style="border-radius:10px;overflow:hidden;border:1px solid #dde8de;">
      <div style="background:#003C20;padding:11px 16px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:11px;font-weight:700;color:#eafff2;letter-spacing:.06em;text-transform:uppercase;">Investment Entries</span>
        ${anyFilter ? `<span style="font-size:11px;color:#6ecfa0;">&nbsp;${filteredEntries.length} of ${client.entries.length}</span>` : ''}
      </div>
      <table>
        <thead>
          <tr style="background:#eef2ec;">
            <th style="padding:9px 14px;font-size:10.5px;font-weight:700;color:#777;text-align:left;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #dde8de;">Date</th>
            <th style="padding:9px 14px;font-size:10.5px;font-weight:700;color:#777;text-align:left;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #dde8de;">Market</th>
            <th style="padding:9px 14px;font-size:10.5px;font-weight:700;color:#777;text-align:right;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #dde8de;">Amount</th>
            <th style="padding:9px 14px;font-size:10.5px;font-weight:700;color:#777;text-align:left;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #dde8de;">Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        ${tfoot}
      </table>
    </div>

    <!-- Footer -->
    <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e0e8e1;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:11px;color:#bbb;">Generated by <span style="font-weight:700;color:#009A51;">EQUICRORE</span> &nbsp;&middot;&nbsp; Personal investment tracker</div>
      <div style="font-size:11px;color:#bbb;">${generatedAt}</div>
    </div>

  </div>

</body>
</html>`

    const dateStr = localDateISO()
    const blob    = new Blob([html], { type: 'text/html' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href        = url
    a.download    = `Equicrore_${client.name.replace(/\s+/g, '_')}_${dateStr}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* unique markets used across all entries (for filter list) */
  const usedMarkets = useMemo(() => {
    if (!client) return []
    const seen = new Set<string>()
    return client.entries
      .filter(e => e.market)
      .map(e => e.market!)
      .filter(m => { if (seen.has(m)) return false; seen.add(m); return true })
  }, [client])

  /* filtered entries */
  const filteredEntries = useMemo(() => {
    if (!client) return []
    const cutoff = time !== 'custom' ? cutoffFor(time as QuickTime) : null
    const lq = noteSearch.trim().toLowerCase()
    return client.entries.filter(e => {
      if (time === 'custom') {
        if (fromDate && e.date < fromDate) return false
        if (toDate   && e.date > toDate)   return false
      } else {
        if (cutoff && e.date < cutoff) return false
      }
      if (lq && !e.notes.toLowerCase().includes(lq)) return false
      if (marketFilter && e.market !== marketFilter) return false
      return true
    }).sort((a, b) => b.date.localeCompare(a.date))
  }, [client, time, fromDate, toDate, noteSearch, marketFilter])

  const totalDeployed = filteredEntries.reduce((s, e) => s + e.amount, 0)
  const allDates      = filteredEntries.map(e => e.date).sort()
  const firstDate     = allDates[0] || null
  const latestDate    = allDates[allDates.length - 1] || null

  const timeLabel   = time === 'custom' ? 'Custom' : time === 'All' ? 'All time' : time
  const anyFilter   = time !== 'All' || !!noteSearch.trim() || !!marketFilter
  const searchLabel = noteSearch.trim()
    ? (noteSearch.length > 12 ? noteSearch.slice(0, 12) + '…' : noteSearch)
    : marketFilter
    ? marketFilter.split(' — ')[0]
    : 'Search / Filter'

  /* ---- Render guards ---- */
  if (notFound) return (
    <div className="content fade">
      <Link href="/dashboard/clients" className="btn btn-ghost btn-mini" style={{ width: 'fit-content' }}>
        <Ico d={BACK_ICON} s={14} /> Clients
      </Link>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '72px 24px', color: 'var(--faint)' }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--muted)' }}>Client not found</div>
      </div>
    </div>
  )

  if (!client) return (
    <div className="content fade">
      <div style={{ color: 'var(--faint)', padding: 24 }}>Loading…</div>
    </div>
  )

  const bg = (() => {
    const COLORS = ['#003C20','#1a73c7','#7a3ec2','#0b8f6a','#c2762e','#d39021','#2e9c8e','#c2402e']
    let h = 0
    for (const ch of client.name) h = (h * 31 + ch.charCodeAt(0)) & 0x7fff
    return COLORS[h % COLORS.length]
  })()

  const inits   = client.name.trim().split(/\s+/).map((w: string) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'
  const capital = client.clientAmount || 0
  const pl      = totalDeployed - capital
  const plPos   = pl >= 0

  return (
    <div className="content fade">
      {/* Header */}
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <Link
            href="/dashboard/clients"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--faint)', fontWeight: 600, textDecoration: 'none', marginBottom: 10 }}
          >
            <Ico d={BACK_ICON} s={13} /> Clients
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: bg, flexShrink: 0,
              display: 'grid', placeItems: 'center', color: '#eafff2', fontWeight: 700, fontSize: 16,
            }}>{inits}</div>
            <div>
              <h1 style={{ marginBottom: 6 }}>{client.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }}>
                {/* Inline capital edit */}
                <div ref={capitalWrapRef}>
                  {editingCapital ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 600, marginRight: 2 }}>Capital ₹</div>
                      <input
                        ref={capitalInputRef}
                        type="number" min="0"
                        value={capitalDraft}
                        onChange={e => setCapitalDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveCapital(); if (e.key === 'Escape') setEditingCapital(false) }}
                        style={{
                          width: 130, border: '1.5px solid var(--forest)', borderRadius: 'var(--r-sm)',
                          padding: '4px 8px', fontSize: 14, fontFamily: 'var(--serif)', fontWeight: 600,
                          color: 'var(--ink)', background: 'var(--paper)', outline: 'none', boxSizing: 'border-box' as const,
                        }}
                      />
                      <button onClick={saveCapital} style={{ background: 'none', border: '1px solid var(--gain)', borderRadius: 4, color: 'var(--gain)', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: '2px 7px', lineHeight: 1.6 }}>✓</button>
                      <button onClick={() => setEditingCapital(false)} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 4, color: 'var(--muted)', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: '2px 7px', lineHeight: 1.6 }}>✗</button>
                    </div>
                  ) : (
                    <div onClick={startEditCapital} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 1 }}>Client capital</div>
                        <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{inr(capital)}</div>
                      </div>
                      <span style={{ color: 'var(--faint)', display: 'flex', marginTop: 10 }}><Ico d={PENCIL_ICON} s={12} /></span>
                    </div>
                  )}
                </div>
                {/* Contact */}
                {(client.phone || client.email) && (
                  <div style={{ fontSize: 13, color: 'var(--faint)', display: 'flex', gap: 12 }}>
                    {client.phone && <span>{client.phone}</span>}
                    {client.email && <span>{client.email}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <button className="btn btn-solid" onClick={openAdd} style={{ marginTop: 32 }}>
          <Ico d={PLUS_ICON} s={16} /> Add Entry
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div className="scard">
          <div className="k"><Ico d="M19 7H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 13h.01M3 9V7a2 2 0 0 1 2-2h11" s={15} />Client capital</div>
          <div className="v num">{inr(capital)}</div>
        </div>
        <div className="scard">
          <div className="k"><Ico d={CAL_ICON} s={15} />{anyFilter ? 'Deployed (filtered)' : 'Total deployed'}</div>
          <div className="v num" style={{ color: 'var(--green)' }}>{inr(totalDeployed)}</div>
          {client.entries.length !== filteredEntries.length && (
            <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>filtered view</div>
          )}
        </div>
        <div className="scard">
          <div className="k"><Ico d="M22 7 13.5 15.5l-5-5L2 17" s={15} />{anyFilter ? 'P&L (filtered)' : 'P&L'}</div>
          <div className="v num" style={{ color: plPos ? 'var(--gain)' : 'var(--loss)' }}>
            {plStr(pl)}
          </div>
        </div>
        <div className="scard">
          <div className="k"><Ico d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" s={15} />Entries</div>
          <div className="v num">{filteredEntries.length}</div>
          {client.entries.length !== filteredEntries.length && (
            <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 2 }}>of {client.entries.length} total</div>
          )}
        </div>
      </div>

      {/* Entries panel */}
      <div className="panel">
        <div className="panel-head" style={{ marginBottom: 0 }}>
          <div><h3>Investment entries</h3></div>
        </div>

        {/* Filter bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 0', margin: '12px 0 0',
          borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
        }}>
          {/* Time filter */}
          <div ref={dropRef} style={{ position: 'relative' }}>
            <DropBtn
              label={timeLabel} open={openDrop} indicator={time !== 'All'}
              onClick={() => {
                if (!openDrop) { setDraftFrom(fromDate); setDraftTo(toDate) }
                setOpenDrop(v => !v)
              }}
            />
            {openDrop && (
              <DropPanel>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 10 }}>Quick range</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {QUICK_TIMES.map(t => (
                    <Chip key={t} label={t} active={time === t} onClick={() => selectQuickTime(t)} />
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--line)', margin: '0 -14px', marginBottom: 14 }} />
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 10 }}>Custom range</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 4 }}>From</div>
                    <input type="date" value={draftFrom} onChange={e => setDraftFrom(e.target.value)} style={dateInputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 4 }}>To</div>
                    <input type="date" value={draftTo} onChange={e => setDraftTo(e.target.value)} style={dateInputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-mini" onClick={() => setOpenDrop(false)}>Cancel</button>
                  <button className="btn btn-solid btn-mini" disabled={!draftFrom && !draftTo} onClick={applyCustom}>Apply</button>
                </div>
              </DropPanel>
            )}
          </div>

          {/* Notes search */}
          <div ref={searchDropRef} style={{ position: 'relative' }}>
            <DropBtn
              label={searchLabel} open={openSearchDrop} indicator={!!noteSearch.trim() || !!marketFilter}
              onClick={() => setOpenSearchDrop(v => !v)}
            />
            {openSearchDrop && (
              <DropPanel minWidth={260}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 10 }}>Filter by notes</div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', pointerEvents: 'none', display: 'flex' }}>
                    <Ico d={SEARCH_ICON} s={13} />
                  </span>
                  <input
                    ref={searchInputRef}
                    value={noteSearch}
                    onChange={e => setNoteSearch(e.target.value)}
                    placeholder="Search in notes…"
                    style={{
                      width: '100%', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
                      padding: '8px 10px 8px 30px', fontSize: 13, fontFamily: 'var(--sans)',
                      color: 'var(--ink)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                {noteSearch.trim() && (
                  <button
                    onClick={() => { setNoteSearch(''); searchInputRef.current?.focus() }}
                    style={{
                      marginTop: 8, width: '100%', padding: '6px 10px', borderRadius: 'var(--r-sm)',
                      border: '1.5px solid var(--line)', background: 'transparent',
                      fontSize: 12.5, fontFamily: 'var(--sans)', color: 'var(--muted)',
                      cursor: 'pointer', fontWeight: 600,
                    }}
                  >Clear search</button>
                )}

                {usedMarkets.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid var(--line)', margin: '12px -14px', marginBottom: 12 }} />
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 8 }}>Filter by market</div>
                    <div
                      onClick={() => setMarketFilter('')}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '7px 2px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)',
                        fontWeight: !marketFilter ? 600 : 400,
                        color: !marketFilter ? 'var(--green)' : 'var(--muted)',
                        borderRadius: 4, transition: 'color 0.1s',
                      }}
                    >
                      All markets
                      {!marketFilter && <Ico d={CHECK_ICON} s={13} />}
                    </div>
                    {usedMarkets.map(m => {
                      const sym  = m.split(' — ')[0]
                      const name = m.split(' — ')[1] || ''
                      const active = marketFilter === m
                      return (
                        <div
                          key={m}
                          onClick={() => setMarketFilter(active ? '' : m)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 2px', cursor: 'pointer', fontSize: 13,
                            fontFamily: 'var(--sans)', borderRadius: 4, transition: 'color 0.1s',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: active ? 'var(--green)' : 'var(--ink)', flexShrink: 0 }}>{sym}</span>
                          <span style={{ fontSize: 12, color: 'var(--faint)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{name}</span>
                          {active && <Ico d={CHECK_ICON} s={13} />}
                        </div>
                      )
                    })}
                  </>
                )}
              </DropPanel>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {filteredEntries.length > 0 && (
              <button
                onClick={downloadReport}
                title="Download report"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 13px', borderRadius: 100,
                  border: '1.5px solid var(--line)', background: 'var(--paper)',
                  color: 'var(--muted)', fontSize: 12.5, fontWeight: 600,
                  fontFamily: 'var(--sans)', cursor: 'pointer', transition: 'all 0.13s',
                  whiteSpace: 'nowrap' as const,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.border = '1.5px solid var(--forest)'
                  e.currentTarget.style.color = 'var(--forest)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.border = '1.5px solid var(--line)'
                  e.currentTarget.style.color = 'var(--muted)'
                }}
              >
                <Ico d={DOWNLOAD_ICON} s={13} />
                Report
              </button>
            )}
            <span style={{ fontSize: 12.5, color: 'var(--faint)', whiteSpace: 'nowrap' as const }}>
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 24px', color: 'var(--faint)' }}>
            <Ico d={client.entries.length === 0 ? CAL_ICON : SEARCH_ICON} s={40} />
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
              {client.entries.length === 0 ? 'No entries yet' : 'No entries match your filters'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', maxWidth: 280 }}>
              {client.entries.length === 0
                ? 'Click + Add Entry to record an investment'
                : anyFilter
                  ? 'Try adjusting the time range or clearing the notes search'
                  : 'Try a different filter'}
            </div>
          </div>
        ) : (
          <div className="list">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="lrow" style={{ display: 'flex', alignItems: 'center', minHeight: 50, gap: 12 }}>
                <span style={{ flex: '0 0 110px', fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>
                  {fmtDate(entry.date)}
                </span>
                <div style={{ flex: '0 0 150px', flexShrink: 0 }}>
                  {entry.market ? (
                    <span style={{
                      fontSize: 12, fontWeight: 700, background: 'var(--bg)', color: 'var(--muted)',
                      padding: '3px 8px', borderRadius: 999, display: 'inline-block',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                      maxWidth: '100%',
                    }}>
                      {entry.market.split(' — ')[0]}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--faint)', fontSize: 13 }}>—</span>
                  )}
                </div>
                <div style={{ flex: '0 0 140px', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600, color: 'var(--green)' }}>
                    {inr(entry.amount)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--muted)' }}>
                  {entry.notes ? (
                    <span
                      title={entry.notes.length > 60 ? entry.notes : undefined}
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                    >
                      {entry.notes.length > 60 ? entry.notes.slice(0, 60) + '…' : entry.notes}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--faint)' }}>—</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <EditBtn onClick={() => openEditEntry(entry)} />
                  <DelBtn
                    pending={pendingDelete === entry.id}
                    onDelete={() => requestDelete(entry.id)}
                    onConfirm={() => confirmDelete(entry.id)}
                    onCancel={() => {
                      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
                      setPendingDelete(null)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredEntries.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 14, marginTop: 4, borderTop: '2px solid var(--line)' }}>
            <span style={{ flex: '0 0 110px', fontSize: 12, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total</span>
            <div style={{ flex: '0 0 150px' }} />
            <div style={{ flex: '0 0 140px' }}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>{inr(totalDeployed)}</span>
            </div>
            <div style={{ flex: 1 }} />
          </div>
        )}
      </div>

      {/* Add Entry Modal */}
      <div className={`ov${addOpen ? ' show' : ''}`}>
        <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
          {done ? (
            <div className="modal-body">
              <div className="confirm-ok">
                <div className="ok"><Ico d={CHECK_ICON} s={34} /></div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Entry saved!</h3>
              </div>
            </div>
          ) : (
            <>
              <div className="modal-head">
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r)', background: bg, display: 'grid', placeItems: 'center', color: '#eafff2', flexShrink: 0, fontWeight: 700, fontSize: 14 }}>{inits}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--ink)' }}>Add entry</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{client.name}</div>
                </div>
                <button className="tb-icon" style={{ marginLeft: 'auto' }} onClick={() => setAddOpen(false)}>
                  <Ico d="M6 6l12 12M18 6 6 18" s={16} />
                </button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>Date</label>
                  <input type="date" style={inputStyle} value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Market / Instrument</label>
                  <MarketField value={entryMarket} onChange={setEntryMarket} />
                </div>
                <div className="field">
                  <label>Amount invested (₹)</label>
                  <input
                    type="number" min="0" autoFocus
                    style={{ ...inputStyle, fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}
                    value={amount} placeholder="e.g. 500000"
                    onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEntry() }}
                  />
                  {parseFloat(amount) > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--faint)' }}>
                      = <b style={{ color: 'var(--ink)' }}>{inr(parseFloat(amount))}</b>
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Notes</label>
                  <textarea
                    style={{ ...inputStyle, resize: 'none' as const }} rows={2}
                    value={entryNotes} placeholder="e.g. Initial investment, SIP payment…"
                    onChange={e => setEntryNotes(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button className="btn btn-ghost btn-mini" onClick={() => setAddOpen(false)}>Cancel</button>
                  <button
                    className="btn btn-solid btn-mini" onClick={saveEntry}
                    disabled={!amount || parseFloat(amount) <= 0}
                    style={{ opacity: amount && parseFloat(amount) > 0 ? 1 : 0.5 }}
                  >Save</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Entry Modal */}
      <div className={`ov${editOpen ? ' show' : ''}`}>
        <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
          {editDone ? (
            <div className="modal-body">
              <div className="confirm-ok">
                <div className="ok"><Ico d={CHECK_ICON} s={34} /></div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Entry updated!</h3>
              </div>
            </div>
          ) : (
            <>
              <div className="modal-head">
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r)', background: bg, display: 'grid', placeItems: 'center', color: '#eafff2', flexShrink: 0, fontWeight: 700, fontSize: 14 }}>{inits}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--ink)' }}>Edit entry</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{client.name}</div>
                </div>
                <button className="tb-icon" style={{ marginLeft: 'auto' }} onClick={() => setEditOpen(false)}>
                  <Ico d="M6 6l12 12M18 6 6 18" s={16} />
                </button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>Date</label>
                  <input type="date" style={inputStyle} value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Market / Instrument</label>
                  <MarketField value={editMarket} onChange={setEditMarket} />
                </div>
                <div className="field">
                  <label>Amount invested (₹)</label>
                  <input
                    type="number" min="0" autoFocus
                    style={{ ...inputStyle, fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}
                    value={editAmt} placeholder="e.g. 500000"
                    onChange={e => setEditAmt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEditEntry() }}
                  />
                  {parseFloat(editAmt) > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--faint)' }}>
                      = <b style={{ color: 'var(--ink)' }}>{inr(parseFloat(editAmt))}</b>
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Notes</label>
                  <textarea
                    style={{ ...inputStyle, resize: 'none' as const }} rows={2}
                    value={editNotes} placeholder="e.g. Initial investment, SIP payment…"
                    onChange={e => setEditNotes(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button className="btn btn-ghost btn-mini" onClick={() => setEditOpen(false)}>Cancel</button>
                  <button
                    className="btn btn-solid btn-mini" onClick={saveEditEntry}
                    disabled={!editAmt || parseFloat(editAmt) <= 0}
                    style={{ opacity: editAmt && parseFloat(editAmt) > 0 ? 1 : 0.5 }}
                  >Save</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
