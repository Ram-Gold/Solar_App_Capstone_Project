import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HiOutlineEnvelope, HiOutlineArrowLeft, HiOutlineArrowRight } from 'react-icons/hi2'
import { requestPasswordReset } from '../lib/customerService'
import jdSolarLogo from '../assets/jdsolarlogo.webp'

const RESEND_COOLDOWN_SECONDS = 60

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState(() => localStorage.getItem('jd_remembered_email') || '')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading || cooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSent(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err.message || 'Unable to send the reset link right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-jds-surface font-inter text-jds-on-surface min-h-screen flex flex-col">
      <header className="w-full">
        <nav className="flex justify-between items-center w-full px-4 md:px-10 py-8 max-w-[1200px] mx-auto">
          <Link to="/" className="flex items-center group" aria-label="JD Solar Home">
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
            <div className="text-center mb-8">
              <h1 className="text-headline-lg text-jds-on-surface mb-2">Forgot Password</h1>
              <p className="text-body-md text-jds-on-surface-variant">
                Enter the email address on your customer account and we will send you a reset link.
              </p>
            </div>

            {sent && (
              <div role="status" className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 text-sm mb-6">
                If an account exists for that email address, a reset link has been sent. The link expires in 30 minutes.
              </div>
            )}

            {error && (
              <div role="alert" className="p-3.5 rounded-xl bg-jds-error-container border border-jds-error/20 text-jds-on-error-container text-sm mb-6">
                <span className="leading-tight font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-label-sm text-jds-on-surface-variant ml-1" htmlFor="email">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-jds-on-surface-variant">
                    <HiOutlineEnvelope className="text-xl" />
                  </div>
                  <input
                    className="w-full pl-11 pr-4 py-3.5 bg-jds-surface-variant/30 border-none focus:ring-2 focus:ring-jds-secondary rounded-lg text-body-md text-jds-on-surface outline-none"
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="w-full py-4 bg-jds-primary-container hover:bg-jds-primary transition-all duration-300 rounded-lg text-jds-on-primary-container hover:text-jds-on-primary text-[16px] font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                type="submit"
                disabled={loading || cooldown > 0}
              >
                {loading
                  ? 'Sending...'
                  : cooldown > 0
                    ? `Resend available in ${cooldown}s`
                    : sent ? 'Resend Reset Link' : 'Send Reset Link'}
                {!loading && cooldown === 0 && <HiOutlineArrowRight />}
              </button>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
