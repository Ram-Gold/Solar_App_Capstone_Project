import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'


const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/browse', label: 'Products' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, role, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const handleAuthClick = async () => {
    if (user) {
      await signOut()
      navigate('/')
    } else {
      navigate('/login')
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const dynamicNavLinks = [...navLinks]
  if (user && (role === 'admin' || role === 'staff')) {
    const dashboardPath = role === 'admin' ? '/admin' : '/staff'
    dynamicNavLinks.splice(3, 0, { to: dashboardPath, label: 'Dashboard' })
  }

  return (
    <header className="bg-jds-surface/90 backdrop-blur-lg sticky top-0 z-50 border-b border-jds-outline-variant/20 shadow-sm">
      <div className="flex items-center w-full px-6 py-4 max-w-screen-2xl mx-auto gap-12">
        {/* Left Group: Logo & Navigation */}
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-jds-primary rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 shadow-md">
              <div className="w-4 h-4 bg-white rounded-full opacity-80" />
            </div>
            <span className="font-inter text-headline-md font-bold text-jds-on-surface tracking-tighter">
              JD<span className="text-jds-primary">Solar</span>
            </span>
          </Link>

          {/* Navigation Links - Anchored Left */}
          <nav className="hidden lg:flex items-center gap-8">
            {dynamicNavLinks.map((link) => {
              const isActive = link.to !== '#' && pathname === link.to
              return (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`relative font-inter text-label-md tracking-wide transition-all duration-300 px-1 py-1 ${
                    isActive
                      ? 'text-jds-primary font-semibold'
                      : 'text-jds-on-surface-variant hover:text-jds-primary'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-jds-primary rounded-full"
                    />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Group: Search & Actions */}
        <div className="flex items-center gap-4 flex-grow max-w-xl justify-end ml-auto">
          {/* Refined Search Bar */}
          <form 
            onSubmit={handleSearchSubmit}
            className="relative group w-full max-w-[280px] hidden sm:block"
          >
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jds-on-surface-variant group-focus-within:text-jds-primary transition-colors text-lg" />
            <input
              type="text"
              placeholder="Search guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-jds-surface-container-low border border-jds-outline-variant/30 rounded-xl py-2 pl-10 pr-4 text-label-md text-jds-on-surface focus:ring-2 focus:ring-jds-primary/20 focus:border-jds-primary focus:bg-jds-surface transition-all outline-none"
            />
          </form>

          <div className="h-6 w-px bg-jds-outline-variant/30 hidden md:block" />

          {/* Auth & CTA */}
          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={handleAuthClick}
                className="font-inter text-label-md text-jds-on-surface-variant hover:text-jds-primary transition-colors px-2"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleAuthClick}
                className="font-inter text-label-md text-jds-on-surface-variant hover:text-jds-primary transition-colors hidden md:inline-block px-2"
              >
                Login
              </button>
            )}

            <Link
              to="/chat"
              className="bg-jds-primary text-jds-on-primary px-6 py-2.5 rounded-xl font-inter text-label-md font-bold hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Get Quote
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}