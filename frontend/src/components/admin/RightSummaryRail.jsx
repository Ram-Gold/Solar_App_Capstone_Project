import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getStockQuantity, getStockTier } from '../../lib/inventoryUtils'
import { isPickupInquiry, normalizeInquiryStatus, OPS_UPDATED_EVENT } from '../../lib/inquiryStatusUtils'

function useRailMetrics({ productsProp, quoteStatsProp }) {
  const [metrics, setMetrics] = useState({
    totalInquiries: 0,
    activeInquiries: 0,
    completedQuotes: 0,
    completionDenom: 0,
    completionPct: 0,
    pickups: 0,
    activeHolds: 0,
    consultations: 0,
    claimsResolved: 0,
    claimsInspecting: 0,
    claimsRejected: 0,
    tokensIssued: 0,
    pendingQuotes: 0,
    restockAlerts: 0,
    totalUnits: 0,
    topMovers: [],
  })

  useEffect(() => {
    let ignore = false

    async function load() {
      let products = Array.isArray(productsProp) ? productsProp : []
      let quotes = []
      let claims = []
      let tokensCount = 0

      if (typeof supabase?.from === 'function') {
        try {
          const requests = [
            supabase
              .from('quote_tickets')
              .select('id, ticket_code, status, will_visit, purpose_of_visitation, is_reservation'),
            supabase.from('warranty_claims').select('id, status'),
            supabase.from('customer_purchases').select('id', { count: 'exact', head: true }),
          ]
          if (products.length === 0) {
            requests.push(supabase.from('products').select('id, name, sales, stock_quantity, in_stock'))
          }
          const results = await Promise.all(requests)
          if (results[0]?.data) quotes = results[0].data
          if (results[1]?.data) claims = results[1].data
          if (typeof results[2]?.count === 'number') tokensCount = results[2].count
          if (results[3]?.data) products = results[3].data
        } catch {
          // Safe fallback when mocked or offline
        }
      }

      if (ignore) return

      const pendingQuotes =
        quoteStatsProp?.pending ??
        quotes.filter((q) => normalizeInquiryStatus(q.status) === 'Pending').length
      const confirmedQuotes = quotes.filter((q) => normalizeInquiryStatus(q.status) === 'Confirmed').length
      const completedQuotes = quotes.filter((q) => normalizeInquiryStatus(q.status) === 'Completed').length

      const activeQuotes = quotes.filter((q) => {
        const st = normalizeInquiryStatus(q.status)
        return st === 'Pending' || st === 'Confirmed'
      })

      const pickups = activeQuotes.filter((q) => isPickupInquiry(q)).length
      const activeHolds = activeQuotes.filter((q) => isPickupInquiry(q) && Boolean(q.is_reservation)).length
      const consultations =
        quoteStatsProp?.consultations ?? activeQuotes.filter((q) => !isPickupInquiry(q)).length

      const completionDenom = pendingQuotes + confirmedQuotes + completedQuotes
      const completionPct =
        completionDenom > 0 ? Math.round((completedQuotes / completionDenom) * 100) : 0

      const resolved = claims.filter((c) => {
        const s = String(c.status || '').toLowerCase()
        return ['approved', 'resolved', 'replaced', 'completed'].includes(s)
      }).length
      const inspecting = claims.filter((c) => {
        const s = String(c.status || '').toLowerCase()
        return ['pending', 'under review', 'inspecting', 'in_review'].includes(s)
      }).length
      const rejected = claims.filter((c) => {
        const s = String(c.status || '').toLowerCase()
        return ['rejected', 'denied', 'out of warranty', 'expired'].includes(s)
      }).length

      const restockAlerts = products.filter((p) => {
        const tier = getStockTier(p)
        return tier === 'out' || tier === 'low'
      }).length

      const totalUnits = products.reduce((acc, p) => acc + getStockQuantity(p), 0)

      const topMovers = [...products]
        .sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))
        .slice(0, 3)

      setMetrics({
        totalInquiries: quoteStatsProp?.total ?? quotes.length,
        activeInquiries: activeQuotes.length,
        completedQuotes,
        completionDenom,
        completionPct,
        pickups,
        activeHolds,
        consultations,
        claimsResolved: resolved,
        claimsInspecting: inspecting,
        claimsRejected: rejected,
        tokensIssued: tokensCount,
        pendingQuotes,
        restockAlerts,
        totalUnits,
        topMovers,
      })
    }

    load()
    const handleOpsUpdated = () => {
      load()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(OPS_UPDATED_EVENT, handleOpsUpdated)
    }
    return () => {
      ignore = true
      if (typeof window !== 'undefined') {
        window.removeEventListener(OPS_UPDATED_EVENT, handleOpsUpdated)
      }
    }
  }, [productsProp, quoteStatsProp])

  return metrics
}

