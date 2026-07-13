'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import '@/styles/dashboard.css'
import Link from 'next/link'
import { inr, localDateISO } from '@/lib/format'
import { Ico } from '@/components/dashboard/DashLayout'
import { type Client, loadClients, saveClients } from '@/lib/clients'
import { getUserData, saveUserData } from '@/lib/userStorage'

const USERS_ICON  = 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'
const PLUS_ICON   = 'M12 5v14M5 12h14'
const CHECK_ICON  = 'M20 6 9 17l-5-5'
const PERSON_ICON = 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
const CHEVRON     = 'M6 9l6 6 6-6'
const SEARCH_ICON = 'M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z'
const X_ICON      = 'M18 6 6 18M6 6l12 12'
const PENCIL_ICON = 'M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'
const TRASH_ICON  = 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6'

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

type QuickDate = 'all' | 'month' | '3m' | 'year' | 'custom'

function cutoffFor(key: QuickDate): string | null {
  if (key === 'all' || key === 'custom') return null
  const d = new Date()
  if (key === 'month') return localDateISO(new Date(d.getFullYear(), d.getMonth(), 1))
  if (key === '3m')    { d.setMonth(d.getMonth() - 3); return localDateISO(d) }
  if (key === 'year')  return `${d.getFullYear()}-01-01`
  return null
}

function fmtShort(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const DATE_OPTIONS: { key: QuickDate; label: string }[] = [
  { key: 'all',    label: 'All time' },
  { key: 'month',  label: 'This Month' },
  { key: '3m',     label: 'Last 3 Months' },
  { key: 'year',   label: 'This Year' },
  { key: 'custom', label: 'Custom dates' },
]

function initials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'
}

const AVATAR_COLORS = ['#003C20','#1a73c7','#7a3ec2','#0b8f6a','#c2762e','#d39021','#2e9c8e','#c2402e']
function avatarColor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0x7fff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function plStr(pl: number): string {
  if (pl >= 0) return `+${inr(pl)}`
  return `−${inr(Math.abs(pl))}`
}

/* ---- Filter pill button ---- */
function FilterPill({ label, open, active, onClick }: {
  label: string; open: boolean; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
      borderRadius: 100, cursor: 'pointer', fontFamily: 'var(--sans)',
      fontSize: 13, fontWeight: 600, transition: 'all 0.13s', whiteSpace: 'nowrap' as const,
      border: `1.5px solid ${open ? 'var(--forest)' : active ? 'var(--green)' : 'var(--line)'}`,
      background: open ? 'var(--forest)' : active ? 'rgba(0,154,81,.08)' : 'var(--paper)',
      color: open ? '#fff' : active ? 'var(--green)' : 'var(--ink)',
    }}>
      {active && !open && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
      )}
      {label}
      <span style={{ opacity: 0.7, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'flex' }}>
        <Ico d={CHEVRON} s={13} />
      </span>
    </button>
  )
}

