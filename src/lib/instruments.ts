/* ============================================================
   EQUICRORE — Market instruments catalogue
   ============================================================ */

export type Market = 'IN' | 'US' | 'Crypto'
export type AssetType = 'Equity' | 'ETF' | 'Mutual Fund' | 'Crypto' | 'Index'

export interface Instrument {
  sym:       string        // our internal symbol
  yahooSym?: string        // yahoo finance symbol (with .NS/.BO suffix)
  cgId?:     string        // coingecko coin id
  name:      string
  market:    Market
  type:      AssetType
  sector?:   string
  color:     string
  mcap?:     string        // display market cap
}

export const instruments: Instrument[] = [
  // ---- Indian Equities ----
  { sym:'RELIANCE',   yahooSym:'RELIANCE.NS',   name:'Reliance Industries',      market:'IN',     type:'Equity',      sector:'Energy',       color:'#1a73c7', mcap:'₹19.8 L Cr' },
  { sym:'TCS',        yahooSym:'TCS.NS',         name:'Tata Consultancy Services',market:'IN',     type:'Equity',      sector:'IT',           color:'#7a3ec2', mcap:'₹14.2 L Cr' },
  { sym:'HDFCBANK',   yahooSym:'HDFCBANK.NS',    name:'HDFC Bank',               market:'IN',     type:'Equity',      sector:'Banking',      color:'#1f55b5', mcap:'₹12.1 L Cr' },
  { sym:'INFY',       yahooSym:'INFY.NS',        name:'Infosys',                 market:'IN',     type:'Equity',      sector:'IT',           color:'#0b8f6a', mcap:'₹6.8 L Cr'  },
  { sym:'ICICIBANK',  yahooSym:'ICICIBANK.NS',   name:'ICICI Bank',              market:'IN',     type:'Equity',      sector:'Banking',      color:'#c2762e', mcap:'₹7.9 L Cr'  },
  { sym:'HINDUNILVR', yahooSym:'HINDUNILVR.NS',  name:'Hindustan Unilever',      market:'IN',     type:'Equity',      sector:'FMCG',         color:'#2e9c8e', mcap:'₹5.5 L Cr'  },
  { sym:'BAJFINANCE', yahooSym:'BAJFINANCE.NS',  name:'Bajaj Finance',           market:'IN',     type:'Equity',      sector:'Finance',      color:'#5b6ad0', mcap:'₹4.8 L Cr'  },
  { sym:'WIPRO',      yahooSym:'WIPRO.NS',       name:'Wipro',                   market:'IN',     type:'Equity',      sector:'IT',           color:'#3a6fb0', mcap:'₹2.6 L Cr'  },
  { sym:'TATAMOTORS', yahooSym:'TATAMOTORS.NS',  name:'Tata Motors',             market:'IN',     type:'Equity',      sector:'Auto',         color:'#3a6fb0', mcap:'₹3.2 L Cr'  },
  { sym:'ZOMATO',     yahooSym:'ZOMATO.NS',      name:'Zomato',                  market:'IN',     type:'Equity',      sector:'Consumer',     color:'#c2402e', mcap:'₹2.1 L Cr'  },
  { sym:'ADANIENT',   yahooSym:'ADANIENT.NS',    name:'Adani Enterprises',       market:'IN',     type:'Equity',      sector:'Conglomerate', color:'#1a73c7', mcap:'₹3.6 L Cr'  },
  { sym:'SUNPHARMA',  yahooSym:'SUNPHARMA.NS',   name:'Sun Pharmaceutical',      market:'IN',     type:'Equity',      sector:'Pharma',       color:'#d39021', mcap:'₹3.9 L Cr'  },
  { sym:'MARUTI',     yahooSym:'MARUTI.NS',      name:'Maruti Suzuki',           market:'IN',     type:'Equity',      sector:'Auto',         color:'#2e9c8e', mcap:'₹3.4 L Cr'  },
  { sym:'LTIM',       yahooSym:'LTIM.NS',        name:'LTIMindtree',             market:'IN',     type:'Equity',      sector:'IT',           color:'#7a3ec2', mcap:'₹1.4 L Cr'  },
  { sym:'AXISBANK',   yahooSym:'AXISBANK.NS',    name:'Axis Bank',               market:'IN',     type:'Equity',      sector:'Banking',      color:'#c2762e', mcap:'₹3.5 L Cr'  },
  // ---- Indian ETFs ----
  { sym:'NIFTYBEES',  yahooSym:'NIFTYBEES.NS',   name:'Nippon India Nifty 50 ETF',market:'IN',   type:'ETF',         sector:'Index',        color:'#c2762e', mcap:'₹7,200 Cr'  },
  { sym:'GOLDBEES',   yahooSym:'GOLDBEES.NS',    name:'Nippon India Gold ETF',   market:'IN',     type:'ETF',         sector:'Commodity',    color:'#b98a2e', mcap:'₹8,400 Cr'  },
  { sym:'BANKBEES',   yahooSym:'BANKBEES.NS',    name:'Nippon India Bank ETF',   market:'IN',     type:'ETF',         sector:'Banking',      color:'#1f55b5', mcap:'₹4,100 Cr'  },
  // ---- US Equities ----
  { sym:'AAPL',  yahooSym:'AAPL',  name:'Apple Inc.',           market:'US', type:'Equity', sector:'Technology',    color:'#555', mcap:'$3.1T' },
  { sym:'NVDA',  yahooSym:'NVDA',  name:'NVIDIA Corporation',   market:'US', type:'Equity', sector:'Technology',    color:'#76b900', mcap:'$2.8T' },
  { sym:'MSFT',  yahooSym:'MSFT',  name:'Microsoft Corporation',market:'US', type:'Equity', sector:'Technology',    color:'#0078d4', mcap:'$3.0T' },
  { sym:'TSLA',  yahooSym:'TSLA',  name:'Tesla Inc.',           market:'US', type:'Equity', sector:'Auto/EV',       color:'#cc0000', mcap:'$780B' },
  { sym:'AMZN',  yahooSym:'AMZN',  name:'Amazon.com Inc.',      market:'US', type:'Equity', sector:'E-Commerce',    color:'#ff9900', mcap:'$1.9T' },
  { sym:'GOOGL', yahooSym:'GOOGL', name:'Alphabet Inc.',        market:'US', type:'Equity', sector:'Technology',    color:'#4285f4', mcap:'$2.1T' },
  { sym:'META',  yahooSym:'META',  name:'Meta Platforms Inc.',  market:'US', type:'Equity', sector:'Social Media',  color:'#0082fb', mcap:'$1.3T' },
  { sym:'NFLX',  yahooSym:'NFLX',  name:'Netflix Inc.',         market:'US', type:'Equity', sector:'Streaming',     color:'#e50914', mcap:'$280B' },
  { sym:'AMD',   yahooSym:'AMD',   name:'Advanced Micro Devices',market:'US',type:'Equity', sector:'Semiconductors',color:'#ed1c24', mcap:'$250B' },
  { sym:'JPM',   yahooSym:'JPM',   name:'JPMorgan Chase',       market:'US', type:'Equity', sector:'Banking',       color:'#005eb8', mcap:'$560B' },
  { sym:'BRKB',  yahooSym:'BRK-B', name:'Berkshire Hathaway B', market:'US', type:'Equity', sector:'Conglomerate',  color:'#3a2a06', mcap:'$870B' },
  { sym:'V',     yahooSym:'V',     name:'Visa Inc.',            market:'US', type:'Equity', sector:'Finance',       color:'#1a1f71', mcap:'$530B' },
  // ---- Crypto ----
  { sym:'BTC',   cgId:'bitcoin',       name:'Bitcoin',       market:'Crypto', type:'Crypto', color:'#f7931a', mcap:'$1.2T'  },
  { sym:'ETH',   cgId:'ethereum',      name:'Ethereum',      market:'Crypto', type:'Crypto', color:'#627eea', mcap:'$370B'  },
  { sym:'SOL',   cgId:'solana',        name:'Solana',        market:'Crypto', type:'Crypto', color:'#9945ff', mcap:'$82B'   },
  { sym:'BNB',   cgId:'binancecoin',   name:'BNB',           market:'Crypto', type:'Crypto', color:'#f3ba2f', mcap:'$90B'   },
  { sym:'XRP',   cgId:'ripple',        name:'XRP',           market:'Crypto', type:'Crypto', color:'#0085c0', mcap:'$65B'   },
  { sym:'ADA',   cgId:'cardano',       name:'Cardano',       market:'Crypto', type:'Crypto', color:'#0033ad', mcap:'$18B'   },
  { sym:'DOGE',  cgId:'dogecoin',      name:'Dogecoin',      market:'Crypto', type:'Crypto', color:'#c2a633', mcap:'$24B'   },
  { sym:'MATIC', cgId:'matic-network', name:'Polygon',       market:'Crypto', type:'Crypto', color:'#8247e5', mcap:'$7B'    },
  { sym:'DOT',   cgId:'polkadot',      name:'Polkadot',      market:'Crypto', type:'Crypto', color:'#e6007a', mcap:'$10B'   },
  { sym:'AVAX',  cgId:'avalanche-2',   name:'Avalanche',     market:'Crypto', type:'Crypto', color:'#e84142', mcap:'$14B'   },
  { sym:'LINK',  cgId:'chainlink',     name:'Chainlink',     market:'Crypto', type:'Crypto', color:'#2a5ada', mcap:'$9B'    },
  { sym:'UNI',   cgId:'uniswap',       name:'Uniswap',       market:'Crypto', type:'Crypto', color:'#ff007a', mcap:'$5B'    },
]

export const sectors = {
  IN: ['All', 'IT', 'Banking', 'Energy', 'FMCG', 'Auto', 'Finance', 'Pharma', 'Consumer', 'Conglomerate', 'Commodity', 'Index'],
  US: ['All', 'Technology', 'Banking', 'Finance', 'Auto/EV', 'E-Commerce', 'Social Media', 'Streaming', 'Semiconductors', 'Conglomerate'],
  Crypto: ['All'],
}
