import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HiOutlineLockClosed, HiOutlineArrowLeft } from 'react-icons/hi2'
import { resetCustomerPassword } from '../lib/customerService'
import jdSolarLogo from '../assets/jdsolarlogo.webp'

const MIN_LENGTH = 8

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Capture the token once, then strip it from the address bar and history.
  const [token] = useState(() => searchParams.get('token') || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [linkInvalid, setLinkInvalid] = useState(!token)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) window.history.replaceState(null, '', '/reset-password')
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await resetCustomerPassword(token, password)
      // Clear any lingering customer session on this browser, then send them to login.
      localStorage.removeItem('jd_customer_token')
      localStorage.removeItem('jd_last_activity_timestamp')
      window.dispatchEvent(new Event('jd_customer_auth_change'))
      navigate('/login?reason=reset', { replace: true })
    } catch (err) {
      const msg = err.message || 'Unable to reset the password.'
      if (/invalid or has expired/i.test(msg)) setLinkInvalid(true)
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full pl-11 pr-4 py-3.5 bg-jds-surface-variant/30 border-none focus:ring-2 focus:ring-jds-secondary rounded-lg text-body-md text-jds-on-surface outline-none'

  return (
    <div className="bg-jds-surface font-inter text-jds-on-surface min-h-screen flex flex-col">
      <header className="w-full">
        <nav className="flex justify-between items-center w-full px-4 md:px-10 py-8 max-w-[1200px] mx-auto">
          <Link to="/" className="flex items-center" aria-label="JD Solar Home">
            <img src={jdSolarLogo} alt="JD Solar" className="h-10 w-auto object-contain" />
          </Link>
          <Link to="/login" className="flex items-center gap-2 text-jds-on-surface-variant hover:text-jds-primary transition-colors duration-200">
            <HiOutlineArrowLeft className="text-xl" />
            <span className="text-label-md">Back to Login</span>
          </Link>
        </nav>
      </header>

      <main className="flex-grow flex items-center justify-center px-4">
        <motion.div
          className="w-full max-w-[440px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-jds-surface-container-lowest border border-jds-outline-variant/30 rounded-xl p-10 shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
            {linkInvalid ? (
              <div className="text-center">
                <h1 className="text-headline-lg text-jds-on-surface mb-2">Link Not Valid</h1>
                <p className="text-body-md text-jds-on-surface-variant mb-6">
                  This reset link is invalid or has expired. Request a new one to continue.
                </p>
                <Link
                  to="/forgot-password"
                  className="inline-block w-full py-4 bg-jds-primary-container hover:bg-jds-primary rounded-lg text-jds-on-primary-container hover:text-jds-on-primary text-[16px] font-bold text-center transition-all"
                >
                  Request a New Link
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-headline-lg text-jds-on-surface mb-2">Set a New Password</h1>
                  <p className="text-body-md text-jds-on-surface-variant">
                    Choose a password of at least {MIN_LENGTH} characters.
                  </p>
                </div>

                {error && (
                  <div role="alert" className="p-3.5 rounded-xl bg-jds-error-container border border-jds-error/20 text-jds-on-error-container text-sm mb-6">
                    <span className="leading-tight font-medium">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-label-sm text-jds-on-surface-variant ml-1" htmlFor="new-password">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-jds-on-surface-variant">
                        <HiOutlineLockClosed className="text-xl" />
                      </div>
                      <input
                        className={inputClass}
                        id="new-password"
                        name="new-password"
                        type={show ? 'text' : 'password'}
                        required
                        minLength={MIN_LENGTH}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-label-sm text-jds-on-surface-variant ml-1" htmlFor="confirm-password">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-jds-on-surface-variant">
                        <HiOutlineLockClosed className="text-xl" />
                      </div>
                      <input
                        className={inputClass}
                        id="confirm-password"
                        name="confirm-password"
                        type={show ? 'text' : 'password'}
                        required
                        minLength={MIN_LENGTH}
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-1">
                    <input
                      className="w-5 h-5 rounded border-jds-outline-variant text-jds-primary focus:ring-jds-primary"
                      id="show-password"
                      type="checkbox"
                      checked={show}
                      onChange={(e) => setShow(e.target.checked)}
                    />
                    <label className="text-label-md text-jds-on-surface-variant cursor-pointer" htmlFor="show-password">
                      Show passwords
                    </label>
                  </div>

                  <button
                    className="w-full py-4 bg-jds-primary-container hover:bg-jds-primary transition-all duration-300 rounded-lg text-jds-on-primary-container hover:text-jds-on-primary text-[16px] font-bold shadow-sm disabled:opacity-60"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
