import { useState } from 'react'
import StaffSidebar from '../components/staff/StaffSidebar'
import DashboardScreen from '../components/admin/DashboardScreen'
import ProductsScreen from '../components/admin/ProductsScreen'
import AddProductScreen from '../components/admin/AddProductScreen'

const screens = {
  dashboard: DashboardScreen,
  products: ProductsScreen,
  'add-product': AddProductScreen,
}

export default function StaffPage() {
  const [activeScreen, setActiveScreen] = useState('dashboard')

  const ActiveComponent = screens[activeScreen]

  const handleNavigate = (screen) => {
    setActiveScreen(screen)
  }

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden bg-jds-background">
      <StaffSidebar activeScreen={activeScreen} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto p-8">
        <ActiveComponent onNavigate={handleNavigate} />
      </main>
    </div>
  )
}
