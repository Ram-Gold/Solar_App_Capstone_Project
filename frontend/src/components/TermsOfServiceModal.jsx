import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TermsOfServiceModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-service-title"
        onClick={onClose}
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
                Platform Terms • Republic Act 10173 (Data Privacy Act)
              </span>
              <h2 id="terms-service-title" className="text-lg md:text-xl font-bold text-jds-on-surface tracking-tight">
                Terms of Service and Privacy Policy
              </h2>
              <p className="text-xs text-jds-on-surface-variant">
                JD-Foz Solar Products Trading • Quiapo, Manila & Cavite Logistics Hub
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 text-xs text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container rounded transition-colors cursor-pointer"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs md:text-sm text-jds-on-surface-variant leading-relaxed font-inter">
            {/* Introductory Notice */}
            <div className="p-4 rounded-lg bg-jds-surface-container/40 border border-jds-outline-variant/30 text-jds-on-surface">
              <p className="font-semibold text-xs uppercase tracking-wider text-jds-on-surface mb-1">
                Overview & Customer Protection Commitment
              </p>
              <p className="text-xs leading-relaxed text-jds-on-surface-variant">
                JD Solar operates an Online-to-Offline (O2O) platform for off-grid solar lighting systems. We help customers find suitable solar lights, schedule showroom visits, and troubleshoot their equipment. We treat your personal details and service inquiries with strict confidentiality.
              </p>
            </div>

            {/* Section 1 */}
            <div className="space-y-1.5 border-b border-jds-outline-variant/20 pb-4">
              <h3 className="text-sm font-bold text-jds-on-surface">
                1. Product Matcher and Sizing Recommendations
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                The Product Matcher is an in-browser recommendation tool that filters catalog items based on your selected criteria (budget, location type, and lighting hours). It runs entirely on your device without storing your survey choices. Lighting duration and brightness estimates are guidelines: actual performance depends on daily sunlight exposure, weather conditions, panel angle, and local shade.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-1.5 border-b border-jds-outline-variant/20 pb-4">
              <h3 className="text-sm font-bold text-jds-on-surface">
                2. Online-to-Offline (O2O) Requests and Store Visits
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                Our website does not process digital payments or credit card transactions. Submitting an inquiry or reservation creates an official pickup pass for visiting our physical showroom in Quiapo, Manila or our Cavite Hub. Inquiries are non-binding; equipment inspection, technical consultation, and payment are finalized in person.
              </p>
            </div>

            {/* Section 3 */}
            <div className="space-y-1.5 border-b border-jds-outline-variant/20 pb-4">
              <h3 className="text-sm font-bold text-jds-on-surface">
                3. Privacy of Inquiries and Troubleshooting Requests
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                All submitted quote tickets, showroom appointment details, and troubleshooting requests are strictly private:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-jds-on-surface-variant mt-1">
                <li>Your requests and registered equipment records can only be viewed by you and authorized JD Solar store staff.</li>
                <li>Other visitors, search engines, or third parties cannot view your tickets, contact information, or service history.</li>
                <li>Diagnostic symptom selections and service tickets are stored securely to help our technicians review your claim and prepare replacement components.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-1.5 border-b border-jds-outline-variant/20 pb-4">
              <h3 className="text-sm font-bold text-jds-on-surface">
                4. Data Protection under Republic Act 10173
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                In compliance with the Philippine Data Privacy Act of 2012 (Republic Act 10173):
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-jds-on-surface-variant mt-1">
                <li>
                  <strong>Purpose Limitation:</strong> We collect your name, mobile number, and address solely to coordinate your showroom appointment, prepare your requested solar lighting units, and manage your warranty records.
                </li>
                <li>
                  <strong>Zero Third-Party Sharing:</strong> We do not sell, rent, or share customer contact details with external advertising networks, marketers, or data brokers.
                </li>
                <li>
                  <strong>Zero Online Payment Data:</strong> Because transactions are finalized in person, we never ask for or store credit cards, bank accounts, or digital payment credentials.
                </li>
                <li>
                  <strong>Automatic Data Hygiene:</strong> Unconfirmed inquiries are automatically cleared from the system after 14 days, and completed tickets are archived within 7 days.
                </li>
                <li>
                  <strong>Right to Erasure:</strong> Customers can delete their registered profile and linked product history at any time through their Customer Portal account settings.
                </li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="space-y-1.5 border-b border-jds-outline-variant/20 pb-4">
              <h3 className="text-sm font-bold text-jds-on-surface">
                5. 2-Year Warranty and Coverage Guidelines
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                Registered off-grid solar products include a standard 24-month (2-year) warranty with a 1-time unit replacement entitlement for verified factory defects (such as internal controller failures, battery malfunctions, or solar cell defects).
              </p>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed mt-1">
                Warranty replacement does not cover damage caused by human error or improper installation, including dropped units, shattered solar glass, water ingress from unsealed cable entries, or unauthorized tampering. Disqualified units remain eligible for bench diagnosis and replacement parts at cost at our Quiapo showroom.
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-jds-on-surface">
                6. Contact Information & Location
              </h3>
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                For questions regarding your orders, warranty coverage, or data privacy requests, you can visit our Quiapo Showroom at 1645 Soler St. Brgy. 309 Cor Calero, Manila, or contact us directly at fozjeremy@gmail.com.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-jds-outline-variant/30 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-jds-on-surface text-jds-surface text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
