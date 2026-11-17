import { X } from 'lucide-react'
import useModalBehavior from '../../hooks/useModalBehavior'

/**
 * Reusable Slide-Over Right Inspector Drawer anchored below the public Navbar.
 * Standardizes inspection, stock audit, spec editing, and review workflows.
 */
export default function InspectorDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  tabs = [],
  activeTab,
  onTabChange,
  footer,
  disableClose = false,
  widthClass = 'max-w-[480px]',
  children,
}) {
  useModalBehavior({
    isOpen,
    onClose: () => {
      if (!disableClose && onClose) onClose()
    },
  })

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-x-0 top-[54px] sm:top-[73px] bottom-0 z-50 flex justify-end bg-[#211b11]/30 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !disableClose && onClose) {
          onClose()
        }
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Inspector Drawer'}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${widthClass} h-full bg-jds-surface-container-lowest border-l border-jds-outline-variant/50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200`}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-jds-surface-container-low border-b border-jds-outline-variant/30 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant">
              {subtitle || 'Equipment Inspector'}
            </span>
            <button
              type="button"
              disabled={disableClose}
              onClick={onClose}
              className="jds-btn-motion jds-focus-ring inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-jds-outline-variant/50 bg-jds-surface-container-lowest text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container disabled:opacity-50 cursor-pointer"
              aria-label="Close Drawer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Close Drawer</span>
            </button>
          </div>

          {title && (
            <h2 className="text-lg font-bold text-jds-on-surface leading-snug line-clamp-2">
              {title}
            </h2>
          )}

          {tabs.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap" role="tablist">
              {tabs.map((tab) => {
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onTabChange && onTabChange(tab.id)}
                    className={`jds-focus-ring min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-jds-surface-container-lowest border-jds-outline-variant text-jds-primary shadow-2xs'
                        : 'border-transparent text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-5 py-3.5 bg-jds-surface-container-low border-t border-jds-outline-variant/30 flex items-center justify-between gap-3 shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </div>
  )
}
