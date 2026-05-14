import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sun } from 'lucide-react'
import { Button } from './ui/button'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/browse', label: 'Browse' },
  { to: '/chat', label: 'SolarAI' },
]


export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleAuthClick = async () => {
    if (user) {
      await signOut()
      navigate('/')
    } else {
      navigate('/login')
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <Link to="/" className="flex items-center space-x-2">
          <Sun className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">SolarApp</span>
        </Link>
        <div className="flex items-center space-x-8">
          <div className="hidden md:flex items-center space-x-6">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === link.to ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                to="/admin"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Admin
              </Link>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleAuthClick}>
            {user ? 'Sign Out' : 'Sign In'}
          </Button>
        </div>
      </div>
    </nav>
  )
}