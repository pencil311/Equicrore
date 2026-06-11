'use client'
import { HoldingsPanel, AllocationPanel } from '@/components/dashboard/DashPanels'
import { Ico } from '@/components/dashboard/DashLayout'
import { useDash } from '@/lib/dashContext'

const EMPTY_ICON = 'M6 7V6a4 4 0 0 1 8 0v1M4 7h16l-1 13H5z'

export default function PortfolioPage() {
  const { liveHoldings, cash, portfolioValue, openTrade } = useDash()

  return (
    <div className="content fade">
      <div className="page-head">
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Portfolio</b></div>
          <h1>Your holdings</h1>
        </div>
      </div>

      {liveHoldings.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, padding: '72px 24px', color: 'var(--faint)',
        }}>
          <Ico d={EMPTY_ICON} s={48} />
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--muted)', marginTop: 4 }}>
            No holdings yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', maxWidth: 300 }}>
            Record your first buy trade to get started. Your holdings will appear here automatically.
          </div>
          <button
            className="btn btn-solid btn-mini"
            style={{ marginTop: 8 }}
            onClick={() => openTrade()}
          >
            Record a trade
          </button>
        </div>
      ) : (
        <div className="grid-2">
          <HoldingsPanel holdings={liveHoldings} onTrade={openTrade} />
          <AllocationPanel holdings={liveHoldings} cash={cash} portfolioValue={portfolioValue} />
        </div>
      )}
    </div>
  )
}
