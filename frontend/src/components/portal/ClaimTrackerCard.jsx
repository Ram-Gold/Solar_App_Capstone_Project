import { Info, Check } from 'lucide-react'
import { formatDate, getClaimStatusMeta } from '../../lib/warrantyUtils'

const LIFECYCLE_STEPS = [
  { id: 'in_review', label: 'Diagnostic Intake' },
  { id: 'approved', label: 'Approved for Release' },
  { id: 'resolved', label: 'Handover Complete' },
]

function getActiveStepIndex(status) {
  if (status === 'resolved' || status === 'archived') return 2
  if (status === 'approved') return 1
  if (status === 'rejected') return -1
  return 0
}

/**
 * Warranty claim card featuring a 3-step Baymard-style lifecycle stepper
 * and store technician response callout.
 */
export default function ClaimTrackerCard({ claim }) {
  const statusMeta = getClaimStatusMeta(claim.status)
  const activeStep = getActiveStepIndex(claim.status)
  const isRejected = claim.status === 'rejected'

  return (
    <article className="p-5 rounded-2xl bg-jds-surface-container-lowest dark:bg-jds-surface border border-jds-outline-variant/50 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-jds-outline-variant/30">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-xs font-extrabold text-jds-primary">
            TICKET #{String(claim.id || '').slice(0, 8).toUpperCase()}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.color}`}>
            {statusMeta.label}
          </span>
        </div>
        <span className="text-xs text-jds-on-surface-variant">
          Filed {formatDate(claim.created_at)}
        </span>
      </div>

      {/* 3-Step Lifecycle Progress Indicator */}
      {!isRejected && (
        <div
          aria-label="Claim progress"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-jds-surface border border-jds-outline-variant/35"
        >
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isDone = idx < activeStep || (activeStep === 2 && idx === 2)
            const isCurrent = idx === activeStep && activeStep < 2
            return (
              <div
                key={step.id}
                className={`flex items-center gap-2 text-xs ${isCurrent
                  ? 'font-bold text-jds-on-surface'
                  : isDone
                    ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                    : 'font-medium text-jds-on-surface-variant/70'
                  }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${isDone
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                      ? 'bg-jds-primary-container text-jds-on-primary-fixed'
                      : 'bg-jds-surface-container-high text-jds-on-surface-variant'
                    }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </span>
                <span>{step.label}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="text-xs space-y-1.5">
        <div className="font-bold text-sm text-jds-on-surface">
          {claim.product_name}
        </div>
        <div className="text-jds-on-surface-variant">
          Symptom: <strong className="text-jds-on-surface">{claim.issue_category}</strong>
        </div>
        <p className="text-jds-on-surface-variant bg-jds-surface p-3 rounded-xl border border-jds-outline-variant/35 whitespace-pre-line leading-relaxed">
          &ldquo;{claim.description}&rdquo;
        </p>
      </div>

      {claim.staff_notes && (
        <div className="p-3.5 rounded-xl bg-jds-secondary/10 border border-jds-secondary/20 text-xs space-y-1">
          <div className="font-bold text-jds-secondary flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Note from Store Technician</span>
          </div>
          <div className="text-jds-on-surface font-medium pl-5">
            {claim.staff_notes}
          </div>
        </div>
      )}
    </article>
  )
}