/**
 * Compact 3-tile summary strip rendered above the main table on < 1140px (xl) viewports.
 */
export function CompactSummaryStrip({ products, quoteStats, onNavigate }) {
  const m = useRailMetrics({ productsProp: products, quoteStatsProp: quoteStats })
  const totalClaims = m.claimsResolved + m.claimsInspecting + m.claimsRejected
  const resolvedPct = totalClaims > 0 ? Math.round((m.claimsResolved / totalClaims) * 100) : 0

  return (
    <section
      aria-label="Operational summary"
      className="xl:hidden grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-jds-surface-container-lowest border border-jds-outline-variant/30"
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant">
          Inquiry Fulfillment
        </p>
        <p className="text-sm font-bold text-jds-on-surface tabular-nums mt-0.5">
          {m.completionPct}% fulfilled ({m.pickups} pickups / {m.consultations} inquiries)
        </p>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant">
          Claim Pipeline
        </p>
        <p className="text-sm font-bold text-jds-on-surface tabular-nums mt-0.5">
          {resolvedPct}% resolved ({m.claimsInspecting} inspecting)
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant">
            Top Moving SKU
          </p>
          <p className="text-sm font-bold text-jds-on-surface truncate mt-0.5">
            {m.topMovers[0]?.name || 'No recorded sales yet'}
          </p>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-jds-primary hover:underline shrink-0 cursor-pointer"
          >
            Catalog
          </button>
        )}
      </div>
    </section>
  )
}

/**
 * Hybrid Right-Hand Operational Summary Rail (~300px) visible on >= xl screens
 * for Dashboard Overview, Inquiries & Pickups, and Orders.
 */
