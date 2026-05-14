import { Sun, LayoutDashboard, Package, ShoppingCart, Truck, Users, UserCircle, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const mainLinks = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
]

const managementLinks = [
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'profile', label: 'Profile', icon: UserCircle },
]

export default function AdminSidebar({ activeScreen, onNavigate }) {
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
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </button>
    )
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Sun className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight">Solar Admin</h2>
          <p className="text-[11px] text-muted-foreground">Product Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Main</p>
          {mainLinks.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
        <div className="space-y-1">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">User Management</p>
          {managementLinks.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
        <div className="space-y-1">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </nav>

      {/* User info footer */}
      <div className="border-t px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.email?.split('@')[0] || 'User'}</p>
            <p className="text-[11px] text-muted-foreground capitalize">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
