import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  ShieldCheck,
  Package,
  Phone,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  Lock,
  Mail,
  Clock,
  X,
  Trash2,
  FileText
} from 'lucide-react'
import {
  fetchCustomerPortalData,
  getCustomerAuthStatus,
  setCustomerPassword,
  deleteCustomerAccount,
  confirmCustomerEmailByToken,
  queueAndSendCustomerConfirmationEmail
} from '../lib/customerService'
import { sanitizeEmail, isValidEmail } from '../lib/sanitize.js'
import FaultDiagnosticModal from '../components/FaultDiagnosticModal'
import WarrantyTermsModal from '../components/WarrantyTermsModal'
import EquipmentCard from '../components/portal/EquipmentCard'
import ClaimTrackerCard from '../components/portal/ClaimTrackerCard'
import useModalBehavior from '../hooks/useModalBehavior'
import { useAuth } from '../context/AuthContext'
import AnimatedConfirmation from '../components/ui/AnimatedConfirmation'

export default function CustomerPortalPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, role, loading: authLoading, setCustomerSession, signOut } = useAuth()
  const [token, setToken] = useState(() => {
    const urlToken = searchParams.get('token') || searchParams.get('uuid')
    return urlToken || localStorage.getItem('jd_customer_token') || ''
  })

  // Security guard: If user is not authenticated, redirect to login with forwarded parameters
  useEffect(() => {
    if (!authLoading && !user) {
      const forwardToken = searchParams.get('token') || searchParams.get('uuid') || ''
      const confirmParam = searchParams.get('confirm_email') || ''
      const q = new URLSearchParams()
      if (forwardToken) q.set('token', forwardToken)
      if (confirmParam) q.set('confirm_email', confirmParam)
      const qStr = q.toString() ? `?${q.toString()}` : ''
      navigate(`/login${qStr}`, { replace: true })
    }
  }, [authLoading, user, navigate, searchParams])

  // Prevent cross-customer session hijacking: If logged in as customer A but viewing token B
  useEffect(() => {
    if (!authLoading && user && role === 'customer') {
      const urlToken = searchParams.get('token') || searchParams.get('uuid')
      const activeCustomerToken =
        user.accessToken ||
        (user.isCustomer ? user.id : null) ||
        localStorage.getItem('jd_customer_token') ||
        user.id
      if (urlToken && activeCustomerToken && urlToken !== activeCustomerToken) {
        navigate(`/login?token=${encodeURIComponent(urlToken)}`, { replace: true })
      }
    }
  }, [authLoading, user, role, searchParams, navigate])

  const [portalData, setPortalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPurchaseForClaim, setSelectedPurchaseForClaim] = useState(null)
  const [diagnosticMode, setDiagnosticMode] = useState('assistant')
  const [activeTab, setActiveTab] = useState('equipment')
  const [manualTokenInput, setManualTokenInput] = useState('')

  // Password & Security Management States
  const [authStatus, setAuthStatus] = useState({
    hasPassword: false,
    email: null,
    emailConfirmed: false,
    emailConfirmationStatus: 'unconfirmed'
  })
  const [emailBannerStatus, setEmailBannerStatus] = useState(null)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [emailJustConfirmedMessage, setEmailJustConfirmedMessage] = useState(null)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [pwdEmail, setPwdEmail] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState(null)
  const [pwdSuccess, setPwdSuccess] = useState(null)

  // Account Deletion States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const { backdropProps: passwordBackdropProps } = useModalBehavior({
    isOpen: isPasswordModalOpen,
    onClose: () => setIsPasswordModalOpen(false),
  })

  const { backdropProps: deleteBackdropProps } = useModalBehavior({
    isOpen: isDeleteModalOpen,
    onClose: () => {
      if (!isDeletingAccount) {
        setIsDeleteModalOpen(false)
        setDeleteError(null)
      }
    },
  })

  // Warranty Terms & Policy Modal States
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false)
  const [isFirstTimeWarranty, setIsFirstTimeWarranty] = useState(false)

  const loadData = async (activeToken, { silent = false } = {}) => {
    if (!activeToken) {
      if (!silent) setLoading(false)
      return
    }

    try {
      if (!silent) {
        setLoading(true)
        setError(null)
      }

      // Check if customer arrived via one-click email confirmation link (?confirm_email=...)
      const confirmParam = searchParams.get('confirm_email')
      if (confirmParam) {
        const confirmResult = await confirmCustomerEmailByToken(activeToken, confirmParam)
        if (confirmResult?.success) {
          setEmailJustConfirmedMessage(
            confirmResult.message || 'Your email address has been verified and confirmed.'
          )
          // Clean up query parameter while preserving token
          try {
            const nextParams = new URLSearchParams(searchParams)
            nextParams.delete('confirm_email')
            setSearchParams(nextParams, { replace: true })
          } catch {
            // ignore
          }
        }
      }

      const { data, error: fetchErr } = await fetchCustomerPortalData(activeToken)
      if (fetchErr) throw fetchErr
      if (!data) throw new Error('Customer account not found.')
      setPortalData(data)

      // First-time warranty terms acknowledgment check
      const ackKey = `jd_warranty_ack_${activeToken}`
      const hasAcknowledged = localStorage.getItem(ackKey) === 'true'
      if (!hasAcknowledged) {
        setIsFirstTimeWarranty(true)
        setIsWarrantyModalOpen(true)
      }

      // Fetch password & auth status
      const authInfo = await getCustomerAuthStatus(activeToken)
      setAuthStatus(authInfo)
      const resolvedEmail = authInfo?.email || data?.customer?.email || ''
      if (resolvedEmail) {
        setPwdEmail(resolvedEmail)
      }
    } catch (err) {
      console.error('Portal load failed:', err)
      if (!silent) {
        setError(err.message || 'Failed to retrieve your customer portal.')
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const handleResendEmailConfirmation = async () => {
    const targetEmail = authStatus?.email || portalData?.customer?.email
    if (!token || !targetEmail || resendingConfirmation) return
    try {
      setResendingConfirmation(true)
      await queueAndSendCustomerConfirmationEmail({
        customerId: portalData?.customer?.id || null,
        customerName: portalData?.customer?.name || 'Customer',
        phoneNumber: portalData?.customer?.phone || '',
        email: targetEmail,
        accessToken: token,
        branchLocation: portalData?.purchases?.[0]?.branch_location || 'Cavite',
        onStatusChange: (statusUpdate) => {
          setEmailBannerStatus(statusUpdate)
        }
      })
    } catch (err) {
      console.error('Failed to resend confirmation email:', err)
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleAcknowledgeWarranty = () => {
    if (token) {
      localStorage.setItem(`jd_warranty_ack_${token}`, 'true')
    }
    setIsFirstTimeWarranty(false)
    setIsWarrantyModalOpen(false)
  }

  const handleOpenWarrantyTerms = () => {
    setIsFirstTimeWarranty(false)
    setIsWarrantyModalOpen(true)
  }

  useEffect(() => {
    if (token) {
      loadData(token)
    } else {
      setLoading(false)
    }
  }, [token])

  const handleManualTokenSubmit = (e) => {
    e.preventDefault()
    const clean = manualTokenInput.trim()
    if (!clean) return
    if (!user) {
      navigate(`/login?token=${encodeURIComponent(clean)}`)
      return
    }
    if (role === 'admin' || role === 'staff') {
      setToken(clean)
    } else {
      // Customer must authenticate with the requested account
      navigate(`/login?token=${encodeURIComponent(clean)}`)
    }
  }

  const handleClaimSubmitted = () => {
    if (token) loadData(token, { silent: true })
  }

  const handleConfirmDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true)
      setDeleteError(null)
      await deleteCustomerAccount({
        customerId: portalData?.customer?.id || null,
        token,
        email: authStatus.email || portalData?.customer?.email
      })
      if (setCustomerSession) {
        setCustomerSession(null)
      }
      if (signOut) {
        await signOut()
      }
      navigate('/')
    } catch (err) {
      console.error('Failed to delete customer account:', err)
      setDeleteError(err.message || 'Failed to delete your account. Please try again.')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(null)

    const cleanEmail = sanitizeEmail(pwdEmail)
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setPwdError('Please enter a valid email address.')
      return
    }
    if (!pwdNew || pwdNew.length < 8) {
      setPwdError('Password must be at least 8 characters.')
      return
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError('New password and confirmation do not match.')
      return
    }

    try {
      setPwdLoading(true)
      const res = await setCustomerPassword({
        token,
        email: cleanEmail,
        password: pwdNew,
        currentPassword: authStatus.hasPassword ? pwdCurrent : null
      })

      setPwdSuccess(res.message || 'Account password updated successfully.')
      const wasEmailChanged = Boolean(res.emailChanged)
      setAuthStatus(prev => ({
        ...prev,
        hasPassword: true,
        email: cleanEmail,
        emailConfirmed: wasEmailChanged ? false : prev.emailConfirmed,
        emailConfirmationStatus: wasEmailChanged ? 'awaiting_confirmation' : prev.emailConfirmationStatus
      }))
      if (wasEmailChanged) {
        setEmailJustConfirmedMessage(null)
        await queueAndSendCustomerConfirmationEmail({
          customerId: portalData?.customer?.id || null,
          customerName: portalData?.customer?.name || 'Customer',
          phoneNumber: portalData?.customer?.phone || '',
          email: cleanEmail,
          accessToken: token,
          branchLocation: portalData?.purchases?.[0]?.branch_location || 'Cavite',
          onStatusChange: (statusUpdate) => {
            setEmailBannerStatus(statusUpdate)
          }
        })
      }
      if (setCustomerSession) {
        setCustomerSession(token, cleanEmail)
      }
      setPwdNew('')
      setPwdConfirm('')
      setPwdCurrent('')
    } catch (err) {
      setPwdError(err.message || 'Failed to save password.')
    } finally {
      setPwdLoading(false)
    }
  }

  // 1. NO TOKEN SCREEN
  if (!token) {
    return (
      <div className="min-h-screen bg-jds-surface flex items-center justify-center p-4">
        <div className="bg-jds-surface-container-lowest border border-jds-outline-variant/50 rounded-2xl max-w-md w-full p-6 text-center space-y-5 shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-jds-primary/10 text-jds-primary flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-jds-on-surface">JD-Foz Solar Customer Portal</h1>
            <p className="text-xs text-jds-on-surface-variant mt-1.5">
              Please scan the QR code printed on your in-store purchase slip or paste your access key below.
            </p>
          </div>

          <form onSubmit={handleManualTokenSubmit} className="space-y-3 pt-2">
            <input
              type="text"
              placeholder="Paste Access Token (UUID)..."
              value={manualTokenInput}
              onChange={(e) => setManualTokenInput(e.target.value)}
              className="w-full min-h-[44px] bg-jds-surface border border-jds-outline-variant/50 rounded-xl px-4 py-2.5 text-base sm:text-xs text-jds-on-surface font-mono placeholder:font-sans placeholder:text-jds-on-surface-variant/40 focus:outline-none focus:border-jds-primary"
            />
            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-jds-primary text-jds-on-primary font-semibold text-xs hover:bg-jds-primary/90 transition-all shadow-sm cursor-pointer"
            >
              Open Portal
            </button>
          </form>

          <div className="pt-2 border-t border-jds-outline-variant/30 flex flex-col items-center gap-1.5 text-[11px] text-jds-on-surface-variant">
            <div>
              Have an email and password?{' '}
              <Link to="/login" className="text-jds-primary font-semibold hover:underline">
                Sign in here
              </Link>
            </div>
            <div>
              Forgot password?{' '}
              <Link to="/forgot-password" className="text-jds-secondary font-semibold hover:underline">
                Reset it here
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2. LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-jds-surface flex flex-col items-center justify-center p-4 space-y-3">
        <div className="w-10 h-10 border-2 border-jds-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-jds-on-surface-variant font-medium">Loading your solar equipment &amp; warranties...</p>
      </div>
    )
  }

  // 3. ERROR STATE
  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-jds-surface flex items-center justify-center p-4">
        <div className="bg-jds-surface-container-lowest border border-rose-500/20 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-jds-on-surface">Unable to Access Portal</h2>
          <p className="text-xs text-jds-on-surface-variant">{error || 'Invalid or expired customer token.'}</p>
          <button
            onClick={() => {
              localStorage.removeItem('jd_customer_token')
              setToken('')
              setError(null)
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-jds-surface-container border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-colors cursor-pointer"
          >
            Try Another Access Key
          </button>
        </div>
      </div>
    )
  }

  const { customer, purchases = [], claims = [] } = portalData
  const existingAccountClaim = claims[0] || null
  const activeWarrantiesCount = purchases.filter(p => p.is_warranty_active).length
  const openClaims = claims.filter(c => ['in_review', 'pending', 'checking', 'approved', 'ready_for_release'].includes(c.status || 'in_review'))
  const resolvedCustomerEmail = authStatus.email || customer.email || ''
  const isEmailConfirmed = Boolean(
    emailJustConfirmedMessage ||
    authStatus.emailConfirmed ||
    customer.email_confirmed_at ||
    customer.email_confirmed ||
    emailBannerStatus?.status === 'confirmed'
  )
  const currentEmailStatus = isEmailConfirmed
    ? 'confirmed'
    : (emailBannerStatus?.status || authStatus.emailConfirmationStatus || customer.email_confirmation_status || (resolvedCustomerEmail ? 'awaiting_confirmation' : 'unconfirmed'))

  return (
    <div className="min-h-screen bg-jds-surface pb-16">

      {/* Calm Identity & Utility Header */}
      <div className="bg-jds-surface-container-lowest border-b border-jds-outline-variant/40 px-4 py-5 sm:px-6 sm:py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold text-jds-primary uppercase tracking-wider">
              Customer Portal
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-jds-on-surface tracking-tight mt-0.5">
              Welcome, {customer.name}!
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-jds-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
              </span>
              {resolvedCustomerEmail && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {resolvedCustomerEmail}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenWarrantyTerms}
              className="min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl bg-jds-surface-container-lowest hover:bg-jds-surface-container-low border border-jds-outline-variant/60 text-xs font-semibold text-jds-on-surface inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Review Official Warranty Terms"
            >
              <FileText className="w-3.5 h-3.5 text-jds-primary" />
              <span>Terms &amp; Policy</span>
            </button>

            <button
              type="button"
              onClick={() => loadData(token)}
              className="min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl bg-jds-surface-container-lowest hover:bg-jds-surface-container-low border border-jds-outline-variant/60 text-xs font-semibold text-jds-on-surface inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">

        {/* Email Confirmation Status Banner (Exception-first, non-blocking) */}
        {emailJustConfirmedMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-700 dark:text-emerald-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <strong className="font-bold">Email Verified:</strong> {emailJustConfirmedMessage}
              </div>
            </div>
          </div>
        )}

        {!isEmailConfirmed && (
          <div className="p-4 rounded-2xl bg-jds-primary-container/15 border border-jds-primary-container/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              {currentEmailStatus === 'queued' || resendingConfirmation ? (
                <RefreshCw className="w-4 h-4 text-jds-primary shrink-0 mt-0.5 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 text-jds-primary shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-bold text-jds-on-surface">
                  {currentEmailStatus === 'queued' || resendingConfirmation
                    ? 'Queuing email confirmation...'
                    : 'Awaiting Email Confirmation'}
                </div>
                <p className="text-jds-on-surface-variant leading-relaxed">
                  {currentEmailStatus === 'queued' || resendingConfirmation
                    ? `Queuing account creation confirmation email to ${resolvedCustomerEmail || 'your email address'}...`
                    : resolvedCustomerEmail
                      ? `Confirmation email sent to ${resolvedCustomerEmail}. Awaiting verification — please check your inbox and click the confirmation link.`
                      : 'Please link and confirm your email address to receive account notifications and warranty updates.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              {resolvedCustomerEmail ? (
                <button
                  type="button"
                  onClick={handleResendEmailConfirmation}
                  disabled={resendingConfirmation || currentEmailStatus === 'queued'}
                  className="min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl bg-jds-surface-container-lowest border border-jds-outline-variant/60 hover:bg-jds-surface-container-low text-xs font-semibold text-jds-on-surface flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resendingConfirmation ? 'animate-spin' : ''}`} />
                  Resend Confirmation Email
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPwdError(null)
                    setPwdSuccess(null)
                    setIsPasswordModalOpen(true)
                  }}
                  className="min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-semibold hover:bg-jds-primary/90 transition-colors cursor-pointer"
                >
                  Add Email Address
                </button>
              )}
            </div>
          </div>
        )}

        {/* Segmented Navigation Tabs */}
        <nav
          aria-label="Customer portal sections"
          className="inline-flex max-w-full overflow-x-auto scrollbar-hide bg-jds-surface-container p-1 rounded-2xl border border-jds-outline-variant/45 gap-1"
        >
          <button
            type="button"
            onClick={() => setActiveTab('equipment')}
            className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'equipment'
              ? 'bg-jds-surface-container-lowest text-jds-on-surface shadow-xs'
              : 'text-jds-on-surface-variant hover:text-jds-on-surface'
              }`}
          >
            <Package className="w-3.5 h-3.5 text-jds-primary" />
            <span>My Equipment</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-jds-surface-container-high text-jds-on-surface-variant">
              {purchases.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('claims')}
            className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'claims'
              ? 'bg-jds-surface-container-lowest text-jds-on-surface shadow-xs'
              : 'text-jds-on-surface-variant hover:text-jds-on-surface'
              }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-jds-secondary" />
            <span>Service Claims</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-jds-surface-container-high text-jds-on-surface-variant">
              {claims.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${activeTab === 'account'
              ? 'bg-jds-surface-container-lowest text-jds-on-surface shadow-xs'
              : 'text-jds-on-surface-variant hover:text-jds-on-surface'
              }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-jds-on-surface-variant" />
            <span>Account &amp; Security</span>
          </button>
        </nav>

        {/* TAB 1: MY EQUIPMENT */}
        {activeTab === 'equipment' && (
          <section className="space-y-4">
            {openClaims.length > 0 && (
              <div className="p-4 rounded-2xl bg-jds-secondary/10 border border-jds-secondary/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-jds-secondary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-jds-on-surface">
                      {openClaims.length} Active Service Ticket{openClaims.length === 1 ? '' : 's'}
                    </div>
                    <p className="text-jds-on-surface-variant mt-0.5">
                      TICKET #{String(openClaims[0].id || '').slice(0, 8).toUpperCase()} for {openClaims[0].product_name} is currently in progress.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('claims')}
                  className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 rounded-xl bg-jds-surface-container-lowest border border-jds-outline-variant/60 hover:bg-jds-surface-container-low text-xs font-bold text-jds-secondary shrink-0 self-start sm:self-center cursor-pointer"
                >
                  Track Claim
                </button>
              </div>
            )}

            {purchases.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-jds-surface-container-lowest border border-jds-outline-variant/40 text-xs text-jds-on-surface-variant">
                No registered product purchases found for this account.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {purchases.map((p) => {
                  const linkedClaims = claims.filter(
                    (c) =>
                      c.customer_purchase_id === p.id ||
                      c.customer_purchases?.id === p.id ||
                      c.purchase_id === p.id
                  )
                  return (
                    <EquipmentCard
                      key={p.id}
                      purchase={p}
                      linkedClaims={linkedClaims}
                      existingAccountClaim={existingAccountClaim}
                      onTroubleshoot={(item) => {
                        setSelectedPurchaseForClaim(item)
                        setDiagnosticMode('assistant')
                      }}
                      onFileClaim={(item) => {
                        if (existingAccountClaim || claims.some((c) => c.purchase_id === item.id)) {
                          setActiveTab('claims')
                          return
                        }
                        setSelectedPurchaseForClaim(item)
                        setDiagnosticMode('claim')
                      }}
                      onViewClaims={() => setActiveTab('claims')}
                    />
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: SERVICE CLAIMS */}
        {activeTab === 'claims' && (
          <section className="space-y-4">
            {claims.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-jds-surface-container-lowest border border-jds-outline-variant/40 text-xs text-jds-on-surface-variant space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600/50 mx-auto" />
                <div>
                  <div className="font-bold text-sm text-jds-on-surface">No Active Service Claims</div>
                  <p className="mt-1">All your registered solar products are in good operational standing.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('equipment')}
                  className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-xl bg-jds-surface-container border border-jds-outline-variant/50 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-colors cursor-pointer"
                >
                  Back to My Equipment
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {claims.map((claim) => (
                  <ClaimTrackerCard key={claim.id} claim={claim} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: ACCOUNT & SECURITY */}
        {activeTab === 'account' && (
          <section className="space-y-3.5">
            <div className="p-5 rounded-2xl bg-jds-surface-container-lowest border border-jds-outline-variant/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-jds-on-surface">Account Password &amp; Security</h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${authStatus.hasPassword
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                        }`}
                    >
                      {authStatus.hasPassword ? 'Password Enabled' : 'Token Only'}
                    </span>
                  </div>
                  <p className="text-xs text-jds-on-surface-variant max-w-xl">
                    {authStatus.hasPassword
                      ? `Linked login email: ${authStatus.email || resolvedCustomerEmail || 'Configured'}. Sign in via email and password on the login page.`
                      : 'You are currently accessing this portal via token or QR scan. Set a password to sign in via email and password anytime.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPwdError(null)
                  setPwdSuccess(null)
                  setIsPasswordModalOpen(true)
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-bold hover:bg-jds-primary/90 transition-all shrink-0 shadow-xs cursor-pointer"
              >
                {authStatus.hasPassword ? 'Change Password' : 'Set Up Password'}
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400">Delete Account</h2>
                  <p className="text-xs text-jds-on-surface-variant max-w-xl leading-relaxed">
                    Permanently remove your customer profile, portal access credentials, registered equipment units, and warranty claim history from the JD Solar platform.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteError(null)
                  setIsDeleteModalOpen(true)
                }}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all shrink-0 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </section>
        )}

      </div>

      {/* Password Management Modal */}
      {isPasswordModalOpen && (
        <div
          {...passwordBackdropProps}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-jds-surface-container-lowest border border-jds-outline-variant/50 rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 my-auto space-y-5 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-jds-outline-variant/20 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-jds-primary/10 text-jds-primary flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-jds-on-surface">
                    {authStatus.hasPassword ? 'Change Account Password' : 'Set Account Password'}
                  </h3>
                  <p className="text-[11px] text-jds-on-surface-variant">
                    Manage credentials to log in via email and password
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 w-9 h-9 sm:w-7 sm:h-7 rounded-lg hover:bg-jds-surface-container flex items-center justify-center text-jds-on-surface-variant"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pwdError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-medium">
                {pwdError}
              </div>
            )}

            {pwdSuccess ? (
              <AnimatedConfirmation
                title="Password Updated"
                description={pwdSuccess}
                duration={1800}
                onComplete={() => {
                  setIsPasswordModalOpen(false)
                  setPwdSuccess(null)
                }}
              />
            ) : (
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-jds-on-surface flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-jds-on-surface-variant" />
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    value={pwdEmail}
                    onChange={(e) => setPwdEmail(e.target.value)}
                    className="w-full bg-jds-surface-container/50 border border-jds-outline-variant/40 rounded-xl px-3.5 py-2 text-xs text-jds-on-surface focus:outline-none focus:border-jds-primary"
                  />
                </div>

                {authStatus.hasPassword && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-jds-on-surface flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-jds-on-surface-variant" />
                        Current Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-[11px] text-jds-secondary font-semibold hover:underline"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <input
                      type="password"
                      placeholder="Enter current password"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      className="w-full bg-jds-surface-container/50 border border-jds-outline-variant/40 rounded-xl px-3.5 py-2 text-xs text-jds-on-surface focus:outline-none focus:border-jds-primary"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-jds-on-surface flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-jds-on-surface-variant" />
                    {authStatus.hasPassword ? 'New Password' : 'Create Password'}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    className="w-full bg-jds-surface-container/50 border border-jds-outline-variant/40 rounded-xl px-3.5 py-2 text-xs text-jds-on-surface focus:outline-none focus:border-jds-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-jds-on-surface flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-jds-on-surface-variant" />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    className="w-full bg-jds-surface-container/50 border border-jds-outline-variant/40 rounded-xl px-3.5 py-2 text-xs text-jds-on-surface focus:outline-none focus:border-jds-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-jds-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-xl bg-jds-surface-container/70 border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="min-h-[44px] sm:min-h-[38px] px-5 py-2 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-bold hover:bg-jds-primary/90 transition-all disabled:opacity-60 shadow-sm cursor-pointer"
                  >
                    {pwdLoading ? 'Saving...' : 'Save Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Fault Diagnostic Modal */}
      {selectedPurchaseForClaim && (
        <FaultDiagnosticModal
          isOpen={Boolean(selectedPurchaseForClaim)}
          onClose={() => setSelectedPurchaseForClaim(null)}
          purchase={selectedPurchaseForClaim}
          customerToken={token}
          existingAccountClaim={existingAccountClaim}
          onClaimSubmitted={handleClaimSubmitted}
          onTrackClaims={() => setActiveTab('claims')}
          initialMode={diagnosticMode}
        />
      )}

      {/* Delete Customer Account Confirmation Modal */}
      {isDeleteModalOpen && (
        <div
          {...deleteBackdropProps}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-jds-surface-container-lowest border border-jds-outline-variant/50 rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 my-auto space-y-5 shadow-2xl relative"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-jds-on-surface">
                  Delete Your Account?
                </h3>
                <p className="text-xs text-jds-on-surface-variant truncate">
                  {customer?.name} ({customer?.phone})
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 space-y-1.5 leading-relaxed">
              <p className="font-bold">Warning: This action cannot be undone.</p>
              <p>
                Deleting your account will permanently erase your customer profile, portal token, login credentials,{' '}
                <strong>{purchases.length} registered unit(s)</strong> (including{' '}
                <strong>{activeWarrantiesCount} active warrant{activeWarrantiesCount === 1 ? 'y' : 'ies'}</strong>),
                and all associated warranty claim records from the database.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 font-semibold">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-jds-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setDeleteError(null)
                }}
                disabled={isDeletingAccount}
                className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-xl bg-jds-surface-container/70 border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={isDeletingAccount}
                className="min-h-[44px] sm:min-h-[38px] inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-60 shadow-sm cursor-pointer"
              >
                {isDeletingAccount ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Yes, Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Year Warranty Terms & Disqualification Notice Modal */}
      <WarrantyTermsModal
        isOpen={isWarrantyModalOpen}
        onClose={() => setIsWarrantyModalOpen(false)}
        onAcknowledge={handleAcknowledgeWarranty}
        isFirstTime={isFirstTimeWarranty}
        customerName={portalData?.customer?.name || ''}
      />
    </div>
  )
}
