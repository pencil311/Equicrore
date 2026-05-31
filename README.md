# Equicrore

Personal trading & investment portfolio showcase. Tracks Indian stocks (NSE/BSE),
US stocks (NYSE/NASDAQ), and crypto with real-time data.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in your MongoDB URI and other keys

# 3. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Project scaffold, design tokens, folder structure | ✅ Done |
| 2 | Homepage (landing page) | 🔲 Next |
| 3 | Dashboard UI (mock data) | 🔲 |
| 4 | Auth + MongoDB | 🔲 |
| 5 | Live market data | 🔲 |
| 6 | Market browser | 🔲 |

## Tech stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + CSS custom properties
- **Recharts** for charts
- **NextAuth.js** for auth
- **MongoDB Atlas** for persistence
- **CoinGecko** + **yahoo-finance2** for market data

## Design

All design tokens in `src/styles/tokens.css`.
Brand: forest green (`#003C20`) + emerald (`#009A51`) on sage (`#E7ECE5`).
Fonts: Spectral (serif) + Hanken Grotesk (sans).
