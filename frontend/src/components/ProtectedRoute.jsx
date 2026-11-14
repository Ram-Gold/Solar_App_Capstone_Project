import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Intercept customer portal access via QR / email token:
  // If accessing /portal with a token/uuid, verify visitor is authenticated as that specific customer.
  // If not authenticated, or logged in as staff/admin, or logged in as a different customer:
  // Redirect to login to force clean customer authentication without contaminating admin sessions.
  const searchParams = new URLSearchParams(location.search || '')
  const forwardedToken = searchParams.get('token') || searchParams.get('uuid')

  if (forwardedToken && location.pathname.startsWith('/portal')) {
    const activeCustomerToken =
      user?.accessToken ||
      (user?.isCustomer ? user.id : null) ||
      (typeof window !== 'undefined' ? localStorage.getItem('jd_customer_token') : null) ||
      user?.id

    if (!user || role !== 'customer' || (activeCustomerToken && activeCustomerToken !== forwardedToken)) {
      return <Navigate to={`/login${location.search}`} replace />
    }
  }

  if (!user) {
    const search = location.search || ''
    return <Navigate to={`/login${search}`} replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin" replace />
    if (role === 'staff') return <Navigate to="/staff" replace />
    if (role === 'customer') return <Navigate to="/portal" replace />
    return <Navigate to="/" replace />
  }

  return children
}
