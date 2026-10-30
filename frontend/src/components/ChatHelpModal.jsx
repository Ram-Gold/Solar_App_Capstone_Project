// frontend/src/components/ChatHelpModal.jsx
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineXMark,
  HiOutlineShieldCheck,
  HiOutlineCpuChip,
  HiOutlineClock,
  HiOutlineCircleStack,
} from 'react-icons/hi2'

export default function ChatHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-jds-outline-variant/30 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-jds-outline-variant/20 bg-jds-surface-container-lowest">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-jds-primary-container/30 text-jds-primary flex items-center justify-center">
                <HiOutlineShieldCheck size={22} />
              </div>
              <div>
                <h2 className="text-title-md font-bold text-jds-on-surface">
                  Assistant Guide & Data Policy
                </h2>
                <p className="text-label-sm text-jds-on-surface-variant/70">
                  Transparency and privacy guidelines
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container-high transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <HiOutlineXMark size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 text-body-sm text-jds-on-surface-variant leading-relaxed max-h-[75vh] overflow-y-auto">
            {/* Notice 1: Not AI */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-jds-surface-container-low border border-jds-outline-variant/30">
              <HiOutlineCpuChip className="text-jds-primary size-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-label-md font-bold text-jds-on-surface mb-1">
                  Technical Help & FAQ System (Not AI)
                </h3>
                <p>
                  This consultation assistant is an automated, rule-based Help and FAQ support system. It is <strong>NOT an artificial intelligence (AI) model or large language model (LLM)</strong>. For automated multi-criteria product matching and engineering calculations, please visit the dedicated Product Matcher. All product specifications, pricing packages, and branch guidelines are deterministically provided based on verified JD Solar catalog data.
                </p>
              </div>
            </div>

            {/* Notice 2: Local Storage & 30-Day Expiration */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-jds-surface-container-low border border-jds-outline-variant/30">
              <HiOutlineCircleStack className="text-jds-secondary size-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-label-md font-bold text-jds-on-surface mb-1">
                  Local Storage & Privacy
                </h3>
                <p>
                  Your consultations are saved strictly on this device inside your browser&apos;s local storage. Conversations are never transmitted to third-party AI platforms, external training sets, or marketing trackers.
                </p>
              </div>
            </div>

            {/* Notice 3: 30-Day Auto Purge */}
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-jds-surface-container-low border border-jds-outline-variant/30">
              <HiOutlineClock className="text-emerald-600 size-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-label-md font-bold text-jds-on-surface mb-1">
                  Automatic 30-Day History Removal
                </h3>
                <p>
                  For maintenance and privacy, an automated background timer purges saved consultation records after <strong>30 days</strong>. You may also delete any past session manually at any time from your conversation history list.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-jds-outline-variant/20 bg-jds-surface-container-lowest">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-label-md font-semibold bg-jds-primary text-white hover:bg-jds-primary/90 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              Understood
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
