import { Sun, LayoutDashboard, Package, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const mainLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
]

export default function StaffSidebar({ activeScreen, onNavigate }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const NavItem = ({ item }) => {
    const Icon = item.icon
    const isActive = activeScreen === item.id
    return (
      <button
        onClick={() => onNavigate(item.id)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-jds-primary/10 text-jds-primary'
            : 'text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-on-surface'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </button>
    )
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-jds-outline-variant/30 bg-jds-surface">
      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        <div className="space-y-1">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/60">Main Control</p>
          {mainLinks.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* User info footer */}
      <div className="border-t border-jds-outline-variant/30 px-5 py-4 bg-jds-surface-container-low/30">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-jds-secondary-container text-jds-on-secondary-container text-xs font-bold">
            {user?.email?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-jds-on-surface">{user?.email?.split('@')[0] || 'Staff'}</p>
            <p className="text-[11px] text-jds-on-surface-variant capitalize">Staff Member</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
