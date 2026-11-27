import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

export default function MatchBreakdownPopover({
  label,
  details = [],
  badgeClassName = '',
  align = 'left',
  variant = 'matcher',
  ariaLabel,
}) {
  const [isPinned, setIsPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef(null)

  const isOpen = isPinned || isHovered

  useEffect(() => {
    if (!isOpen) return

    const handleOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsPinned(false)
        setIsHovered(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsPinned(false)
        setIsHovered(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleToggle = (event) => {
    event.stopPropagation()
    if (isPinned) {
      setIsPinned(false)
      setIsHovered(false)
    } else {
      setIsPinned(true)
    }
  }

  const isModal = variant === 'modal'
  const alignClass = align === 'right' ? 'right-0' : 'left-0'

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        onClick={handleToggle}
        onFocus={() => setIsHovered(true)}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget)) {
            setIsHovered(false)
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel || `Match breakdown for ${label}`}
        className={`inline-flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${badgeClassName}`}
      >
        <span>{label}</span>
        <Info className="size-3 shrink-0 opacity-75" aria-hidden="true" />
      </button>

      {isOpen && details.length > 0 && (
        <div
          role="dialog"
          aria-label="Match breakdown"
          className={`absolute top-full mt-2 ${alignClass} z-40 w-64 sm:w-72 max-w-[calc(100vw-3rem)] rounded-2xl p-3.5 shadow-xl border text-left ${
            isModal
              ? 'bg-white border-jds-outline-variant/40 text-jds-on-surface'
              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100'
          }`}
        >
          <div
            className={`text-[11px] font-semibold pb-2 mb-2.5 border-b ${
              isModal
                ? 'text-jds-on-surface border-jds-outline-variant/25'
                : 'text-neutral-700 dark:text-neutral-200 border-neutral-100 dark:border-neutral-800'
            }`}
          >
            Match breakdown
          </div>

          <div className="space-y-2.5">
            {details.map((row) => {
              const isNeutral = Boolean(row.isAny || row.isUnlisted)
              const barColor = isNeutral
                ? isModal
                  ? 'bg-slate-300'
                  : 'bg-neutral-300 dark:bg-neutral-600'
                : row.score >= 85
                ? 'bg-emerald-500'
                : row.score >= 65
                ? 'bg-amber-500'
                : row.score === 0
                ? 'bg-red-500'
                : 'bg-neutral-400 dark:bg-neutral-500'

              const barWidth = isNeutral
                ? 100
                : row.score <= 0
                ? 0
                : Math.min(100, Math.max(6, row.score))

              const rightValue = row.isUnlisted
                ? 'Price upon inquiry'
                : row.isAny
                ? 'Any'
                : `${row.score}%`

              return (
                <div key={row.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold ${
                        isModal ? 'text-jds-on-surface' : 'text-neutral-700 dark:text-neutral-200'
                      }`}
                    >
                      {row.label}
                    </span>
                    <span
                      className={`text-[11px] tabular-nums ${
                        isNeutral
                          ? isModal
                            ? 'font-medium text-jds-on-surface-variant'
                            : 'font-medium text-neutral-500 dark:text-neutral-400'
                          : isModal
                          ? 'font-bold text-jds-on-surface'
                          : 'font-bold text-neutral-900 dark:text-white'
                      }`}
                    >
                      {rightValue}
                    </span>
                  </div>

                  <div
                    className={`w-full h-1.5 rounded-full overflow-hidden ${
                      isModal
                        ? 'bg-jds-surface-container-high'
                        : 'bg-neutral-200/80 dark:bg-neutral-700'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {row.detail && (
                    <p
                      className={`text-[11px] leading-snug ${
                        isModal
                          ? 'text-jds-on-surface-variant'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {row.detail}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
