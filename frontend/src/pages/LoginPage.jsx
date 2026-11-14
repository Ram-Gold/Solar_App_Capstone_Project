import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  loginCustomerWithPassword,
  getCustomerAuthStatus,
  setCustomerPassword
} from '../lib/customerService'
import { motion } from 'framer-motion'
import PrivacyPolicyModal from '../components/PrivacyPolicyModal'
import TermsOfServiceModal from '../components/TermsOfServiceModal'
import {
  HiOutlineEnvelope,
  HiOutlineLockClosed,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineSun,
  HiOutlineShieldCheck,
  HiOutlineKey,
} from 'react-icons/hi2'
import jdSolarLogo from '../assets/jdsolarlogo.webp'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const isTimedOut = searchParams.get('reason') === 'timeout'
  const isPasswordReset = searchParams.get('reason') === 'reset'
  const forwardedToken = (searchParams.get('token') || searchParams.get('uuid') || '').trim()
  const forwardedConfirm = (searchParams.get('confirm_email') || '').trim()

  const [email, setEmail] = useState(() => {
    return localStorage.getItem('jd_remembered_email') || localStorage.getItem('jd_customer_email') || ''
  })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forwardedAuth, setForwardedAuth] = useState(null)
  const [resolvingForwarded, setResolvingForwarded] = useState(Boolean(forwardedToken))
  const [showManualToken, setShowManualToken] = useState(false)
  const [manualTokenVal, setManualTokenVal] = useState('')
  const [manualTokenLoading, setManualTokenLoading] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [remember, setRemember] = useState(true)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const { user, role, signOut, signIn, setCustomerSession } = useAuth()
  const navigate = useNavigate()

  // If visitor arrives with a customer token while currently logged into an admin or staff account,
  // sign out of the staff/admin session so it cannot contaminate customer activation/login.
  useEffect(() => {
    if (forwardedToken && user && (role === 'admin' || role === 'staff') && typeof signOut === 'function') {
      signOut()
    }
  }, [forwardedToken, user, role, signOut])

  useEffect(() => {
    if (!email) {
      const stored = localStorage.getItem('jd_remembered_email') || localStorage.getItem('jd_customer_email')
      if (stored) setEmail(stored)
    }
  }, [email])

  // Resolve forwarded UUID access token
  useEffect(() => {
    if (!forwardedToken) {
      setForwardedAuth(null)
      setResolvingForwarded(false)
      return
    }

    let mounted = true

    async function resolveToken() {
      try {
        setResolvingForwarded(true)
        const authStatus = await getCustomerAuthStatus(forwardedToken)
        if (!mounted) return

        let resolvedEmail = authStatus?.email || ''
        const hasPwd = Boolean(authStatus?.hasPassword)

        if (!resolvedEmail) {
          try {
            const { data: custRow } = await supabase
              .from('customers')
              .select('email')
              .eq('access_token', forwardedToken)
              .maybeSingle()
            if (custRow?.email) {
              resolvedEmail = custRow.email
            }
          } catch {
            // ignore
          }
        }

        setForwardedAuth({
          token: forwardedToken,
          hasPassword: hasPwd,
          email: hasPwd ? '' : resolvedEmail
        })

        // Only pre-fill email during first-time activation so an existing account's email is never leaked via URL token.
        if (resolvedEmail && !hasPwd) {
          setEmail(resolvedEmail)
        }
      } catch (err) {
        console.warn('Failed to resolve forwarded token:', err)
      } finally {
        if (mounted) setResolvingForwarded(false)
      }
    }

    resolveToken()
    return () => {
      mounted = false
    }
  }, [forwardedToken])

  const handleVerifyManualToken = async (e) => {
    e.preventDefault()
    const clean = manualTokenVal.trim()
    if (!clean) return
    setError('')
    setManualTokenLoading(true)
    try {
      const authStatus = await getCustomerAuthStatus(clean)
      let resolvedEmail = authStatus?.email || ''
      if (!resolvedEmail) {
        try {
          const { data: custRow } = await supabase
            .from('customers')
            .select('email')
            .eq('access_token', clean)
            .maybeSingle()
          if (custRow?.email) resolvedEmail = custRow.email
        } catch {
          // ignore
        }
      }

      setForwardedAuth({
        token: clean,
        hasPassword: Boolean(authStatus?.hasPassword),
        email: resolvedEmail
      })
      if (resolvedEmail) setEmail(resolvedEmail)
      navigate(`/login?token=${encodeURIComponent(clean)}`, { replace: true })
    } catch {
      setError('Could not verify access token.')
    } finally {
      setManualTokenLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    localStorage.setItem('jd_remembered_email', normalizedEmail)
    localStorage.setItem('jd_last_activity_timestamp', Date.now().toString())

    try {
      // 1. First-time account activation for customer with forwarded token but no password
      if (forwardedToken && forwardedAuth && !forwardedAuth.hasPassword) {
        if (!password || password.length < 8) {
          setError('Password must be at least 8 characters.')
          setLoading(false)
          return
        }
        if (password !== confirmPassword) {
          setError('New password and confirmation do not match.')
          setLoading(false)
          return
        }

        await setCustomerPassword({
          token: forwardedToken,
          email: normalizedEmail,
          password
        })

        if (supabase?.auth?.signInWithPassword) {
          const { error: signInAfterActivateErr } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password
          })
          if (signInAfterActivateErr) {
            setError(signInAfterActivateErr.message || 'Account activated, but sign-in failed. Please log in with your new password.')
            setLoading(false)
            return
          }
        }

        if (setCustomerSession) {
          setCustomerSession(forwardedToken, normalizedEmail)
        } else {
          localStorage.setItem('jd_customer_token', forwardedToken)
          localStorage.setItem('jd_customer_email', normalizedEmail)
        }

        const confirmSuffix = forwardedConfirm ? `&confirm_email=${encodeURIComponent(forwardedConfirm)}` : ''
        navigate(`/portal?token=${encodeURIComponent(forwardedToken)}${confirmSuffix}`)
        return
      }

      // 2. Customer password login
      const custRes = await loginCustomerWithPassword(normalizedEmail, password)
      if (custRes?.token) {
        if (setCustomerSession) {
          setCustomerSession(custRes.token, normalizedEmail)
        } else {
          localStorage.setItem('jd_customer_token', custRes.token)
          localStorage.setItem('jd_customer_email', normalizedEmail)
        }
        const activeToken = forwardedToken || custRes.token
        const confirmSuffix = forwardedConfirm ? `&confirm_email=${encodeURIComponent(forwardedConfirm)}` : ''
        navigate(`/portal?token=${encodeURIComponent(activeToken)}${confirmSuffix}`)
        return
      }

      // 3. Otherwise reuse authenticated Supabase user (or sign in) for staff/admin authentication
      let userId = custRes?.authUser?.id || null
      if (!userId) {
        const { data, error: signInError } = await signIn(normalizedEmail, password)
        if (signInError) {
          setError(signInError.message)
          return
        }
        userId = data?.user?.id || null
      }

      if (userId) {
        // Check admins table first
        const { data: adminRow } = await supabase.from('admins').select('id').eq('id', userId).maybeSingle()
        if (adminRow) {
          navigate('/admin')
          return
        }

        // Check if user is a customer linked to auth.users
        const { data: custRow } = await supabase
          .from('customers')
          .select('access_token')
          .or(`id.eq.${userId},user_id.eq.${userId}`)
          .maybeSingle()
        if (custRow?.access_token) {
          localStorage.setItem('jd_customer_token', custRow.access_token)
          navigate(`/portal?token=${custRow.access_token}`)
          return
        }

        // Check staff table
        const { data: staffRow } = await supabase.from('staff').select('id').eq('id', userId).maybeSingle()
        if (staffRow) {
          navigate('/staff')
          return
        }

        // Account row does not exist in admins, customers, or staff (deleted account)
        await supabase.auth.signOut()
        setError('This account has been deleted or no longer has access to the platform.')
        return
      } else {
        navigate('/admin')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err?.message || 'An unexpected system error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const isFirstTimeActivation = Boolean(forwardedToken && forwardedAuth && !forwardedAuth.hasPassword)

  return (
    <div className="bg-jds-surface font-inter text-jds-on-surface min-h-screen flex flex-col">
      {/* Minimal Header */}
      <header className="w-full">
        <nav className="flex justify-between items-center w-full px-4 md:px-10 py-8 max-w-[1200px] mx-auto">
          <Link to="/" className="flex items-center group" aria-label="JD Solar Home">
            <img
              src={jdSolarLogo}
              alt="JD Solar"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
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
            <div className="text-center mb-8">
              <h1 className="text-headline-lg text-jds-on-surface mb-2">Portal Login</h1>
              <p className="text-body-md text-jds-on-surface-variant">
                {isFirstTimeActivation
                  ? 'Activate and secure your customer dashboard.'
                  : 'Access your solar dashboard, warranties, or staff panel.'}
              </p>
            </div>

            {/* Forwarded UUID Banner: First-Time Activation */}
            {isFirstTimeActivation && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-jds-on-surface text-sm mb-6 shadow-sm"
              >
                <HiOutlineKey className="text-xl text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-label-md text-amber-700 dark:text-amber-300">
                    First-Time Account Activation
                  </span>
                  <span className="text-body-sm text-jds-on-surface-variant leading-relaxed mt-0.5">
                    Please create a password (minimum 8 characters) to secure your account and access your dashboard.
                  </span>
                </div>
              </motion.div>
            )}

            {/* Session Timeout Banner */}
            {isTimedOut && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3.5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-sm mb-6 shadow-sm"
              >
                <HiOutlineLockClosed className="text-xl text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-label-md">Session Timed Out</span>
                  <span className="text-body-sm opacity-90 leading-relaxed mt-0.5">
                    Your session expired due to 15 minutes of inactivity. Please enter your password to continue.
                  </span>
                </div>
              </motion.div>
            )}

            {/* Password Reset Success Banner */}
            {isPasswordReset && (
              <div
                role="status"
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 text-sm mb-6"
              >
                <span className="font-semibold text-label-md block">Password Updated</span>
                <span className="text-body-sm opacity-90">Sign in with your new password.</span>
              </div>
            )}

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
                <div className="flex items-center justify-between">
                  <label
                    className="block text-label-sm text-jds-on-surface-variant ml-1"
                    htmlFor="password"
                  >
                    {isFirstTimeActivation ? 'Create Password' : 'Password'}
                  </label>
                  {!isFirstTimeActivation && (
                    <Link
                      to="/forgot-password"
                      className="text-label-sm text-jds-secondary font-bold hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )}
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
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Confirm Password (for first-time activation) */}
              {isFirstTimeActivation && (
                <div className="space-y-2">
                  <label
                    className="block text-label-sm text-jds-on-surface-variant ml-1"
                    htmlFor="confirmPassword"
                  >
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-jds-on-surface-variant group-focus-within:text-jds-secondary transition-colors">
                      <HiOutlineLockClosed className="text-xl" />
                    </div>
                    <input
                      className="w-full pl-11 pr-4 py-3.5 bg-jds-surface-variant/30 border-none focus:ring-2 focus:ring-jds-secondary focus:bg-jds-surface-container-lowest rounded-lg text-body-md text-jds-on-surface transition-all placeholder:text-jds-on-surface-variant/50 outline-none"
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="••••••••"
                      required
                      type="password"
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Remember */}
              {!isFirstTimeActivation && (
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
              )}

              {/* Submit */}
              <button
                className="w-full py-4 bg-jds-primary-container hover:bg-jds-primary transition-all duration-300 rounded-lg text-jds-on-primary-container hover:text-jds-on-primary text-[16px] font-bold shadow-sm hover:shadow-md flex items-center justify-center gap-2 group disabled:opacity-60 cursor-pointer"
                type="submit"
                disabled={loading || resolvingForwarded}
              >
                {loading
                  ? 'Authenticating...'
                  : isFirstTimeActivation
                    ? 'Activate Account & Sign In'
                    : 'Sign In to Dashboard'}
                {!loading && (
                  <HiOutlineArrowRight className="group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </form>

            {/* Manual Token Verification Section */}
            <div className="mt-6 pt-5 border-t border-jds-outline-variant/30 text-center">
              <button
                type="button"
                onClick={() => setShowManualToken(!showManualToken)}
                className="text-label-sm text-jds-primary hover:underline font-medium cursor-pointer"
              >
                {showManualToken
                  ? 'Hide Access Key Lookup'
                  : 'Have a Purchase Receipt Access Token (UUID)?'}
              </button>

              {showManualToken && (
                <form onSubmit={handleVerifyManualToken} className="mt-3.5 space-y-2 text-left">
                  <label
                    className="block text-label-sm text-jds-on-surface-variant ml-1"
                    htmlFor="manualTokenInput"
                  >
                    Customer Access Token (UUID)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="manualTokenInput"
                      type="text"
                      value={manualTokenVal}
                      onChange={(e) => setManualTokenVal(e.target.value)}
                      placeholder="Paste UUID token..."
                      className="w-full px-3.5 py-2.5 bg-jds-surface-variant/30 rounded-lg text-body-sm font-mono text-jds-on-surface outline-none focus:ring-2 focus:ring-jds-primary"
                    />
                    <button
                      type="submit"
                      disabled={manualTokenLoading}
                      className="px-4 py-2.5 bg-jds-primary text-jds-on-primary font-semibold text-xs rounded-lg hover:bg-jds-primary/90 shrink-0 cursor-pointer disabled:opacity-60"
                    >
                      {manualTokenLoading ? 'Checking...' : 'Lookup'}
                    </button>
                  </div>
                  <p className="text-[11px] text-jds-on-surface-variant leading-relaxed">
                    Verifying your token identifies your account. Password authentication is still required to access the dashboard.
                  </p>
                </form>
              )}
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
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="text-label-sm text-jds-on-surface-variant hover:text-jds-secondary underline transition-all cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-label-sm text-jds-on-surface-variant hover:text-jds-secondary underline transition-all cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </footer>

      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
      <TermsOfServiceModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  )
}
