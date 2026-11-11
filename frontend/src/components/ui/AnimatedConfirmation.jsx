import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * AnimatedConfirmation Component
 *
 * Provides a clean, industrial-grade animated checkmark confirmation without emojis or manual buttons.
 * Renders an SVG circular stroke that traces 360°, followed by the checkmark stroke drawing inward.
 *
 * @param {Object} props
 * @param {boolean} [props.isOpen=true] - Whether the confirmation is actively displayed
 * @param {string} props.title - Primary status text (e.g. "Showroom Pass Confirmed")
 * @param {string} [props.description] - Secondary informative message
 * @param {string} [props.referenceCode] - Optional reference code / ticket code
 * @param {number} [props.duration=1800] - Duration in ms before auto-completing
 * @param {Function} props.onComplete - Callback fired after playback completes
 * @param {boolean} [props.isModal=false] - Whether to render as fixed backdrop modal or inline block
 */
export default function AnimatedConfirmation({
  isOpen = true,
  title,
  description,
  referenceCode,
  duration = 1800,
  onComplete,
  isModal = false,
}) {
  useEffect(() => {
    if (!isOpen) return

    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete()
      }
    }, duration)

    return () => clearTimeout(timer)
  }, [isOpen, duration, onComplete])

  if (!isOpen) return null

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-4"
    >
      {/* Animated Checkmark Circle */}
      <div className="relative flex items-center justify-center">
        {/* Soft background pulse glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.4, 0.25], scale: [0.6, 1.25, 1.1] }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute w-24 h-24 rounded-full bg-emerald-500/20 blur-xl pointer-events-none"
        />

        <svg
          className="w-20 h-20 text-emerald-600 dark:text-emerald-400 relative z-10"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle background track */}
          <circle
            cx="40"
            cy="40"
            r="34"
            className="stroke-emerald-100 dark:stroke-emerald-950/60"
            strokeWidth="3.5"
          />

          {/* Animated drawing perimeter */}
          <motion.circle
            cx="40"
            cy="40"
            r="34"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, rotate: -90 }}
            animate={{ pathLength: 1, rotate: -90 }}
            transition={{
              duration: 0.55,
              ease: [0.65, 0, 0.35, 1],
            }}
            style={{ transformOrigin: 'center' }}
          />

          {/* Animated drawing checkmark */}
          <motion.path
            d="M25 41.5 L35 51.5 L55 29.5"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 0.45,
              delay: 0.38,
              ease: [0.65, 0, 0.35, 1],
            }}
          />
        </svg>
      </div>

      {/* Confirmation Headings */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="space-y-1.5 max-w-sm"
      >
        <h3 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
            {description}
          </p>
        )}
      </motion.div>

      {/* Reference Code Badge (Optional) */}
      {referenceCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300"
        >
          {referenceCode}
        </motion.div>
      )}
    </motion.div>
  )

  if (isModal) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden"
          >
            {content}
          </motion.div>
        </div>
      </AnimatePresence>
    )
  }

  return <AnimatePresence>{content}</AnimatePresence>
}

