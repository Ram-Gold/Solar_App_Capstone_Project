import DashboardLayoutShell from '../components/admin/DashboardLayoutShell'
import DashboardScreen from '../components/admin/DashboardScreen'
import ProductsScreen from '../components/admin/ProductsScreen'
import AddProductScreen from '../components/admin/AddProductScreen'
import OrdersScreen from '../components/admin/OrdersScreen'
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
  images: ProductsScreen,
  users: UsersScreen,
  profile: ProfileScreen,
}

export default function AdminPage() {
  return (
    <DashboardLayoutShell
      roleVariant="admin"
      screens={screens}
      fallbackTitle="Admin Screen Error"
    />
  )
}
