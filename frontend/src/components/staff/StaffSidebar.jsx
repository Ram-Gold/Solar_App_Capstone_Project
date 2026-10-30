import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  LogOut,
  Image as ImageIcon,
  Ticket,
  QrCode,
  ShieldCheck,
  UserCheck,
  UserCircle,
  CalendarDays,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import jdSolarLogo from '../../assets/jdsolarlogo.webp'

const mainLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'register-sale', label: 'Register Sale & QR', icon: QrCode },
  { id: 'customers', label: 'Customers & Tokens', icon: UserCheck },
  { id: 'claims', label: 'Warranty & Claims', icon: ShieldCheck },
  { id: 'inquiries', label: 'Inquiries', icon: CalendarDays },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'profile', label: 'Profile', icon: UserCircle },
]

export default function StaffSidebar({ activeScreen, onNavigate, isOpen, onClose }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const NavItem = ({ item }) => {
    const Icon = item.icon
    const isActive =
      activeScreen === item.id ||
      (item.id === 'inquiries' && (activeScreen === 'pickups' || activeScreen === 'quotes' || activeScreen === 'calendar'))
    return (
      <button
        onClick={() => {
          onNavigate(item.id)
          if (onClose) onClose()
        }}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-jds-primary/10 text-jds-primary font-bold'
            : 'text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-on-surface'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </button>
    )
  }

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-jds-outline-variant/30 bg-jds-surface transition-transform duration-300 lg:static lg:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      {/* Brand Header */}
      <div className="px-6 py-5 border-b border-jds-outline-variant/30 flex items-center justify-between">
        <Link to="/" className="flex items-center group" aria-label="JD Solar Home">
          <img 
            src={jdSolarLogo} 
            alt="JD Solar" 
            className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-jds-primary/10 text-jds-primary">
          Staff
        </span>
      </div>

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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-jds-secondary-container text-jds-on-secondary-container text-xs font-bold shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-jds-on-surface">{user?.email?.split('@')[0] || 'Staff'}</p>
              <p className="text-[11px] text-jds-on-surface-variant capitalize">Staff Member</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="text-jds-on-surface-variant hover:text-jds-primary p-1.5 rounded-lg hover:bg-jds-surface-container transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
