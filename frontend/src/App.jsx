import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import BrowsePage from './pages/BrowsePage'
import ChatboxPage from './pages/ChatboxPage'
import AboutPage from './pages/AboutPage'
import ProductInfoPage from './pages/ProductInfoPage'
import AdminPage from './pages/AdminPage'
import StaffPage from './pages/StaffPage'
import LoginPage from './pages/LoginPage'
import { ChatProvider } from './context/ChatContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function AppLayout() {
  const { pathname } = useLocation()
  const isAdminRoute = pathname.startsWith('/admin')

  return (
    <div className="flex flex-col min-h-screen">
      {!isAdminRoute && <Navbar />}
      <main className={isAdminRoute ? '' : 'flex-grow'}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/product/:id" element={<ProductInfoPage />} />
          <Route path="/chat" element={<ChatboxPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/staff" 
            element={
              <ProtectedRoute>
                <StaffPage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
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