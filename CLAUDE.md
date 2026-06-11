# EQUICRORE — Project Briefing for Claude Code

## What this is
A personal trading & investment showcase website. Displays real-time prices across
Indian stocks (NSE/BSE), US stocks (NYSE/NASDAQ), and crypto. Built to demonstrate
portfolio management skills modeled on wealthy.in but as a personal site.



## Tech stack
- **Frontend/Backend**: Next.js 14 (App Router), TypeScript
- **Styling**: CSS custom properties (tokens.css) + Tailwind utilities
- **Charts**: Recharts (replaces hand-rolled SVG from design handoff)
- **Auth**: NextAuth.js (Phase 4)
- **Database**: MongoDB Atlas (direct connection string — ISP blocks SRV)
- **Market data**: CoinGecko (crypto), yahoo-finance2 npm (stocks)

## Design system
All design tokens live in `src/styles/tokens.css`. This is the source of truth.
- Primary: `--green: #009A51`
- Deep: `--forest: #003C20`
- Page bg: `--bg: #eef2ec`
- Cards: `--paper: #fbfdfb`
- Fonts: Spectral (serif, headings/numbers) + Hanken Grotesk (sans, UI)
- Dark theme: set `data-theme="dark"` on `<html>`, persisted in localStorage['eq-theme']
- Negative values use minus glyph `−` (U+2212), not hyphen

## File structure
```
src/
  app/                  # Next.js App Router pages
    page.tsx            # Homepage (Phase 2)
    dashboard/          # Dashboard (Phase 3)
    markets/            # Market browser (Phase 6)
    api/
      auth/             # NextAuth (Phase 4)
      market/           # Price data proxy (Phase 5)
  components/
    ui/                 # Primitive components (Button, Card, Badge…)
    layout/             # Sidebar, TopBar, Nav
    charts/             # Recharts wrappers (AreaChart, Donut, Spark)
    dashboard/          # Dashboard panels (Holdings, Watchlist, etc.)
  lib/
    format.ts           # inr(), inrShort(), pct() — Indian number formatting
    mockData.ts         # Development mock data (replace in Phase 5)
    db.ts               # MongoDB connection (Phase 4)
    auth.ts             # NextAuth config (Phase 4)
  hooks/
    useCountUp.ts       # Animated number hook
    useTheme.ts         # Theme toggle hook
  styles/
    tokens.css          # Design tokens (DO NOT rename/move)
    globals.css         # Tailwind base + token import
```

## Build phases
1. ✅ Project scaffold (this file)
2. 🔲 Homepage — port index.html design
3. 🔲 Dashboard UI — port dashboard.html with mock data
4. 🔲 Auth + MongoDB
5. 🔲 Live market data APIs
6. 🔲 Market browser page

## Key conventions
- All currency formatted with `inr()` / `inrShort()` from `src/lib/format.ts`
- Animated numbers use `useCountUp` hook
- Never gate content visibility on animation — always visible at rest
- Use `--ease: cubic-bezier(.22,.61,.36,1)` for all transitions
- MongoDB: use direct connection string (ISP blocks SRV format)

## Related project
MoodSync (moodsync-fgmw.vercel.app) uses same MongoDB Atlas cluster.
Atlas cluster ID: h7nhyyh — create a separate `equicrore` database.
