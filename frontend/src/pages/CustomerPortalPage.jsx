import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  Package,
  Calendar,
  Phone,
  User,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Bookmark,
  Store,
  ChevronRight,
  Info,
  Cpu,
  Sparkles,
  Activity
} from 'lucide-react'
import { fetchCustomerPortalData } from '../lib/customerService'
import { formatDate, formatRemainingText, getClaimStatusMeta } from '../lib/warrantyUtils'
import FaultDiagnosticModal from '../components/FaultDiagnosticModal'

export default function CustomerPortalPage() {
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState(() => {
    const urlToken = searchParams.get('token')
    if (urlToken) {
      try {
        localStorage.setItem('jd_customer_token', urlToken)
      } catch (e) {
        console.warn('Could not save token to localStorage', e)
      }
      return urlToken
    }
    return localStorage.getItem('jd_customer_token') || ''
  })

  const [portalData, setPortalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPurchaseForClaim, setSelectedPurchaseForClaim] = useState(null)
  const [diagnosticMode, setDiagnosticMode] = useState('assistant')
  const [manualTokenInput, setManualTokenInput] = useState('')

  const loadData = async (activeToken) => {
    if (!activeToken) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchErr } = await fetchCustomerPortalData(activeToken)
      if (fetchErr) throw fetchErr
      if (!data) throw new Error('Customer account not found.')
      setPortalData(data)
    } catch (err) {
      console.error('Portal load failed:', err)
      setError(err.message || 'Failed to retrieve your customer dashboard.')
    } finally {
      setLoading(false)
    }
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
    localStorage.setItem('jd_customer_token', clean)
    setToken(clean)
  }

  const handleClaimSubmitted = () => {
    if (token) loadData(token)
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

          <div className="text-[11px] text-jds-on-surface-variant pt-2 border-t border-jds-outline-variant/30">
            Need help? Contact our Cavite or Quiapo branch staff for assistance.
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

  return (
    <div className="min-h-screen bg-jds-background pb-16">
      
      {/* Top Banner & Customer Header */}
      <div className="bg-jds-surface border-b border-jds-outline-variant/30 px-4 py-6 md:px-8">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* Quick Bookmark Reminder Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jds-primary/10 text-jds-primary text-[11px] font-semibold border border-jds-primary/20">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmark this link on your mobile browser for anytime access</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-jds-primary uppercase tracking-wider">
                Customer Dashboard
              </div>
              <h1 className="text-2xl font-bold text-jds-on-surface mt-0.5">
                Welcome, {customer.name}!
              </h1>
              <p className="text-xs text-jds-on-surface-variant flex items-center gap-2 mt-1">
                <Phone className="w-3.5 h-3.5" /> {customer.phone}
              </p>
            </div>

            <button
              onClick={() => loadData(token)}
              className="self-start md:self-auto px-3.5 py-1.5 rounded-xl bg-jds-surface-container/60 border border-jds-outline-variant/40 hover:bg-jds-surface-container text-xs font-medium text-jds-on-surface flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh Status
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-jds-surface-container/30 border border-jds-outline-variant/20 text-center">
              <div className="text-base md:text-xl font-bold text-jds-on-surface">{purchases.length}</div>
              <div className="text-[10px] md:text-xs text-jds-on-surface-variant">Registered Units</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-base md:text-xl font-bold text-emerald-500">{activeWarrantiesCount}</div>
              <div className="text-[10px] md:text-xs text-emerald-600">Active Warranties</div>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <div className="text-base md:text-xl font-bold text-blue-500">{claims.length}</div>
              <div className="text-[10px] md:text-xs text-blue-600">Service Claims</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
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
                        {p.product_image && (
                          <img
                            src={p.product_image}
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
                        <div
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold">
                            {isActive ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                            <span>{isActive ? 'Active Warranty' : 'Expired'}</span>
                          </div>
                          <span className="text-[11px] font-medium">
                            {formatRemainingText(p.days_remaining)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Diagnostic System Bar */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-jds-surface-container/60 via-jds-surface-container-low to-jds-surface border border-jds-primary/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-jds-on-surface">
                          <Cpu className="w-3.5 h-3.5 text-jds-primary" />
                          <span>Auto-Diagnostic System</span>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Decision-Tree Ready
                        </span>
                      </div>

                      <p className="text-[11px] text-jds-on-surface-variant leading-relaxed">
                        Automated triage for PV panel soiling, LiFePO4 battery BMS cutoff, sensor errors & hardware defects.
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
                          <span>Run Triage</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPurchaseForClaim(p)
                            setDiagnosticMode('scan')
                          }}
                          className="py-2 px-2.5 rounded-xl bg-jds-surface border border-jds-outline-variant/60 hover:bg-jds-surface-container hover:border-jds-primary/40 text-xs font-semibold text-jds-on-surface transition-all flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Activity className="w-3.5 h-3.5 text-jds-primary" />
                          <span>Quick Scan</span>
                        </button>
                      </div>
                    </div>

                    {/* Direct Claim Link */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-jds-outline-variant/20">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPurchaseForClaim(p)
                          setDiagnosticMode('claim')
                        }}
                        className="hover:underline text-jds-on-surface-variant hover:text-jds-primary font-medium flex items-center gap-1 transition-colors"
                      >
                        <Wrench className="w-3 h-3 text-jds-primary" />
                        <span>File Manual Claim</span>
                      </button>
                      <span className="text-[10px] text-jds-on-surface-variant/70">
                        Coverage: {p.warranty_months || 12} Mos
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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

        {/* Branch Support & Assistance Footer Card */}
        <div className="p-6 rounded-2xl bg-jds-surface-container/40 border border-jds-outline-variant/30 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-jds-on-surface">
            <Store className="w-4 h-4 text-jds-primary" />
            <span>JD Force Solar Store Support</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-jds-on-surface-variant">
            <div className="space-y-1">
              <strong className="text-jds-on-surface">Cavite Branch:</strong>
              <div>General Trias, Cavite • Open Mon-Sat 8:00 AM - 5:00 PM</div>
              <div>Hotline / Viber: 0917-XXX-XXXX</div>
            </div>
            <div className="space-y-1">
              <strong className="text-jds-on-surface">Quiapo Manila Branch:</strong>
              <div>Evangelista St., Quiapo, Manila • Open Mon-Sat 8:30 AM - 5:30 PM</div>
              <div>Hotline / Viber: 0918-XXX-XXXX</div>
            </div>
          </div>
        </div>

      </div>

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
    </div>
  )
}
