'use client'
import { TransactionsPanel } from '@/components/dashboard/DashPanels'
import { useDash } from '@/lib/dashContext'

export default function OrdersPage() {
  const { txns } = useDash()
  return (
    <div className="content fade">
      <div className="page-head">
        <div>
          <div className="crumb">Dashboard <span>·</span> <b>Transactions</b></div>
          <h1>Transaction history</h1>
        </div>
      </div>
      <TransactionsPanel txns={txns} />
    </div>
  )
}
