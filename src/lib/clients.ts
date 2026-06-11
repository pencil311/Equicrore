/* Clients localStorage utilities */

export interface ClientEntry {
  id: string
  date: string
  amount: number
  market?: string
  notes: string
  createdAt: string
}

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  notes: string
  clientAmount: number
  createdAt: string
  entries: ClientEntry[]
}

export function loadClients(): Client[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('eq-clients') || '[]') } catch { return [] }
}

export function saveClients(clients: Client[]): void {
  localStorage.setItem('eq-clients', JSON.stringify(clients))
}

export function updateClient(updated: Client): void {
  const all = loadClients()
  const idx = all.findIndex(c => c.id === updated.id)
  if (idx >= 0) { all[idx] = updated; saveClients(all) }
}
