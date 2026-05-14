import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/browse', label: 'Products' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, role, signOut } = useAuth()

  const handleAuthClick = async () => {
    if (user) {
      await signOut()
      navigate('/')
    } else {
      navigate('/login')
    }
  }

  const dynamicNavLinks = [...navLinks]
  if (user && (role === 'admin' || role === 'staff')) {
    const dashboardPath = role === 'admin' ? '/admin' : '/staff'
    // Insert after Products (which is at index 2)
    dynamicNavLinks.splice(3, 0, { to: dashboardPath, label: 'Dashboard' })
  }

  return (
    <header className="bg-jds-surface/80 backdrop-blur-md sticky top-0 z-50 border-b border-jds-outline-variant/30">
      <div className="flex justify-between items-center w-full px-4 md:px-6 py-4 max-w-[1400px] mx-auto">
        {/* Logo */}
        <Link to="/" className="font-inter text-headline-md font-bold text-jds-primary shrink-0">
          JD Solar
        </Link>

        {/* Center Nav Links — desktop only */}
        <nav className="hidden md:flex items-center gap-6">
          {dynamicNavLinks.map((link) => {
            const isActive = link.to !== '#' && pathname === link.to
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`font-inter text-label-md transition-colors duration-200 ${
                  isActive
                    ? 'text-jds-primary border-b-2 border-jds-primary pb-1'
                    : 'text-jds-on-surface-variant hover:text-jds-primary'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={handleAuthClick}
              className="font-inter text-label-md text-jds-on-surface-variant hover:text-jds-primary transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={handleAuthClick}
              className="font-inter text-label-md text-jds-on-surface-variant hover:text-jds-primary transition-colors hidden md:inline-block"
            >
              Staff Login
            </button>
          )}

          <Link
            to="/chat"
            className="bg-jds-primary-container text-jds-on-primary-container px-6 py-2 rounded-lg font-inter text-label-md hover:opacity-80 transition-opacity duration-200"
          >
            Get Quote
          </Link>
        </div>
      </div>
    </header>
  )
}