export default function RightSummaryRail({ products, quoteStats, role = 'admin', onNavigate }) {
  const m = useRailMetrics({ productsProp: products, quoteStatsProp: quoteStats })
  const isAdmin = role === 'admin'

  const totalClaims = m.claimsResolved + m.claimsInspecting + m.claimsRejected
  const resolvedPct = totalClaims > 0 ? Math.round((m.claimsResolved / totalClaims) * 100) : 0
  const inspectPct = totalClaims > 0 ? Math.round((m.claimsInspecting / totalClaims) * 100) : 0
  const rejectedPct = totalClaims > 0 ? Math.max(0, 100 - resolvedPct - inspectPct) : 0

  // Semi-circular arc stroke dasharray for inquiry completion progress (excluding Cancelled)
  const arcMax = 201
  const fulfillmentRatio =
    m.completionDenom > 0 ? Math.min(1, m.completedQuotes / m.completionDenom) : 0
  const arcFill = Math.round(arcMax * fulfillmentRatio)

  return (
    <aside
      aria-label="Operational summary rail"
      className="hidden xl:flex w-[300px] shrink-0 flex-col gap-4 border-l border-jds-outline-variant bg-jds-surface p-4 overflow-y-auto"
    >
      {/* Inquiry Fulfillment Gauge */}
      <section className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-jds-on-surface">
            Inquiry Fulfillment
          </h2>
          <span className="text-[11px] font-medium text-jds-on-surface-variant">
            {m.activeInquiries} active
          </span>
        </div>

        <div className="flex flex-col items-center py-1">
          <svg className="w-36 h-20" viewBox="0 0 160 90" aria-hidden="true">
            <path
              d="M 16 78 A 64 64 0 0 1 144 78"
              fill="none"
              stroke="#e7e0d4"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 16 78 A 64 64 0 0 1 144 78"
              fill="none"
              stroke="#b45309"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${arcFill} ${arcMax}`}
            />
          </svg>
          <p className="text-xl font-extrabold text-jds-on-surface tabular-nums -mt-6">
            {m.completionPct}%
          </p>
          <p className="text-xs text-jds-on-surface-variant mt-0.5 text-center">
            {m.completedQuotes} of {m.completionDenom} fulfilled ({m.pendingQuotes} pending)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-jds-outline-variant/25">
          <div>
            <p className="text-sm font-bold text-jds-on-surface tabular-nums">{m.pickups} pickups</p>
            <p className="text-[11px] text-jds-on-surface-variant">
              {m.activeHolds > 0 ? `${m.activeHolds} holding stock` : 'Store pickups'}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-jds-on-surface tabular-nums">{m.consultations} visits</p>
            <p className="text-[11px] text-jds-on-surface-variant">Showroom inquiries</p>
          </div>
        </div>
      </section>

      {/* Warranty & Claim Breakdown */}
      <section className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-jds-on-surface">
            Warranty Claims
          </h2>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('claims')}
              className="text-[11px] font-bold text-jds-primary hover:underline cursor-pointer"
            >
              Open Queue
            </button>
          )}
        </div>

        <div className="h-2 w-full rounded-full bg-jds-surface-container overflow-hidden flex" aria-hidden="true">
          <div style={{ width: `${resolvedPct}%` }} className="bg-emerald-700" />
          <div style={{ width: `${inspectPct}%` }} className="bg-amber-600" />
          <div style={{ width: `${rejectedPct}%` }} className="bg-jds-error" />
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-jds-on-surface-variant">Resolved / Replaced</span>
            <span className="font-bold text-jds-on-surface tabular-nums">{m.claimsResolved} ({resolvedPct}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-jds-on-surface-variant">Under Inspection</span>
            <span className="font-bold text-jds-on-surface tabular-nums">{m.claimsInspecting} ({inspectPct}%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-jds-on-surface-variant">Denied / Expired</span>
            <span className="font-bold text-jds-on-surface tabular-nums">{m.claimsRejected} ({rejectedPct}%)</span>
          </div>
        </div>
      </section>

      {/* Operations Snapshot */}
      <section className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-jds-on-surface">
          Operations Snapshot
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-base font-extrabold text-jds-on-surface tabular-nums">{m.tokensIssued}</p>
            <p className="text-[11px] text-jds-on-surface-variant">QR tokens issued</p>
          </div>
          <div>
            <p className="text-base font-extrabold text-jds-on-surface tabular-nums">{m.restockAlerts}</p>
            <p className="text-[11px] text-jds-on-surface-variant">Restock alerts</p>
          </div>
          <div>
            <p className="text-base font-extrabold text-jds-on-surface tabular-nums">{m.pendingQuotes}</p>
            <p className="text-[11px] text-jds-on-surface-variant">Pending inquiries</p>
          </div>
          <div>
            <p className="text-base font-extrabold text-jds-on-surface tabular-nums">
              {isAdmin ? m.totalUnits : m.claimsInspecting}
            </p>
            <p className="text-[11px] text-jds-on-surface-variant">
              {isAdmin ? 'Warehouse units' : 'Open claim reviews'}
            </p>
          </div>
        </div>
      </section>

      {/* Top Moving SKUs */}
      <section className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 space-y-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-jds-on-surface">
          Top Moving SKUs
        </h2>
        {m.topMovers.length === 0 ? (
          <p className="text-xs text-jds-on-surface-variant">No sales recorded yet.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {m.topMovers.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-jds-on-surface font-medium">{item.name}</span>
                <span className="font-bold text-jds-on-surface tabular-nums shrink-0">
                  {Number(item.sales || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  )
}
