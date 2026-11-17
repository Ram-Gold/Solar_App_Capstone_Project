import { useState } from 'react'
import { Menu } from 'lucide-react'
import ErrorBoundary from '../ErrorBoundary'
import AdminSidebar from './AdminSidebar'
import StaffSidebar from '../staff/StaffSidebar'
import MobileBottomNav from './MobileBottomNav'
import RightSummaryRail, { CompactSummaryStrip } from './RightSummaryRail'

const HYBRID_RAIL_SCREENS = new Set(['dashboard', 'inquiries', 'calendar', 'pickups', 'quotes', 'orders'])

/**
 * Shared operations workspace frame used by both AdminPage and StaffPage.
 * Keeps the public Navbar above, mounts the warm-light collapsible sidebar,
 * adds the hybrid RightSummaryRail on Overview/Inquiries/Orders, and provides
 * mobile drawer + bottom navigation.
 */
export default function DashboardLayoutShell({
  roleVariant = 'admin',
  screens,
  fallbackTitle,
}) {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [navPayload, setNavPayload] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const ActiveComponent = screens[activeScreen] || screens.dashboard
  const SidebarComponent = roleVariant === 'admin' ? AdminSidebar : StaffSidebar
  const showHybridRail = HYBRID_RAIL_SCREENS.has(activeScreen)

  const handleNavigate = (screen, payload = null) => {
    setNavPayload(payload || null)
    setActiveScreen(screen)
  }

  const screenProps =
    activeScreen === 'images'
      ? { onNavigate: handleNavigate, initialTab: 'media' }
      : activeScreen === 'register-sale'
        ? { onNavigate: handleNavigate, preselectedTicketId: navPayload?.ticketId ?? null }
        : { onNavigate: handleNavigate }

  return (
    <div className="flex h-[calc(100dvh-54px)] sm:h-[calc(100dvh-73px)] overflow-hidden bg-jds-surface relative">
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[80] focus:px-4 focus:py-2.5 focus:rounded-lg focus:bg-jds-primary focus:text-jds-on-primary focus:font-bold focus:outline-2 focus:outline-jds-primary-container"
      >
        Skip to content
      </a>

      {/* Sidebar backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-[55] bg-[#211b11]/45 backdrop-blur-xs lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <SidebarComponent
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-1.5 sm:px-6 sm:py-2.5 border-b border-jds-chrome-border bg-jds-chrome shrink-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="min-h-[44px] flex items-center gap-2 text-xs sm:text-label-md font-semibold text-jds-on-surface hover:text-jds-primary transition-colors cursor-pointer pr-2"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{roleVariant === 'admin' ? 'Console Menu' : 'Staff Menu'}</span>
          </button>
          <span className="text-xs sm:text-label-md font-bold capitalize text-jds-primary">
            {activeScreen.replace('-', ' ')}
          </span>
        </div>

        <div className="flex-1 flex min-w-0 overflow-hidden">
          <main
            id="dashboard-main-content"
            className="flex-1 min-w-0 overflow-y-auto p-3 pb-24 sm:p-5 sm:pb-24 md:p-6 lg:pb-8 space-y-5"
          >
            {showHybridRail && (
              <CompactSummaryStrip onNavigate={handleNavigate} />
            )}

            <ErrorBoundary
              key={activeScreen}
              isSubtree
              fallbackTitle={fallbackTitle}
              onReset={() => setActiveScreen('dashboard')}
            >
              <ActiveComponent key={activeScreen} {...screenProps} />
            </ErrorBoundary>
          </main>

          {showHybridRail && (
            <RightSummaryRail role={roleVariant} onNavigate={handleNavigate} />
          )}
        </div>
      </div>

      <MobileBottomNav
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        onOpenMore={() => setIsSidebarOpen(true)}
      />
    </div>
  )
}
