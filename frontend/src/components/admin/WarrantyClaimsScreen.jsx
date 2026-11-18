import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare,
  RefreshCw,
  Phone,
  User,
  Calendar,
  Package,
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
  Inbox,
  HelpCircle,
  Save,
  Lock
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/toast'
import {
  fetchAllWarrantyClaims,
  updateClaimStatus,
  archiveWarrantyClaim,
  restoreWarrantyClaim,
  deleteWarrantyClaim
} from '../../lib/customerService'
import {
  CLAIM_STATUSES,
  formatDate,
  getClaimStatusMeta,
  isWarrantyActive,
  getRemainingDays,
  normalizeClaimStatus,
  isCompletedClaimStage,
  isClaimTransitionAllowed,
  appendAdminOverrideNote,
} from '../../lib/warrantyUtils'
import useModalBehavior from '../../hooks/useModalBehavior'
import InspectorDrawer from './InspectorDrawer'
import ViewModeToggle from './ViewModeToggle'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table'

const KANBAN_COLUMNS = [
  {
    id: 'in_review',
    title: CLAIM_STATUSES.in_review.label,
    description: 'Triage & coverage check',
    nextAction: CLAIM_STATUSES.in_review.nextAction,
    accentBorder: 'border-amber-500/40',
    cardAccent: 'border-l-[3px] border-l-amber-500',
    headerBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    countBadge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: AlertTriangle,
    emptyText: 'No tickets in diagnostic intake',
  },
  {
    id: 'checking',
    title: CLAIM_STATUSES.checking.label,
    description: 'Bench test & fault verification',
    nextAction: CLAIM_STATUSES.checking.nextAction,
    accentBorder: 'border-sky-500/40',
    cardAccent: 'border-l-[3px] border-l-sky-500',
    headerBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    countBadge: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30',
    icon: Search,
    emptyText: 'No tickets under verification',
  },
  {
    id: 'approved',
    title: CLAIM_STATUSES.approved.label,
    description: 'Replacement or repair authorized',
    nextAction: CLAIM_STATUSES.approved.nextAction,
    accentBorder: 'border-emerald-500/40',
    cardAccent: 'border-l-[3px] border-l-emerald-500',
    headerBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    countBadge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: CheckCircle2,
    emptyText: 'No tickets awaiting repair or allocation',
  },
  {
    id: 'ready_for_release',
    title: CLAIM_STATUSES.ready_for_release.label,
    description: 'Staged at branch for customer pickup',
    nextAction: CLAIM_STATUSES.ready_for_release.nextAction,
    accentBorder: 'border-indigo-500/40',
    cardAccent: 'border-l-[3px] border-l-indigo-500',
    headerBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    countBadge: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    icon: Package,
    emptyText: 'No tickets ready for pickup',
  },
  {
    id: 'resolved',
    title: CLAIM_STATUSES.resolved.label,
    description: 'Unit handed over / case closed',
    nextAction: CLAIM_STATUSES.resolved.nextAction,
    accentBorder: 'border-teal-500/40',
    cardAccent: 'border-l-[3px] border-l-teal-500',
    headerBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
    countBadge: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
    icon: ShieldCheck,
    emptyText: 'No closed tickets',
  },
  {
    id: 'rejected',
    title: CLAIM_STATUSES.rejected.label,
    description: 'Outside terms or warranty void',
    nextAction: CLAIM_STATUSES.rejected.nextAction,
    accentBorder: 'border-rose-500/40',
    cardAccent: 'border-l-[3px] border-l-rose-500',
    headerBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
    countBadge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: XCircle,
    emptyText: 'No declined tickets',
  },
]

function NextActionTooltip({ stageTitle, nextAction, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)

  const updatePosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const tooltipWidth = 240
    const padding = 12
    const rawLeft = align === 'left' ? rect.left : rect.right - tooltipWidth
    const clampedLeft = Math.max(
      padding,
      Math.min(rawLeft, (typeof window !== 'undefined' ? window.innerWidth : 1200) - tooltipWidth - padding)
    )
    setCoords({
      top: rect.bottom + 6,
      left: clampedLeft,
    })
  }

  const handleOpen = () => {
    updatePosition()
    setOpen(true)
  }

  if (!nextAction) return null

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleOpen}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Next action for ${stageTitle}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          if (open) setOpen(false)
          else handleOpen()
        }}
        onFocus={handleOpen}
        onBlur={() => setOpen(false)}
        className="p-1 rounded-full text-current/70 hover:text-current hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-neutral-400/50 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          className="fixed z-[9999] w-60 px-3 py-2 rounded-lg bg-neutral-800 dark:bg-neutral-900 text-neutral-100 border border-neutral-700/80 shadow-lg text-left pointer-events-none"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
            Next Action Required
          </p>
          <p className="text-xs text-neutral-100 leading-relaxed">
            {nextAction}
          </p>
        </div>,
        document.body
      )}
    </div>
  )
}

