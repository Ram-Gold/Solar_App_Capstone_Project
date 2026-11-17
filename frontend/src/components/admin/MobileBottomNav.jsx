import { LayoutDashboard, CalendarDays, ShieldCheck, QrCode, MoreHorizontal } from 'lucide-react'

const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inquiries', label: 'Inquiries', icon: CalendarDays },
  { id: 'claims', label: 'Claims', icon: ShieldCheck },
  { id: 'register-sale', label: 'Register', icon: QrCode },
]

/**
 * Fixed one-handed bottom tab bar for Staff Workspace and Admin Console on mobile (< lg).
 */
export default function MobileBottomNav({ activeScreen, onNavigate, onOpenMore }) {
  const isInquiriesAlias = ['inquiries', 'pickups', 'quotes', 'calendar'].includes(activeScreen)
  const isPrimaryActive = (id) =>
    activeScreen === id || (id === 'inquiries' && isInquiriesAlias)
  const isMoreActive = !PRIMARY_TABS.some((tab) => isPrimaryActive(tab.id))

  return (
    <nav
      aria-label="Mobile dashboard navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-jds-chrome-border bg-jds-chrome px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="grid grid-cols-5 items-stretch">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon
          const active = isPrimaryActive(tab.id)
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              className={`min-h-[52px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${active
                  ? 'text-jds-primary font-bold'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Open More Menu"
          className={`min-h-[52px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${isMoreActive
              ? 'text-jds-primary font-bold'
              : 'text-jds-on-surface-variant hover:text-jds-on-surface'
            }`}
        >
          <MoreHorizontal className="h-5 w-5 shrink-0" />
          <span className="truncate max-w-full">Menu</span>
        </button>
      </div>
    </nav>
  )
}
