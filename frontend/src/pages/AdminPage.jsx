import { useState } from 'react'
import AdminSidebar from '../components/admin/AdminSidebar'
import DashboardScreen from '../components/admin/DashboardScreen'
import ProductsScreen from '../components/admin/ProductsScreen'
import AddProductScreen from '../components/admin/AddProductScreen'
import OrdersScreen from '../components/admin/OrdersScreen'
import SuppliersScreen from '../components/admin/SuppliersScreen'
import UsersScreen from '../components/admin/UsersScreen'
import ProfileScreen from '../components/admin/ProfileScreen'

const screens = {
  dashboard: DashboardScreen,
  products: ProductsScreen,
  'add-product': AddProductScreen,
  orders: OrdersScreen,
  suppliers: SuppliersScreen,
  users: UsersScreen,
  profile: ProfileScreen,
}

export default function AdminPage() {
  const [activeScreen, setActiveScreen] = useState('dashboard')

  const ActiveComponent = screens[activeScreen]

  const handleNavigate = (screen) => {
    setActiveScreen(screen)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar activeScreen={activeScreen} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <ActiveComponent onNavigate={handleNavigate} />
        </div>
      </main>
    </div>
  )
}
