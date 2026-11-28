import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Package,
  Sparkles,
  Wrench,
  ExternalLink,
} from 'lucide-react'
import { formatDate, formatRemainingText } from '../../lib/warrantyUtils'
import { getMainProductImage } from '../../lib/productImageUtils'

function getCoverageState(purchase, hasClaimedReplacement) {
  if (purchase.is_voided) {
    return {
      label: 'Warranty Voided',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
      barClass: 'bg-rose-500',
      barWidth: '100%',
      captionRight: 'Disqualified',
      icon: ShieldX,
    }
  }
  if (hasClaimedReplacement) {
    return {
      label: '1-Time Replacement Fulfilled',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
      barClass: 'bg-amber-500',
      barWidth: '100%',
      captionRight: 'Branch repairs available',
      icon: ShieldCheck,
    }
  }
  if (purchase.is_warranty_active) {
    const totalDays = Math.max(1, (purchase.warranty_months || 24) * 30)
    const pct = Math.min(100, Math.max(6, Math.round((Number(purchase.days_remaining || 0) / totalDays) * 100)))
    return {
      label: 'Active • 1 Replacement Available',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
      barClass: 'bg-emerald-600',
      barWidth: `${pct}%`,
      captionRight: formatRemainingText(purchase.days_remaining),
      icon: ShieldCheck,
    }
  }
  return {
    label: 'Warranty Expired',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
    barClass: 'bg-rose-500/60',
    barWidth: '100%',
    captionRight: 'Expired',
    icon: ShieldAlert,
  }
}

/**
 * Calm Device Hub equipment card with single metadata strip, coverage progress bar,
 * and direct support/claim entry points.
 */
export default function EquipmentCard({
  purchase,
  linkedClaims = [],
  onTroubleshoot,
  onFileClaim,
  onViewClaims,
}) {
  const existingClaim = linkedClaims[0] || null
  const hasExistingClaim = linkedClaims.length > 0
  const hasClaimedReplacement = linkedClaims.some(
    (c) => c.status === 'resolved' || c.status === 'approved' || c.status === 'ready_for_release'
  )
  const openClaim = linkedClaims.find((c) =>
    ['in_review', 'pending', 'checking', 'approved', 'ready_for_release'].includes(c.status || 'in_review')
  )
  const coverage = getCoverageState(purchase, hasClaimedReplacement)
  const StatusIcon = coverage.icon
  const thumbUrl = getMainProductImage(purchase.product_image)
  const warrantyMonths = purchase.warranty_months || 24
  const isSupportOnly = purchase.is_voided || hasExistingClaim

  return (
    <article className="rounded-2xl bg-jds-surface-container-lowest dark:bg-jds-surface border border-jds-outline-variant/50 p-5 flex flex-col justify-between gap-4 shadow-xs hover:border-jds-outline transition-all">
      <div className="space-y-3.5">
        {/* Product Header */}
        <div className="flex items-start gap-3.5">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={purchase.product_name}
              className="w-14 h-14 rounded-xl object-cover border border-jds-outline-variant/40 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-jds-surface-container-low border border-jds-outline-variant/40 flex items-center justify-center text-jds-primary shrink-0">
              <Package className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm sm:text-base text-jds-on-surface leading-snug">
              {purchase.product_name}
            </h3>
            <p className="text-xs text-jds-on-surface-variant mt-0.5 truncate">
              {purchase.watt || purchase.product_type || 'Solar Equipment'}
            </p>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border mt-2 ${coverage.badgeClass}`}
            >
              <StatusIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{coverage.label}</span>
            </span>
          </div>
        </div>

        {/* Coverage Timeline */}
        <div>
          <div className="h-1.5 w-full rounded-full bg-jds-surface-container overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${coverage.barClass}`}
              style={{ width: coverage.barWidth }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-jds-on-surface-variant mt-1.5">
            <span>{warrantyMonths}-Month Coverage</span>
            <span className="font-semibold text-jds-on-surface">{coverage.captionRight}</span>
          </div>
        </div>

        {purchase.is_voided && (
          <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
            <strong>Void Reason:</strong> {purchase.void_reason || 'Disqualified under warranty policy.'}
          </div>
        )}
      </div>

      {/* Single Clean Metadata Strip */}
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-jds-surface border border-jds-outline-variant/35">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-jds-on-surface-variant">
              Serial #
            </div>
            <div className="text-xs font-bold font-mono text-jds-on-surface truncate mt-0.5">
              {purchase.serial_number || 'N/A'}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-jds-on-surface-variant">
              Purchased
            </div>
            <div className="text-xs font-bold text-jds-on-surface truncate mt-0.5">
              {formatDate(purchase.purchase_date)}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-jds-on-surface-variant">
              Branch
            </div>
            <div className="text-xs font-bold text-jds-on-surface truncate mt-0.5">
              {purchase.branch_location || 'Cavite'}
            </div>
          </div>
        </div>

        {existingClaim && (
          <button
            type="button"
            onClick={onViewClaims}
            className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl bg-jds-secondary/10 border border-jds-secondary/25 text-xs font-semibold text-jds-secondary flex items-center justify-between hover:bg-jds-secondary/15 transition-colors cursor-pointer"
          >
            <span>
              {openClaim ? 'Active Ticket' : 'Claim Filed'} #{String(existingClaim.id || '').slice(0, 8).toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1 font-bold">
              {openClaim ? 'Track Status' : 'View Claim'} <ExternalLink className="w-3 h-3" />
            </span>
          </button>
        )}

        {/* Primary & Secondary Support Actions */}
        {isSupportOnly ? (
          <div className="space-y-2">
            <p className="text-[11px] text-jds-on-surface-variant leading-snug">
              {purchase.is_voided
                ? 'Self-diagnostic guide and non-warranty branch servicing remain available.'
                : hasClaimedReplacement
                  ? '1-time replacement fulfilled. Self-diagnostics and branch servicing remain available.'
                  : 'One warranty claim has already been filed for this unit. Self-diagnostics remain available.'}
            </p>
            <button
              type="button"
              onClick={() => onTroubleshoot(purchase)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-jds-surface-container border border-jds-outline-variant/60 hover:bg-jds-surface-container-high text-xs font-semibold text-jds-on-surface transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-jds-primary" />
              <span>Run Troubleshooting Guide</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onTroubleshoot(purchase)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Troubleshoot</span>
            </button>

            <button
              type="button"
              onClick={() => onFileClaim(purchase)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-jds-surface-container-lowest border border-jds-outline-variant/60 hover:bg-jds-surface-container-low hover:border-jds-primary/40 text-xs font-semibold text-jds-on-surface transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-jds-primary" />
              <span>File Claim</span>
            </button>
          </div>
        )}
      </div>
    </article>
  )
}
