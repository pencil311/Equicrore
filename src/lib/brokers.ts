export type BrokerId = 'dhan' | 'zerodha' | 'fyers' | 'angelone' | 'schwab' | 'fidelity' | 'ibkr'

export interface Broker {
  id: BrokerId
  name: string
  color: string
  logo: string
}

export const BROKERS: Broker[] = [
  { id: 'dhan',      name: 'Dhan',               color: '#1a5fe0', logo: '/assets/dhan.png' },
  { id: 'zerodha',   name: 'Zerodha',             color: '#387ed1', logo: '' },
  { id: 'fyers',     name: 'Fyers',               color: '#f5a623', logo: '/assets/fyers.png' },
  { id: 'angelone',  name: 'Angel One',           color: '#e03424', logo: '/assets/angelone.png' },
  { id: 'schwab',    name: 'Charles Schwab',      color: '#00a0df', logo: '' },
  { id: 'fidelity',  name: 'Fidelity',            color: '#006b3c', logo: '' },
  { id: 'ibkr',      name: 'Interactive Brokers', color: '#e31837', logo: '' },
]

const VALID_IDS = new Set<string>(['dhan', 'zerodha', 'fyers', 'angelone', 'schwab', 'fidelity', 'ibkr'])

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
  if (v && VALID_IDS.has(v)) return v as BrokerId
  return 'dhan'
}