/* ---- Client card ---- */
function ClientCard({ client, filteredTotal, filteredCount, dateActive, onSaveAmount, onDelete }: {
  client: Client
  filteredTotal: number
  filteredCount: number
  dateActive: boolean
  onSaveAmount: (id: string, amount: number) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing]       = useState(false)
  const [draft, setDraft]           = useState('')
  const [pendingDelete, setPending] = useState(false)
  const deleteTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef                    = useRef<HTMLInputElement>(null)
  const editWrapRef                 = useRef<HTMLDivElement>(null)

  const bg      = avatarColor(client.name)
  const capital = client.clientAmount || 0
  const pl      = filteredTotal - capital
  const plPos   = pl >= 0

  useEffect(() => {
    if (!editing) return
    setTimeout(() => inputRef.current?.focus(), 10)
    function h(e: MouseEvent) {
      if (editWrapRef.current && !editWrapRef.current.contains(e.target as Node)) setEditing(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [editing])

  function startEdit() { setDraft(capital.toString()); setEditing(true) }

  function saveEdit() {
    const val = parseFloat(draft)
    if (!isNaN(val) && val >= 0) onSaveAmount(client.id, val)
    setEditing(false)
  }

  function requestDelete() {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setPending(true)
    deleteTimerRef.current = setTimeout(() => setPending(false), 3000)
  }

  function cancelDelete() {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    setPending(false)
  }

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Avatar + name / contact + capital */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', background: bg, flexShrink: 0,
          display: 'grid', placeItems: 'center', color: '#eafff2', fontWeight: 700, fontSize: 15,
        }}>
          {initials(client.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            {/* Name + contact */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: 'var(--ink)', fontFamily: 'var(--serif)', lineHeight: 1.2 }}>
                  {client.name}
                </div>
                {dateActive && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
                    background: 'rgba(0,154,81,.12)', color: 'var(--green)',
                    letterSpacing: '.04em', textTransform: 'uppercase' as const, flexShrink: 0,
                  }}>Filtered</span>
                )}
              </div>
              {client.phone && <div style={{ fontSize: 12.5, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{client.phone}</div>}
              {client.email && <div style={{ fontSize: 12.5, color: 'var(--faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</div>}
            </div>

            {/* Inline editable capital */}
            <div ref={editWrapRef} style={{ flexShrink: 0, textAlign: 'right' as const }}>
              {editing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    ref={inputRef}
                    type="number" min="0"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
                    style={{
                      width: 110, border: '1.5px solid var(--forest)', borderRadius: 'var(--r-sm)',
                      padding: '5px 8px', fontSize: 13, fontFamily: 'var(--serif)', fontWeight: 600,
                      color: 'var(--ink)', background: 'var(--paper)', outline: 'none', boxSizing: 'border-box' as const,
                    }}
                  />
                  <button onClick={saveEdit} style={{ background: 'none', border: '1px solid var(--gain)', borderRadius: 4, color: 'var(--gain)', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: '2px 6px', lineHeight: 1.6 }}>✓</button>
                  <button onClick={() => setEditing(false)} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 4, color: 'var(--muted)', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: '2px 6px', lineHeight: 1.6 }}>✗</button>
                </div>
              ) : (
                <div onClick={startEdit} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.05em', textAlign: 'right' as const, marginBottom: 2 }}>Capital</div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{inr(capital)}</div>
                  </div>
                  <span style={{ color: 'var(--faint)', display: 'flex', marginTop: 10 }}><Ico d={PENCIL_ICON} s={11} /></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 4 }}>
              {dateActive ? 'Deployed (filtered)' : 'Total deployed'}
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 500, color: 'var(--green)', letterSpacing: '-.01em' }}>
              {inr(filteredTotal)}
            </div>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.05em', marginBottom: 4 }}>P&amp;L</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 500, color: plPos ? 'var(--gain)' : 'var(--loss)', letterSpacing: '-.01em' }}>
              {plStr(pl)}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--faint)', marginTop: 6 }}>
          {filteredCount} {filteredCount === 1 ? 'entry' : 'entries'}
          {dateActive && filteredCount !== client.entries.length && (
            <span style={{ opacity: 0.7 }}> of {client.entries.length} total</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {pendingDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
            <span style={{ fontSize: 12.5, color: 'var(--loss)', fontWeight: 600, flex: 1 }}>Delete this client?</span>
            <button
              onClick={() => onDelete(client.id)}
              style={{ background: 'none', border: '1px solid var(--loss)', borderRadius: 4, color: 'var(--loss)', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: '2px 8px', lineHeight: 1.6 }}
            >✓ Yes</button>
            <button
              onClick={cancelDelete}
              style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 4, color: 'var(--muted)', fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: '2px 8px', lineHeight: 1.6 }}
            >✗ No</button>
          </div>
        ) : (
          <button
            onClick={requestDelete}
            title="Delete client"
            style={{
              background: 'none', border: '1.5px solid var(--line)', borderRadius: 'var(--r-sm)',
              cursor: 'pointer', padding: '5px 9px', display: 'flex', alignItems: 'center',
              color: 'var(--faint)', transition: 'all 0.13s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--loss)'; e.currentTarget.style.color = 'var(--loss)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--faint)' }}
          >
            <Ico d={TRASH_ICON} s={14} />
          </button>
        )}
        {!pendingDelete && (
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="btn btn-ghost btn-mini"
            style={{ justifyContent: 'center', flex: 1 }}
          >
            View details →
          </Link>
        )}
      </div>
    </div>
  )
}

