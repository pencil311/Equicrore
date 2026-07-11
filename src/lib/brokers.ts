export type BrokerId = 'dhan' | 'zerodha' | 'fyers' | 'angelone' | 'schwab' | 'fidelity' | 'ibkr'

export interface Broker {
  id: BrokerId
  name: string
  color: string
  logo: string
}

export const BROKERS: Broker[] = [
  { id: 'dhan',      name: 'Dhan',               color: '#1a5fe0', logo: 'https://play-lh.googleusercontent.com/S1aTpHYAMBYGMnbUMfFGpHfvYNMpHYGMbWpGMnbUMfFGpH' },
  { id: 'zerodha',   name: 'Zerodha (Kite)',      color: '#387ed1', logo: 'https://zerodha.com/static/images/logo.svg' },
  { id: 'fyers',     name: 'Fyers',               color: '#f5a623', logo: 'https://fyers.in/images/fyers-logo.svg' },
  { id: 'angelone',  name: 'Angel One',           color: '#e03424', logo: 'https://www.angelone.in/images/logo.svg' },
  { id: 'schwab',    name: 'Charles Schwab',      color: '#00a0df', logo: 'https://www.schwab.com/favicon.ico' },
  { id: 'fidelity',  name: 'Fidelity',            color: '#006b3c', logo: 'https://www.fidelity.com/favicon.ico' },
  { id: 'ibkr',      name: 'Interactive Brokers', color: '#e31837', logo: 'https://www.interactivebrokers.com/favicon.ico' },
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
