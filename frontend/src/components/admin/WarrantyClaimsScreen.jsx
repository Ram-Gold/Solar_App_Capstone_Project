import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Phone,
  User,
  Calendar,
  Package,
  Eye,
  X,
  FileText
} from 'lucide-react'
import { fetchAllWarrantyClaims, updateClaimStatus } from '../../lib/customerService'
import { formatDate, getClaimStatusMeta, isWarrantyActive, getRemainingDays } from '../../lib/warrantyUtils'

export default function WarrantyClaimsScreen() {
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [editingNotes, setEditingNotes] = useState({})

  const loadClaims = async () => {
    try {
      setLoading(true)
      const { claims: data, error } = await fetchAllWarrantyClaims(statusFilter)
      if (error) throw error
      setClaims(data || [])
      // Initialize notes
      const initialNotes = {}
      ;(data || []).forEach(c => {
        initialNotes[c.id] = c.staff_notes || ''
      })
      setEditingNotes(initialNotes)
    } catch (err) {
      console.error('Failed to load warranty claims:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClaims()
  }, [statusFilter])

  const handleStatusChange = async (claimId, newStatus) => {
    try {
      setUpdatingId(claimId)
      const currentNote = editingNotes[claimId] || ''
      await updateClaimStatus(claimId, newStatus, currentNote)
      setClaims(prev =>
        prev.map(c => (c.id === claimId ? { ...c, status: newStatus, staff_notes: currentNote } : c))
      )
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('Error updating claim status: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSaveNotes = async (claimId) => {
    try {
      setUpdatingId(claimId)
      const claim = claims.find(c => c.id === claimId)
      const currentStatus = claim?.status || 'pending'
      const currentNote = editingNotes[claimId] || ''
      await updateClaimStatus(claimId, currentStatus, currentNote)
      setClaims(prev =>
        prev.map(c => (c.id === claimId ? { ...c, staff_notes: currentNote } : c))
      )
      alert('Technician notes saved successfully.')
    } catch (err) {
      console.error('Failed to save notes:', err)
      alert('Error saving notes: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  // Filter by search
  const filteredClaims = claims.filter(c => {
    const cust = c.customer_purchases?.customers
    const prod = c.customer_purchases?.products
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      (cust?.full_name || '').toLowerCase().includes(q) ||
      (cust?.phone_number || '').includes(q) ||
      (prod?.name || '').toLowerCase().includes(q) ||
      (c.customer_purchases?.serial_number || '').toLowerCase().includes(q) ||
      (c.issue_category || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-jds-outline-variant/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-500">
              RMA & Triage
            </span>
            <h1 className="text-2xl font-bold text-jds-on-surface">Warranty & Diagnostic Claims</h1>
          </div>
          <p className="text-sm text-jds-on-surface-variant mt-1">
            Review customer fault submissions, inspect photo evidence, and manage replacement approvals.
          </p>
        </div>

        <button
          onClick={loadClaims}
          disabled={loading}
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-jds-surface border border-jds-outline-variant/40 hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Tickets' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'in_review', label: 'Under Inspection' },
            { id: 'approved', label: 'Approved' },
            { id: 'resolved', label: 'Resolved' },
            { id: 'rejected', label: 'Declined' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-jds-primary text-jds-on-primary shadow-sm'
                  : 'bg-jds-surface border border-jds-outline-variant/30 text-jds-on-surface-variant hover:text-jds-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-jds-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search customer, phone, serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-xl pl-9 pr-4 py-2 text-xs text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:outline-none focus:border-jds-primary transition-colors"
          />
        </div>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-jds-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-jds-on-surface-variant">Loading warranty claims...</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="py-20 text-center bg-jds-surface rounded-2xl border border-jds-outline-variant/30 p-8 space-y-3">
          <ShieldCheck className="w-12 h-12 text-jds-on-surface-variant/40 mx-auto" />
          <h3 className="text-base font-semibold text-jds-on-surface">No warranty claims found</h3>
          <p className="text-xs text-jds-on-surface-variant max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `There are currently no tickets matching status "${statusFilter}".`
              : 'No customers have filed diagnostic or warranty tickets yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => {
            const customer = claim.customer_purchases?.customers
            const product = claim.customer_purchases?.products
            const purchase = claim.customer_purchases
            const statusMeta = getClaimStatusMeta(claim.status)
            const warrantyActive = isWarrantyActive(purchase?.warranty_expires_at)
            const daysLeft = getRemainingDays(purchase?.warranty_expires_at)

            return (
              <div
                key={claim.id}
                className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl p-6 shadow-sm hover:border-jds-outline-variant/80 transition-all space-y-5"
              >
                {/* Top Row: Ticket ID, Status Badge, Submission Date */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-jds-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-jds-primary bg-jds-primary/10 px-2.5 py-1 rounded-lg">
                      CLAIM-{claim.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="text-xs text-jds-on-surface-variant flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Submitted: {formatDate(claim.created_at)}
                  </div>
                </div>

                {/* Details Grid: Customer & Product Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-jds-surface-container/20 border border-jds-outline-variant/30 text-xs">
                  {/* Customer Column */}
                  <div className="space-y-1">
                    <div className="text-jds-on-surface-variant font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-jds-primary" /> Customer Info
                    </div>
                    <div className="font-bold text-sm text-jds-on-surface">
                      {customer?.full_name || 'Customer'}
                    </div>
                    <div className="font-mono text-jds-on-surface-variant">
                      {customer?.phone_number || 'N/A'}
                    </div>
                    <div className="text-jds-on-surface-variant">
                      Branch: <strong>{purchase?.branch_location || 'Cavite'}</strong>
                    </div>
                  </div>

                  {/* Product & Warranty Column */}
                  <div className="space-y-1">
                    <div className="text-jds-on-surface-variant font-medium flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-jds-primary" /> Product & Warranty
                    </div>
                    <div className="font-bold text-sm text-jds-on-surface">
                      {product?.name || 'Solar Unit'}
                    </div>
                    <div className="text-jds-on-surface-variant flex items-center gap-2">
                      {purchase?.serial_number && <span>S/N: <strong className="font-mono">{purchase.serial_number}</strong></span>}
                      <span>Purchased: {formatDate(purchase?.purchase_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        warrantyActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {warrantyActive ? `Warranty Active (${daysLeft} days)` : 'Warranty Expired'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Issue Description */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-jds-surface-container text-jds-on-surface border border-jds-outline-variant/40">
                      Issue: {claim.issue_category}
                    </span>
                  </div>
                  <p className="text-sm text-jds-on-surface bg-jds-surface-container/30 p-3 rounded-xl border border-jds-outline-variant/20 whitespace-pre-line">
                    {claim.description}
                  </p>
                </div>

                {/* Evidence Media (Photos/Videos) */}
                {claim.media_urls && claim.media_urls.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-jds-on-surface-variant">
                      Uploaded Evidence ({claim.media_urls.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {claim.media_urls.map((url, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setSelectedMedia(url)}
                          className="relative w-20 h-20 rounded-xl overflow-hidden border border-jds-outline-variant/40 hover:opacity-80 transition-opacity bg-black/10 group"
                        >
                          <img
                            src={url}
                            alt="Fault evidence"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If video or failed image, show icon
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff Action & Technician Notes */}
                <div className="pt-3 border-t border-jds-outline-variant/30 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  {/* Status Picker */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-[11px] font-semibold text-jds-on-surface-variant">
                      Update Ticket Status
                    </label>
                    <select
                      value={claim.status}
                      disabled={updatingId === claim.id}
                      onChange={(e) => handleStatusChange(claim.id, e.target.value)}
                      className="w-full bg-jds-surface border border-jds-outline-variant/50 rounded-xl px-3 py-2 text-xs font-semibold text-jds-on-surface focus:outline-none focus:border-jds-primary cursor-pointer disabled:opacity-50"
                    >
                      <option value="pending">Pending Review</option>
                      <option value="in_review">Under Inspection</option>
                      <option value="approved">Approved for Replacement / Repair</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Claim Declined</option>
                    </select>
                  </div>

                  {/* Technician Notes */}
                  <div className="md:col-span-6 space-y-1">
                    <label className="text-[11px] font-semibold text-jds-on-surface-variant">
                      Technician Notes (Visible to Customer)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bring unit to Quiapo branch for replacement"
                      value={editingNotes[claim.id] || ''}
                      onChange={(e) =>
                        setEditingNotes(prev => ({ ...prev, [claim.id]: e.target.value }))
                      }
                      className="w-full bg-jds-surface border border-jds-outline-variant/50 rounded-xl px-3 py-2 text-xs text-jds-on-surface focus:outline-none focus:border-jds-primary placeholder:text-jds-on-surface-variant/40"
                    />
                  </div>

                  {/* Save Note Button */}
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      disabled={updatingId === claim.id}
                      onClick={() => handleSaveNotes(claim.id)}
                      className="w-full py-2 px-3 rounded-xl bg-jds-surface-container hover:bg-jds-surface-container-high border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface transition-colors disabled:opacity-50"
                    >
                      {updatingId === claim.id ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-black rounded-2xl overflow-hidden p-2">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedMedia}
              alt="Evidence full view"
              className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}
