import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Wrench,
  Clock,
  ExternalLink
} from 'lucide-react'

export default function WarrantyTermsModal({
  isOpen,
  onClose,
  onAcknowledge,
  isFirstTime = false,
  customerName = ''
}) {
  const [agreed, setAgreed] = useState(false)

  if (!isOpen) return null

  const handleConfirm = () => {
    if (onAcknowledge) {
      onAcknowledge()
    } else if (onClose) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warranty-terms-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl overflow-hidden my-6 text-jds-on-surface"
        >
          {/* Header */}
          <div className="p-6 border-b border-jds-outline-variant/30 bg-jds-surface-container/40 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    Terms of Service & Coverage Policy
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    24 Months (2 Years)
                  </span>
                </div>
                <h2 id="warranty-terms-title" className="text-lg md:text-xl font-bold text-jds-on-surface">
                  2-Year Solar Warranty & Disqualification Notice
                </h2>
                <p className="text-xs text-jds-on-surface-variant">
                  {customerName ? `Account Holder: ${customerName} • ` : ''}JD Force Solar Quiapo & Cavite Technical Hub
                </p>
              </div>
            </div>

            {/* Close button only visible if not in mandatory first-time onboarding mode */}
            {!isFirstTime && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto text-xs leading-relaxed text-jds-on-surface-variant">
            {/* First-time alert banner */}
            {isFirstTime && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-jds-on-surface">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-800 dark:text-amber-300 block">
                    First-Time Portal Access Acknowledgment
                  </span>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80">
                    Please review our 24-month warranty terms and damage disqualification conditions before accessing your customer dashboard.
                  </p>
                </div>
              </div>
            )}

            {/* Clause 1: Default 2-Year Warranty Coverage */}
            <div className="p-4 rounded-xl bg-jds-surface-container/30 border border-jds-outline-variant/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-jds-on-surface">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>1. Default 24-Month (2-Year) Manufacturer Defect Coverage</span>
              </div>
              <p>
                Every solar lighting luminaire, solar panel, and energy storage unit registered to your account is protected under our standard <strong>24-Month (2-Year) official warranty</strong> starting from the recorded in-store purchase date.
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-jds-on-surface">
                <li>Manufacturing, soldering, or circuit assembly defects.</li>
                <li>Internal MPPT/PWM charge controller and dusk-to-dawn sensor failure.</li>
                <li>Premature battery capacity loss exceeding normal degradation cycles.</li>
                <li>Photovoltaic solar cell delamination under standard operating exposure.</li>
              </ul>
            </div>

            {/* Clause 2: 1-Time Replacement Entitlement */}
            <div className="p-4 rounded-xl bg-jds-surface-container/30 border border-jds-outline-variant/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-jds-on-surface">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>2. 1-Time Unit Replacement Entitlement</span>
              </div>
              <p>
                Each registered serial number is eligible for exactly <strong>one (1) complete unit replacement</strong> or major sub-assembly exchange during its 2-year warranty term. Once a replacement ticket is fulfilled and verified, warranty coverage for that unit is concluded.
              </p>
            </div>

            {/* Clause 3: Critical Disqualification & Carelessness Warning */}
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/25 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>3. Disqualified Conditions & Damage Exclusions</span>
              </div>
              <p className="text-jds-on-surface">
                The manufacturer warranty strictly covers technical and factory malfunctions. The following occurrences are classified as <strong>external trauma, customer carelessness, or operational negligence</strong>, and disqualify the unit from free replacement:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 rounded-lg bg-jds-surface border border-rose-500/20 space-y-0.5">
                  <strong className="text-rose-700 dark:text-rose-400 font-semibold block">Physical Drops & Fractures:</strong>
                  <span>Cracked or shattered tempered glass, dented casings, and sheared mounting brackets caused by accidental falls.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-jds-surface border border-rose-500/20 space-y-0.5">
                  <strong className="text-rose-700 dark:text-rose-400 font-semibold block">Water Ingress from Unsealed Ports:</strong>
                  <span>Moisture intrusion resulting from unfastened waterproof cable caps or compromised rubber grommets during installation.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-jds-surface border border-rose-500/20 space-y-0.5">
                  <strong className="text-rose-700 dark:text-rose-400 font-semibold block">Modified Wiring & Tampering:</strong>
                  <span>Spliced cables, bypassed charge controllers, broken warranty security seals, or unauthorized third-party teardowns.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-jds-surface border border-rose-500/20 space-y-0.5">
                  <strong className="text-rose-700 dark:text-rose-400 font-semibold block">Electrical Overload:</strong>
                  <span>Direct grid connection, unrectified AC voltage spikes, or non-compatible third-party power adapters.</span>
                </div>
              </div>
            </div>

            {/* Clause 4: Non-Warranty Bench Servicing */}
            <div className="p-4 rounded-xl bg-jds-surface-container/30 border border-jds-outline-variant/30 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-jds-on-surface">
                <Wrench className="w-4 h-4 text-jds-primary shrink-0" />
                <span>4. Local After-Sales Bench Servicing</span>
              </div>
              <p>
                If a unit is disqualified due to accidental damage or has completed its warranty term, JD Solar continues to provide bench diagnostic evaluation, technical troubleshooting, and replacement hardware components (replacement glass, lithium cells, LED arrays) at cost at our Quiapo Showroom and Cavite Logistics Hub.
              </p>
            </div>
          </div>

          {/* Footer & Acknowledgment Gate */}
          <div className="p-5 border-t border-jds-outline-variant/30 bg-jds-surface-container/40 space-y-4">
            {isFirstTime ? (
              <label className="flex items-start gap-3 p-3 rounded-xl bg-jds-surface border border-jds-outline-variant/50 cursor-pointer hover:border-jds-primary transition-colors">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-jds-outline text-jds-primary focus:ring-jds-primary cursor-pointer shrink-0"
                />
                <span className="text-xs text-jds-on-surface font-medium leading-relaxed">
                  I have read, understood, and accept the <strong>2-Year Solar Warranty Terms</strong>, 1-time replacement entitlement, and damage disqualification conditions.
                </span>
              </label>
            ) : (
              <div className="text-xs text-jds-on-surface-variant flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Warranty terms are active and registered to your customer profile.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              {!isFirstTime && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-jds-outline-variant/50 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}

              {isFirstTime ? (
                <button
                  type="button"
                  disabled={!agreed}
                  onClick={handleConfirm}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-bold hover:bg-jds-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acknowledge & Access Dashboard</span>
                </button>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

