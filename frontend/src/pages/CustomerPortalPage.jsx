import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Package,
  Phone,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  Sparkles,
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
import { formatDate, formatRemainingText, getClaimStatusMeta } from '../lib/warrantyUtils'
import { sanitizeEmail, isValidEmail } from '../lib/sanitize.js'
import FaultDiagnosticModal from '../components/FaultDiagnosticModal'
import WarrantyTermsModal from '../components/WarrantyTermsModal'
import useModalBehavior from '../hooks/useModalBehavior'
import { getMainProductImage } from '../lib/productImageUtils'
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
      if (urlToken && user.id && urlToken !== user.id) {
        navigate(`/login?token=${encodeURIComponent(urlToken)}`, { replace: true })
      }
    }
  }, [authLoading, user, role, searchParams, navigate])

  const [portalData, setPortalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPurchaseForClaim, setSelectedPurchaseForClaim] = useState(null)
  const [diagnosticMode, setDiagnosticMode] = useState('assistant')
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

  const loadData = async (activeToken) => {
    if (!activeToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

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
      setError(err.message || 'Failed to retrieve your customer dashboard.')
    } finally {
      setLoading(false)
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
    if (token) loadData(token)
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
      <div className="min-h-screen bg-jds-background flex items-center justify-center p-4">
        <div className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl max-w-md w-full p-6 text-center space-y-5 shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-jds-primary/10 text-jds-primary flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-jds-on-surface">JD Force Solar Customer Portal</h1>
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
              className="w-full bg-jds-surface-container/50 border border-jds-outline-variant/50 rounded-xl px-4 py-2.5 text-xs text-jds-on-surface font-mono placeholder:font-sans placeholder:text-jds-on-surface-variant/40 focus:outline-none focus:border-jds-primary"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-jds-primary text-jds-on-primary font-semibold text-xs hover:bg-jds-primary/90 transition-all shadow-sm"
            >
              Open Dashboard
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
      <div className="min-h-screen bg-jds-background flex flex-col items-center justify-center p-4 space-y-3">
        <div className="w-10 h-10 border-2 border-jds-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-jds-on-surface-variant font-medium">Loading your solar dashboard & warranties...</p>
      </div>
    )
  }

  // 3. ERROR STATE
  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-jds-background flex items-center justify-center p-4">
        <div className="bg-jds-surface border border-rose-500/20 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-lg">
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
            className="px-4 py-2 rounded-xl bg-jds-surface-container border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container-high transition-colors"
          >
            Try Another Access Key
          </button>
        </div>
      </div>
    )
  }

  const { customer, purchases = [], claims = [] } = portalData
  const activeWarrantiesCount = purchases.filter(p => p.is_warranty_active).length
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
    <div className="min-h-screen bg-jds-background pb-16">
      
      {/* Top Banner & Customer Header */}
      <div className="bg-jds-surface border-b border-jds-outline-variant/30 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="text-[10px] sm:text-xs font-semibold text-jds-primary uppercase tracking-wider">
                Customer Dashboard
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-jds-on-surface mt-0.5">
                Welcome, {customer.name}!
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-[11px] sm:text-xs text-jds-on-surface-variant">
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {customer.phone}
                </span>
                {resolvedCustomerEmail && (
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {resolvedCustomerEmail}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => {
                  setPwdError(null)
                  setPwdSuccess(null)
                  setIsPasswordModalOpen(true)
                }}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-jds-primary/10 hover:bg-jds-primary/20 border border-jds-primary/30 text-[11px] sm:text-xs font-semibold text-jds-primary flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {authStatus.hasPassword ? 'Change Password' : 'Set Password'}
              </button>

              <button
                onClick={() => loadData(token)}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-jds-surface-container/60 border border-jds-outline-variant/40 hover:bg-jds-surface-container text-[11px] sm:text-xs font-medium text-jds-on-surface flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 sm:pt-2">
            <div className="p-2 sm:p-3 rounded-xl bg-jds-surface-container/30 border border-jds-outline-variant/20 text-center">
              <div className="text-sm sm:text-lg md:text-xl font-bold text-jds-on-surface">{purchases.length}</div>
              <div className="text-[9px] sm:text-xs text-jds-on-surface-variant font-medium">Units</div>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-sm sm:text-lg md:text-xl font-bold text-emerald-500">{activeWarrantiesCount}</div>
              <div className="text-[9px] sm:text-xs text-emerald-600 font-medium">Warranties</div>
            </div>
            <div className="p-2 sm:p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <div className="text-sm sm:text-lg md:text-xl font-bold text-blue-500">{claims.length}</div>
              <div className="text-[9px] sm:text-xs text-blue-600 font-medium">Claims</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-5 sm:space-y-8">

        {/* Email Confirmation Status Banner (Non-blocking) */}
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
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              {currentEmailStatus === 'queued' || resendingConfirmation ? (
                <RefreshCw className="w-4 h-4 text-jds-primary shrink-0 mt-0.5 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
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
                  className="px-3.5 py-2 rounded-xl bg-jds-surface border border-jds-outline-variant/50 hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
                  className="px-3.5 py-2 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-semibold hover:bg-jds-primary/90 transition-colors"
                >
                  Add Email Address
                </button>
              )}
            </div>
          </div>
        )}

        {/* SECTION 1: Registered Products & Warranties */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-jds-primary" />
              <h2 className="text-lg font-bold text-jds-on-surface">Purchased Products & Warranties</h2>
            </div>
            <span className="text-xs text-jds-on-surface-variant font-medium">
              {purchases.length} Item{purchases.length === 1 ? '' : 's'}
            </span>
          </div>

          {purchases.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-jds-surface border border-jds-outline-variant/30 text-xs text-jds-on-surface-variant">
              No registered product purchases found for this account.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchases.map((p) => {
                const isActive = p.is_warranty_active
                const linkedClaims = claims.filter(
                  (c) => c.customer_purchase_id === p.id || c.customer_purchases?.id === p.id
                )
                const hasClaimedReplacement = linkedClaims.some(
                  (c) => c.status === 'resolved' || c.status === 'approved'
                )

                return (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-sm flex flex-col justify-between hover:border-jds-outline-variant/80 transition-all space-y-4"
                  >
                    <div>
                      {/* Top Product Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-sm text-jds-on-surface leading-snug">
                            {p.product_name}
                          </h3>
                          <p className="text-xs text-jds-on-surface-variant">
                            {p.watt || p.product_type || 'Solar Product'}
                          </p>
                        </div>
                        {getMainProductImage(p.product_image) && (
                          <img
                            src={getMainProductImage(p.product_image)}
                            alt={p.product_name}
                            className="w-12 h-12 rounded-lg object-cover border border-jds-outline-variant/30 shrink-0"
                          />
                        )}
                      </div>

                      {/* Hardware & Purchase Details */}
                      <div className="mt-3 space-y-1 text-xs text-jds-on-surface-variant bg-jds-surface-container/20 p-3 rounded-xl border border-jds-outline-variant/20">
                        {p.serial_number && (
                          <div className="flex justify-between">
                            <span>Serial #:</span>
                            <strong className="font-mono text-jds-on-surface">{p.serial_number}</strong>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Purchase Date:</span>
                          <span className="text-jds-on-surface">{formatDate(p.purchase_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Store Branch:</span>
                          <span className="text-jds-on-surface">{p.branch_location || 'Cavite'}</span>
                        </div>
                      </div>

                      {/* Warranty Status Pill */}
                      <div className="mt-3">
                        {p.is_voided ? (
                          <div className="space-y-2">
                            <div className="p-2.5 rounded-xl text-xs flex items-center justify-between border bg-rose-500/10 text-rose-500 border-rose-500/20">
                              <div className="flex items-center gap-1.5 font-semibold">
                                <ShieldX className="w-4 h-4" />
                                <span>Warranty Voided</span>
                              </div>
                              <span className="text-[11px] font-medium">Disqualified</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-[11px] text-rose-600 leading-snug">
                              <strong>Void Reason:</strong> {p.void_reason || 'Disqualified under warranty policy.'}
                            </div>
                          </div>
                        ) : hasClaimedReplacement ? (
                          <div className="space-y-1.5">
                            <div className="p-2.5 rounded-xl text-xs flex items-center justify-between border bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <div className="flex items-center gap-1.5 font-semibold">
                                <ShieldCheck className="w-4 h-4 text-amber-600" />
                                <span>1-Time Replacement Fulfilled</span>
                              </div>
                              <span className="text-[11px] font-medium">Concluded</span>
                            </div>
                            <div className="px-1 text-[11px] text-jds-on-surface-variant leading-tight">
                              The 1-time replacement entitlement has been fulfilled. Shop repairs remain available at store branches.
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div
                              className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-semibold">
                                {isActive ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                                <span>{isActive ? 'Active (1 Replacement Available)' : 'Expired'}</span>
                              </div>
                              <span className="text-[11px] font-medium">
                                {formatRemainingText(p.days_remaining)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Troubleshooting & Claim Actions */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-jds-surface-container/60 via-jds-surface-container-low to-jds-surface border border-jds-primary/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-jds-on-surface">
                          <Wrench className="w-3.5 h-3.5 text-jds-primary" />
                          <span>Troubleshooting & Claims</span>
                        </div>
                      </div>

                      {p.is_voided || hasClaimedReplacement ? (
                        <div className="space-y-2.5">
                          <p className="text-[11px] text-jds-on-surface-variant leading-relaxed">
                            {p.is_voided
                              ? "This equipment's warranty is voided. You can still use our self-diagnostic troubleshooting guide or visit our Quiapo / Cavite branch for non-warranty shop servicing."
                              : "This unit has used its 1-time warranty replacement entitlement. You can run self-diagnostics or bring the unit to our branch for shop repairs."}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPurchaseForClaim(p)
                              setDiagnosticMode('assistant')
                            }}
                            className="w-full py-2 px-2.5 rounded-xl bg-jds-surface-container border border-jds-outline-variant/60 hover:bg-jds-surface-container-high text-xs font-semibold text-jds-on-surface transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-jds-primary" />
                            <span>Run Troubleshooting Guide</span>
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[11px] text-jds-on-surface-variant leading-relaxed">
                            Run a multi-criteria diagnostic audit across electrical, physical, and environmental checks, or directly file a warranty claim.
                          </p>

                          <div className="grid grid-cols-2 gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPurchaseForClaim(p)
                                setDiagnosticMode('assistant')
                              }}
                              className="py-2 px-2.5 rounded-xl bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Troubleshoot</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPurchaseForClaim(p)
                                setDiagnosticMode('claim')
                              }}
                              className="py-2 px-2.5 rounded-xl bg-jds-surface border border-jds-outline-variant/60 hover:bg-jds-surface-container hover:border-jds-primary/40 text-xs font-semibold text-jds-on-surface transition-all flex items-center justify-center gap-1.5 active:scale-95"
                            >
                              <Wrench className="w-3.5 h-3.5 text-jds-primary" />
                              <span>File Manual Claim</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Hardware & Coverage Summary Footer */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-jds-outline-variant/20 text-jds-on-surface-variant">
                      <span>Serial #: <strong className="font-mono text-jds-on-surface">{p.serial_number || 'N/A'}</strong></span>
                      <span>Warranty: <strong>{p.warranty_months ? `${p.warranty_months} Months (${Math.round(p.warranty_months / 12)} Yrs)` : '24 Months (2 Yrs)'}</strong></span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Warranty Policy & Case Evaluation Overview Banner */}
        <div className="p-4 md:p-5 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-jds-outline-variant/20 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-jds-on-surface">2-Year Solar Warranty & Case Evaluation Policy</h3>
                <p className="text-xs text-jds-on-surface-variant">Default 24-Month Coverage • 1-Time Replacement Entitlement</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={handleOpenWarrantyTerms}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-jds-primary/10 hover:bg-jds-primary/20 text-jds-primary border border-jds-primary/30 transition-colors flex items-center gap-1 cursor-pointer"
                title="Review Official Warranty Terms"
              >
                <FileText className="w-3 h-3" />
                <span>Terms & Policy</span>
              </button>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                24 Mos Solar Terms
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                1-Time Replacement
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-jds-on-surface-variant">
            <div className="p-3 rounded-xl bg-jds-surface-container/30 border border-jds-outline-variant/20 space-y-1">
              <strong className="text-emerald-700 dark:text-emerald-400 font-semibold block">Covered Under Warranty (Case-by-Case):</strong>
              <p>Manufacturing and factory defects, internal controller/sensor failure, abnormal battery loss, and solar cell degradation under standard operating conditions.</p>
            </div>
            <div className="p-3 rounded-xl bg-jds-surface-container/30 border border-jds-outline-variant/20 space-y-1">
              <strong className="text-rose-700 dark:text-rose-400 font-semibold block">Disqualified / Voided Terms:</strong>
              <p>Physical drops, shattered glass, blunt force casing trauma, customer carelessness, unauthorized disassembly, modified wiring, or water ingress from unsealed ports.</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: Active Claims & Status Tracker */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-jds-on-surface">Service & Diagnostic Claims</h2>
            </div>
            <span className="text-xs text-jds-on-surface-variant font-medium">
              {claims.length} Ticket{claims.length === 1 ? '' : 's'}
            </span>
          </div>

          {claims.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-jds-surface border border-jds-outline-variant/30 text-xs text-jds-on-surface-variant space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto" />
              <div className="font-semibold text-jds-on-surface">No Active Claims</div>
              <div>All your registered solar products are in good operational standing.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => {
                const statusMeta = getClaimStatusMeta(claim.status)
                return (
                  <div
                    key={claim.id}
                    className="p-5 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-jds-outline-variant/20">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-jds-primary">
                          TICKET #{claim.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-jds-on-surface-variant">
                        Filed: {formatDate(claim.created_at)}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-jds-on-surface">
                        Product: {claim.product_name}
                      </div>
                      <div className="text-jds-on-surface-variant">
                        Symptom: <strong className="text-jds-on-surface">{claim.issue_category}</strong>
                      </div>
                      <p className="text-jds-on-surface-variant bg-jds-surface-container/30 p-2.5 rounded-xl border border-jds-outline-variant/20 mt-1 whitespace-pre-line">
                        "{claim.description}"
                      </p>
                    </div>

                    {/* Staff Technician Note Callout */}
                    {claim.staff_notes && (
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                        <div className="font-semibold text-blue-600 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" /> Note from Store Technician:
                        </div>
                        <div className="text-jds-on-surface font-medium pl-5">
                          {claim.staff_notes}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Account Security & Password Status Card */}
        <div className="p-6 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center shrink-0 mt-0.5">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-jds-on-surface">Account Password & Security</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  authStatus.hasPassword
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {authStatus.hasPassword ? 'Password Enabled' : 'Token Only'}
                </span>
              </div>
              <p className="text-xs text-jds-on-surface-variant max-w-xl">
                {authStatus.hasPassword
                  ? `Linked login email: ${authStatus.email}. You can sign in via email & password on the main portal login page.`
                  : 'You are currently accessing this portal via token or QR scan. Set a password to sign in via email & password anytime.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setPwdError(null)
              setPwdSuccess(null)
              setIsPasswordModalOpen(true)
            }}
            className="px-4 py-2.5 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-semibold hover:bg-jds-primary/90 transition-all shrink-0 shadow-sm"
          >
            {authStatus.hasPassword ? 'Change Password' : 'Set Up Password'}
          </button>
        </div>

        {/* Danger Zone: Delete Customer Account Card (Bottom of Page) */}
        <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Delete Account</h3>
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
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-all shrink-0 shadow-sm cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>

      </div>

      {/* Password Management Modal */}
      {isPasswordModalOpen && (
        <div
          {...passwordBackdropProps}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative"
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
                className="w-7 h-7 rounded-lg hover:bg-jds-surface-container flex items-center justify-center text-jds-on-surface-variant"
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
                  className="px-4 py-2 rounded-xl bg-jds-surface-container/70 border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-bold hover:bg-jds-primary/90 transition-all disabled:opacity-60 shadow-sm"
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
          onClaimSubmitted={handleClaimSubmitted}
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
            className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative"
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
                className="px-4 py-2 rounded-xl bg-jds-surface-container/70 border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                disabled={isDeletingAccount}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-60 shadow-sm cursor-pointer"
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
