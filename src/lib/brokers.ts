export type BrokerId = 'dhan' | 'zerodha' | 'fyers' | 'angelone' | 'schwab' | 'fidelity' | 'ibkr'

export interface Broker {
  id: BrokerId
  name: string
  color: string
  logo: string
}

export const BROKERS: Broker[] = [
  { id: 'dhan',      name: 'Dhan',               color: '#1a5fe0', logo: '/assets/brokers/dhan.png' },
  { id: 'zerodha',   name: 'Zerodha (Kite)',      color: '#387ed1', logo: '/assets/brokers/zerodha.png' },
  { id: 'fyers',     name: 'Fyers',               color: '#f5a623', logo: '/assets/brokers/fyers.png' },
  { id: 'angelone',  name: 'Angel One',           color: '#e03424', logo: '/assets/brokers/angelone.png' },
  { id: 'schwab',    name: 'Charles Schwab',      color: '#00a0df', logo: '/assets/brokers/schwab.png' },
  { id: 'fidelity',  name: 'Fidelity',            color: '#006b3c', logo: '/assets/brokers/fidelity.png' },
  { id: 'ibkr',      name: 'Interactive Brokers', color: '#e31837', logo: '/assets/brokers/ibkr.png' },
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