export default function WarrantyClaimsScreen({ initialSearch = '' }) {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  useEffect(() => {
    if (initialSearch) setSearchQuery(initialSearch)
  }, [initialSearch])
  const [branchFilter, setBranchFilter] = useState('all') // 'all' | 'Cavite' | 'Quiapo'
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'in_review' | 'approved' | 'resolved' | 'rejected'
  const [sortOrder, setSortOrder] = useState('newest') // 'newest' | 'oldest'
  const [activeView, setActiveView] = useState('board') // 'board' (active) | 'archived'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards' | 'board'

  const [activeModalClaim, setActiveModalClaim] = useState(null)
  const [claimDrawerTab, setClaimDrawerTab] = useState('triage') // 'dossier' | 'triage'
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

  const handleCloseModal = () => {
    setActiveModalClaim(null)
    setModalSuccessMsg('')
  }

  const anyClaimModalOpen = Boolean(
    selectedMedia ||
    claimToArchive ||
    claimToDelete ||
    claimToRestore
  )

  useModalBehavior({
    isOpen: anyClaimModalOpen,
    onClose: () => {
      if (selectedMedia) setSelectedMedia(null)
      else if (claimToDelete && !actionLoading) setClaimToDelete(null)
      else if (claimToRestore && !actionLoading) setClaimToRestore(null)
      else if (claimToArchive && !actionLoading) setClaimToArchive(null)
      else if (activeModalClaim && !modalSaving) handleCloseModal()
    },
  })

  // Drag-and-drop & mobile tab state
  const [draggingClaimId, setDraggingClaimId] = useState(null)
  const [dragOverColumnId, setDragOverColumnId] = useState(null)
  const [mobileActiveTab, setMobileActiveTab] = useState('in_review')
  const [pendingClaimChanges, setPendingClaimChanges] = useState({})
  const [claimConfirmOpen, setClaimConfirmOpen] = useState(false)
  const [savingStagedClaims, setSavingStagedClaims] = useState(false)
  const [overridePrompt, setOverridePrompt] = useState(null) // { claim, baseStatus, targetStatus }
  const [overrideReason, setOverrideReason] = useState('')
  const [drawerOverrideReason, setDrawerOverrideReason] = useState('')
  const { showToast } = useToast()

  const pendingClaimList = Object.values(pendingClaimChanges)
  const pendingClaimCount = pendingClaimList.length

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
      const rawStatus = activeModalClaim.status || 'in_review'
      setModalStatus(rawStatus === 'pending' ? 'in_review' : rawStatus)
      setModalNotes(activeModalClaim.staff_notes || '')
      setDrawerOverrideReason('')
      setModalSuccessMsg('')
      setCopiedPhone(false)
    }
  }, [activeModalClaim])

  const handleOpenModal = (claim) => {
    setActiveModalClaim(claim)
  }

  const handleSaveModalChanges = async () => {
    if (!activeModalClaim) return
    const baseStatus = normalizeClaimStatus(activeModalClaim.status)
    const transition = isClaimTransitionAllowed({
      fromStatus: baseStatus,
      toStatus: modalStatus,
      isAdmin,
    })

    if (modalStatus !== baseStatus && !transition.allowed) {
      showToast('Transition Locked', 'Warranty claims can only move forward.', 'warning')
      return
    }
    if (transition.requiresOverride && !drawerOverrideReason.trim()) {
      showToast('Override Reason Required', 'Enter a reason before reversing a completed or closed stage.', 'warning')
      return
    }

    const finalNotes = transition.requiresOverride
      ? appendAdminOverrideNote(modalNotes, {
          fromStatus: baseStatus,
          toStatus: modalStatus,
          reason: drawerOverrideReason,
        })
      : modalNotes

    try {
      setModalSaving(true)
      await updateClaimStatus(activeModalClaim.id, modalStatus, finalNotes)

      // Update local state
      setClaims((prev) =>
        prev.map((c) =>
          c.id === activeModalClaim.id
            ? { ...c, status: modalStatus, staff_notes: finalNotes, updated_at: new Date().toISOString() }
            : c
        )
      )

      setActiveModalClaim((prev) =>
        prev ? { ...prev, status: modalStatus, staff_notes: finalNotes } : null
      )
      setModalNotes(finalNotes)
      setDrawerOverrideReason('')

      setModalSuccessMsg('Ticket updated successfully.')
      showToast('Ticket Updated', `CLAIM-${activeModalClaim.id.slice(0, 8).toUpperCase()} saved.`, 'success')
      setTimeout(() => setModalSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Failed to update ticket:', err)
      showToast('Update Failed', err.message || 'Could not update claim.', 'error')
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

      showToast('Ticket Archived', `Ticket CLAIM-${claimToArchive.id.slice(0, 8).toUpperCase()} moved to Archived Tickets.`, 'info')
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

      showToast('Ticket Restored', `Ticket CLAIM-${claimToRestore.id.slice(0, 8).toUpperCase()} restored to Active Board.`, 'success')
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

      showToast('Ticket Deleted', `Ticket CLAIM-${claimToDelete.id.slice(0, 8).toUpperCase()} permanently deleted.`, 'info')
      setClaimToDelete(null)
    } catch (err) {
      console.error('Failed to delete ticket:', err)
      alert('Error deleting claim: ' + (err.message || 'Server error'))
    } finally {
      setActionLoading(false)
    }
  }

  // Stage Drag & Drop / Quick Select status updates (forward-only for staff; admin override for reversals)
  const handleDropClaim = (claimId, targetStatus) => {
    const claim = claims.find((c) => c.id === claimId)
    if (!claim) return
    const baseStatus = normalizeClaimStatus(claim.status)

    if (targetStatus === baseStatus) {
      setPendingClaimChanges((prev) => {
        if (!prev[claimId]) return prev
        const next = { ...prev }
        delete next[claimId]
        return next
      })
      return
    }

    const { allowed, requiresOverride } = isClaimTransitionAllowed({
      fromStatus: baseStatus,
      toStatus: targetStatus,
      isAdmin,
    })

    if (!allowed) {
      showToast(
        'Transition Locked',
        'Warranty claims can only move forward. Backward movement is restricted.',
        'warning'
      )
      return
    }

    if (requiresOverride) {
      setOverridePrompt({ claim, baseStatus, targetStatus })
      setOverrideReason('')
      return
    }

    setPendingClaimChanges((prev) => ({
      ...prev,
      [claimId]: {
        claim,
        baseStatus,
        targetStatus,
        overrideReason: null,
      },
    }))
  }

  const handleConfirmAdminOverride = () => {
    if (!overridePrompt || !overrideReason.trim()) return
    const { claim, baseStatus, targetStatus } = overridePrompt
    setPendingClaimChanges((prev) => ({
      ...prev,
      [claim.id]: {
        claim,
        baseStatus,
        targetStatus,
        overrideReason: overrideReason.trim(),
      },
    }))
    setOverridePrompt(null)
    setOverrideReason('')
  }

  const handleDiscardClaimChanges = () => {
    setPendingClaimChanges({})
    setClaimConfirmOpen(false)
  }

  const handleConfirmSaveClaimChanges = async () => {
    if (pendingClaimList.length === 0) return
    setSavingStagedClaims(true)
    const nowIso = new Date().toISOString()
    const updatedMap = new Map()

    try {
      for (const entry of pendingClaimList) {
        const finalNotes = entry.overrideReason
          ? appendAdminOverrideNote(entry.claim.staff_notes, {
              fromStatus: entry.baseStatus,
              toStatus: entry.targetStatus,
              reason: entry.overrideReason,
            })
          : entry.claim.staff_notes || ''

        const { error } = await updateClaimStatus(
          entry.claim.id,
          entry.targetStatus,
          finalNotes
        )
        if (error) throw error
        updatedMap.set(entry.claim.id, {
          status: entry.targetStatus,
          staff_notes: finalNotes,
        })
      }

      setClaims((prev) =>
        prev.map((c) =>
          updatedMap.has(c.id)
            ? { ...c, ...updatedMap.get(c.id), updated_at: nowIso }
            : c
        )
      )
      setPendingClaimChanges({})
      setClaimConfirmOpen(false)
      showToast(
        'Changes Saved',
        `${pendingClaimList.length} warranty ${pendingClaimList.length === 1 ? 'claim' : 'claims'} updated successfully.`,
        'success'
      )
    } catch (err) {
      console.error('Failed to save staged claim changes:', err)
      showToast('Save Failed', err.message || 'Could not save claim stage changes.', 'error')
    } finally {
      setSavingStagedClaims(false)
    }
  }

  const handleCopyPhone = (phone) => {
    if (!phone) return
    navigator.clipboard.writeText(phone)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  // Merge staged status previews into claims for Table, Cards, and Board views
  const displayClaims = claims.map((c) => {
    const staged = pendingClaimChanges[c.id]
    return staged ? { ...c, status: staged.targetStatus, _isStaged: true } : c
  })

  // Calculate totals
  const activeClaimsCount = displayClaims.filter((c) => (c.status || 'in_review') !== 'archived').length
  const archivedClaimsCount = displayClaims.filter((c) => (c.status || 'in_review') === 'archived').length

  // Filter & sort claims based on activeView, branch, status, search
  const filteredClaims = displayClaims
    .filter((c) => {
      const isArchived = (c.status || 'in_review') === 'archived'
      if (activeView === 'board' && isArchived) return false
      if (activeView === 'archived' && !isArchived) return false

      if (activeView !== 'archived' && statusFilter !== 'all') {
        const normalizedStatus = (c.status || 'in_review') === 'pending' ? 'in_review' : (c.status || 'in_review')
        if (normalizedStatus !== statusFilter) return false
      }

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
    .sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime()
      const timeB = new Date(b.created_at || 0).getTime()
      return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA
    })

  // Group claims by status (handling legacy 'pending' as 'in_review' for intake)
  const claimsByColumn = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = filteredClaims.filter((c) => {
      const s = c.status || 'in_review'
      if (col.id === 'in_review') {
        return s === 'in_review' || s === 'pending'
      }
      return s === col.id
    })
    return acc
  }, {})

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      {/* Simplified Header with Scope Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg sm:text-xl font-bold text-jds-on-surface">Claims</h1>
          <div
            role="group"
            aria-label="Claims scope"
            className="inline-flex h-9 items-center rounded-lg border border-jds-outline-variant bg-jds-surface p-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => setActiveView('board')}
              aria-pressed={activeView !== 'archived'}
              className={`jds-focus-ring inline-flex h-full items-center gap-1.5 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                activeView !== 'archived'
                  ? 'bg-jds-surface-container text-jds-primary'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
              }`}
            >
              <span>Active Claims ({activeClaimsCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('archived')
                if (viewMode === 'board') setViewMode('table')
              }}
              aria-pressed={activeView === 'archived'}
              className={`jds-focus-ring inline-flex h-full items-center gap-1.5 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                activeView === 'archived'
                  ? 'bg-jds-surface-container text-jds-primary'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface'
              }`}
            >
              <Archive className="w-3.5 h-3.5 shrink-0" />
              <span>Archived Claims ({archivedClaimsCount})</span>
            </button>
          </div>
        </div>

        <button
          onClick={loadClaims}
          disabled={loading}
          className="px-3.5 h-9 rounded-lg bg-jds-surface border border-jds-outline-variant hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Simplified Filter & View Bar */}
      <div className="jds-panel p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-jds-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customer, phone, serial, product, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="jds-control w-full pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-jds-on-surface-variant/60 hover:text-jds-on-surface cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeView !== 'archived' && (
            <select
              aria-label="Filter by claim status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="jds-control font-semibold cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {KANBAN_COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.title}
                </option>
              ))}
            </select>
          )}

          <select
            aria-label="Filter by branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="jds-control font-semibold cursor-pointer"
          >
            <option value="all">All Branches</option>
            <option value="Cavite">Cavite</option>
            <option value="Quiapo">Quiapo</option>
          </select>

          <select
            aria-label="Sort claims"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="jds-control font-semibold cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>

          {(searchQuery || branchFilter !== 'all' || statusFilter !== 'all' || sortOrder !== 'newest') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setBranchFilter('all')
                setStatusFilter('all')
                setSortOrder('newest')
              }}
              className="jds-control font-semibold text-jds-on-surface-variant hover:text-jds-primary flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <div className="ml-auto">
            <ViewModeToggle
              value={viewMode}
              onChange={setViewMode}
              extraModes={
                activeView === 'archived'
                  ? []
                  : [{ id: 'board', label: 'Board', icon: Kanban }]
              }
            />
          </div>
        </div>
      </div>

      {/* Main Content: Table (default) | Cards | Board */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-jds-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-jds-on-surface-variant font-medium">Loading warranty claims...</p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="jds-panel overflow-hidden">
          {filteredClaims.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-4 space-y-2">
              <Inbox className="w-8 h-8 text-jds-on-surface-variant/40" />
              <p className="text-sm font-bold text-jds-on-surface">
                {activeView === 'archived' ? 'No archived claims found' : 'No warranty claims match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Equipment &amp; S/N</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filed</TableHead>
                    <TableHead className="text-right pr-5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => {
                    const customer = claim.customer_purchases?.customers
                    const product = claim.customer_purchases?.products
                    const purchase = claim.customer_purchases
                    const statusMeta = getClaimStatusMeta(claim.status)
                    const isArchived = (claim.status || 'in_review') === 'archived'

                    return (
                      <TableRow
                        key={claim.id}
                        onClick={() => handleOpenModal(claim)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-mono text-xs font-bold text-jds-primary">
                          CLAIM-{claim.id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-xs text-jds-on-surface">{customer?.full_name || 'Customer'}</div>
                          <div className="text-[11px] font-mono text-jds-on-surface-variant">{customer?.phone_number || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-jds-on-surface truncate max-w-[200px]">{product?.name || 'Solar Unit'}</div>
                          <div className="text-[11px] font-mono text-jds-on-surface-variant">{purchase?.serial_number ? `S/N: ${purchase.serial_number}` : '—'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-jds-on-surface">{claim.issue_category}</div>
                          <div className="text-[11px] text-jds-on-surface-variant truncate max-w-[200px]">{claim.description}</div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-jds-on-surface-variant">
                          {purchase?.branch_location || 'Cavite'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isArchived ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-neutral-500/10 text-neutral-600 border border-neutral-500/20">
                              Archived
                            </span>
                          ) : (
                            <select
                              aria-label={`Claim ${claim.id.slice(0, 8)} status`}
                              value={claim.status === 'pending' ? 'in_review' : (claim.status || 'in_review')}
                              onChange={(e) => handleDropClaim(claim.id, e.target.value)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-bold cursor-pointer focus:outline-none ${statusMeta?.color || 'bg-jds-surface border-jds-outline-variant/40 text-jds-on-surface'}`}
                            >
                              {KANBAN_COLUMNS.map((opt) => {
                                const current = normalizeClaimStatus(claim.status)
                                const { allowed } = isClaimTransitionAllowed({
                                  fromStatus: current,
                                  toStatus: opt.id,
                                  isAdmin,
                                })
                                return (
                                  <option
                                    key={opt.id}
                                    value={opt.id}
                                    disabled={opt.id !== current && !allowed}
                                  >
                                    {opt.title}
                                  </option>
                                )
                              })}
                            </select>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-jds-on-surface-variant tabular-nums">
                          {formatDate(claim.created_at)}
                        </TableCell>
                        <TableCell className="text-right pr-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isArchived ? (
                              isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateRestore(claim)}
                                    className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 text-xs font-semibold cursor-pointer"
                                  >
                                    Restore
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateDelete(claim)}
                                    className="p-1.5 rounded-lg text-jds-error hover:bg-jds-error-container/20 cursor-pointer"
                                    title="Delete claim"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenModal(claim)}
                                  className="px-2.5 py-1 rounded-lg border border-jds-outline-variant/60 text-xs font-bold text-jds-on-surface hover:bg-jds-surface-container cursor-pointer"
                                >
                                  Inspect
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleInitiateArchive(claim)}
                                    className="p-1.5 rounded-lg text-jds-on-surface-variant hover:text-jds-primary hover:bg-jds-surface-container cursor-pointer"
                                    title="Archive claim"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                )}
                              </>
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
      ) : viewMode === 'cards' && activeView !== 'archived' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClaims.length === 0 ? (
            <div className="col-span-full py-16 text-center jds-panel">
              <p className="text-sm font-bold text-jds-on-surface">No warranty claims match your filters</p>
            </div>
          ) : (
            filteredClaims.map((claim) => {
              const customer = claim.customer_purchases?.customers
              const product = claim.customer_purchases?.products
              const purchase = claim.customer_purchases
              const warrantyActive = isWarrantyActive(purchase?.warranty_expires_at)
              const daysLeft = getRemainingDays(purchase?.warranty_expires_at)

              return (
                <div
                  key={claim.id}
                  onClick={() => handleOpenModal(claim)}
                  className="jds-card p-4 cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-jds-outline-variant/60">
                      <span className="font-mono text-[11px] font-bold text-jds-primary bg-jds-primary/10 px-2 py-0.5 rounded-md border border-jds-primary/20">
                        CLAIM-{claim.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[11px] text-jds-on-surface-variant tabular-nums">
                        {formatDate(claim.created_at)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-jds-on-surface truncate">{customer?.full_name || 'Customer'}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-jds-surface-container text-jds-on-surface-variant shrink-0">
                          {purchase?.branch_location || 'Cavite'}
                        </span>
                      </div>
                      <p className="text-xs text-jds-on-surface-variant font-mono">{customer?.phone_number || 'No phone'}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-jds-surface-container-low border border-jds-outline-variant/60 space-y-1">
                      <div className="text-xs font-semibold text-jds-on-surface truncate">{product?.name || 'Solar Light Unit'}</div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-jds-on-surface-variant">{purchase?.serial_number || 'No S/N'}</span>
                        <span className={`font-bold ${warrantyActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {warrantyActive ? `${daysLeft}d warranty` : 'Expired'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-jds-on-surface-variant line-clamp-2">
                      <strong className="text-jds-on-surface">{claim.issue_category}:</strong> {claim.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-jds-outline-variant/60 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      aria-label={`Move claim ${claim.id.slice(0, 8)} status`}
                      value={claim.status === 'pending' ? 'in_review' : (claim.status || 'in_review')}
                      onChange={(e) => handleDropClaim(claim.id, e.target.value)}
                      className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${getClaimStatusMeta(claim.status).color || 'border-jds-outline-variant bg-jds-surface text-jds-on-surface'}`}
                    >
                      {KANBAN_COLUMNS.map((opt) => {
                        const current = normalizeClaimStatus(claim.status)
                        const { allowed } = isClaimTransitionAllowed({
                          fromStatus: current,
                          toStatus: opt.id,
                          isAdmin,
                        })
                        return (
                          <option
                            key={opt.id}
                            value={opt.id}
                            disabled={opt.id !== current && !allowed}
                          >
                            {opt.title}
                          </option>
                        )
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleOpenModal(claim)}
                      className="px-3 py-1.5 rounded-lg bg-jds-primary/10 text-jds-primary text-xs font-bold cursor-pointer"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : activeView === 'archived' ? (
        <div className="space-y-4">
          <div className="p-4 jds-panel bg-jds-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Archive className="w-5 h-5 text-neutral-500" />
              <div>
                <h2 className="text-sm font-bold text-jds-on-surface">Archived Warranty Tickets</h2>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-jds-surface border border-jds-outline-variant text-jds-on-surface">
              {filteredClaims.length} Archived Record{filteredClaims.length === 1 ? '' : 's'}
            </span>
          </div>

          {filteredClaims.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-jds-outline-variant bg-jds-surface-container-low/40 space-y-3">
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
                    className="jds-card p-4 cursor-pointer space-y-3 flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-jds-outline-variant/60">
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
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-jds-surface-container text-jds-on-surface-variant border border-jds-outline-variant/60 shrink-0">
                            {purchase?.branch_location || 'Cavite'}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-jds-on-surface-variant/70 pl-5">
                          {customer?.phone_number || 'No phone'}
                        </div>
                      </div>

                      {/* Product */}
                      <div className="p-3 rounded-lg bg-jds-surface-container-low border border-jds-outline-variant/60 space-y-1">
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
                      className="pt-3 border-t border-jds-outline-variant/60 flex items-center justify-between gap-2"
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
        <div className="space-y-4 pb-6">
          {/* Mobile Tabbed Status Switcher (< md) */}
          <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {KANBAN_COLUMNS.map((col) => {
              const ColumnIcon = col.icon
              const count = (claimsByColumn[col.id] || []).length
              const isActive = mobileActiveTab === col.id
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileActiveTab(col.id)}
                  className={`min-h-[44px] shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${isActive
                      ? `${col.headerBg} ${col.accentBorder} shadow-xs`
                      : 'bg-jds-surface border-jds-outline-variant/30 text-jds-on-surface-variant'
                    }`}
                >
                  <ColumnIcon className="w-4 h-4 shrink-0" />
                  <span>{col.title}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-extrabold border ${col.countBadge}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col md:flex-row md:overflow-x-auto gap-4 pb-2 items-stretch md:items-start">
            {KANBAN_COLUMNS.map((col) => {
              const ColumnIcon = col.icon
              const colClaims = claimsByColumn[col.id] || []
              const isDropTarget = dragOverColumnId === col.id
              const isMobileVisible = mobileActiveTab === col.id
              const draggedClaim = draggingClaimId
                ? displayClaims.find((c) => c.id === draggingClaimId)
                : null
              const dragTransition = draggedClaim
                ? isClaimTransitionAllowed({
                    fromStatus: draggedClaim.status,
                    toStatus: col.id,
                    isAdmin,
                  })
                : { allowed: true, requiresOverride: false }
              const isLockedDrop = Boolean(
                isDropTarget &&
                  draggingClaimId &&
                  draggedClaim &&
                  normalizeClaimStatus(draggedClaim.status) !== col.id &&
                  !dragTransition.allowed
              )

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = isLockedDrop ? 'none' : 'move'
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
                  className={`${isMobileVisible ? 'flex' : 'hidden md:flex'} flex-col bg-jds-surface-container-low/40 rounded-2xl border transition-all md:w-[275px] lg:w-[285px] md:shrink-0 max-w-full shadow-2xs overflow-visible ${isLockedDrop
                      ? 'border-rose-500/50 ring-2 ring-rose-500/30 bg-rose-500/[0.03]'
                      : isDropTarget
                        ? 'border-jds-primary ring-2 ring-jds-primary/60 bg-jds-primary/[0.04]'
                        : 'border-jds-outline-variant/30'
                    }`}
                >
                  {/* Column Header */}
                  <div className={`p-4 rounded-t-2xl border-b border-jds-outline-variant/30 flex items-center justify-between gap-2 ${col.headerBg}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <ColumnIcon className="w-4 h-4 shrink-0" />
                      <h2 className="text-xs font-bold uppercase tracking-wider leading-tight">{col.title}</h2>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <NextActionTooltip stageTitle={col.title} nextAction={col.nextAction} align="right" />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${col.countBadge}`}>
                        {colClaims.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards Container (independent vertical scroll on md+, natural flow on mobile) */}
                  <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 md:min-h-[460px] md:max-h-[calc(100vh-270px)] md:overflow-y-auto md:pr-2">
                    {/* Drop zone placeholder indicator when dragged over */}
                    {isDropTarget && draggingClaimId && (
                      isLockedDrop ? (
                        <div className="p-3.5 rounded-xl border-2 border-dashed border-rose-500/50 bg-rose-500/10 text-center text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4 shrink-0" />
                          <span>Locked (forward-only)</span>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl border-2 border-dashed border-jds-primary/60 bg-jds-primary/10 text-center text-xs font-semibold text-jds-primary flex items-center justify-center gap-2">
                          <ColumnIcon className="w-4 h-4" />
                          <span>Drop to move to {col.title}</span>
                        </div>
                      )
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
                        const normStatus = normalizeClaimStatus(claim.status)
                        const isTerminalForStaff = !isAdmin && (normStatus === 'resolved' || normStatus === 'rejected')

                        return (
                          <div
                            key={claim.id}
                            draggable={!isTerminalForStaff}
                            onDragStart={(e) => {
                              if (isTerminalForStaff) {
                                e.preventDefault()
                                return
                              }
                              e.dataTransfer.setData('text/plain', claim.id)
                              e.dataTransfer.effectAllowed = 'move'
                              setDraggingClaimId(claim.id)
                            }}
                            onDragEnd={() => {
                              setDraggingClaimId(null)
                              setDragOverColumnId(null)
                            }}
                            onClick={() => handleOpenModal(claim)}
                            className={`group relative rounded-lg border bg-jds-surface p-3 transition-all ${isTerminalForStaff ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} space-y-2 select-none overflow-hidden ${col.cardAccent || ''} ${isDragging
                                ? 'border-jds-primary ring-2 ring-jds-primary shadow-xl z-20 opacity-100'
                                : 'border-jds-outline-variant/40 shadow-2xs hover:shadow-sm hover:border-jds-primary/50'
                              }`}
                          >
                            {/* Row 1: Identifier + Branch & Date */}
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center gap-1 min-w-0">
                                <GripVertical className="w-3.5 h-3.5 text-jds-on-surface-variant/35 group-hover:text-jds-primary transition-colors shrink-0" />
                                <span className="font-mono font-semibold text-jds-on-surface-variant truncate">
                                  CLAIM-{claim.id.slice(0, 8).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-jds-surface-container text-jds-on-surface-variant border border-jds-outline-variant/30">
                                  {purchase?.branch_location || 'Cavite'}
                                </span>
                                <span className="text-[10px] text-jds-on-surface-variant/70">
                                  {formatDate(claim.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Row 2: Product Title & 1-line Issue Summary */}
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-jds-on-surface truncate">
                                {product?.name || 'Solar Light Unit'}
                              </div>
                              {claim.description && (
                                <p className="text-[11px] text-jds-on-surface-variant line-clamp-1">
                                  {claim.description}
                                </p>
                              )}
                            </div>

                            {/* Row 3: Compact Metadata Pills (Customer, Category, Warranty, Signals) */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="inline-flex items-center gap-1 font-medium text-jds-on-surface-variant max-w-[105px] truncate">
                                <User className="w-3 h-3 shrink-0 opacity-70" />
                                <span className="truncate">{customer?.full_name || 'Customer'}</span>
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-jds-surface-container-low text-jds-on-surface-variant border border-jds-outline-variant/30 truncate max-w-[100px]">
                                {claim.issue_category}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium border ${
                                  warrantyActive
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${warrantyActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {warrantyActive ? `${daysLeft}d` : 'Exp'}
                              </span>
                              {claim._isStaged && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
                                  Staged
                                </span>
                              )}
                              {claim.media_urls && claim.media_urls.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-jds-on-surface-variant/80 ml-auto" title={`${claim.media_urls.length} attachment(s)`}>
                                  <ImageIcon className="w-3 h-3" />
                                  <span>{claim.media_urls.length}</span>
                                </span>
                              )}
                              {claim.staff_notes && (
                                <span className="inline-flex items-center text-blue-600 dark:text-blue-400" title="Has technician notes">
                                  <MessageSquare className="w-3 h-3" />
                                </span>
                              )}
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
        </div>
      )}

      {/* STAGED CLAIM STAGE SAVE CHANGES BAR + CONFIRMATION MODAL */}
      {pendingClaimCount > 0 && (
        <div
          role="region"
          aria-label="Pending claim stage changes"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl rounded-xl border border-jds-primary/40 bg-jds-surface/95 backdrop-blur-md px-4 py-3 shadow-xl flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-bold text-jds-on-surface">
              {pendingClaimCount} unsaved {pendingClaimCount === 1 ? 'claim change' : 'claim changes'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {pendingClaimList.map((entry) => (
                <span
                  key={entry.claim.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] font-medium text-jds-on-surface max-w-full"
                >
                  <span className="font-mono font-semibold">
                    CLAIM-{entry.claim.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold truncate">
                    ({getClaimStatusMeta(entry.baseStatus).label} {'->'} {getClaimStatusMeta(entry.targetStatus).label})
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDiscardClaimChanges}
              disabled={savingStagedClaims}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setClaimConfirmOpen(true)}
              disabled={savingStagedClaims}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes ({pendingClaimCount})
            </Button>
          </div>
        </div>
      )}

      <Dialog open={claimConfirmOpen} onOpenChange={(open) => !savingStagedClaims && setClaimConfirmOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              Confirm Claim Stage Changes
            </DialogTitle>
            <DialogDescription>
              Review the {pendingClaimCount} pending {pendingClaimCount === 1 ? 'claim update' : 'claim updates'} below before saving to the database.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto space-y-2 py-1">
            {pendingClaimList.map((entry) => (
              <div
                key={entry.claim.id}
                className="rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low/60 px-3 py-2 text-xs space-y-1"
              >
                <div className="font-mono font-semibold text-jds-on-surface">
                  CLAIM-{entry.claim.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="text-[11px] text-jds-on-surface-variant">
                  <span>{getClaimStatusMeta(entry.baseStatus).label}</span>{' -> '}
                  <strong className="text-jds-primary">{getClaimStatusMeta(entry.targetStatus).label}</strong>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setClaimConfirmOpen(false)}
              disabled={savingStagedClaims}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSaveClaimChanges}
              disabled={savingStagedClaims}
              className="gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {savingStagedClaims ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(overridePrompt)} onOpenChange={(open) => !open && setOverridePrompt(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500 shrink-0" />
              Admin Stage Reversal Override
            </DialogTitle>
            <DialogDescription>
              Reversing a completed or closed stage is audited. Enter a reason for moving{' '}
              <span className="font-mono font-semibold text-jds-on-surface">
                {overridePrompt ? `CLAIM-${overridePrompt.claim.id.slice(0, 8).toUpperCase()}` : ''}
              </span>{' '}
              from{' '}
              <strong>{overridePrompt ? getClaimStatusMeta(overridePrompt.baseStatus).label : ''}</strong>{' '}
              back to{' '}
              <strong>{overridePrompt ? getClaimStatusMeta(overridePrompt.targetStatus).label : ''}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-1">
            <label htmlFor="admin-override-reason" className="text-xs font-bold text-jds-on-surface-variant block">
              Override Reason (Logged to Technician Notes)
            </label>
            <textarea
              id="admin-override-reason"
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="e.g., Customer returned unit for secondary bench verification"
              className="w-full rounded-lg border border-jds-outline-variant/50 bg-jds-surface-container-low p-2.5 text-xs text-jds-on-surface outline-none focus:border-jds-primary"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOverridePrompt(null)
                setOverrideReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!overrideReason.trim()}
              onClick={handleConfirmAdminOverride}
              className="gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Stage Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warranty Claim Slide-Over Inspector Drawer */}
      <InspectorDrawer
        isOpen={Boolean(activeModalClaim)}
        onClose={handleCloseModal}
        disableClose={modalSaving || Boolean(selectedMedia || claimToArchive || claimToDelete || claimToRestore)}
        widthClass="max-w-[560px]"
        subtitle={
          activeModalClaim
            ? `CLAIM-${activeModalClaim.id.slice(0, 8).toUpperCase()} · ${activeModalClaim.customer_purchases?.branch_location || 'Cavite'} Store`
            : ''
        }
        title={activeModalClaim?.customer_purchases?.products?.name || 'Warranty Claim Ticket'}
        tabs={[
          { id: 'triage', label: 'Review & Triage' },
          { id: 'dossier', label: 'Dossier & Evidence' },
        ]}
        activeTab={claimDrawerTab}
        onTabChange={setClaimDrawerTab}
        footer={
          activeModalClaim && (
            <div className="flex flex-wrap items-center justify-between gap-2 w-full">
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  {activeModalClaim.status === 'archived' ? (
                    <button
                      type="button"
                      disabled={modalSaving}
                      onClick={() => handleInitiateRestore(activeModalClaim)}
                      className="jds-btn-motion px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={modalSaving}
                      onClick={() => handleInitiateArchive(activeModalClaim)}
                      className="jds-btn-motion px-3 py-2 rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-lowest text-jds-on-surface text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Archive className="w-3.5 h-3.5 text-jds-on-surface-variant" />
                      <span>Archive</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={modalSaving}
                    onClick={() => handleInitiateDelete(activeModalClaim)}
                    className="jds-btn-motion px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={modalSaving}
                  className="jds-btn-motion px-4 py-2 rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-lowest text-xs font-semibold text-jds-on-surface-variant hover:text-jds-on-surface cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalSaving}
                  onClick={handleSaveModalChanges}
                  className="jds-btn-motion px-5 py-2 rounded-lg bg-jds-primary text-jds-on-primary text-xs font-bold hover:bg-jds-primary/90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {modalSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        }
      >
        {activeModalClaim && (
          <div className="space-y-5">
            {modalSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{modalSuccessMsg}</span>
              </div>
            )}

            {/* Status & Warranty Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-jds-outline-variant/25">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getClaimStatusMeta(activeModalClaim.status).color}`}>
                  {getClaimStatusMeta(activeModalClaim.status).label}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 border border-amber-500/20">
                  {activeModalClaim.issue_category}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                  isWarrantyActive(activeModalClaim.customer_purchases?.warranty_expires_at)
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                }`}
              >
                {isWarrantyActive(activeModalClaim.customer_purchases?.warranty_expires_at)
                  ? 'Active Warranty'
                  : 'Warranty Expired'}
              </span>
            </div>

            {claimDrawerTab === 'triage' ? (
              <div className="space-y-5">
                {/* Visual Claim Lifecycle Pipeline */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-jds-on-surface-variant">
                      Claim Lifecycle Stage
                    </span>
                    <NextActionTooltip
                      stageTitle={getClaimStatusMeta(modalStatus === 'pending' ? 'in_review' : (modalStatus || activeModalClaim.status || 'in_review')).label}
                      nextAction={getClaimStatusMeta(modalStatus === 'pending' ? 'in_review' : (modalStatus || activeModalClaim.status || 'in_review')).nextAction}
                      align="left"
                    />
                  </div>
                  <div className="space-y-2">
                    {KANBAN_COLUMNS.map((col) => {
                      const ColIcon = col.icon
                      const drawerBase = normalizeClaimStatus(activeModalClaim.status)
                      const isCurrent = (modalStatus || drawerBase) === col.id
                      const isCompleted = isCompletedClaimStage(drawerBase, col.id)
                      const transition = isClaimTransitionAllowed({
                        fromStatus: drawerBase,
                        toStatus: col.id,
                        isAdmin,
                      })
                      const isDisabled = col.id !== drawerBase && !transition.allowed

                      return (
                        <button
                          key={col.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => !isDisabled && setModalStatus(col.id)}
                          className={`w-full text-left flex items-center justify-between p-3 rounded-xl text-xs transition-all border ${
                            isDisabled
                              ? 'opacity-50 cursor-not-allowed border-jds-outline-variant/20 bg-jds-surface-container-low/20 text-jds-on-surface-variant'
                              : isCurrent
                                ? `${col.headerBg} font-bold border-jds-primary/40 cursor-pointer`
                                : isCompleted
                                  ? 'opacity-65 cursor-pointer border-jds-outline-variant/25 bg-jds-surface-container-low/30 text-jds-on-surface-variant hover:bg-jds-surface-container'
                                  : 'cursor-pointer border-jds-outline-variant/25 bg-jds-surface-container-low/40 text-jds-on-surface-variant hover:bg-jds-surface-container'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <ColIcon className="w-4 h-4 shrink-0" />
                            <div>
                              <div className="font-semibold text-xs leading-none">{col.title}</div>
                              <div className="text-[11px] opacity-80 mt-1">{col.description}</div>
                            </div>
                          </div>
                          {isCurrent ? (
                            <span className="text-[10px] uppercase tracking-wide font-extrabold px-2 py-0.5 rounded-full border border-current">
                              Active
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-jds-surface-container text-jds-on-surface-variant border border-jds-outline-variant/40">
                              {!isAdmin && <Lock className="w-2.5 h-2.5" />}
                              Completed
                            </span>
                          ) : isDisabled ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-jds-surface-container text-jds-on-surface-variant border border-jds-outline-variant/40">
                              <Lock className="w-2.5 h-2.5" />
                              Locked
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Target Stage Select & Technician Notes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="claim-target-stage" className="text-xs font-bold text-jds-on-surface-variant block">
                      Target Ticket Stage
                    </label>
                    <NextActionTooltip
                      stageTitle={getClaimStatusMeta(modalStatus === 'pending' ? 'in_review' : (modalStatus || activeModalClaim.status || 'in_review')).label}
                      nextAction={getClaimStatusMeta(modalStatus === 'pending' ? 'in_review' : (modalStatus || activeModalClaim.status || 'in_review')).nextAction}
                      align="left"
                    />
                  </div>
                  <select
                    id="claim-target-stage"
                    value={modalStatus === 'pending' ? 'in_review' : modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="w-full h-10 bg-jds-surface-container-low border border-jds-outline-variant/40 rounded-lg px-3 text-xs font-semibold text-jds-on-surface outline-none focus:border-jds-primary cursor-pointer"
                  >
                    {KANBAN_COLUMNS.map((col) => {
                      const drawerBase = normalizeClaimStatus(activeModalClaim.status)
                      const { allowed } = isClaimTransitionAllowed({
                        fromStatus: drawerBase,
                        toStatus: col.id,
                        isAdmin,
                      })
                      return (
                        <option
                          key={col.id}
                          value={col.id}
                          disabled={col.id !== drawerBase && !allowed}
                        >
                          {col.title} ({col.description})
                        </option>
                      )
                    })}
                    {modalStatus === 'archived' && (
                      <option value="archived">Archived / Concluded</option>
                    )}
                  </select>

                  {isAdmin &&
                    isClaimTransitionAllowed({
                      fromStatus: normalizeClaimStatus(activeModalClaim.status),
                      toStatus: modalStatus,
                      isAdmin: true,
                    }).requiresOverride && (
                      <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-1.5">
                        <label
                          htmlFor="drawer-override-reason"
                          className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block"
                        >
                          Admin Override Reason (Required for Reversal)
                        </label>
                        <input
                          id="drawer-override-reason"
                          type="text"
                          value={drawerOverrideReason}
                          onChange={(e) => setDrawerOverrideReason(e.target.value)}
                          placeholder="e.g., Re-opened for secondary voltage bench test"
                          className="w-full h-9 rounded-lg border border-amber-500/40 bg-jds-surface px-3 text-xs text-jds-on-surface outline-none focus:border-jds-primary"
                        />
                      </div>
                    )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="claim-tech-notes" className="text-xs font-bold text-jds-on-surface-variant">
                      Technician Notes
                    </label>
                    <span className="text-[11px] text-jds-on-surface-variant">Visible to customer</span>
                  </div>
                  <textarea
                    id="claim-tech-notes"
                    rows={3}
                    placeholder="e.g. Unit inspected at counter. Battery fault confirmed; replacement authorized."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-jds-surface-container-low border border-jds-outline-variant/40 rounded-lg p-3 text-xs text-jds-on-surface outline-none focus:border-jds-primary leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Approved: Bring solar unit to counter for direct swap.',
                      'Inspection: Unit passed test. Please verify cable connection.',
                      'Claim approved: Replacement module ready for pickup.',
                      'Declined: Physical fracture outside warranty terms.',
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setModalNotes(preset)}
                        className="px-2.5 py-1 rounded-full bg-jds-surface-container text-[11px] font-medium text-jds-on-surface-variant hover:text-jds-primary hover:bg-jds-primary/10 cursor-pointer"
                      >
                        {preset.slice(0, 32)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Customer & Hardware Dossier */}
                <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-jds-on-surface">
                        {activeModalClaim.customer_purchases?.customers?.full_name || 'Customer'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs text-jds-on-surface-variant">
                          {activeModalClaim.customer_purchases?.customers?.phone_number || 'No contact phone'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(activeModalClaim.customer_purchases?.customers?.phone_number)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-jds-surface-container text-[11px] font-semibold text-jds-on-surface-variant hover:text-jds-primary cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                    <span className="text-[11px] text-jds-on-surface-variant tabular-nums">
                      Submitted {formatDate(activeModalClaim.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs pt-2 border-t border-jds-outline-variant/25">
                    <div>
                      <span className="text-[11px] text-jds-on-surface-variant block">Serial Number</span>
                      <span className="font-mono font-bold text-jds-on-surface">
                        {activeModalClaim.customer_purchases?.serial_number || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-jds-on-surface-variant block">Coverage Remaining</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        {getRemainingDays(activeModalClaim.customer_purchases?.warranty_expires_at)} days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fault Statement */}
                <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/50 p-4 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant">
                    Customer Problem Statement
                  </span>
                  <p className="text-xs text-jds-on-surface whitespace-pre-line leading-relaxed">
                    {activeModalClaim.description}
                  </p>
                </div>

                {/* Photographic Fault Evidence */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-jds-on-surface block">
                    Fault Evidence ({activeModalClaim.media_urls?.length || 0} attached)
                  </span>
                  {activeModalClaim.media_urls && activeModalClaim.media_urls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {activeModalClaim.media_urls.map((url, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setSelectedMedia(url)}
                          className="group relative aspect-4/3 rounded-lg overflow-hidden bg-jds-surface-container cursor-pointer border border-jds-outline-variant/30"
                        >
                          <img
                            src={url}
                            alt="Fault evidence"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-jds-surface-container-low/40 text-center text-xs text-jds-on-surface-variant">
                      No customer media files attached for this claim.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </InspectorDrawer>

      {/* ARCHIVE CONFIRMATION MODAL */}
      {claimToArchive && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setClaimToArchive(null)
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl border border-jds-outline-variant/40 bg-jds-surface p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
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
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl border border-emerald-500/30 bg-jds-surface p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
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
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-2xl border border-rose-500/30 bg-jds-surface p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
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
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] bg-black rounded-2xl overflow-hidden p-2 shadow-2xl"
          >
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

