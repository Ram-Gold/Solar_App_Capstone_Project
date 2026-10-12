import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'
import {
  Ticket,
  Calendar,
  Clock,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  Clock3,
  UserCheck,
  AlertCircle,
  ExternalLink,
  Phone,
  Mail,
  Edit3,
  Trash2,
  X,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react'
import { FaFacebook, FaInstagram } from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'

const STATUSES = ['Pending', 'Confirmed', 'Visited', 'Completed', 'Cancelled']

export const isPickupTicket = (q) => {
  if (q.ticket_code?.startsWith('JDS-RES-')) return true
  if (q.ticket_code?.startsWith('JDS-INQ-')) return false
  const purpose = (q.purpose_of_visitation || '').toLowerCase()
  return (
    purpose.includes('purchase') ||
    purpose.includes('pickup') ||
    purpose.includes('cash & carry') ||
    purpose.includes('reservation')
  )
}

export const getHoldCountdown = (createdAt) => {
  if (!createdAt) return null
  const createdTime = new Date(createdAt).getTime()
  if (isNaN(createdTime)) return null
  const now = Date.now()
  const diffHours = (now - createdTime) / (1000 * 60 * 60)
  if (diffHours < 48) {
    const left = Math.max(1, Math.round(48 - diffHours))
    return { text: `${left}h hold left`, active: true }
  }
  return { text: 'Hold Expired', active: false }
}

export default function QuotesScreen({ filterType = 'all' }) {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [intentTab, setIntentTab] = useState(filterType === 'all' ? 'ALL' : filterType.toUpperCase())
  const [selectedQuote, setSelectedQuote] = useState(null)
  const [editingNotes, setEditingNotes] = useState('')
  const [editingStatus, setEditingStatus] = useState('Pending')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { role } = useAuth()

  useEffect(() => {
    fetchQuotes()
  }, [])

  useEffect(() => {
    if (filterType !== 'all') {
      setIntentTab(filterType.toUpperCase())
    }
  }, [filterType])

  const fetchQuotes = async () => {
    setLoading(true)
    let fetched = []

    try {
      const { data, error } = await supabase
        .from('quote_tickets')
        .select('*')
        .order('id', { ascending: false })

      if (!error && data) {
        fetched = data
      }
    } catch (err) {
      console.warn('Error fetching quotes from Supabase:', err)
    }

    // Also merge any local fallback tickets from localStorage
    try {
      const local = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
      const existingCodes = new Set(fetched.map((q) => q.ticket_code))
      const extraLocal = local.filter((q) => !existingCodes.has(q.ticket_code))
      fetched = [...extraLocal, ...fetched]
    } catch (e) {
      console.error('LocalStorage read error:', e)
    }

    setQuotes(fetched)
    setLoading(false)
  }

  const handleOpenDetail = (quote) => {
    setSelectedQuote(quote)
    setEditingStatus(quote.status || 'Pending')
    setEditingNotes(quote.staff_notes || '')
    setSaveSuccess(false)
  }

  const handleSaveDetail = async () => {
    if (!selectedQuote) return
    setSaving(true)

    const updatedData = {
      status: editingStatus,
      staff_notes: editingNotes,
      updated_at: new Date().toISOString(),
    }

    try {
      // Update in Supabase
      if (selectedQuote.id) {
        await supabase
          .from('quote_tickets')
          .update(updatedData)
          .eq('id', selectedQuote.id)
      } else {
        await supabase
          .from('quote_tickets')
          .update(updatedData)
          .eq('ticket_code', selectedQuote.ticket_code)
      }

      // Update in local state
      const updatedList = quotes.map((q) =>
        q.ticket_code === selectedQuote.ticket_code ? { ...q, ...updatedData } : q
      )
      setQuotes(updatedList)
      setSelectedQuote((prev) => ({ ...prev, ...updatedData }))

      // Update localStorage backup
      try {
        const local = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
        const updatedLocal = local.map((q) =>
          q.ticket_code === selectedQuote.ticket_code ? { ...q, ...updatedData } : q
        )
        localStorage.setItem('jds_local_quotes', JSON.stringify(updatedLocal))
      } catch (err) {
        console.error(err)
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Failed to update quote:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (quote) => {
    if (!confirm(`Are you sure you want to delete ticket ${quote.ticket_code}?`)) return

    try {
      if (quote.id) {
        await supabase.from('quote_tickets').delete().eq('id', quote.id)
      } else {
        await supabase.from('quote_tickets').delete().eq('ticket_code', quote.ticket_code)
      }

      setQuotes(quotes.filter((q) => q.ticket_code !== quote.ticket_code))
      if (selectedQuote?.ticket_code === quote.ticket_code) {
        setSelectedQuote(null)
      }

      // Remove from localStorage
      const local = JSON.parse(localStorage.getItem('jds_local_quotes') || '[]')
      localStorage.setItem(
        'jds_local_quotes',
        JSON.stringify(local.filter((q) => q.ticket_code !== quote.ticket_code))
      )
    } catch (err) {
      console.error('Error deleting quote:', err)
    }
  }

  // Filter calculations
  const filteredQuotes = quotes.filter((q) => {
    // Intent / Type filter
    const isPickup = isPickupTicket(q)
    if (intentTab === 'PICKUP' && !isPickup) return false
    if (intentTab === 'INQUIRY' && isPickup) return false

    // Search query match
    const qStr = `${q.ticket_code || ''} ${q.customer_name || ''} ${q.mobile_contact || ''} ${q.city || ''} ${q.product_name || ''} ${q.facebook || ''} ${q.purpose_of_visitation || ''}`.toLowerCase()
    const matchesSearch = qStr.includes(searchQuery.toLowerCase())

    // Branch filter
    let matchesBranch = true
    if (branchFilter === 'Quiapo') {
      matchesBranch = q.will_visit && q.store_branch?.toLowerCase().includes('quiapo')
    } else if (branchFilter === 'Cavite') {
      matchesBranch = q.will_visit && q.store_branch?.toLowerCase().includes('cavite')
    } else if (branchFilter === 'Remote') {
      matchesBranch = !q.will_visit
    }

    // Status filter
    let matchesStatus = true
    if (statusFilter !== 'ALL') {
      matchesStatus = q.status?.toLowerCase() === statusFilter.toLowerCase()
    }

    return matchesSearch && matchesBranch && matchesStatus
  })

  // Summary Metrics based on active view
  const isPickupView = intentTab === 'PICKUP'
  const isInquiryView = intentTab === 'INQUIRY'

  const relevantQuotes = quotes.filter((q) => {
    if (isPickupView) return isPickupTicket(q)
    if (isInquiryView) return !isPickupTicket(q)
    return true
  })

  const totalRelevant = relevantQuotes.length
  const scheduledVisits = relevantQuotes.filter((q) => q.will_visit).length
  const pendingCount = relevantQuotes.filter((q) => q.status === 'Pending').length
  const attendedVisits = relevantQuotes.filter((q) => q.status === 'Visited' || q.status === 'Completed').length

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Visited':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'Cancelled':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'Pending':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200'
    }
  }

  return (
    <div className="max-w-[1300px] mx-auto space-y-8 animate-in fade-in duration-500 font-inter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-md font-bold text-jds-on-surface flex items-center gap-2">
            {isPickupView && (
              <>
                <ShoppingBag className="h-6 w-6 text-emerald-600" />
                <span>Store Pickup Reservations</span>
              </>
            )}
            {isInquiryView && (
              <>
                <Ticket className="h-6 w-6 text-blue-600" />
                <span>Product Inquiries & Consultations</span>
              </>
            )}
            {!isPickupView && !isInquiryView && (
              <>
                <Building2 className="h-6 w-6 text-jds-primary" />
                <span>Customer Quotes & Store Visit Tickets</span>
              </>
            )}
            <span className="text-sm px-2.5 py-0.5 rounded-full bg-jds-primary/10 text-jds-primary font-bold">
              {filteredQuotes.length} Total
            </span>
          </h1>
          <p className="text-body-md text-jds-on-surface-variant">
            {isPickupView && 'Track customer stock reservations, 48-hour hold windows, and in-store cash pickups at Quiapo and Cavite.'}
            {isInquiryView && 'Manage customer product inquiries, lighting demonstration appointments, and technical consultation requests.'}
            {!isPickupView && !isInquiryView && 'Manage product quotation inquiries, in-store customer visit appointments, and social verifications.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchQuotes}
            variant="outline"
            className="border-jds-outline-variant bg-jds-surface-container-lowest text-jds-on-surface hover:bg-jds-surface-container gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* High-level Sub-tab Filter if in All View */}
      {filterType === 'all' && (
        <div className="flex items-center gap-2 border-b border-jds-outline-variant/40 pb-2">
          <button
            onClick={() => setIntentTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              intentTab === 'ALL'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-jds-on-surface-variant hover:bg-jds-surface-container'
            }`}
          >
            All Tickets ({quotes.length})
          </button>
          <button
            onClick={() => setIntentTab('PICKUP')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              intentTab === 'PICKUP'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Store Pickups ({quotes.filter(isPickupTicket).length})</span>
          </button>
          <button
            onClick={() => setIntentTab('INQUIRY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              intentTab === 'INQUIRY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            <span>Product Inquiries ({quotes.filter((q) => !isPickupTicket(q)).length})</span>
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
              {isPickupView ? 'Total Reservations' : 'Total Entries'}
            </span>
            <div className={`p-2 rounded-lg ${isPickupView ? 'bg-emerald-100 text-emerald-700' : 'bg-jds-primary-container/20 text-jds-primary'}`}>
              {isPickupView ? <ShoppingBag className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
            </div>
          </div>
          <p className="text-headline-md font-bold text-jds-on-surface">{totalRelevant}</p>
        </div>

        <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
              Scheduled Visits
            </span>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-blue-900">{scheduledVisits}</p>
        </div>

        <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
              {isPickupView ? 'Pending Counter Holds' : 'Pending Review'}
            </span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-amber-900">{pendingCount}</p>
        </div>

        <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
              {isPickupView ? 'Picked Up / Closed' : 'Visited / Resolved'}
            </span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-headline-md font-bold text-emerald-900">{attendedVisits}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-jds-on-surface-variant/60" />
          <input
            type="text"
            placeholder="Search ticket code, customer, phone, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-jds-outline-variant bg-jds-surface pl-10 pr-4 py-2 text-sm text-jds-on-surface outline-none focus:border-jds-primary"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-jds-on-surface-variant shrink-0">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-lg border border-jds-outline-variant bg-jds-surface px-3 py-1.5 text-xs text-jds-on-surface outline-none focus:border-jds-primary"
          >
            <option value="ALL">All Branches</option>
            <option value="Quiapo">Quiapo Showroom</option>
            <option value="Cavite">Cavite Distribution Hub</option>
            <option value="Remote">Remote Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-jds-outline-variant bg-jds-surface px-3 py-1.5 text-xs text-jds-on-surface outline-none focus:border-jds-primary"
          >
            <option value="ALL">All Statuses</option>
            {STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-jds-primary mx-auto mb-3" />
            <p className="text-sm text-jds-on-surface-variant font-medium">Loading entries...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-jds-surface-container flex items-center justify-center mx-auto text-jds-on-surface-variant/40">
              <Ticket className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-jds-on-surface text-body-lg">No entries found</h3>
            <p className="text-sm text-jds-on-surface-variant">
              {searchQuery || branchFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search queries or filter selections.'
                : 'When customers reserve or inquire on product pages, their tickets will appear here in real-time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-jds-surface-container-low/20">
                <TableRow>
                  <TableHead className="font-bold text-jds-on-surface">Ticket & Type</TableHead>
                  <TableHead className="font-bold text-jds-on-surface">Customer</TableHead>
                  <TableHead className="font-bold text-jds-on-surface">Product & Qty</TableHead>
                  <TableHead className="font-bold text-jds-on-surface">Showroom Schedule</TableHead>
                  <TableHead className="font-bold text-jds-on-surface">Social & Verification</TableHead>
                  <TableHead className="font-bold text-jds-on-surface">Status</TableHead>
                  <TableHead className="font-bold text-jds-on-surface text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((q) => {
                  const isPickup = isPickupTicket(q)
                  const holdInfo = isPickup ? getHoldCountdown(q.created_at) : null

                  return (
                    <TableRow key={q.ticket_code} className="hover:bg-jds-surface-container-low/10 transition-colors">
                      {/* Ticket Code & Type */}
                      <TableCell>
                        <div className="font-mono font-bold text-jds-primary text-xs">
                          {q.ticket_code}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {isPickup ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <ShoppingBag className="h-2.5 w-2.5" />
                              <span>Store Pickup</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              <Ticket className="h-2.5 w-2.5" />
                              <span>Inquiry</span>
                            </span>
                          )}
                          {holdInfo && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              holdInfo.active 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-red-100 text-red-800 font-bold'
                            }`}>
                              {holdInfo.text}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        <div className="font-bold text-jds-on-surface text-sm">{q.customer_name}</div>
                        <div className="text-xs text-jds-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span>{q.mobile_contact}</span>
                          <span>•</span>
                          <span>{q.city}</span>
                        </div>
                      </TableCell>

                      {/* Product & Qty */}
                      <TableCell>
                        <div className="font-medium text-jds-on-surface text-xs max-w-[200px] truncate" title={q.product_name}>
                          {q.product_name}
                        </div>
                        <div className="text-[11px] text-jds-primary font-bold mt-0.5">
                          Qty: {q.quantity || 1} {q.product_watt ? `(${q.product_watt}W)` : ''}
                        </div>
                      </TableCell>

                      {/* Visit / Schedule */}
                      <TableCell>
                        {q.will_visit ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-jds-secondary bg-jds-secondary-container/20 px-2 py-0.5 rounded">
                              <Building2 className="h-3 w-3" />
                              {q.store_branch?.includes('Quiapo') ? 'Quiapo Showroom' : 'Cavite Hub'}
                            </span>
                            <div className="text-xs text-jds-on-surface font-semibold flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-jds-on-surface-variant" />
                              {q.visit_date} ({q.visit_time_slot?.split(' ')[0]})
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                              Remote Request
                            </span>
                            <div className="text-xs text-jds-on-surface-variant font-medium">
                              Via {q.preferred_channel || 'Facebook'}
                            </div>
                          </div>
                        )}
                      </TableCell>

                      {/* Social & Verification */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Call */}
                          {q.mobile_contact && (
                            <a
                              href={`tel:${q.mobile_contact}`}
                              className="p-1.5 rounded-lg border border-jds-outline-variant/60 hover:bg-emerald-50 text-emerald-700 transition-colors"
                              title={`Call ${q.mobile_contact}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {/* Facebook Link */}
                          {q.facebook && (
                            <a
                              href={
                                q.facebook.startsWith('http')
                                  ? q.facebook
                                  : `https://facebook.com/search/top?q=${encodeURIComponent(q.facebook)}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                              title={`Open Facebook Profile (${q.facebook})`}
                            >
                              <FaFacebook className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {/* Instagram Link */}
                          {q.instagram && (
                            <a
                              href={
                                q.instagram.startsWith('http')
                                  ? q.instagram
                                  : `https://instagram.com/${q.instagram.replace('@', '')}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors"
                              title={`Open Instagram (${q.instagram})`}
                            >
                              <FaInstagram className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(
                            q.status
                          )}`}
                        >
                          {q.status || 'Pending'}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(q)}
                            className="h-8 px-2.5 text-xs gap-1 text-jds-primary hover:bg-jds-primary/10 font-bold"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Manage
                          </Button>
                          {role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(q)}
                              className="h-8 w-8 text-jds-error hover:bg-jds-error-container/20"
                              title="Delete Ticket"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ================= TICKET DETAIL & MANAGEMENT MODAL ================= */}
      {selectedQuote && (() => {
        const isSelectedPickup = isPickupTicket(selectedQuote)
        const holdCountdown = isSelectedPickup ? getHoldCountdown(selectedQuote.created_at) : null

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-jds-surface rounded-2xl shadow-2xl border border-jds-outline-variant overflow-hidden max-h-[90vh] flex flex-col font-inter">
              {/* Header */}
              <div className="bg-jds-surface-container-high px-6 py-4 border-b border-jds-outline-variant/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold ${
                    isSelectedPickup ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {isSelectedPickup ? <ShoppingBag className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-body-lg font-bold text-jds-on-surface flex items-center gap-2">
                      <span>{isSelectedPickup ? 'Store Pickup Reservation' : 'Product Consultation Ticket'}</span>
                      <span className="font-mono text-sm text-jds-primary font-bold">{selectedQuote.ticket_code}</span>
                    </h3>
                    <p className="text-xs text-jds-on-surface-variant flex items-center gap-2">
                      <span>Submitted {new Date(selectedQuote.created_at || Date.now()).toLocaleDateString()}</span>
                      {holdCountdown && (
                        <span className={`px-2 py-0.2 rounded font-bold ${holdCountdown.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {holdCountdown.text}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="p-2 rounded-full hover:bg-jds-surface-container transition-colors text-jds-on-surface-variant"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* 48h Stock Hold Alert Banner for Reservations */}
                {isSelectedPickup && (
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-950 flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Showroom Floor Reservation:</span> Customer has reserved this item for physical counter pickup at <strong>{selectedQuote.store_branch}</strong>. Confirm boxed unit is ready in the back room before counter payment.
                    </div>
                  </div>
                )}

                {/* Status Update Card */}
                <div className="rounded-xl border border-jds-outline-variant/50 bg-jds-surface-container-lowest p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-jds-on-surface-variant">
                      Update Ticket Status
                    </label>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(editingStatus)}`}>
                      Current: {editingStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditingStatus(st)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          editingStatus === st
                            ? 'border-jds-primary bg-jds-primary text-jds-on-primary shadow-sm'
                            : 'border-jds-outline-variant/60 bg-jds-surface hover:border-jds-primary'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Profile & Verification */}
                <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-5 space-y-4">
                  <h4 className="text-sm font-bold text-jds-on-surface flex items-center gap-2 border-b border-jds-outline-variant/30 pb-2">
                    <Sparkles className="h-4 w-4 text-jds-primary" />
                    <span>Customer Information & Verification</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-jds-on-surface-variant/70 font-semibold block">Full Name</span>
                      <p className="font-bold text-sm text-jds-on-surface mt-0.5">{selectedQuote.customer_name}</p>
                    </div>
                    <div>
                      <span className="text-jds-on-surface-variant/70 font-semibold block">Mobile Contact</span>
                      <a
                        href={`tel:${selectedQuote.mobile_contact}`}
                        className="font-bold text-sm text-emerald-700 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {selectedQuote.mobile_contact}
                      </a>
                    </div>
                    <div>
                      <span className="text-jds-on-surface-variant/70 font-semibold block">Email</span>
                      <p className="font-medium text-jds-on-surface mt-0.5">{selectedQuote.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-jds-on-surface-variant/70 font-semibold block">City / Municipality</span>
                      <p className="font-medium text-jds-on-surface mt-0.5">{selectedQuote.city}</p>
                    </div>
                    <div>
                      <span className="text-jds-on-surface-variant/70 font-semibold block">
                        {isSelectedPickup ? 'Purpose' : 'Consultation Topic'}
                      </span>
                      <p className="font-bold text-jds-primary mt-0.5">{selectedQuote.purpose_of_visitation}</p>
                    </div>
                    <div>
                      <span className="text-jds-on-surface-variant/70 font-semibold block">Verified Socials</span>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedQuote.facebook && (
                          <a
                            href={
                              selectedQuote.facebook.startsWith('http')
                                ? selectedQuote.facebook
                                : `https://facebook.com/search/top?q=${encodeURIComponent(selectedQuote.facebook)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold hover:bg-blue-100"
                          >
                            <FaFacebook className="h-3.5 w-3.5" />
                            <span>{selectedQuote.facebook}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {selectedQuote.instagram && (
                          <a
                            href={
                              selectedQuote.instagram.startsWith('http')
                                ? selectedQuote.instagram
                                : `https://instagram.com/${selectedQuote.instagram.replace('@', '')}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-pink-50 text-pink-700 border border-pink-200 font-bold hover:bg-pink-100"
                          >
                            <FaInstagram className="h-3.5 w-3.5" />
                            <span>{selectedQuote.instagram}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visit / Remote Breakdown */}
                <div className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-lowest p-5 space-y-3">
                  <h4 className="text-sm font-bold text-jds-on-surface flex items-center gap-2 border-b border-jds-outline-variant/30 pb-2">
                    <Building2 className="h-4 w-4 text-jds-secondary" />
                    <span>Visitation & Order Scope</span>
                  </h4>
                  {selectedQuote.will_visit ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-jds-on-surface-variant/70 font-semibold block">Showroom Branch</span>
                        <p className="font-bold text-jds-primary mt-0.5">{selectedQuote.store_branch}</p>
                      </div>
                      <div>
                        <span className="text-jds-on-surface-variant/70 font-semibold block">Scheduled Date</span>
                        <p className="font-bold text-jds-on-surface mt-0.5">{selectedQuote.visit_date}</p>
                      </div>
                      <div>
                        <span className="text-jds-on-surface-variant/70 font-semibold block">Time Slot</span>
                        <p className="font-bold text-jds-on-surface mt-0.5">{selectedQuote.visit_time_slot}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-jds-on-surface-variant/70 font-semibold block">Preferred Remote Channel</span>
                        <p className="font-bold text-jds-secondary mt-0.5">{selectedQuote.preferred_channel}</p>
                      </div>
                      {selectedQuote.delivery_address && (
                        <div>
                          <span className="text-jds-on-surface-variant/70 font-semibold block">Delivery Address</span>
                          <p className="font-medium text-jds-on-surface mt-0.5">{selectedQuote.delivery_address}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Product Requested */}
                  <div className="mt-4 pt-3 border-t border-jds-outline-variant/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-jds-on-surface-variant/70 font-semibold block">
                        {isSelectedPickup ? 'Reserved Unit' : 'Product Requested'}
                      </span>
                      <p className="font-bold text-sm text-jds-on-surface">
                        {selectedQuote.product_name} <span className="text-jds-primary font-bold">× {selectedQuote.quantity || 1}</span>
                      </p>
                    </div>
                    {selectedQuote.product_watt && (
                      <span className="px-3 py-1 rounded-full bg-jds-secondary-container/20 text-jds-secondary font-bold">
                        {selectedQuote.product_watt}W
                      </span>
                    )}
                  </div>
                </div>

                {/* Staff Internal Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-jds-on-surface mb-1.5">
                    Internal Staff Notes & Log
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Record customer updates, calls made, discounts quoted, or visit outcomes..."
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    className="w-full rounded-xl border border-jds-outline-variant bg-jds-surface-container-lowest p-3 text-sm text-jds-on-surface outline-none focus:border-jds-primary resize-none"
                  />
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="bg-jds-surface-container px-6 py-4 border-t border-jds-outline-variant/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                      <Check className="h-4 w-4" /> Changes saved successfully!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedQuote(null)}
                    className="border-jds-outline-variant text-jds-on-surface hover:bg-jds-surface-container-high"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleSaveDetail}
                    disabled={saving}
                    className="bg-jds-primary text-jds-on-primary hover:opacity-90 font-bold px-5"
                  >
                    {saving ? 'Saving...' : 'Save Updates'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
