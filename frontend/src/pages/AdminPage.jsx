import { useState } from 'react'
import { Menu } from 'lucide-react'
import AdminSidebar from '../components/admin/AdminSidebar'
import DashboardScreen from '../components/admin/DashboardScreen'
import QuotesScreen from '../components/admin/QuotesScreen'
import ProductsScreen from '../components/admin/ProductsScreen'
import AddProductScreen from '../components/admin/AddProductScreen'
import OrdersScreen from '../components/admin/OrdersScreen'
import ImagesScreen from '../components/admin/ImagesScreen'
import UsersScreen from '../components/admin/UsersScreen'
import ProfileScreen from '../components/admin/ProfileScreen'
import RegisterSaleScreen from '../components/admin/RegisterSaleScreen'
import WarrantyClaimsScreen from '../components/admin/WarrantyClaimsScreen'
import CustomersScreen from '../components/admin/CustomersScreen'

const PickupsScreen = (props) => <QuotesScreen {...props} filterType="pickup" />
const InquiriesScreen = (props) => <QuotesScreen {...props} filterType="inquiry" />

const screens = {
  dashboard: DashboardScreen,
  'register-sale': RegisterSaleScreen,
  customers: CustomersScreen,
  claims: WarrantyClaimsScreen,
  pickups: PickupsScreen,
  inquiries: InquiriesScreen,
  quotes: QuotesScreen,
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

  const ActiveComponent = screens[activeScreen]

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
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-jds-outline-variant/30 bg-jds-surface shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 text-label-md font-medium text-jds-on-surface hover:text-jds-primary transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span>Dashboard Menu</span>
          </button>
          <span className="text-label-md font-semibold capitalize text-jds-primary">{activeScreen.replace('-', ' ')}</span>
        </div>

        <main className="flex-grow overflow-y-auto p-4 md:p-8">
          <ActiveComponent onNavigate={handleNavigate} />
        </main>
      </div>
    </div>
  )
}
