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
import CustomerPortalPage from './pages/CustomerPortalPage'
import { ChatProvider } from './context/ChatContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

function AppLayout() {
  const { pathname } = useLocation()
  const isDashboardRoute = pathname.startsWith('/admin') || pathname.startsWith('/staff')
  const isLoginRoute = pathname === '/login'
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
          <Route path="/portal" element={<CustomerPortalPage />} />
          <Route path="/login" element={<LoginPage />} />
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
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 bg-stone-900/95 hover:bg-stone-900 dark:bg-white/95 dark:hover:bg-white text-white dark:text-stone-900 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.22)] hover:shadow-[0_12px_36px_rgba(253,184,19,0.35)] hover:scale-105 active:scale-95 transition-all duration-200 border border-stone-800/80 dark:border-stone-200 backdrop-blur-md cursor-pointer"
          aria-label="Solar FAQ & Technical Assistant"
        >
          <div className="relative flex items-center justify-center">
            <HiOutlineChatBubbleLeftRight className="w-5 h-5 text-amber-400 dark:text-amber-600 transition-transform duration-200 group-hover:scale-110" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide">Solar FAQ</span>
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
          <ChatProvider>
            <AppLayout />
          </ChatProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App