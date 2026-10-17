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
  FileText,
  Store,
  Layers,
  ChevronRight,
  Maximize2,
  Check,
  Copy,
  Image as ImageIcon,
  Kanban,
  GripVertical,
  Archive,
  Trash2,
  RotateCcw,
  Inbox
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  fetchAllWarrantyClaims,
  updateClaimStatus,
  archiveWarrantyClaim,
  restoreWarrantyClaim,
  deleteWarrantyClaim
} from '../../lib/customerService'
import { formatDate, getClaimStatusMeta, isWarrantyActive, getRemainingDays, CLAIM_STATUSES } from '../../lib/warrantyUtils'

const KANBAN_COLUMNS = [
  {
    id: 'pending',
    title: 'Pending Review',
    description: 'Awaiting triage & technical inspection',
    accentBorder: 'border-amber-500/40',
    headerBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    countBadge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: Clock,
    emptyText: 'No tickets awaiting review',
  },
  {
    id: 'in_review',
    title: 'Under Inspection',
    description: 'Technician currently evaluating fault',
    accentBorder: 'border-blue-500/40',
    headerBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    countBadge: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    icon: AlertTriangle,
    emptyText: 'No tickets currently under inspection',
  },
  {
    id: 'approved',
    title: 'Approved',
    description: 'Replacement or repair authorized',
    accentBorder: 'border-emerald-500/40',
    headerBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    countBadge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
    emptyText: 'No tickets in approved state',
  },
  {
    id: 'resolved',
    title: 'Resolved',
    description: 'Replacement completed / closed',
    accentBorder: 'border-teal-500/40',
    headerBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
    countBadge: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
    icon: ShieldCheck,
    emptyText: 'No resolved tickets',
  },
  {
    id: 'rejected',
    title: 'Declined',
    description: 'Outside terms or warranty void',
    accentBorder: 'border-rose-500/40',
    headerBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    countBadge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: XCircle,
    emptyText: 'No declined tickets',
  },
]

