import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useModalBehavior from '../hooks/useModalBehavior'

export default function WarrantyTermsModal({
  isOpen,
  onClose,
  onAcknowledge,
  isFirstTime = false,
  customerName = ''
}) {
  const [agreed, setAgreed] = useState(false)
  const { backdropProps } = useModalBehavior({
    isOpen,
    onClose: !isFirstTime ? onClose : undefined,
    closeOnOutsideClick: !isFirstTime,
    closeOnEscape: !isFirstTime,
  })

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
        {...backdropProps}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="warranty-terms-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-jds-surface border border-jds-outline-variant/50 rounded-xl shadow-2xl overflow-hidden my-6 text-jds-on-surface flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-jds-outline-variant/30 flex items-start justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-jds-on-surface-variant/80 block">
                Terms of Service • 24 Months (2 Years)
              </span>
              <h2 id="warranty-terms-title" className="text-lg md:text-xl font-bold text-jds-on-surface tracking-tight">
                2-Year Solar Warranty & Disqualification Notice
              </h2>
              <p className="text-xs text-jds-on-surface-variant">
                {customerName ? `Account Holder: ${customerName} • ` : ''}JD-Foz Solar Products Trading Quiapo & Cavite Technical Hub
              </p>
            </div>

            {!isFirstTime && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 text-xs text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container rounded transition-colors cursor-pointer"
                aria-label="Close"
              >
                Close
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 overflow-y-auto text-xs md:text-sm leading-relaxed text-jds-on-surface-variant font-inter">
            {/* First-time alert banner */}
            {isFirstTime && (
              <div className="p-4 rounded-lg bg-jds-surface-container/40 border border-jds-outline-variant/30 text-jds-on-surface space-y-1">
                <span className="font-semibold text-xs uppercase tracking-wider block">
                  First-Time Portal Access Acknowledgment
                </span>
                <p className="text-xs leading-relaxed text-jds-on-surface-variant">
                  Please review our 24-month warranty terms and equipment handling conditions before accessing your customer dashboard.
                </p>
              </div>
            )}

            {/* Clause 1: Default 2-Year Warranty Coverage */}
            <div className="space-y-1.5 border-b border-jds-outline-variant/20 pb-4">
              <h3 className="text-sm font-bold text-jds-on-surface">
                1. Default 24-Month (2-Year) Manufacturer Defect Coverage
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                Every solar lighting luminaire, solar panel, and energy storage unit registered to your account is protected under our standard 24-Month (2-Year) official warranty starting from the recorded in-store purchase date.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-jds-on-surface-variant mt-2">
                <li>Manufacturing, soldering, or circuit assembly defects.</li>
                <li>Internal charge controller and dusk-to-dawn sensor failure.</li>
                <li>Premature battery capacity loss exceeding normal degradation cycles.</li>
                <li>Photovoltaic solar cell delamination under standard operating exposure.</li>
              </ul>
            </div>

            {/* Clause 2: 1-Time Replacement Entitlement */}
            <div className="space-y-1.5 border-b border-jds-outline-variant/20 pb-4">
              <h3 className="text-sm font-bold text-jds-on-surface">
                2. One-Time Unit Replacement Entitlement
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                Each registered serial number is eligible for exactly one (1) complete unit replacement or major sub-assembly exchange during its 2-year warranty term. Once a replacement ticket is fulfilled and verified, warranty coverage for that unit is concluded.
              </p>
            </div>

            {/* Clause 3: Critical Disqualification & Carelessness Warning */}
            <div className="space-y-1.5 border-b border-jds-outline-variant/20 pb-4">
              <h3 className="text-sm font-bold text-jds-on-surface">
                3. Disqualified Conditions & Damage Exclusions
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                The manufacturer warranty strictly covers technical and factory malfunctions. The following occurrences are classified as external trauma, customer carelessness, or operational negligence, and disqualify the unit from free replacement:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-jds-on-surface-variant mt-2">
                <li>Physical Drops and Fractures: Cracked or shattered tempered glass, dented casings, and sheared mounting brackets caused by accidental falls.</li>
                <li>Water Ingress from Unsealed Ports: Moisture intrusion resulting from unfastened waterproof cable caps or compromised rubber grommets during installation.</li>
                <li>Modified Wiring and Tampering: Spliced cables, bypassed charge controllers, broken warranty security seals, or unauthorized third-party teardowns.</li>
                <li>Electrical Overload: Direct grid connection, unrectified AC voltage spikes, or non-compatible third-party power adapters.</li>
              </ul>
            </div>

            {/* Clause 4: Non-Warranty Bench Servicing */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-jds-on-surface">
                4. Local After-Sales Bench Servicing
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                If a unit is disqualified due to accidental damage or has completed its warranty term, JD Solar continues to provide bench diagnostic evaluation, technical troubleshooting, and replacement hardware components (replacement glass, lithium cells, LED arrays) at cost at our Quiapo Showroom and Cavite Logistics Hub.
              </p>
            </div>
          </div>

          {/* Footer & Acknowledgment Gate */}
          <div className="p-4 border-t border-jds-outline-variant/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0">
            {isFirstTime ? (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-jds-outline text-jds-primary focus:ring-0 cursor-pointer shrink-0"
                />
                <span className="text-xs text-jds-on-surface leading-snug">
                  I have read, understood, and accept the 2-Year Solar Warranty Terms, 1-time replacement entitlement, and damage disqualification conditions.
                </span>
              </label>
            ) : (
              <span className="text-xs text-jds-on-surface-variant">
                Warranty terms are active and registered to your customer profile.
              </span>
            )}

            <div className="flex items-center justify-end gap-2.5 shrink-0">
              {!isFirstTime && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-jds-outline-variant/50 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}

              {isFirstTime && (
                <button
                  type="button"
                  disabled={!agreed}
                  onClick={handleConfirm}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-jds-on-surface text-jds-surface text-xs font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                >
                  Acknowledge & Access Dashboard
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
