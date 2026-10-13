import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ChatWidget from './components/ChatWidget'
import LandingPage from './pages/LandingPage'
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
import './App.css'

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
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/staff" 
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      {showShell && !isDashboardRoute && !isPortalRoute && !isMatchRoute && !isChatRoute && <Footer />}
      {showShell && pathname !== '/chat' && !isPortalRoute && <ChatWidget />}
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ChatProvider>
          <AppLayout />
        </ChatProvider>
      </AuthProvider>
    </Router>
  )
}

export default App