/* ---- Page ---- */
export default function ClientsPage() {
  const [clients, setClients]         = useState<Client[]>([])

  /* add client modal */
  const [addOpen, setAddOpen]         = useState(false)
  const [name, setName]               = useState('')
  const [phone, setPhone]             = useState('')
  const [email, setEmail]             = useState('')
  const [clientAmt, setClientAmt]     = useState('')
  const [notes, setNotes]             = useState('')
  const [done, setDone]               = useState(false)

  /* date range filter */
  const [dateFilter, setDateFilter]   = useState<QuickDate>('all')
  const [fromDate, setFromDate]       = useState('')
  const [toDate, setToDate]           = useState('')
  const [draftFrom, setDraftFrom]     = useState('')
  const [draftTo, setDraftTo]         = useState('')
  const [openDate, setOpenDate]       = useState(false)
  const dateRef                       = useRef<HTMLDivElement>(null)

  /* client name filter */
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [nameSearch, setNameSearch]   = useState('')
  const [openName, setOpenName]       = useState(false)
  const nameRef                       = useRef<HTMLDivElement>(null)
  const nameInputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getUserData('clients').then(mongoClients => {
      if (Array.isArray(mongoClients) && mongoClients.length > 0) {
        localStorage.setItem('eq-clients', JSON.stringify(mongoClients))
      }
      setClients(loadClients())
    })
  }, [])

  useEffect(() => {
    if (!openDate) return
    function h(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setOpenDate(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openDate])

  useEffect(() => {
    if (!openName) return
    function h(e: MouseEvent) {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) setOpenName(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openName])

  useEffect(() => {
    if (openName) setTimeout(() => nameInputRef.current?.focus(), 30)
  }, [openName])

  function openDateDrop() {
    setOpenName(false)
    if (!openDate) { setDraftFrom(fromDate); setDraftTo(toDate) }
    setOpenDate(v => !v)
  }

  function openNameDrop() {
    setOpenDate(false)
    setNameSearch('')
    setOpenName(v => !v)
  }

  function selectDate(key: QuickDate) {
    if (key !== 'custom') { setDateFilter(key); setFromDate(''); setToDate(''); setOpenDate(false) }
    else setDateFilter('custom')
  }

  function applyCustom() {
    setFromDate(draftFrom); setToDate(draftTo); setDateFilter('custom'); setOpenDate(false)
  }

  function selectClientName(id: string) { setSelectedClient(id); setOpenName(false) }

  function clearFilters() {
    setDateFilter('all'); setFromDate(''); setToDate('')
    setSelectedClient('all')
  }

  function openAdd() {
    setName(''); setPhone(''); setEmail(''); setClientAmt(''); setNotes(''); setDone(false)
    setAddOpen(true)
  }

  function saveClient() {
    if (!name.trim()) return
    const newClient: Client = {
      id: Date.now().toString(),
      name: name.trim(), phone: phone.trim(), email: email.trim(), notes: notes.trim(),
      clientAmount: parseFloat(clientAmt) || 0,
      createdAt: localDateISO(),
      entries: [],
    }
    const updated = [...clients, newClient]
    setClients(updated)
    saveClients(updated)
    saveUserData('clients', updated).catch(() => {})
    window.dispatchEvent(new CustomEvent('eq-record-added'))
    setDone(true)
    setTimeout(() => setAddOpen(false), 1200)
  }

  function saveClientAmount(id: string, amount: number) {
    const updated = clients.map(c => c.id === id ? { ...c, clientAmount: amount } : c)
    setClients(updated)
    saveClients(updated)
    saveUserData('clients', updated).catch(() => {})
    window.dispatchEvent(new CustomEvent('eq-record-added'))
  }

  function deleteClient(id: string) {
    const updated = clients.filter(c => c.id !== id)
    setClients(updated)
    saveClients(updated)
    saveUserData('clients', updated).catch(() => {})
    window.dispatchEvent(new CustomEvent('eq-record-added'))
  }

  function entriesInRange(client: Client) {
    if (dateFilter === 'all') return client.entries
    const cutoff = cutoffFor(dateFilter)
    return client.entries.filter(e => {
      if (dateFilter === 'custom') {
        if (fromDate && e.date < fromDate) return false
        if (toDate   && e.date > toDate)   return false
        return true
      }
      return !(cutoff && e.date < cutoff)
    })
  }

  const filteredClients = useMemo(() => {
    let list = clients
    if (selectedClient !== 'all') list = list.filter(c => c.id === selectedClient)
    if (dateFilter !== 'all') {
      const cutoff = cutoffFor(dateFilter)
      list = list.filter(c => {
        const inRange = c.entries.filter(e => {
          if (dateFilter === 'custom') {
            if (fromDate && e.date < fromDate) return false
            if (toDate   && e.date > toDate)   return false
            return true
          }
          return !(cutoff && e.date < cutoff)
        })
        return inRange.length > 0
      })
    }
    return list
  }, [clients, selectedClient, dateFilter, fromDate, toDate])

  const nameSearchResults = useMemo(() => {
    const q = nameSearch.trim().toLowerCase()
    return q ? clients.filter(c => c.name.toLowerCase().includes(q)) : clients
  }, [clients, nameSearch])

  const dateActive   = dateFilter !== 'all'
  const selectedName = selectedClient !== 'all' ? clients.find(c => c.id === selectedClient)?.name ?? 'Client' : null

  const datePillLabel = (() => {
    if (dateFilter === 'all')    return 'All time'
    if (dateFilter === 'month')  return 'This Month'
    if (dateFilter === '3m')     return 'Last 3 Months'
    if (dateFilter === 'year')   return 'This Year'
    if (fromDate && toDate)      return `${fmtShort(fromDate)} – ${fmtShort(toDate)}`
    if (fromDate)                return `From ${fmtShort(fromDate)}`
    if (toDate)                  return `Until ${fmtShort(toDate)}`
    return 'Custom'
  })()

  return (
    <div className="content fade">
      <div className="page-head">
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Clients</b></div>
          <h1>Clients</h1>
          <div className="sub" style={{ marginTop: 2 }}>Manage your client investments</div>
        </div>
        <button className="btn btn-solid" onClick={openAdd}>
          <Ico d={PLUS_ICON} s={16} />
          Add Client
        </button>
      </div>

      {/* Filter bar */}
      {clients.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', marginBottom: 4, borderBottom: '1px solid var(--line)' }}>
          {/* Date range */}
          <div ref={dateRef} style={{ position: 'relative' }}>
            <FilterPill label={datePillLabel} open={openDate} active={dateActive} onClick={openDateDrop} />
            {openDate && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, minWidth: 220,
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)', overflow: 'hidden',
              }}>
                {DATE_OPTIONS.map(opt => (
                  <div
                    key={opt.key}
                    onClick={() => selectDate(opt.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)',
                      fontWeight: dateFilter === opt.key ? 600 : 400,
                      color: dateFilter === opt.key ? 'var(--green)' : 'var(--ink)',
                      background: 'transparent', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {opt.label}
                    {dateFilter === opt.key && <Ico d={CHECK_ICON} s={13} />}
                  </div>
                ))}
                {dateFilter === 'custom' && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
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
                      <button className="btn btn-ghost btn-mini" onClick={() => setOpenDate(false)}>Cancel</button>
                      <button className="btn btn-solid btn-mini" disabled={!draftFrom && !draftTo} onClick={applyCustom}>Apply</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Client name */}
          <div ref={nameRef} style={{ position: 'relative' }}>
            <FilterPill label={selectedName ?? 'All clients'} open={openName} active={selectedClient !== 'all'} onClick={openNameDrop} />
            {openName && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, minWidth: 240,
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)', overflow: 'hidden',
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ico d={SEARCH_ICON} s={13} />
                  <input
                    ref={nameInputRef}
                    value={nameSearch}
                    onChange={e => setNameSearch(e.target.value)}
                    placeholder="Search client name…"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, fontFamily: 'var(--sans)', color: 'var(--ink)', background: 'transparent' }}
                  />
                  {nameSearch && (
                    <button onClick={() => setNameSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--faint)', display: 'flex', padding: 2 }}>
                      <Ico d={X_ICON} s={12} />
                    </button>
                  )}
                </div>
                {!nameSearch && (
                  <div
                    onClick={() => selectClientName('all')}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)',
                      fontWeight: selectedClient === 'all' ? 600 : 400,
                      color: selectedClient === 'all' ? 'var(--green)' : 'var(--ink)',
                      background: 'transparent', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    All clients
                    {selectedClient === 'all' && <Ico d={CHECK_ICON} s={13} />}
                  </div>
                )}
                <div style={{ maxHeight: 220, overflowY: 'auto' as const }}>
                  {nameSearchResults.length === 0 ? (
                    <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--faint)', textAlign: 'center' as const }}>No clients found</div>
                  ) : nameSearchResults.map(c => (
                    <div
                      key={c.id}
                      onClick={() => selectClientName(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)',
                        fontWeight: selectedClient === c.id ? 600 : 400,
                        color: selectedClient === c.id ? 'var(--green)' : 'var(--ink)',
                        background: 'transparent', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: avatarColor(c.name),
                        display: 'grid', placeItems: 'center', color: '#eafff2', fontWeight: 700, fontSize: 11, flexShrink: 0,
                      }}>{initials(c.name)}</div>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.name}</span>
                      {selectedClient === c.id && <Ico d={CHECK_ICON} s={13} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Count */}
          <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--faint)', whiteSpace: 'nowrap' as const }}>
            {filteredClients.length} of {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </div>
        </div>
      )}

      {/* Content */}
      {clients.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '72px 24px', color: 'var(--faint)' }}>
          <Ico d={PERSON_ICON} s={48} />
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--muted)', marginTop: 4 }}>No clients yet</div>
          <div style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', maxWidth: 280 }}>Add your first client to get started</div>
          <button className="btn btn-solid btn-mini" style={{ marginTop: 8 }} onClick={openAdd}>
            <Ico d={PLUS_ICON} s={14} /> Add Client
          </button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '72px 24px', color: 'var(--faint)' }}>
          <Ico d={SEARCH_ICON} s={44} />
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--muted)', marginTop: 4 }}>No clients match your filters</div>
          <div style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', maxWidth: 300 }}>Try adjusting the date range or selecting a different client</div>
          <button className="btn btn-ghost btn-mini" style={{ marginTop: 8 }} onClick={clearFilters}>Clear filters</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {filteredClients.map(c => {
            const inRange = entriesInRange(c)
            return (
              <ClientCard
                key={c.id}
                client={c}
                filteredTotal={inRange.reduce((s, e) => s + e.amount, 0)}
                filteredCount={inRange.length}
                dateActive={dateActive}
                onSaveAmount={saveClientAmount}
                onDelete={deleteClient}
              />
            )
          })}
        </div>
      )}

      {/* Add Client Modal */}
      <div className={`ov${addOpen ? ' show' : ''}`}>
        <div className="modal" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
          {done ? (
            <div className="modal-body">
              <div className="confirm-ok">
                <div className="ok"><Ico d={CHECK_ICON} s={34} /></div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>Client added!</h3>
              </div>
            </div>
          ) : (
            <>
              <div className="modal-head">
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r)', background: 'var(--forest)', display: 'grid', placeItems: 'center', color: '#eafff2', flexShrink: 0 }}>
                  <Ico d={USERS_ICON} s={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--ink)' }}>Add client</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Create a new client record</div>
                </div>
                <button className="tb-icon" style={{ marginLeft: 'auto' }} onClick={() => setAddOpen(false)}>
                  <Ico d="M6 6l12 12M18 6 6 18" s={16} />
                </button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>Full Name *</label>
                  <input
                    autoFocus style={inputStyle} value={name} placeholder="e.g. Rajesh Kumar"
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveClient() }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Phone</label>
                    <input style={inputStyle} value={phone} placeholder="9876543210" onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Email</label>
                    <input style={inputStyle} type="email" value={email} placeholder="name@example.com" onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Investment Amount (₹) *</label>
                  <input
                    type="number" min="0" style={{ ...inputStyle, fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600 }}
                    value={clientAmt} placeholder="Total capital client has entrusted to you"
                    onChange={e => setClientAmt(e.target.value)}
                  />
                  {parseFloat(clientAmt) > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--faint)' }}>
                      = <b style={{ color: 'var(--ink)' }}>{inr(parseFloat(clientAmt))}</b>
                    </div>
                  )}
                </div>
                <div className="field">
                  <label>Notes</label>
                  <textarea
                    style={{ ...inputStyle, resize: 'none' as const }} rows={2}
                    value={notes} placeholder="Optional notes about this client"
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button className="btn btn-ghost btn-mini" onClick={() => setAddOpen(false)}>Cancel</button>
                  <button
                    className="btn btn-solid btn-mini" onClick={saveClient}
                    disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.5 }}
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
