import React, { useState, useEffect } from 'react'
import {
  Users,
  Search,
  QrCode,
  Key,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Phone,
  User,
  Package,
  Calendar,
  Store,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Clock,
  Printer
} from 'lucide-react'
import { fetchAllCustomers } from '../../lib/customerService'
import { formatDate } from '../../lib/warrantyUtils'
import QRReceiptModal from './QRReceiptModal'

export default function CustomersScreen({ onNavigate, onSelectCustomerForSale }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('All')
  const [warrantyFilter, setWarrantyFilter] = useState('All')

  // Selected customer for full QR & Token modal
  const [activeCustomerForQr, setActiveCustomerForQr] = useState(null)
  
  // Track copied tokens and links by customer ID
  const [copiedTokens, setCopiedTokens] = useState({})
  const [copiedLinks, setCopiedLinks] = useState({})

  // Expanded rows to view purchase breakdown
  const [expandedRows, setExpandedRows] = useState({})
  
  // Visible full tokens state
  const [revealedTokens, setRevealedTokens] = useState({})

  const loadData = async () => {
    try {
      setLoading(true)
      const { customers: list, error } = await fetchAllCustomers()
      if (error) throw error
      setCustomers(list || [])
    } catch (err) {
      console.error('Failed to load customer list:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCopyToken = (customerId, token) => {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopiedTokens(prev => ({ ...prev, [customerId]: true }))
    setTimeout(() => {
      setCopiedTokens(prev => ({ ...prev, [customerId]: false }))
    }, 2000)
  }

  const handleCopyLink = (customerId, qrUrl) => {
    if (!qrUrl) return
    navigator.clipboard.writeText(qrUrl)
    setCopiedLinks(prev => ({ ...prev, [customerId]: true }))
    setTimeout(() => {
      setCopiedLinks(prev => ({ ...prev, [customerId]: false }))
    }, 2000)
  }

  const toggleRow = (customerId) => {
    setExpandedRows(prev => ({ ...prev, [customerId]: !prev[customerId] }))
  }

  const toggleRevealToken = (customerId) => {
    setRevealedTokens(prev => ({ ...prev, [customerId]: !prev[customerId] }))
  }

  // Filtered customer list
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !query ||
      c.full_name.toLowerCase().includes(query) ||
      c.phone_number.toLowerCase().includes(query) ||
      (c.access_token && c.access_token.toLowerCase().includes(query))

    let matchesBranch = true
    if (branchFilter !== 'All') {
      matchesBranch = c.purchases.some(p => p.branch_location === branchFilter)
    }

    let matchesWarranty = true
    if (warrantyFilter === 'Active') {
      matchesWarranty = c.active_warranties_count > 0
    } else if (warrantyFilter === 'Expired') {
      matchesWarranty = c.active_warranties_count === 0 && c.total_purchases > 0
    } else if (warrantyFilter === 'No Purchases') {
      matchesWarranty = c.total_purchases === 0
    }

    return matchesSearch && matchesBranch && matchesWarranty
  })

  // KPI Calculations
  const totalCustomersCount = customers.length
  const totalPurchasesCount = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0)
  const totalActiveWarranties = customers.reduce((sum, c) => sum + (c.active_warranties_count || 0), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-jds-outline-variant/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-jds-primary/10 text-jds-primary">
              Customer Registry
            </span>
            <h1 className="text-2xl font-bold text-jds-on-surface">Customers, QR & Access Tokens</h1>
          </div>
          <p className="text-sm text-jds-on-surface-variant mt-1">
            Directory of registered equipment owners, warranty tokens, and customer self-service QR credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface hover:bg-jds-surface-container transition-all"
            title="Reload customer list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate('register-sale')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Sale</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-jds-on-surface-variant">Registered Customers</div>
            <div className="text-2xl font-bold text-jds-on-surface mt-1">{totalCustomersCount}</div>
            <div className="text-[11px] text-jds-on-surface-variant/70 mt-0.5">Verified equipment profiles</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-jds-on-surface-variant">Active Warranties</div>
            <div className="text-2xl font-bold text-emerald-500 mt-1">{totalActiveWarranties}</div>
            <div className="text-[11px] text-jds-on-surface-variant/70 mt-0.5">Units currently protected</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-jds-on-surface-variant">Total Installed Units</div>
            <div className="text-2xl font-bold text-jds-on-surface mt-1">{totalPurchasesCount}</div>
            <div className="text-[11px] text-jds-on-surface-variant/70 mt-0.5">Logged sales and receipts</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-jds-surface rounded-2xl border border-jds-outline-variant/40 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-jds-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, phone, or token UUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-jds-surface-container/40 border border-jds-outline-variant/50 rounded-xl pl-9 pr-4 py-2 text-xs text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:outline-none focus:border-jds-primary transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 text-xs text-jds-on-surface-variant bg-jds-surface-container/30 border border-jds-outline-variant/40 rounded-xl px-3 py-1.5">
            <Store className="w-3.5 h-3.5 text-jds-primary shrink-0" />
            <span>Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent font-semibold text-jds-on-surface focus:outline-none cursor-pointer"
            >
              <option value="All">All Branches</option>
              <option value="Cavite">Cavite</option>
              <option value="Quiapo">Quiapo</option>
            </select>
          </div>

          {/* Warranty Filter */}
          <div className="flex items-center gap-1.5 text-xs text-jds-on-surface-variant bg-jds-surface-container/30 border border-jds-outline-variant/40 rounded-xl px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Warranty:</span>
            <select
              value={warrantyFilter}
              onChange={(e) => setWarrantyFilter(e.target.value)}
              className="bg-transparent font-semibold text-jds-on-surface focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Warranties</option>
              <option value="Expired">Expired</option>
              <option value="No Purchases">No Purchases</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Directory List */}
      <div className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full border-2 border-jds-primary border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-semibold text-jds-on-surface">Loading customer directory...</p>
            <p className="text-xs text-jds-on-surface-variant">Retrieving warranty tokens and records</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-jds-surface-container flex items-center justify-center text-jds-on-surface-variant mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-jds-on-surface">No customers found</h3>
            <p className="text-xs text-jds-on-surface-variant max-w-sm mt-1 mb-4">
              {searchQuery || branchFilter !== 'All' || warrantyFilter !== 'All'
                ? 'Try adjusting your search criteria or resetting your active filters.'
                : 'No customer profiles have been registered in the system yet.'}
            </p>
            {(searchQuery || branchFilter !== 'All' || warrantyFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setBranchFilter('All')
                  setWarrantyFilter('All')
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-jds-surface-container text-jds-on-surface hover:bg-jds-surface-container-high transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-jds-outline-variant/20">
            {filteredCustomers.map((customer) => {
              const isExpanded = !!expandedRows[customer.id]
              const isTokenRevealed = !!revealedTokens[customer.id]
              const isTokenCopied = !!copiedTokens[customer.id]
              const isLinkCopied = !!copiedLinks[customer.id]
              const displayToken = isTokenRevealed
                ? customer.access_token
                : `${(customer.access_token || '').slice(0, 8)}••••••••${(customer.access_token || '').slice(-4)}`

              return (
                <div key={customer.id} className="transition-colors hover:bg-jds-surface-container/20">
                  {/* Main Row */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Customer Profile */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-jds-on-surface truncate">
                            {customer.full_name}
                          </h3>
                          {customer.active_warranties_count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3" />
                              {customer.active_warranties_count} Active
                            </span>
                          ) : customer.total_purchases > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                              <ShieldAlert className="w-3 h-3" />
                              Warranties Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500">
                              No Purchases
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-jds-on-surface-variant flex-wrap font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-jds-on-surface-variant/70" />
                            {customer.phone_number}
                          </span>
                          <span className="text-jds-outline-variant/60">•</span>
                          <span className="flex items-center gap-1 font-inter text-[11px]">
                            <Calendar className="w-3 h-3 text-jds-on-surface-variant/70" />
                            Registered {formatDate(customer.created_at)}
                          </span>
                          <span className="text-jds-outline-variant/60">•</span>
                          <span className="flex items-center gap-1 font-inter text-[11px]">
                            <Package className="w-3 h-3 text-jds-on-surface-variant/70" />
                            {customer.total_purchases} Unit{customer.total_purchases === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Token Display */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-jds-surface-container/40 border border-jds-outline-variant/40 rounded-xl px-3 py-2 max-w-xl">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Key className="w-3.5 h-3.5 text-jds-primary" />
                        <span className="text-[11px] font-bold text-jds-on-surface">Token:</span>
                      </div>

                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="font-mono text-xs text-jds-on-surface truncate select-all"
                          title={customer.access_token}
                        >
                          {displayToken}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleRevealToken(customer.id)}
                          className="p-1 text-jds-on-surface-variant hover:text-jds-on-surface transition-colors shrink-0"
                          title={isTokenRevealed ? 'Hide full token' : 'Show full token'}
                        >
                          {isTokenRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyToken(customer.id, customer.access_token)}
                          className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-jds-surface hover:bg-jds-surface-container border border-jds-outline-variant/40 text-jds-on-surface flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                          title="Copy raw access token"
                        >
                          {isTokenCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{isTokenCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Actions & QR Modal trigger */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      {/* View QR Code Button */}
                      <button
                        type="button"
                        onClick={() => setActiveCustomerForQr(customer)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 transition-all shadow-xs"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>View QR & Token</span>
                      </button>

                      {/* Copy Portal Link Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(customer.id, customer.qr_url)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container text-jds-on-surface transition-colors"
                        title="Copy customer self-service URL"
                      >
                        {isLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5" />}
                        <span>{isLinkCopied ? 'Link Copied' : 'Copy Link'}</span>
                      </button>

                      {/* Expand / Collapse Details Button */}
                      {customer.total_purchases > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleRow(customer.id)}
                          className="p-1.5 text-jds-on-surface-variant hover:text-jds-on-surface rounded-lg hover:bg-jds-surface-container transition-colors"
                          title={isExpanded ? 'Collapse equipment list' : 'View purchased equipment'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Purchase Breakdown */}
                  {isExpanded && customer.purchases && customer.purchases.length > 0 && (
                    <div className="px-5 pb-4 pt-1 bg-jds-surface-container/20 border-t border-jds-outline-variant/20 animate-in fade-in">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant mb-2 flex items-center justify-between">
                        <span>Registered Units & Warranty Status ({customer.purchases.length})</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCustomerForSale) {
                              onSelectCustomerForSale(customer)
                            } else if (onNavigate) {
                              onNavigate('register-sale')
                            }
                          }}
                          className="text-[11px] text-jds-primary font-semibold hover:underline"
                        >
                          + Register New Unit for {customer.full_name.split(' ')[0]}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {customer.purchases.map((purchase, pIdx) => (
                          <div
                            key={purchase.id || pIdx}
                            className="p-3 rounded-xl bg-jds-surface border border-jds-outline-variant/40 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="font-semibold text-jds-on-surface truncate">
                                {purchase.product_name}
                              </div>
                              <div className="text-[11px] text-jds-on-surface-variant flex items-center gap-2 flex-wrap">
                                {purchase.serial_number && (
                                  <span>S/N: <strong className="font-mono text-jds-on-surface">{purchase.serial_number}</strong></span>
                                )}
                                <span>Branch: {purchase.branch_location || 'Cavite'}</span>
                                <span>Purchased: {purchase.purchase_date}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className={`font-semibold ${purchase.is_warranty_active ? 'text-emerald-500' : 'text-neutral-400'}`}>
                                {purchase.is_warranty_active ? `${purchase.days_remaining}d left` : 'Expired'}
                              </div>
                              <div className="text-[10px] text-jds-on-surface-variant">
                                Exp: {formatDate(purchase.warranty_expires_at)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* QR & Token Receipt Modal */}
      {activeCustomerForQr && (
        <QRReceiptModal
          isOpen={!!activeCustomerForQr}
          onClose={() => setActiveCustomerForQr(null)}
          customer={activeCustomerForQr}
          purchases={activeCustomerForQr.purchases || []}
          qrUrl={activeCustomerForQr.qr_url}
        />
      )}
    </div>
  )
}
