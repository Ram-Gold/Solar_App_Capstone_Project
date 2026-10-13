import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { HiOutlineMagnifyingGlass, HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2'


const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/browse', label: 'Products' },
  { to: '/match', label: 'Product Matcher' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, role, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const isMatchPage = pathname.startsWith('/match')

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

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
    dynamicNavLinks.push({ to: dashboardPath, label: 'Dashboard' })
  } else if (user && role === 'customer') {
    dynamicNavLinks.push({ to: '/portal', label: 'My Dashboard' })
  }

  const navContent = (
    <>
      <div className="flex items-center justify-between w-full px-6 py-4 max-w-screen-2xl mx-auto">
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

          {/* Navigation Links - Anchored Left (lg screens) */}
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

        {/* Right Group: Search, Actions, & Hamburger */}
        <div className="flex items-center gap-4">
          {/* Refined Search Bar - Desktop/Tablet (visible sm and up) */}
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

          <div className="h-6 w-px bg-jds-outline-variant/30 hidden lg:block" />

          {/* Auth & CTA - Desktop (lg screens) */}
          <div className="hidden lg:flex items-center gap-4">
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
                className="font-inter text-label-md text-jds-on-surface-variant hover:text-jds-primary transition-colors px-2"
              >
                Login
              </button>
            )}

            <Link
              to="/chat"
              className="bg-jds-primary text-jds-on-primary px-5 py-2 rounded-lg font-inter text-label-md font-bold hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
            >
              Get Quote
            </Link>
          </div>

          {/* Hamburger button (lg:hidden) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-xl text-jds-on-surface hover:bg-jds-surface-container-high transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? (
              <HiOutlineXMark className="w-6 h-6" />
            ) : (
              <HiOutlineBars3 className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-jds-outline-variant/20 bg-jds-surface-container-lowest overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-6">
              {/* Search Input for Mobile/Tablet (hidden sm and up since it is in header there) */}
              <form onSubmit={handleSearchSubmit} className="relative group w-full sm:hidden">
                <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jds-on-surface-variant group-focus-within:text-jds-primary transition-colors text-lg" />
                <input
                  type="text"
                  placeholder="Search guide..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-jds-surface-container-low border border-jds-outline-variant/30 rounded-xl py-2.5 pl-10 pr-4 text-label-md text-jds-on-surface focus:ring-2 focus:ring-jds-primary/20 focus:border-jds-primary focus:bg-jds-surface transition-all outline-none"
                />
              </form>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-4">
                {dynamicNavLinks.map((link) => {
                  const isActive = link.to !== '#' && pathname === link.to
                  return (
                    <Link
                      key={link.label}
                      to={link.to}
                      onClick={() => setIsOpen(false)}
                      className={`font-inter text-body-lg tracking-wide transition-all duration-300 py-1 ${
                        isActive
                          ? 'text-jds-primary font-semibold'
                          : 'text-jds-on-surface-variant hover:text-jds-primary'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="h-px bg-jds-outline-variant/20" />

              {/* Auth & CTA Mobile Buttons */}
              <div className="flex flex-col gap-3">
                {user ? (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      handleAuthClick()
                    }}
                    className="font-inter text-label-md text-center py-3 bg-jds-surface-container-high hover:bg-jds-surface-container-highest rounded-xl text-jds-on-surface-variant transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        handleAuthClick()
                      }}
                      className="font-inter text-label-md text-center py-3 bg-jds-surface-container-high hover:bg-jds-surface-container-highest rounded-xl text-jds-on-surface-variant transition-colors"
                    >
                      Login
                    </button>
                  </>
                )}

                <Link
                  to="/chat"
                  onClick={() => setIsOpen(false)}
                  className="bg-jds-primary text-jds-on-primary text-center py-3 rounded-xl font-inter text-label-md font-bold shadow-md hover:shadow-lg transition-all"
                >
                  Get Quote
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  if (isMatchPage) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 group/nav pointer-events-none">
        {/* Invisible top hover trigger rail */}
        <div className="absolute top-0 left-0 right-0 h-4 sm:h-5 pointer-events-auto" />

        {/* Subtle indicator hint at top center when hidden */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-neutral-400/30 dark:bg-neutral-600/40 pointer-events-none transition-opacity duration-300 group-hover/nav:opacity-0" />

        <header
          className={`pointer-events-auto bg-jds-surface/95 backdrop-blur-xl border-b border-jds-outline-variant/20 shadow-md transition-all duration-300 ease-out transform ${
            isOpen
              ? 'translate-y-0 opacity-100'
              : '-translate-y-full opacity-0 group-hover/nav:translate-y-0 group-hover/nav:opacity-100 group-focus-within/nav:translate-y-0 group-focus-within/nav:opacity-100'
          }`}
        >
          {navContent}
        </header>
      </div>
    )
  }

  return (
    <header className="bg-jds-surface/95 backdrop-blur-xl sticky top-0 z-50 border-b border-jds-outline-variant/20 shadow-sm transition-colors duration-200">
      {navContent}
    </header>
  )
}