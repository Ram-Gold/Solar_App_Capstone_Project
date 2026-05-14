import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion } from 'framer-motion'
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineSun,
} from 'react-icons/hi2'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        navigate('/admin')
      }
    } catch {
      setError('An unexpected system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-jds-surface font-inter text-jds-on-surface min-h-screen flex flex-col">
      {/* Minimal Header */}
      <header className="w-full">
        <nav className="flex justify-between items-center w-full px-4 md:px-10 py-8 max-w-[1200px] mx-auto">
          <Link to="/" className="flex items-center gap-2 group">
            <HiOutlineSun className="text-jds-primary text-3xl" />
            <span className="text-headline-md font-bold text-jds-primary">JD Solar</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-jds-on-surface-variant hover:text-jds-primary transition-colors duration-200"
          >
            <HiOutlineArrowLeft className="text-xl" />
            <span className="text-label-md">Home</span>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4">
        <motion.div
          className="w-full max-w-[440px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Login Card */}
          <div className="bg-jds-surface-container-lowest border border-jds-outline-variant/30 rounded-xl p-10 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
            {/* Card Header */}
            <div className="text-center mb-10">
              <h1 className="text-headline-lg text-jds-on-surface mb-2">Staff Login</h1>
              <p className="text-body-md text-jds-on-surface-variant">
                Access the internal solar management dashboard.
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-jds-error-container border border-jds-error/20 text-jds-on-error-container text-sm mb-6"
              >
                <span className="leading-tight font-medium">{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label
                  className="block text-label-sm text-jds-on-surface-variant ml-1"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-jds-on-surface-variant group-focus-within:text-jds-secondary transition-colors">
                    <HiOutlineEnvelope className="text-xl" />
                  </div>
                  <input
                    className="w-full pl-11 pr-4 py-3.5 bg-jds-surface-variant/30 border-none focus:ring-2 focus:ring-jds-secondary focus:bg-jds-surface-container-lowest rounded-lg text-body-md text-jds-on-surface transition-all placeholder:text-jds-on-surface-variant/50 outline-none"
                    id="email"
                    name="email"
                    placeholder="name@jdsolar.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label
                    className="block text-label-sm text-jds-on-surface-variant"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <a
                    className="text-label-sm text-jds-secondary hover:underline"
                    href="#"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-jds-on-surface-variant group-focus-within:text-jds-secondary transition-colors">
                    <HiOutlineLockClosed className="text-xl" />
                  </div>
                  <input
                    className="w-full pl-11 pr-4 py-3.5 bg-jds-surface-variant/30 border-none focus:ring-2 focus:ring-jds-secondary focus:bg-jds-surface-container-lowest rounded-lg text-body-md text-jds-on-surface transition-all placeholder:text-jds-on-surface-variant/50 outline-none"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Remember */}
              <div className="flex items-center gap-3 px-1">
                <input
                  className="w-5 h-5 rounded border-jds-outline-variant text-jds-primary focus:ring-jds-primary"
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label
                  className="text-label-md text-jds-on-surface-variant cursor-pointer"
                  htmlFor="remember"
                >
                  Remember this device
                </label>
              </div>

              {/* Submit */}
              <button
                className="w-full py-4 bg-jds-primary-container hover:bg-jds-primary transition-all duration-300 rounded-lg text-jds-on-primary-container hover:text-jds-on-primary text-[16px] font-bold shadow-sm hover:shadow-md flex items-center justify-center gap-2 group disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                {!loading && (
                  <HiOutlineArrowRight className="group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </form>

            {/* Help */}
            <div className="mt-8 pt-8 border-t border-jds-outline-variant/30 text-center">
              <p className="text-label-sm text-jds-on-surface-variant">
                Technical issues?{' '}
                <a className="text-jds-secondary font-bold hover:underline" href="#">
                  Contact IT Support
                </a>
              </p>
            </div>
          </div>

          {/* Branding Accent */}
          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-6 opacity-30">
              <HiOutlineSun className="text-3xl text-jds-primary" />
              <div className="h-6 w-[1px] bg-jds-outline" />
              <span className="text-label-sm tracking-widest uppercase">Admin Portal v2.4</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 md:px-10 py-8 max-w-[1200px] mx-auto gap-4">
          <span className="text-label-sm text-jds-on-surface-variant">
            © {new Date().getFullYear()} JD Solar Manila. Quiapo's trusted solar partner.
          </span>
          <div className="flex gap-6">
            <a className="text-label-sm text-jds-on-surface-variant hover:text-jds-secondary underline transition-all" href="#">
              Privacy Policy
            </a>
            <a className="text-label-sm text-jds-on-surface-variant hover:text-jds-secondary underline transition-all" href="#">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
