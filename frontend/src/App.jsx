import { BrowserRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom'
import { HiOutlineChatBubbleLeftRight } from 'react-icons/hi2'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'

import BrowsePage from './pages/BrowsePage'
import ChatboxPage from './pages/ChatboxPage'
import MatchWizardPage from './pages/MatchWizardPage'
import AboutPage from './pages/AboutPage'
import ProductInfoPage from './pages/ProductInfoPage'
import AdminPage from './pages/AdminPage'
import StaffPage from './pages/StaffPage'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import CustomerPortalPage from './pages/CustomerPortalPage'
import { ChatProvider } from './context/ChatContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/ui/toast'
import ProtectedRoute from './components/ProtectedRoute'

function AppLayout() {
  const { pathname } = useLocation()
  const isDashboardRoute = pathname.startsWith('/admin') || pathname.startsWith('/staff')
  const isLoginRoute = ['/login', '/forgot-password', '/reset-password'].includes(pathname)
  const isPortalRoute = pathname.startsWith('/portal')
  const isMatchRoute = pathname.startsWith('/match')
  const isChatRoute = pathname.startsWith('/chat')
  const showShell = !isLoginRoute

  return (
    <div className={`flex flex-col ${isChatRoute ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {showShell && <Navbar />}
      <main className="flex-grow flex flex-col min-h-0">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/match" element={<MatchWizardPage />} />
          <Route path="/product/:id" element={<ProductInfoPage />} />
          <Route path="/chat" element={<ChatboxPage />} />
          <Route 
            path="/portal" 
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'staff']}>
                <CustomerPortalPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/staff/*" 
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffPage />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showShell && !isDashboardRoute && !isPortalRoute && !isMatchRoute && !isChatRoute && <Footer />}

      {/* Floating Solar FAQ Button at bottom right */}
      {showShell && !isDashboardRoute && !isChatRoute && (
        <Link
          to="/chat"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center justify-center gap-2.5 w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-3 bg-jds-primary hover:bg-jds-primary/90 text-jds-on-primary rounded-full shadow-[0_8px_24px_rgba(180,83,9,0.28)] hover:shadow-[0_12px_32px_rgba(180,83,9,0.36)] hover:scale-105 active:scale-95 transition-all duration-200 border border-jds-primary-container/40 cursor-pointer"
          aria-label="Solar FAQ & Technical Assistant"
        >
          <div className="relative flex items-center justify-center">
            <HiOutlineChatBubbleLeftRight className="w-5 h-5 text-jds-primary-container transition-transform duration-200 group-hover:scale-110" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-jds-primary-container animate-pulse" />
          </div>
          <span className="hidden sm:inline text-xs font-bold tracking-wide">Solar FAQ</span>
        </Link>
      )}
    </div>

  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <ChatProvider>
              <AppLayout />
            </ChatProvider>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App