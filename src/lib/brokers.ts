export type BrokerId = 'dhan' | 'frontpage' | 'kite'

export interface Broker {
  id: BrokerId
  name: string
  color: string
}

export const BROKERS: Broker[] = [
  { id: 'dhan',      name: 'Dhan',      color: '#1a73c7' },
  { id: 'frontpage', name: 'Frontpage', color: '#f5a623' },
  { id: 'kite',      name: 'Kite',      color: '#e03424' },
]

export function brokerKeys(id: BrokerId) {
  return {
    holdings: `eq-holdings-${id}`,
    cash:     `eq-cash-${id}`,
    records:  `eq-records-${id}`,
  }
}

export function getActiveBroker(): BrokerId {
  if (typeof window === 'undefined') return 'dhan'
  const v = localStorage.getItem('eq-active-broker')
  if (v === 'dhan' || v === 'frontpage' || v === 'kite') return v
  return 'dhan'
}