export default function WarrantyClaimsScreen() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('all') // 'all' | 'Cavite' | 'Quiapo'
  const [activeView, setActiveView] = useState('board') // 'board' | 'archived'
  
  const [activeModalClaim, setActiveModalClaim] = useState(null)
  const [modalStatus, setModalStatus] = useState('')
  const [modalNotes, setModalNotes] = useState('')
  const [modalSaving, setModalSaving] = useState(false)
  const [modalSuccessMsg, setModalSuccessMsg] = useState('')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [copiedPhone, setCopiedPhone] = useState(false)

  // Confirmation dialogs state
  const [claimToArchive, setClaimToArchive] = useState(null)
  const [claimToDelete, setClaimToDelete] = useState(null)
  const [claimToRestore, setClaimToRestore] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Drag-and-drop state
  const [draggingClaimId, setDraggingClaimId] = useState(null)
  const [dragOverColumnId, setDragOverColumnId] = useState(null)
  const [statusToast, setStatusToast] = useState('')

  const loadClaims = async () => {
    try {
      setLoading(true)
      const { claims: data, error } = await fetchAllWarrantyClaims('all')
      if (error) throw error
      setClaims(data || [])
    } catch (err) {
      console.error('Failed to load warranty claims:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClaims()
  }, [])

  // Sync modal state when active modal claim changes
  useEffect(() => {
    if (activeModalClaim) {
      setModalStatus(activeModalClaim.status || 'pending')
      setModalNotes(activeModalClaim.staff_notes || '')
      setModalSuccessMsg('')
      setCopiedPhone(false)
    }
  }, [activeModalClaim])

  // Escape key handler to close modals or lightboxes in hierarchical order
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedMedia) {
          setSelectedMedia(null)
        } else if (claimToDelete && !actionLoading) {
          setClaimToDelete(null)
        } else if (claimToArchive && !actionLoading) {
          setClaimToArchive(null)
        } else if (claimToRestore && !actionLoading) {
          setClaimToRestore(null)
        } else if (activeModalClaim && !modalSaving) {
          handleCloseModal()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedMedia, claimToDelete, claimToArchive, claimToRestore, actionLoading, activeModalClaim, modalSaving])

  const handleOpenModal = (claim) => {
    setActiveModalClaim(claim)
  }

  const handleCloseModal = () => {
    setActiveModalClaim(null)
    setModalSuccessMsg('')
  }

  const handleSaveModalChanges = async () => {
    if (!activeModalClaim) return
    try {
      setModalSaving(true)
      await updateClaimStatus(activeModalClaim.id, modalStatus, modalNotes)
      
      // Update local state
      setClaims((prev) =>
        prev.map((c) =>
          c.id === activeModalClaim.id
            ? { ...c, status: modalStatus, staff_notes: modalNotes, updated_at: new Date().toISOString() }
            : c
        )
      )

      setActiveModalClaim((prev) =>
        prev ? { ...prev, status: modalStatus, staff_notes: modalNotes } : null
      )

      setModalSuccessMsg('Ticket updated successfully.')
      setTimeout(() => setModalSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Failed to update ticket:', err)
      alert('Error updating claim: ' + err.message)
    } finally {
      setModalSaving(false)
    }
  }

  // Initiate & confirm Archive
  const handleInitiateArchive = (claim) => {
    setClaimToArchive(claim)
  }

  const handleConfirmArchive = async () => {
    if (!claimToArchive) return
    setActionLoading(true)
    try {
      const { error } = await archiveWarrantyClaim(claimToArchive.id, claimToArchive.staff_notes || '')
      if (error) throw error

      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimToArchive.id
            ? { ...c, status: 'archived', updated_at: new Date().toISOString() }
            : c
        )
      )

      if (activeModalClaim?.id === claimToArchive.id) {
        setActiveModalClaim((prev) => (prev ? { ...prev, status: 'archived' } : null))
      }

      setStatusToast(`Ticket CLAIM-${claimToArchive.id.slice(0, 8).toUpperCase()} moved to Archived Tickets.`)
      setTimeout(() => setStatusToast(''), 4000)
      setClaimToArchive(null)
    } catch (err) {
      console.error('Failed to archive ticket:', err)
      alert('Error archiving claim: ' + (err.message || 'Server error'))
    } finally {
      setActionLoading(false)
    }
  }

  // Initiate & confirm Restore
  const handleInitiateRestore = (claim) => {
    setClaimToRestore(claim)
  }

  const handleConfirmRestore = async (targetStatus = 'in_review') => {
    if (!claimToRestore) return
    setActionLoading(true)
    try {
      const { error } = await restoreWarrantyClaim(claimToRestore.id, targetStatus, claimToRestore.staff_notes || '')
      if (error) throw error

      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimToRestore.id
            ? { ...c, status: targetStatus, updated_at: new Date().toISOString() }
            : c
        )
      )

      if (activeModalClaim?.id === claimToRestore.id) {
        setActiveModalClaim((prev) => (prev ? { ...prev, status: targetStatus } : null))
      }

      setStatusToast(`Ticket CLAIM-${claimToRestore.id.slice(0, 8).toUpperCase()} restored to Active Board.`)
      setTimeout(() => setStatusToast(''), 4000)
      setClaimToRestore(null)
    } catch (err) {
      console.error('Failed to restore ticket:', err)
      alert('Error restoring claim: ' + (err.message || 'Server error'))
    } finally {
      setActionLoading(false)
    }
  }

  // Initiate & confirm Delete
  const handleInitiateDelete = (claim) => {
    setClaimToDelete(claim)
  }

  const handleConfirmDelete = async () => {
    if (!claimToDelete) return
    setActionLoading(true)
    try {
      const { error } = await deleteWarrantyClaim(claimToDelete.id)
      if (error) throw error

      setClaims((prev) => prev.filter((c) => c.id !== claimToDelete.id))

      if (activeModalClaim?.id === claimToDelete.id) {
        handleCloseModal()
      }

      setStatusToast(`Ticket CLAIM-${claimToDelete.id.slice(0, 8).toUpperCase()} permanently deleted.`)
      setTimeout(() => setStatusToast(''), 4000)
      setClaimToDelete(null)
    } catch (err) {
      console.error('Failed to delete ticket:', err)
      alert('Error deleting claim: ' + (err.message || 'Server error'))
    } finally {
      setActionLoading(false)
    }
  }

  // Handle Drag & Drop status updates
  const handleDropClaim = async (claimId, targetStatus) => {
    const claim = claims.find((c) => c.id === claimId)
    if (!claim) return
    const prevStatus = claim.status || 'pending'
    if (prevStatus === targetStatus) return

    const targetCol = KANBAN_COLUMNS.find((col) => col.id === targetStatus)
    const targetTitle = targetCol?.title || targetStatus

    // Optimistic UI update
    setClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? { ...c, status: targetStatus, updated_at: new Date().toISOString() }
          : c
      )
    )

    setStatusToast(`Ticket CLAIM-${claimId.slice(0, 8).toUpperCase()} moved to ${targetTitle}`)
    setTimeout(() => setStatusToast(''), 4000)

    try {
      const { error } = await updateClaimStatus(claimId, targetStatus, claim.staff_notes || '')
      if (error) throw error
    } catch (err) {
      console.error('Failed to update ticket status via drag-and-drop:', err)
      // Rollback on failure
      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, status: prevStatus } : c))
      )
      alert('Failed to update ticket status: ' + (err.message || 'Server error'))
    }
  }

  const handleCopyPhone = (phone) => {
    if (!phone) return
    navigator.clipboard.writeText(phone)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  // Calculate totals
  const activeClaimsCount = claims.filter((c) => (c.status || 'pending') !== 'archived').length
  const archivedClaimsCount = claims.filter((c) => (c.status || 'pending') === 'archived').length

  // Filter claims based on activeView
  const filteredClaims = claims.filter((c) => {
    const isArchived = (c.status || 'pending') === 'archived'
    if (activeView === 'board' && isArchived) return false
    if (activeView === 'archived' && !isArchived) return false

    const cust = c.customer_purchases?.customers
    const prod = c.customer_purchases?.products
    const purchase = c.customer_purchases
    const q = searchQuery.toLowerCase().trim()

    const matchesBranch =
      branchFilter === 'all' ||
      (purchase?.branch_location || 'Cavite').toLowerCase() === branchFilter.toLowerCase()

    if (!matchesBranch) return false

    if (!q) return true
    return (
      (cust?.full_name || '').toLowerCase().includes(q) ||
      (cust?.phone_number || '').includes(q) ||
      (prod?.name || '').toLowerCase().includes(q) ||
      (purchase?.serial_number || '').toLowerCase().includes(q) ||
      (c.issue_category || '').toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    )
  })

  // Group claims by status
  const claimsByColumn = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredClaims.filter((c) => (c.status || 'pending') === col.id)
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1750px] mx-auto space-y-7">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-jds-outline-variant/30">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Warranty Operations
            </span>
            <h1 className="text-2xl font-bold text-jds-on-surface">Warranty & Diagnostic Claims Board</h1>
          </div>
          <p className="text-sm text-jds-on-surface-variant mt-1.5 leading-relaxed">
            Visual Kanban triage for customer fault tickets. Drag and drop cards between columns to change statuses, or click any card for full diagnostic evidence and technician triage.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* View Mode Switcher: Active Board vs Archived Claims */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-jds-surface border border-jds-outline-variant/40 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveView('board')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'board'
                  ? 'bg-jds-primary text-jds-on-primary shadow-xs'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Active Board ({activeClaimsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'archived'
                  ? 'bg-jds-primary text-jds-on-primary shadow-xs'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived ({archivedClaimsCount})</span>
            </button>
          </div>

          <button
            onClick={loadClaims}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-jds-surface border border-jds-outline-variant/40 hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface flex items-center gap-2 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Board</span>
          </button>
        </div>
      </div>

      {/* Board Controls & Stage Counters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search & Branch Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-jds-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customer, phone, serial, product or CLAIM ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:outline-none focus:border-jds-primary transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 bg-jds-surface border border-jds-outline-variant/40 rounded-xl px-3.5 py-2 text-xs">
            <Store className="w-4 h-4 text-jds-primary shrink-0" />
            <span className="text-jds-on-surface-variant font-medium whitespace-nowrap">Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent font-semibold text-jds-on-surface focus:outline-none cursor-pointer"
            >
              <option value="all">All Branches</option>
              <option value="Cavite">Cavite Store</option>
              <option value="Quiapo">Quiapo Store</option>
            </select>
          </div>
        </div>

        {/* Total Summary */}
        <div className="flex items-center gap-3 text-xs text-jds-on-surface-variant font-medium">
          <span>{activeView === 'archived' ? 'Archived Records' : 'Active Tickets'}: <strong className="text-jds-on-surface font-semibold">{filteredClaims.length}</strong></span>
          <span className="text-jds-outline-variant">•</span>
          <span>Total Database Claims: <strong className="text-jds-on-surface font-semibold">{claims.length}</strong></span>
        </div>
      </div>

      {/* Drag Status Toast Notification */}
      {statusToast && (
        <div className="p-3.5 rounded-xl bg-jds-primary/10 border border-jds-primary/30 text-jds-primary text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusToast}</span>
          </div>
          <button
            onClick={() => setStatusToast('')}
            className="p-1 hover:bg-jds-primary/20 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Kanban Board Container or Archived Claims View */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-jds-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-jds-on-surface-variant font-medium">Loading warranty tickets onto board...</p>
        </div>
      ) : activeView === 'archived' ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-850/40 border border-jds-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Archive className="w-5 h-5 text-neutral-500" />
              <div>
                <h2 className="text-sm font-bold text-jds-on-surface">Archived Warranty Tickets</h2>
                <p className="text-xs text-jds-on-surface-variant">Concluded and archived tickets retained for warranty history and auditing.</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-jds-surface border border-jds-outline-variant/30 text-jds-on-surface">
              {filteredClaims.length} Archived Record{filteredClaims.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredClaims.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-jds-outline-variant/40 bg-jds-surface/30 space-y-3">
              <Inbox className="w-10 h-10 text-jds-on-surface-variant/40" />
              <div>
                <h3 className="text-sm font-bold text-jds-on-surface">No Archived Tickets Found</h3>
                <p className="text-xs text-jds-on-surface-variant mt-1 max-w-sm">
                  {searchQuery || branchFilter !== 'all'
                    ? 'No archived claims match your current search and branch filters.'
                    : 'There are no archived warranty claims in the database.'}
                </p>
              </div>
              {(searchQuery || branchFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setBranchFilter('all')
                  }}
                  className="text-xs font-semibold text-jds-primary hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClaims.map((claim) => {
                const customer = claim.customer_purchases?.customers
                const product = claim.customer_purchases?.products
                const purchase = claim.customer_purchases

                return (
                  <div
                    key={claim.id}
                    onClick={() => handleOpenModal(claim)}
                    className="rounded-xl border border-jds-outline-variant/40 bg-jds-surface p-4 transition-all hover:shadow-md hover:border-jds-primary/60 cursor-pointer space-y-3.5 flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-jds-outline-variant/20">
                        <span className="font-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-500/10 px-2 py-0.5 rounded-md border border-neutral-500/20">
                          CLAIM-{claim.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-[11px] text-jds-on-surface-variant/70 font-medium">
                          {formatDate(claim.updated_at || claim.created_at)}
                        </span>
                      </div>

                      {/* Customer & Branch */}
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-jds-on-surface flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-jds-on-surface-variant shrink-0" />
                            <span className="truncate">{customer?.full_name || 'Customer'}</span>
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-jds-surface-container text-jds-on-surface-variant border border-jds-outline-variant/30 shrink-0">
                            {purchase?.branch_location || 'Cavite'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-jds-on-surface-variant/70 pl-5">
                          {customer?.phone_number || 'No phone'}
                        </div>
                      </div>

                      {/* Product */}
                      <div className="p-3 rounded-lg bg-jds-surface-container-low/50 border border-jds-outline-variant/20 space-y-1">
                        <div className="text-xs font-semibold text-jds-on-surface flex items-center gap-1.5 truncate">
                          <Package className="w-3.5 h-3.5 text-jds-primary shrink-0" />
                          <span className="truncate">{product?.name || 'Solar Light Unit'}</span>
                        </div>
                        {purchase?.serial_number && (
                          <div className="text-[10px] font-mono text-jds-on-surface-variant flex items-center gap-1">
                            <span>S/N:</span>
                            <span className="font-semibold text-jds-on-surface">{purchase.serial_number}</span>
                          </div>
                        )}
                      </div>

                      {/* Issue Category & Description */}
                      <div className="space-y-1">
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20">
                          {claim.issue_category}
                        </span>
                        <p className="text-[11px] text-jds-on-surface-variant line-clamp-2 leading-relaxed">
                          {claim.description}
                        </p>
                      </div>

                      {claim.staff_notes && (
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 truncate pt-1">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate">{claim.staff_notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions Footer */}
                    <div
                      className="pt-3 border-t border-jds-outline-variant/20 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleInitiateRestore(claim)}
                            className="px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore to Board</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInitiateDelete(claim)}
                            className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-jds-on-surface-variant/60">Archived Record</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-start overflow-x-auto pb-6">
          {KANBAN_COLUMNS.map((col) => {
            const ColumnIcon = col.icon
            const colClaims = claimsByColumn[col.id] || []
            const isDropTarget = dragOverColumnId === col.id

            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragOverColumnId !== col.id) setDragOverColumnId(col.id)
                }}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragOverColumnId(col.id)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setDragOverColumnId(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOverColumnId(null)
                  const claimId = e.dataTransfer.getData('text/plain') || draggingClaimId
                  if (claimId) handleDropClaim(claimId, col.id)
                }}
                className={`flex flex-col bg-jds-surface-container-low/40 rounded-2xl border transition-all min-w-[280px] max-w-full shadow-2xs overflow-hidden ${
                  isDropTarget
                    ? 'border-jds-primary ring-2 ring-jds-primary/60 bg-jds-primary/[0.04]'
                    : 'border-jds-outline-variant/30'
                }`}
              >
                {/* Column Header */}
                <div className={`p-4 border-b border-jds-outline-variant/30 flex items-center justify-between ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <ColumnIcon className="w-4 h-4 shrink-0" />
                    <h2 className="text-xs font-bold uppercase tracking-wider">{col.title}</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${col.countBadge}`}>
                      {colClaims.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container with Independent Vertical Scroll */}
                <div className="p-4 space-y-4 min-h-[460px] max-h-[calc(100vh-270px)] overflow-y-auto pr-2">
                  {/* Drop zone placeholder indicator when dragged over */}
                  {isDropTarget && draggingClaimId && (
                    <div className="p-3.5 rounded-xl border-2 border-dashed border-jds-primary/60 bg-jds-primary/10 text-center text-xs font-semibold text-jds-primary animate-pulse flex items-center justify-center gap-2">
                      <ColumnIcon className="w-4 h-4" />
                      <span>Drop to move to {col.title}</span>
                    </div>
                  )}

                  {colClaims.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-jds-outline-variant/40 bg-jds-surface/30">
                      <ColumnIcon className="w-6 h-6 text-jds-on-surface-variant/30 mb-2" />
                      <p className="text-[11px] text-jds-on-surface-variant/60 font-medium">{col.emptyText}</p>
                    </div>
                  ) : (
                    colClaims.map((claim) => {
                      const customer = claim.customer_purchases?.customers
                      const product = claim.customer_purchases?.products
                      const purchase = claim.customer_purchases
                      const warrantyActive = isWarrantyActive(purchase?.warranty_expires_at)
                      const daysLeft = getRemainingDays(purchase?.warranty_expires_at)
                      const isDragging = draggingClaimId === claim.id

                      return (
                        <div
                          key={claim.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', claim.id)
                            e.dataTransfer.effectAllowed = 'move'
                            setDraggingClaimId(claim.id)
                          }}
                          onDragEnd={() => {
                            setDraggingClaimId(null)
                            setDragOverColumnId(null)
                          }}
                          onClick={() => handleOpenModal(claim)}
                          className={`group relative rounded-xl border bg-jds-surface p-4 transition-all cursor-grab active:cursor-grabbing space-y-3.5 select-none ${
                            isDragging
                              ? 'border-jds-primary ring-2 ring-jds-primary shadow-xl z-20 opacity-100'
                              : 'border-jds-outline-variant/40 shadow-xs hover:shadow-md hover:border-jds-primary/60'
                          }`}
                        >
                          {/* Card Header: Drag Handle + Claim ID + Date */}
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-jds-outline-variant/20">
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3.5 h-3.5 text-jds-on-surface-variant/40 group-hover:text-jds-primary transition-colors shrink-0" />
                              <span className="font-mono text-[11px] font-bold text-jds-primary bg-jds-primary/10 px-2 py-0.5 rounded-md border border-jds-primary/20">
                                CLAIM-{claim.id.slice(0, 8).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[11px] text-jds-on-surface-variant/70 font-medium">
                              {formatDate(claim.created_at)}
                            </span>
                          </div>

                          {/* Customer & Branch */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-jds-on-surface flex items-center gap-1.5 truncate">
                                <User className="w-3.5 h-3.5 text-jds-on-surface-variant shrink-0" />
                                <span className="truncate">{customer?.full_name || 'Customer'}</span>
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-jds-surface-container text-jds-on-surface-variant border border-jds-outline-variant/30 shrink-0">
                                {purchase?.branch_location || 'Cavite'}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-jds-on-surface-variant/70 pl-5">
                              {customer?.phone_number || 'No phone'}
                            </div>
                          </div>

                          {/* Product Info & Warranty Tag */}
                          <div className="p-3 rounded-lg bg-jds-surface-container-low/50 border border-jds-outline-variant/20 space-y-1.5">
                            <div className="text-xs font-semibold text-jds-on-surface flex items-center gap-1.5 truncate">
                              <Package className="w-3.5 h-3.5 text-jds-primary shrink-0" />
                              <span className="truncate">{product?.name || 'Solar Light Unit'}</span>
                            </div>
                            {purchase?.serial_number && (
                              <div className="text-[10px] font-mono text-jds-on-surface-variant flex items-center gap-1">
                                <span>S/N:</span>
                                <span className="font-semibold text-jds-on-surface">{purchase.serial_number}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  warrantyActive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                }`}
                              >
                                {warrantyActive ? `${daysLeft}d warranty` : 'Warranty Expired'}
                              </span>
                            </div>
                          </div>

                          {/* Issue Category & Truncated Note */}
                          <div className="space-y-1">
                            <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-jds-surface-container-high text-jds-on-surface border border-jds-outline-variant/40">
                              {claim.issue_category}
                            </span>
                            <p className="text-[11px] text-jds-on-surface-variant line-clamp-2 leading-relaxed">
                              {claim.description}
                            </p>
                          </div>

                          {/* Media Preview Indicator */}
                          {claim.media_urls && claim.media_urls.length > 0 && (
                            <div className="flex items-center gap-2 pt-1 border-t border-jds-outline-variant/15 text-[11px] text-jds-on-surface-variant/80">
                              <ImageIcon className="w-3.5 h-3.5 text-jds-primary" />
                              <span className="font-semibold">{claim.media_urls.length} attachment{claim.media_urls.length === 1 ? '' : 's'}</span>
                              <div className="flex items-center gap-1 ml-auto">
                                {claim.media_urls.slice(0, 3).map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt="Evidence thumbnail"
                                    className="w-5 h-5 rounded-md object-cover border border-jds-outline-variant/40 bg-black/10"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Card Footer: Click affordance & Staff notes badge */}
                          <div className="flex items-center justify-between pt-2 border-t border-jds-outline-variant/15 text-[11px]">
                            {claim.staff_notes ? (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 truncate max-w-[170px]">
                                <MessageSquare className="w-3 h-3 shrink-0" />
                                <span className="truncate">{claim.staff_notes}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-jds-on-surface-variant/40">No staff notes</span>
                            )}
                            <span className="text-[10px] font-bold text-jds-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Customer Ticket Detail Modal (UI/UX Pro Max Tonal Layout) */}
      {activeModalClaim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !modalSaving) handleCloseModal()
          }}
        >
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-jds-surface dark:bg-[#18140e] shadow-2xl border border-jds-outline-variant/20 dark:border-white/10 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-jds-outline-variant/15 bg-jds-surface-container-lowest/80 dark:bg-white/[0.02] backdrop-blur-sm shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs font-bold text-jds-primary bg-jds-primary/10 px-3.5 py-1 rounded-full border border-jds-primary/20">
                  CLAIM-{activeModalClaim.id.slice(0, 8).toUpperCase()}
                </span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getClaimStatusMeta(activeModalClaim.status).color}`}>
                  {getClaimStatusMeta(activeModalClaim.status).label}
                </span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-jds-surface-container text-jds-on-surface-variant flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-jds-primary" />
                  <span>{activeModalClaim.customer_purchases?.branch_location || 'Cavite'} Store</span>
                </span>
              </div>
              <button
                type="button"
                disabled={modalSaving}
                onClick={handleCloseModal}
                className="rounded-full p-2 text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-on-surface transition-colors disabled:opacity-50 cursor-pointer"
                title="Close ticket details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split 2-Column with Generous Spacing */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 p-7 overflow-y-auto flex-1 max-h-[calc(90vh-140px)]">
              {/* Left Column: Customer Profile, Equipment & Diagnostic Evidence (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {modalSuccessMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{modalSuccessMsg}</span>
                  </div>
                )}

                {/* Equipment & Customer Dossier */}
                <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] rounded-2xl p-6 shadow-sm space-y-4">
                  {/* Eyebrow Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-jds-outline-variant/15 text-xs">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-jds-on-surface-variant">
                      <User className="w-4 h-4 text-jds-primary" />
                      <span>Customer & Equipment Details</span>
                    </div>
                    <span className="text-xs text-jds-on-surface-variant/70">
                      Submitted: {formatDate(activeModalClaim.created_at)}
                    </span>
                  </div>

                  {/* Customer Information Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                      <h3 className="text-base font-bold text-jds-on-surface">
                        {activeModalClaim.customer_purchases?.customers?.full_name || 'Customer'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Phone className="w-3.5 h-3.5 text-jds-on-surface-variant/60" />
                        <span className="font-mono text-xs font-semibold text-jds-on-surface">
                          {activeModalClaim.customer_purchases?.customers?.phone_number || 'No contact phone'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(activeModalClaim.customer_purchases?.customers?.phone_number)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-jds-surface-container hover:bg-jds-primary/10 hover:text-jds-primary text-xs font-medium text-jds-on-surface-variant transition-colors cursor-pointer"
                          title="Copy customer phone"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                    <span
                      className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full border ${
                        isWarrantyActive(activeModalClaim.customer_purchases?.warranty_expires_at)
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {isWarrantyActive(activeModalClaim.customer_purchases?.warranty_expires_at)
                        ? 'Active Warranty'
                        : 'Warranty Expired'}
                    </span>
                  </div>

                  {/* Hardware Specification Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3">
                    <div className="bg-jds-surface-container-low/60 dark:bg-white/[0.04] rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-jds-primary" /> Solar Product Unit
                      </span>
                      <div className="text-xs font-bold text-jds-on-surface">
                        {activeModalClaim.customer_purchases?.products?.name || 'Solar Light Unit'}
                      </div>
                    </div>

                    <div className="bg-jds-surface-container-low/60 dark:bg-white/[0.04] rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-jds-primary" /> Serial Number
                      </span>
                      <div className="font-mono text-xs font-bold text-jds-on-surface">
                        {activeModalClaim.customer_purchases?.serial_number || 'N/A'}
                      </div>
                    </div>

                    <div className="bg-jds-surface-container-low/60 dark:bg-white/[0.04] rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-jds-primary" /> Purchase Date & Period
                      </span>
                      <div className="text-xs font-semibold text-jds-on-surface">
                        {formatDate(activeModalClaim.customer_purchases?.purchase_date)} ({activeModalClaim.customer_purchases?.warranty_months || 12} Mos)
                      </div>
                    </div>

                    <div className="bg-jds-surface-container-low/60 dark:bg-white/[0.04] rounded-xl p-3.5 space-y-1">
                      <span className="text-[11px] font-semibold text-jds-on-surface-variant flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-jds-primary" /> Coverage Countdown
                      </span>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {getRemainingDays(activeModalClaim.customer_purchases?.warranty_expires_at)} days remaining
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Fault Diagnostic Report & Evidence Gallery */}
                <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] rounded-2xl p-6 shadow-sm space-y-5">
                  {/* Eyebrow Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-jds-outline-variant/15 text-xs">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-jds-on-surface">
                      <FileText className="w-4 h-4 text-jds-primary" />
                      <span>Diagnostic Fault Report</span>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                      Category: {activeModalClaim.issue_category}
                    </span>
                  </div>

                  {/* Fault Explanation */}
                  <div className="bg-jds-surface-container-low/50 dark:bg-white/[0.04] rounded-2xl p-4.5 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                      Customer Problem Statement
                    </span>
                    <p className="text-xs text-jds-on-surface whitespace-pre-line leading-relaxed pt-1">
                      {activeModalClaim.description}
                    </p>
                  </div>

                  {/* Evidence Gallery */}
                  <div className="space-y-3 pt-1">
                    <span className="text-xs font-bold text-jds-on-surface flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-jds-primary" />
                      <span>Photographic Fault Evidence</span>
                      <span className="text-[11px] font-normal text-jds-on-surface-variant">
                        ({activeModalClaim.media_urls?.length || 0} attached)
                      </span>
                    </span>

                    {activeModalClaim.media_urls && activeModalClaim.media_urls.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
                        {activeModalClaim.media_urls.map((url, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() => setSelectedMedia(url)}
                            className="group relative aspect-4/3 rounded-xl overflow-hidden bg-black/10 cursor-pointer shadow-xs hover:shadow-md transition-all ring-1 ring-black/5 dark:ring-white/10"
                          >
                            <img
                              src={url}
                              alt="Fault evidence"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-semibold text-xs gap-1.5 backdrop-blur-[2px]">
                              <Maximize2 className="w-4 h-4" />
                              <span>Enlarge</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-jds-surface-container-low/40 dark:bg-white/[0.02] text-center text-xs text-jds-on-surface-variant/60 italic">
                        No customer media files attached for this claim.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Lifecycle Stage & Technician Triage (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Visual Claim Lifecycle Pipeline */}
                <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3.5 border-b border-jds-outline-variant/15 text-xs font-bold uppercase tracking-wider text-jds-on-surface">
                    <Layers className="w-4 h-4 text-jds-primary" />
                    <span>Claim Lifecycle Progression</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {KANBAN_COLUMNS.map((col) => {
                      const ColIcon = col.icon
                      const isCurrent = (modalStatus || activeModalClaim.status) === col.id
                      return (
                        <div
                          key={col.id}
                          onClick={() => setModalStatus(col.id)}
                          className={`flex items-center justify-between p-3 rounded-xl text-xs cursor-pointer transition-all ${
                            isCurrent
                              ? `${col.headerBg} font-bold shadow-xs ring-1 ring-jds-primary/40`
                              : 'text-jds-on-surface-variant hover:bg-jds-surface-container-low/60 hover:text-jds-on-surface'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${isCurrent ? 'bg-white/30 dark:bg-black/30' : 'bg-jds-surface-container'}`}>
                              <ColIcon className="w-4 h-4 shrink-0" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs leading-none">{col.title}</div>
                              <div className="text-[10px] text-jds-on-surface-variant/70 mt-1">{col.description}</div>
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] uppercase tracking-wide font-extrabold px-2.5 py-0.5 rounded-full bg-white/30 dark:bg-black/30 border border-current">
                              Active
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Technician Triage Form */}
                <div className="bg-jds-surface-container-lowest dark:bg-white/[0.03] rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3.5 border-b border-jds-outline-variant/15 text-xs font-bold uppercase tracking-wider text-jds-on-surface">
                    <ShieldCheck className="w-4 h-4 text-jds-primary" />
                    <span>Technician Decision & Notes</span>
                  </div>

                  {/* Stage Dropdown */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-jds-on-surface-variant block">
                      Target Ticket Stage
                    </label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                      className="w-full bg-jds-surface-container-low/50 dark:bg-white/[0.04] border border-jds-outline-variant/30 rounded-xl px-4 py-3 text-xs font-semibold text-jds-on-surface focus:outline-none focus:ring-2 focus:ring-jds-primary transition-all cursor-pointer"
                    >
                      <option value="pending">Pending Review (Awaiting Inspection)</option>
                      <option value="in_review">Under Inspection (Evaluating Fault)</option>
                      <option value="approved">Approved for Replacement / Repair</option>
                      <option value="resolved">Resolved (Completed / Closed)</option>
                      <option value="rejected">Claim Declined (Void / Not Covered)</option>
                      {modalStatus === 'archived' && (
                        <option value="archived">Archived / Concluded</option>
                      )}
                    </select>
                  </div>

                  {/* Technician Notes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-jds-on-surface-variant">
                        Technician Notes
                      </label>
                      <span className="text-[11px] text-jds-on-surface-variant/60">Visible to customer</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="e.g. Unit inspected at counter. Battery fault confirmed; replacement authorized."
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      className="w-full bg-jds-surface-container-low/50 dark:bg-white/[0.04] border border-jds-outline-variant/30 rounded-xl p-4 text-xs text-jds-on-surface focus:outline-none focus:ring-2 focus:ring-jds-primary placeholder:text-jds-on-surface-variant/40 transition-all leading-relaxed"
                    />

                    {/* Quick Presets */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-semibold text-jds-on-surface-variant/80 block">
                        One-Click Preset Responses:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Approved: Bring solar unit to counter for direct swap.',
                          'Inspection: Unit passed test. Please verify cable connection.',
                          'Claim approved: Replacement module ready for pickup.',
                          'Declined: Physical fracture outside warranty terms.'
                        ].map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => setModalNotes(preset)}
                            className="px-3 py-1.5 rounded-full bg-jds-surface-container dark:bg-white/[0.06] text-[11px] font-medium text-jds-on-surface-variant hover:text-jds-primary hover:bg-jds-primary/10 transition-colors text-left cursor-pointer"
                          >
                            {preset.slice(0, 32)}...
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-7 py-4.5 border-t border-jds-outline-variant/15 bg-jds-surface-container-lowest/80 dark:bg-white/[0.02] backdrop-blur-sm shrink-0">
              {/* Admin Actions: Archive, Restore, Delete */}
              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-2">
                  {activeModalClaim.status === 'archived' ? (
                    <button
                      type="button"
                      disabled={modalSaving}
                      onClick={() => handleInitiateRestore(activeModalClaim)}
                      className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Restore ticket back to active triage"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore to Board</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={modalSaving}
                      onClick={() => handleInitiateArchive(activeModalClaim)}
                      className="px-3.5 py-2 rounded-xl border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container text-jds-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Move ticket to archive"
                    >
                      <Archive className="w-3.5 h-3.5 text-jds-on-surface-variant" />
                      <span>Archive Claim</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={modalSaving}
                    onClick={() => handleInitiateDelete(activeModalClaim)}
                    className="px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Permanently remove ticket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Claim</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs text-jds-on-surface-variant/60 hidden sm:inline">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-jds-surface-container text-[11px] font-mono">Esc</kbd> to close
                </span>
              )}

              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={modalSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-jds-on-surface-variant hover:bg-jds-surface-container transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalSaving}
                  onClick={handleSaveModalChanges}
                  className="px-6 py-2.5 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-bold hover:bg-jds-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {modalSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Updating Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Update Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {claimToArchive && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setClaimToArchive(null)
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-jds-outline-variant/40 bg-jds-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-jds-on-surface">Archive Warranty Claim</h3>
                  <p className="text-xs text-jds-on-surface-variant font-mono">
                    CLAIM-{claimToArchive.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setClaimToArchive(null)}
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ticket Details Summary */}
            <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/40 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Customer:</span>
                <span className="font-semibold text-jds-on-surface">
                  {claimToArchive.customer_purchases?.customers?.full_name || 'Customer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Product:</span>
                <span className="font-semibold text-jds-on-surface">
                  {claimToArchive.customer_purchases?.products?.name || 'Solar Luminaire'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Issue:</span>
                <span className="font-semibold text-jds-on-surface">
                  {claimToArchive.issue_category}
                </span>
              </div>
            </div>

            {/* Notice */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                This ticket will be removed from the active triage Kanban board and saved into Archived Tickets. You can view or restore it at any time.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setClaimToArchive(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-jds-on-surface-variant hover:bg-jds-surface-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmArchive}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Archive Ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {claimToRestore && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setClaimToRestore(null)
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-jds-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-jds-on-surface">Restore Warranty Claim</h3>
                  <p className="text-xs text-jds-on-surface-variant font-mono">
                    CLAIM-{claimToRestore.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setClaimToRestore(null)}
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ticket Details Summary */}
            <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/40 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Customer:</span>
                <span className="font-semibold text-jds-on-surface">
                  {claimToRestore.customer_purchases?.customers?.full_name || 'Customer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Product:</span>
                <span className="font-semibold text-jds-on-surface">
                  {claimToRestore.customer_purchases?.products?.name || 'Solar Luminaire'}
                </span>
              </div>
            </div>

            {/* Notice */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                This ticket will be restored back to the active triage board under the "Under Inspection" stage.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setClaimToRestore(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-jds-on-surface-variant hover:bg-jds-surface-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleConfirmRestore('in_review')}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore Ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {claimToDelete && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setClaimToDelete(null)
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-jds-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-jds-on-surface">Delete Warranty Claim</h3>
                  <p className="text-xs text-jds-on-surface-variant font-mono">
                    CLAIM-{claimToDelete.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setClaimToDelete(null)}
                className="rounded-lg p-1 text-jds-on-surface-variant/60 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ticket Details Summary */}
            <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/40 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Customer:</span>
                <span className="font-semibold text-jds-on-surface">
                  {claimToDelete.customer_purchases?.customers?.full_name || 'Customer'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Product:</span>
                <span className="font-semibold text-jds-on-surface">
                  {claimToDelete.customer_purchases?.products?.name || 'Solar Luminaire'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-jds-on-surface-variant">Issue:</span>
                <span className="font-semibold text-jds-on-surface">
                  {claimToDelete.issue_category}
                </span>
              </div>
            </div>

            {/* Irreversible Warning */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                This action is permanent and cannot be undone. The warranty claim ticket, fault description, and diagnostic history will be permanently deleted from the database.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setClaimToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-jds-on-surface-variant hover:bg-jds-surface-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Evidence Viewing */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-black rounded-2xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedMedia}
              alt="Evidence full inspection"
              className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  )
}

