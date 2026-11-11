import { useState } from 'react'
import { Menu } from 'lucide-react'
import ErrorBoundary from '../components/ErrorBoundary'
import AdminSidebar from '../components/admin/AdminSidebar'
import DashboardScreen from '../components/admin/DashboardScreen'
import ProductsScreen from '../components/admin/ProductsScreen'
import AddProductScreen from '../components/admin/AddProductScreen'
import OrdersScreen from '../components/admin/OrdersScreen'
import ImagesScreen from '../components/admin/ImagesScreen'
import UsersScreen from '../components/admin/UsersScreen'
import ProfileScreen from '../components/admin/ProfileScreen'
import RegisterSaleScreen from '../components/admin/RegisterSaleScreen'
import WarrantyClaimsScreen from '../components/admin/WarrantyClaimsScreen'
import CustomersScreen from '../components/admin/CustomersScreen'
import InquiriesScreen from '../components/admin/InquiriesScreen'

const screens = {
  dashboard: DashboardScreen,
  'register-sale': RegisterSaleScreen,
  customers: CustomersScreen,
  claims: WarrantyClaimsScreen,
  inquiries: InquiriesScreen,
  calendar: InquiriesScreen,
  pickups: InquiriesScreen,
  quotes: InquiriesScreen,
  products: ProductsScreen,
  'add-product': AddProductScreen,
  orders: OrdersScreen,
  images: ImagesScreen,
  users: UsersScreen,
  profile: ProfileScreen,
}

export default function AdminPage() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const ActiveComponent = screens[activeScreen] || DashboardScreen

  const handleNavigate = (screen) => {
    setActiveScreen(screen)
  }

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden bg-jds-background relative">
      {/* Sidebar backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <AdminSidebar 
        activeScreen={activeScreen} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3.5 border-b border-jds-outline-variant/30 bg-jds-surface shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 text-xs sm:text-label-md font-medium text-jds-on-surface hover:text-jds-primary transition-colors cursor-pointer"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Dashboard Menu</span>
          </button>
          <span className="text-xs sm:text-label-md font-bold capitalize text-jds-primary">{activeScreen.replace('-', ' ')}</span>
        </div>

        <main className="flex-grow overflow-y-auto p-3 sm:p-5 md:p-8">
          <ErrorBoundary
            key={activeScreen}
            isSubtree
            fallbackTitle="Admin Screen Error"
            onReset={() => setActiveScreen('dashboard')}
          >
            <ActiveComponent onNavigate={handleNavigate} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
