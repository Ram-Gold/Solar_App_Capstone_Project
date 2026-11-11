import { useState, useEffect } from 'react'
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
  ShieldX,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Phone,
  User,
  Package,
  Calendar,
  Store,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  X,
  Save,
  Mail,
  CheckCircle2,
  Clock } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import {
  fetchAllCustomers,
  updateCustomerProfile,
  addCustomerProductPurchase,
  voidCustomerWarranty,
  unvoidCustomerWarranty,
  extendCustomerWarranty,
  removeCustomerPurchase,
  deleteCustomerAccount,
  queueAndSendCustomerConfirmationEmail
} from '../../lib/customerService'
import { formatDate, calculateExpiryDate } from '../../lib/warrantyUtils'
import {
  sanitizeText,
  sanitizePhone,
  isValidPhone,
  sanitizeEmail,
  isValidEmail,
  sanitizeSerialNumber,
  sanitizeNumber
} from '../../lib/sanitize.js'
import QRReceiptModal from './QRReceiptModal'
import useModalBehavior from '../../hooks/useModalBehavior'

export default function CustomersScreen({ onNavigate, onSelectCustomerForSale }) {
  const { role } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [branchFilter, setBranchFilter] = useState('All')
  const [warrantyFilter, setWarrantyFilter] = useState('All')

  // Catalog products for quick product registration
  const [catalogProducts, setCatalogProducts] = useState([])

  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [activeCustomerForQr, setActiveCustomerForQr] = useState(null)

  // Edit Customer Profile state inside modal
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState(null)
  const [emailConfirmationProgress, setEmailConfirmationProgress] = useState(null)
  const [isResendingEmail, setIsResendingEmail] = useState(false)

  // Token & link states inside modal
  const [isTokenRevealedInModal, setIsTokenRevealedInModal] = useState(false)
  const [modalTokenCopied, setModalTokenCopied] = useState(false)
  const [modalLinkCopied, setModalLinkCopied] = useState(false)

  // Add Product form state inside modal
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [newProductId, setNewProductId] = useState('')
  const [newSerial, setNewSerial] = useState('')
  const [newWarrantyMonths, setNewWarrantyMonths] = useState(12)
  const [newBranch, setNewBranch] = useState('Cavite')
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [isSavingProduct, setIsSavingProduct] = useState(false)
  const [productAddMessage, setProductAddMessage] = useState(null)

  // Warranty management modal states
  const [voidingPurchase, setVoidingPurchase] = useState(null)
  const [voidReasonPreset, setVoidReasonPreset] = useState('Broken warranty seal / Tampered')
  const [voidReasonCustom, setVoidReasonCustom] = useState('')
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false)

  const [extendingPurchase, setExtendingPurchase] = useState(null)
  const [extensionMonths, setExtensionMonths] = useState(12)
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false)

  const [removingPurchase, setRemovingPurchase] = useState(null)
  const [inlineConfirmRemoveId, setInlineConfirmRemoveId] = useState(null)
  const [isSubmittingRemoval, setIsSubmittingRemoval] = useState(false)

  // Customer account deletion states (Admin only)
  const [deletingCustomer, setDeletingCustomer] = useState(null)
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false)
  const [deleteCustomerError, setDeleteCustomerError] = useState(null)
  const [customerActionBanner, setCustomerActionBanner] = useState(null)

  const [unitActionMessage, setUnitActionMessage] = useState(null)

  const anyCustomerModalOpen = Boolean(
    selectedCustomer ||
    voidingPurchase ||
    extendingPurchase ||
    removingPurchase ||
    deletingCustomer
  )

  useModalBehavior({
    isOpen: anyCustomerModalOpen,
    onClose: () => {
      if (deletingCustomer && !isDeletingCustomer) setDeletingCustomer(null)
      else if (removingPurchase && !isSubmittingRemoval) setRemovingPurchase(null)
      else if (extendingPurchase && !isSubmittingExtension) setExtendingPurchase(null)
      else if (voidingPurchase && !isSubmittingVoid) setVoidingPurchase(null)
      else if (selectedCustomer && !isSavingProfile && !isSavingProduct) setSelectedCustomer(null)
    },
  })

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

  const loadCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, watt, default_warranty_months, image_url')
        .order('name', { ascending: true })
      if (!error && data) {
        setCatalogProducts(data)
        if (data.length > 0 && !newProductId) {
          setNewProductId(data[0].id)
        }
      }
    } catch (e) {
      console.warn('Failed to load catalog products:', e)
    }
  }

  useEffect(() => {
    loadData()
    loadCatalog()
  }, [])

  // Open modal and initialize form state
  const handleOpenCustomerModal = (customer, openAddProduct = false) => {
    setSelectedCustomer(customer)
    setEditName(customer.full_name || '')
    setEditPhone(customer.phone_number || '')
    setEditEmail(customer.email || '')
    setIsSavingProfile(false)
    setProfileMessage(null)
    setEmailConfirmationProgress(null)
    setIsResendingEmail(false)
    setIsTokenRevealedInModal(false)
    setModalTokenCopied(false)
    setModalLinkCopied(false)
    setIsAddingProduct(openAddProduct)
    setNewProductId(catalogProducts[0]?.id || '')
    setNewSerial('')
    setNewWarrantyMonths(12)
    setNewBranch('Cavite')
    setNewPurchaseDate(new Date().toISOString().split('T')[0])
    setProductAddMessage(null)
    setUnitActionMessage(null)
    setVoidingPurchase(null)
    setExtendingPurchase(null)
    setRemovingPurchase(null)
  }

  const handleCloseCustomerModal = () => {
    setSelectedCustomer(null)
    setIsAddingProduct(false)
    setProfileMessage(null)
    setEmailConfirmationProgress(null)
    setIsResendingEmail(false)
    setProductAddMessage(null)
    setUnitActionMessage(null)
    setVoidingPurchase(null)
    setExtendingPurchase(null)
    setRemovingPurchase(null)
    setInlineConfirmRemoveId(null)
    setDeletingCustomer(null)
    setDeleteCustomerError(null)
  }

  // Handle Admin Delete Customer Account
  const handleConfirmDeleteCustomer = async () => {
    if (!deletingCustomer) return
    try {
      setIsDeletingCustomer(true)
      setDeleteCustomerError(null)
      await deleteCustomerAccount({
        customerId: deletingCustomer.id,
        token: deletingCustomer.access_token
      })

      const deletedName = deletingCustomer.full_name
      setCustomers(prev => prev.filter(c => c.id !== deletingCustomer.id))
      handleCloseCustomerModal()
      setCustomerActionBanner({
        type: 'success',
        text: `Customer account "${deletedName}" and all associated equipment records were permanently deleted.`
      })
      setTimeout(() => setCustomerActionBanner(null), 5000)
    } catch (err) {
      console.error('Failed to delete customer account:', err)
      setDeleteCustomerError(err.message || 'Failed to delete customer account.')
    } finally {
      setIsDeletingCustomer(false)
    }
  }

  // Handle Void Warranty
  const handleConfirmVoid = async () => {
    if (!voidingPurchase || !selectedCustomer) return
    const finalReason = voidReasonPreset === 'Other / Custom reason'
      ? (voidReasonCustom.trim() || 'Administrative Void')
      : (voidReasonCustom.trim() ? `${voidReasonPreset}: ${voidReasonCustom.trim()}` : voidReasonPreset)

    try {
      setIsSubmittingVoid(true)
      const { warning, error } = await voidCustomerWarranty({
        purchaseId: voidingPurchase.id,
        reason: finalReason
      })
      if (error) throw error

      const updatedPurchases = (selectedCustomer.purchases || []).map(p => {
        if (p.id === voidingPurchase.id) {
          return {
            ...p,
            is_voided: true,
            void_reason: finalReason,
            voided_at: new Date().toISOString(),
            is_warranty_active: false,
            days_remaining: 0
          }
        }
        return p
      })

      const activeCount = updatedPurchases.filter(p => p.is_warranty_active).length

      setSelectedCustomer(prev => ({
        ...prev,
        purchases: updatedPurchases,
        active_warranties_count: activeCount
      }))

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? {
        ...c,
        purchases: updatedPurchases,
        active_warranties_count: activeCount
      } : c))

      setVoidingPurchase(null)
      setVoidReasonCustom('')
      setUnitActionMessage({
        type: 'success',
        text: warning ? `Warranty voided. (${warning})` : 'Unit warranty successfully marked as voided.'
      })
      setTimeout(() => setUnitActionMessage(null), 4000)
    } catch (err) {
      console.error('Failed to void warranty:', err)
      setUnitActionMessage({ type: 'error', text: err.message || 'Failed to void warranty.' })
    } finally {
      setIsSubmittingVoid(false)
    }
  }

  // Handle Reactivate / Unvoid Warranty
  const handleConfirmUnvoid = async (purchase) => {
    if (!purchase || !selectedCustomer) return

    try {
      setUnitActionMessage(null)
      const { error } = await unvoidCustomerWarranty({
        purchaseId: purchase.id,
        warrantyMonths: purchase.warranty_months,
        purchaseDate: purchase.purchase_date
      })
      if (error) throw error

      const expiry = purchase.warranty_expires_at || calculateExpiryDate(purchase.purchase_date, purchase.warranty_months)
      const diffDays = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24))
      const isActive = diffDays > 0

      const updatedPurchases = (selectedCustomer.purchases || []).map(p => {
        if (p.id === purchase.id) {
          return {
            ...p,
            is_voided: false,
            void_reason: null,
            voided_at: null,
            is_warranty_active: isActive,
            days_remaining: Math.max(0, diffDays)
          }
        }
        return p
      })

      const activeCount = updatedPurchases.filter(p => p.is_warranty_active).length

      setSelectedCustomer(prev => ({
        ...prev,
        purchases: updatedPurchases,
        active_warranties_count: activeCount
      }))

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? {
        ...c,
        purchases: updatedPurchases,
        active_warranties_count: activeCount
      } : c))

      setUnitActionMessage({ type: 'success', text: 'Warranty reactivated and restored successfully.' })
      setTimeout(() => setUnitActionMessage(null), 3000)
    } catch (err) {
      console.error('Failed to unvoid warranty:', err)
      setUnitActionMessage({ type: 'error', text: err.message || 'Failed to reactivate warranty.' })
    }
  }

  // Handle Extend Warranty
  const handleConfirmExtend = async () => {
    if (!extendingPurchase || !selectedCustomer) return

    try {
      setIsSubmittingExtension(true)
      const { purchase: updated, error } = await extendCustomerWarranty({
        purchaseId: extendingPurchase.id,
        additionalMonths: extensionMonths
      })
      if (error) throw error

      const updatedPurchases = (selectedCustomer.purchases || []).map(p => {
        if (p.id === extendingPurchase.id) {
          return {
            ...p,
            ...updated
          }
        }
        return p
      })

      const activeCount = updatedPurchases.filter(p => p.is_warranty_active).length

      setSelectedCustomer(prev => ({
        ...prev,
        purchases: updatedPurchases,
        active_warranties_count: activeCount
      }))

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? {
        ...c,
        purchases: updatedPurchases,
        active_warranties_count: activeCount
      } : c))

      setExtendingPurchase(null)
      setUnitActionMessage({
        type: 'success',
        text: `Warranty extended by ${extensionMonths} months.`
      })
      setTimeout(() => setUnitActionMessage(null), 3000)
    } catch (err) {
      console.error('Failed to extend warranty:', err)
      setUnitActionMessage({ type: 'error', text: err.message || 'Failed to extend warranty.' })
    } finally {
      setIsSubmittingExtension(false)
    }
  }

  // Handle Remove Unit & Warranty
  const handleConfirmRemove = async (purchaseOverride = null) => {
    const target = purchaseOverride || removingPurchase
    if (!target || !selectedCustomer) return

    try {
      setIsSubmittingRemoval(true)
      const { error } = await removeCustomerPurchase({ purchaseId: target.id })
      if (error) throw error

      const updatedPurchases = (selectedCustomer.purchases || []).filter(p => p.id !== target.id)
      const activeCount = updatedPurchases.filter(p => p.is_warranty_active).length

      setSelectedCustomer(prev => ({
        ...prev,
        purchases: updatedPurchases,
        total_purchases: updatedPurchases.length,
        active_warranties_count: activeCount
      }))

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? {
        ...c,
        purchases: updatedPurchases,
        total_purchases: updatedPurchases.length,
        active_warranties_count: activeCount
      } : c))

      setRemovingPurchase(null)
      setInlineConfirmRemoveId(null)
      setUnitActionMessage({ type: 'success', text: 'Unit and warranty record permanently removed.' })
      setTimeout(() => setUnitActionMessage(null), 3000)
    } catch (err) {
      console.error('Failed to remove purchase:', err)
      setUnitActionMessage({ type: 'error', text: err.message || 'Failed to remove unit.' })
    } finally {
      setIsSubmittingRemoval(false)
    }
  }

  // Handle saving edited customer profile
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!selectedCustomer) return
    const trimmedName = sanitizeText(editName, { maxLength: 100 })
    const trimmedPhone = sanitizePhone(editPhone)
    const trimmedEmail = sanitizeEmail(editEmail)

    if (!trimmedName) {
      setProfileMessage({ type: 'error', text: 'Customer full name is required.' })
      return
    }
    if (!trimmedPhone || !isValidPhone(trimmedPhone)) {
      setProfileMessage({ type: 'error', text: 'A valid 11-digit Philippine mobile phone number starting with 09 is required (e.g. 09171234567).' })
      return
    }
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setProfileMessage({ type: 'error', text: 'A valid customer email address is required.' })
      return
    }

    try {
      setIsSavingProfile(true)
      setProfileMessage(null)
      const { customer: updated, error } = await updateCustomerProfile(selectedCustomer.id, {
        fullName: trimmedName,
        phoneNumber: trimmedPhone,
        email: trimmedEmail,
        previousEmail: selectedCustomer.email || null,
        accessToken: selectedCustomer.access_token,
        branchLocation: selectedCustomer.purchases?.[0]?.branch_location || 'Cavite',
        onEmailStatusChange: (statusUpdate) => {
          setEmailConfirmationProgress(statusUpdate)
        }
      })
      if (error) throw error

      const resolvedEmail = updated.email || trimmedEmail
      const resolvedConfirmed = Boolean(updated.email_confirmed)
      const resolvedStatus = updated.email_confirmation_status || (resolvedConfirmed ? 'confirmed' : 'awaiting_confirmation')

      setSelectedCustomer(prev => ({
        ...prev,
        full_name: updated.full_name,
        phone_number: updated.phone_number,
        email: resolvedEmail,
        email_confirmed: resolvedConfirmed,
        email_confirmation_status: resolvedStatus
      }))

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? {
        ...c,
        full_name: updated.full_name,
        phone_number: updated.phone_number,
        email: resolvedEmail,
        email_confirmed: resolvedConfirmed,
        email_confirmation_status: resolvedStatus
      } : c))

      setProfileMessage({ type: 'success', text: 'Customer profile updated successfully.' })
      setTimeout(() => setProfileMessage(null), 3000)
    } catch (err) {
      console.error('Failed to update customer profile:', err)
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update profile.' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleResendCustomerEmail = async () => {
    if (!selectedCustomer || isResendingEmail) return
    const targetEmail = sanitizeEmail(editEmail || selectedCustomer.email)
    if (!targetEmail || !isValidEmail(targetEmail)) {
      setProfileMessage({ type: 'error', text: 'Enter and save a valid customer email address before resending.' })
      return
    }
    try {
      setIsResendingEmail(true)
      await queueAndSendCustomerConfirmationEmail({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.full_name,
        phoneNumber: selectedCustomer.phone_number,
        email: targetEmail,
        accessToken: selectedCustomer.access_token,
        branchLocation: selectedCustomer.purchases?.[0]?.branch_location || 'Cavite',
        onStatusChange: (statusUpdate) => {
          setEmailConfirmationProgress(statusUpdate)
        }
      })
    } catch (err) {
      console.error('Failed to resend confirmation email:', err)
    } finally {
      setIsResendingEmail(false)
    }
  }

  // Handle adding an individual product unit
  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!selectedCustomer || !newProductId) return

    try {
      setIsSavingProduct(true)
      setProductAddMessage(null)

      const { purchase, error } = await addCustomerProductPurchase({
        customerId: selectedCustomer.id,
        productId: newProductId,
        serialNumber: sanitizeSerialNumber(newSerial, 64),
        warrantyMonths: sanitizeNumber(newWarrantyMonths, { min: 1, max: 360, integer: true, fallback: 12 }),
        purchaseDate: newPurchaseDate,
        branchLocation: sanitizeText(newBranch, { maxLength: 50 })
      })

      if (error) throw error

      const updatedPurchases = [purchase, ...(selectedCustomer.purchases || [])]
      const activeCount = updatedPurchases.filter(p => p.is_warranty_active).length

      setSelectedCustomer(prev => ({
        ...prev,
        purchases: updatedPurchases,
        total_purchases: updatedPurchases.length,
        active_warranties_count: activeCount
      }))

      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? {
        ...c,
        purchases: updatedPurchases,
        total_purchases: updatedPurchases.length,
        active_warranties_count: activeCount
      } : c))

      setIsAddingProduct(false)
      setNewSerial('')
      setProductAddMessage({ type: 'success', text: 'Unit successfully registered to customer.' })
      setTimeout(() => setProductAddMessage(null), 3000)
    } catch (err) {
      console.error('Failed to add product purchase:', err)
      setProductAddMessage({ type: 'error', text: err.message || 'Failed to register product.' })
    } finally {
      setIsSavingProduct(false)
    }
  }

  const handleCopyModalToken = () => {
    if (!selectedCustomer?.access_token) return
    navigator.clipboard.writeText(selectedCustomer.access_token)
    setModalTokenCopied(true)
    setTimeout(() => setModalTokenCopied(false), 2000)
  }

  const handleCopyModalLink = () => {
    if (!selectedCustomer?.qr_url) return
    navigator.clipboard.writeText(selectedCustomer.qr_url)
    setModalLinkCopied(true)
    setTimeout(() => setModalLinkCopied(false), 2000)
  }

  // Filtered customer list
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !query ||
      c.full_name.toLowerCase().includes(query) ||
      c.phone_number.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
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
            <h1 className="text-lg sm:text-2xl font-bold text-jds-on-surface">Customers, QR & Access Tokens</h1>
          </div>
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
      {customerActionBanner && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${customerActionBanner.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : 'bg-jds-error/10 text-jds-error border-jds-error/20'
            }`}
        >
          <span>{customerActionBanner.text}</span>
          <button
            type="button"
            onClick={() => setCustomerActionBanner(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* Customer Directory: Card Grid View */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-jds-surface border border-jds-outline-variant/40 rounded-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-jds-primary border-t-transparent animate-spin mb-3" />
          <p className="text-sm font-semibold text-jds-on-surface">Loading customer directory...</p>
          <p className="text-xs text-jds-on-surface-variant">Retrieving warranty tokens and records</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center px-4 bg-jds-surface border border-jds-outline-variant/40 rounded-2xl">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => handleOpenCustomerModal(customer)}
              className="rounded-2xl border border-jds-outline-variant/40 bg-jds-surface p-5 shadow-xs hover:shadow-md hover:border-jds-primary/60 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
            >
              {/* Card Top: Customer Avatar, Name, Phone & Warranty Badge */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-jds-primary group-hover:text-white transition-colors">
                      {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-body-md font-bold text-jds-on-surface truncate group-hover:text-jds-primary transition-colors">
                        {customer.full_name}
                      </h3>
                      <p className="text-label-sm font-mono text-jds-on-surface-variant flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-jds-on-surface-variant/70 shrink-0" />
                        <span>{customer.phone_number}</span>
                      </p>
                      {customer.email ? (
                        <p className="text-[11px] text-jds-on-surface-variant flex items-center gap-1.5 mt-0.5 truncate" title={customer.email}>
                          <Mail className="w-3 h-3 text-jds-on-surface-variant/70 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                          {customer.email_confirmed ? (
                            <span className="text-[9px] font-bold uppercase text-emerald-500 shrink-0">Confirmed</span>
                          ) : (
                            <span className="text-[9px] font-bold uppercase text-amber-500 shrink-0">Awaiting</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span>Email Required</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {customer.active_warranties_count > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{customer.active_warranties_count} Active</span>
                    </span>
                  ) : customer.total_purchases > 0 && customer.purchases?.length > 0 && customer.purchases.every(p => p.is_voided) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                      <ShieldX className="w-3 h-3" />
                      <span>Voided</span>
                    </span>
                  ) : customer.total_purchases > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 shrink-0">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Expired</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 shrink-0">
                      No Units
                    </span>
                  )}
                </div>
              </div>

              {/* Card Bottom: Registered Date, Units Count, & Add Warranty Shortcut */}
              <div className="pt-3 border-t border-jds-outline-variant/20 flex items-center justify-between gap-2 text-xs text-jds-on-surface-variant">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <Calendar className="w-3.5 h-3.5 text-jds-on-surface-variant/70 shrink-0" />
                  <span className="truncate">Reg: {formatDate(customer.created_at)}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 font-semibold text-jds-on-surface">
                    <Package className="w-3.5 h-3.5 text-jds-primary shrink-0" />
                    <span>
                      {customer.total_purchases} Unit{customer.total_purchases === 1 ? '' : 's'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenCustomerModal(customer, true)
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-jds-primary/10 hover:bg-jds-primary hover:text-white text-jds-primary text-[11px] font-semibold transition-all shadow-2xs"
                    title="Add equipment warranty to customer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Warranty</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Detail & Management Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSavingProfile && !isSavingProduct) {
              setSelectedCustomer(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-jds-outline-variant/30 flex items-center justify-between gap-3 bg-jds-surface-container-low/20 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center font-bold text-base shrink-0">
                  {selectedCustomer.full_name ? selectedCustomer.full_name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-body-lg font-bold text-jds-on-surface truncate">
                    {selectedCustomer.full_name}
                  </h2>
                  <p className="text-label-sm text-jds-on-surface-variant">
                    Registered {formatDate(selectedCustomer.created_at)}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseCustomerModal}
                className="p-1.5 text-jds-on-surface-variant hover:text-jds-on-surface rounded-lg hover:bg-jds-surface-container transition-colors shrink-0"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* 1. Edit Profile Form */}
              <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-label-md font-bold text-jds-on-surface flex items-center gap-2">
                    <User className="w-4 h-4 text-jds-primary" />
                    <span>Customer Details</span>
                  </h3>
                  {profileMessage && (
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${profileMessage.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-jds-error/10 text-jds-error'
                        }`}
                    >
                      {profileMessage.text}
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-label-sm font-semibold text-jds-on-surface-variant">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        required
                        value={editName}
                        onChange={(e) => setEditName(sanitizeText(e.target.value, { maxLength: 100, trim: false }))}
                        onBlur={() => setEditName(prev => prev.trim())}
                        placeholder="Customer full name..."
                        className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-label-sm font-semibold text-jds-on-surface-variant">
                        <label>Phone Number *</label>
                        <span className={`text-[10px] font-mono ${editPhone.length === 11 && isValidPhone(editPhone) ? 'text-emerald-500 font-bold' : 'text-jds-on-surface-variant/60'
                          }`}>
                          {editPhone.length}/11 digits
                        </span>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={11}
                        required
                        value={editPhone}
                        onChange={(e) => setEditPhone(sanitizePhone(e.target.value))}
                        placeholder="09171234567"
                        className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface font-mono outline-none focus:border-jds-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Customer Email Address (Required) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-label-sm font-semibold text-jds-on-surface-variant">
                      <label htmlFor="edit-customer-email">Email Address *</label>
                      {selectedCustomer.email && (
                        selectedCustomer.email_confirmed ? (
                          <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Email Confirmed
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Awaiting Email Verification
                          </span>
                        )
                      )}
                    </div>
                    <input
                      id="edit-customer-email"
                      type="email"
                      maxLength={120}
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(sanitizeEmail(e.target.value))}
                      placeholder="e.g. maria.santos@email.com"
                      className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary transition-colors"
                    />
                  </div>

                  {(emailConfirmationProgress || (selectedCustomer.email && !selectedCustomer.email_confirmed)) && (
                    <div className="p-3 rounded-lg bg-jds-surface-container/40 border border-jds-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-jds-on-surface-variant">
                        {emailConfirmationProgress?.status === 'queued' || isResendingEmail ? (
                          <RefreshCw className="w-3.5 h-3.5 text-jds-primary animate-spin shrink-0" />
                        ) : (
                          <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <span>
                          {emailConfirmationProgress?.status === 'queued' || isResendingEmail
                            ? `Queuing email confirmation to ${editEmail || selectedCustomer.email}...`
                            : emailConfirmationProgress?.message || `Confirmation email sent to ${selectedCustomer.email}. Awaiting customer verification.`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResendCustomerEmail}
                        disabled={isResendingEmail || emailConfirmationProgress?.status === 'queued'}
                        className="px-2.5 py-1 rounded-md bg-jds-surface border border-jds-outline-variant/50 hover:bg-jds-surface-container text-[11px] font-semibold text-jds-on-surface shrink-0 disabled:opacity-50"
                      >
                        Resend Confirmation
                      </button>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-jds-primary text-jds-on-primary text-label-sm font-semibold hover:bg-jds-primary/90 transition-all disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. Token & Portal Actions */}
              <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 space-y-3">
                <h3 className="text-label-md font-bold text-jds-on-surface flex items-center gap-2">
                  <Key className="w-4 h-4 text-jds-primary" />
                  <span>Access Credentials & Portal</span>
                </h3>

                {/* Token Box */}
                <div className="p-3 rounded-lg bg-jds-surface-container/30 border border-jds-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70 block mb-0.5">
                      Unique Token ID
                    </span>
                    <span className="font-mono text-xs text-jds-on-surface font-medium break-all select-all">
                      {isTokenRevealedInModal
                        ? selectedCustomer.access_token
                        : `${(selectedCustomer.access_token || '').slice(0, 8)}••••••••${(selectedCustomer.access_token || '').slice(-4)}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsTokenRevealedInModal(!isTokenRevealedInModal)}
                      className="p-1.5 text-jds-on-surface-variant hover:text-jds-on-surface rounded-lg hover:bg-jds-surface-container transition-colors"
                      title={isTokenRevealedInModal ? 'Mask token' : 'Reveal full token'}
                    >
                      {isTokenRevealedInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyModalToken}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface transition-colors"
                    >
                      {modalTokenCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{modalTokenCopied ? 'Copied' : 'Copy Token'}</span>
                    </button>
                  </div>
                </div>

                {/* Portal Link & QR Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => window.open(selectedCustomer.qr_url, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-jds-primary/10 text-jds-primary hover:bg-jds-primary hover:text-white border border-jds-primary/30 text-xs font-semibold transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Go to Customer Page</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyModalLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface transition-colors"
                  >
                    {modalLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{modalLinkCopied ? 'Link Copied' : 'Copy Portal Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCustomerForQr(selectedCustomer)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-jds-primary" />
                    <span>View Full QR</span>
                  </button>
                </div>
              </div>

              {/* 3. Installed Units / Equipment Section */}
              <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-lowest p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-jds-primary" />
                    <h3 className="text-label-md font-bold text-jds-on-surface">
                      Registered Units ({selectedCustomer.purchases?.length || 0})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingProduct(!isAddingProduct)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-jds-primary text-jds-on-primary text-xs font-semibold hover:bg-jds-primary/90 transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingProduct ? 'Cancel' : 'Add Product'}</span>
                  </button>
                </div>

                {productAddMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold ${productAddMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-jds-error/10 text-jds-error border border-jds-error/20'
                      }`}
                  >
                    {productAddMessage.text}
                  </div>
                )}

                {/* Inline 'Add Product' Form */}
                {isAddingProduct && (
                  <form
                    onSubmit={handleAddProduct}
                    className="p-4 rounded-xl border border-jds-primary/30 bg-jds-primary/5 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-jds-primary/20 pb-2">
                      <span className="text-xs font-bold text-jds-primary uppercase tracking-wide">
                        Register New Unit to Customer
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingProduct(false)}
                        className="text-jds-on-surface-variant hover:text-jds-on-surface text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1">
                          Product Model *
                        </label>
                        <select
                          value={newProductId}
                          onChange={(e) => {
                            const val = e.target.value
                            setNewProductId(val)
                            const p = catalogProducts.find((item) => item.id === val)
                            if (p && p.default_warranty_months) {
                              setNewWarrantyMonths(p.default_warranty_months)
                            }
                          }}
                          className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary"
                          required
                        >
                          {catalogProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.watt ? `(${p.watt}W)` : ''} - {p.type || 'Solar'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1">
                            Serial Number
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. SN-89472"
                            value={newSerial}
                            onChange={(e) => setNewSerial(e.target.value)}
                            className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm font-mono text-jds-on-surface outline-none focus:border-jds-primary"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1">
                            Warranty Duration
                          </label>
                          <select
                            value={newWarrantyMonths}
                            onChange={(e) => setNewWarrantyMonths(Number(e.target.value))}
                            className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary"
                          >
                            <option value={12}>12 Months (1 Year)</option>
                            <option value={24}>24 Months (2 Years)</option>
                            <option value={36}>36 Months (3 Years)</option>
                            <option value={60}>60 Months (5 Years)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1">
                            Branch Location
                          </label>
                          <select
                            value={newBranch}
                            onChange={(e) => setNewBranch(e.target.value)}
                            className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary"
                          >
                            <option value="Cavite">Cavite Branch</option>
                            <option value="Quiapo">Quiapo Branch</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1">
                            Purchase Date
                          </label>
                          <input
                            type="date"
                            value={newPurchaseDate}
                            onChange={(e) => setNewPurchaseDate(e.target.value)}
                            className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isSavingProduct}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-jds-primary text-jds-on-primary text-xs font-semibold hover:bg-jds-primary/90 transition-all disabled:opacity-50"
                        >
                          {isSavingProduct ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Register Unit</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Inline Unit Action Feedback */}
                {unitActionMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold ${unitActionMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-jds-error/10 text-jds-error border border-jds-error/20'
                      }`}
                  >
                    {unitActionMessage.text}
                  </div>
                )}

                {/* List of Registered Purchases */}
                {!selectedCustomer.purchases || selectedCustomer.purchases.length === 0 ? (
                  <div className="text-center py-6 text-xs text-jds-on-surface-variant border border-dashed border-jds-outline-variant/40 rounded-xl">
                    No products or units registered for this customer yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomer.purchases.map((purchase, pIdx) => (
                      <div
                        key={purchase.id || pIdx}
                        className="p-4 rounded-xl bg-jds-surface border border-jds-outline-variant/40 space-y-3 text-xs shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="font-bold text-jds-on-surface truncate text-body-sm">
                              {purchase.product_name}
                            </div>
                            <div className="text-[11px] text-jds-on-surface-variant flex items-center gap-2 flex-wrap">
                              {purchase.serial_number && (
                                <span>
                                  S/N: <strong className="font-mono text-jds-on-surface">{purchase.serial_number}</strong>
                                </span>
                              )}
                              <span>Branch: {purchase.branch_location || 'Cavite'}</span>
                              <span>Purchased: {purchase.purchase_date}</span>
                              <span>Duration: {purchase.warranty_months || 12} Mos</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {purchase.is_voided ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                <ShieldX className="w-3 h-3" />
                                <span>Voided</span>
                              </span>
                            ) : purchase.is_warranty_active ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3" />
                                <span>{purchase.days_remaining}d left</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                                <ShieldAlert className="w-3 h-3" />
                                <span>Expired</span>
                              </span>
                            )}
                            <div className="text-[10px] text-jds-on-surface-variant mt-1">
                              Exp: {formatDate(purchase.warranty_expires_at)}
                            </div>
                          </div>
                        </div>

                        {/* Voided reason banner & reactivation */}
                        {purchase.is_voided && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                <strong>Void Reason:</strong> {purchase.void_reason || 'Administrative void by staff'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleConfirmUnvoid(purchase)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 text-[10px] font-bold shrink-0 transition-colors"
                              title="Reactivate equipment warranty"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reactivate</span>
                            </button>
                          </div>
                        )}

                        {/* Unit Management Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/20">
                          {/* Extend Warranty */}
                          <button
                            type="button"
                            onClick={() => {
                              setExtendingPurchase(purchase)
                              setExtensionMonths(12)
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-jds-outline-variant/40 hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface transition-colors"
                            title="Extend warranty period (+6, +12, +24 months)"
                          >
                            <Clock className="w-3.5 h-3.5 text-jds-primary" />
                            <span>Extend</span>
                          </button>

                          {/* Void Warranty (if not already voided) */}
                          {!purchase.is_voided && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidingPurchase(purchase)
                                setVoidReasonPreset('Broken warranty seal / Tampered')
                                setVoidReasonCustom('')
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-600 hover:bg-amber-500/10 text-xs font-semibold transition-colors"
                              title="Void warranty for customer equipment"
                            >
                              <ShieldX className="w-3.5 h-3.5" />
                              <span>Void</span>
                            </button>
                          )}

                          {/* Remove Unit / Purchase */}
                          <button
                            type="button"
                            onClick={() => setInlineConfirmRemoveId(purchase.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
                            title="Delete equipment record from customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>

                        {/* Inline Remove Confirmation */}
                        {inlineConfirmRemoveId === purchase.id && (
                          <div className="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
                            <div className="flex items-center gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                              <div className="text-xs">
                                <span className="font-bold text-rose-700 dark:text-rose-300">
                                  Are you sure you want to remove?
                                </span>
                                <span className="text-rose-600/90 dark:text-rose-400 block sm:inline sm:ml-1">
                                  Registered Unit: {purchase.product_name} {purchase.serial_number ? `(${purchase.serial_number})` : ''}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => setInlineConfirmRemoveId(null)}
                                disabled={isSubmittingRemoval}
                                className="px-3.5 py-1.5 rounded-lg border border-jds-outline-variant/40 bg-jds-surface text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmRemove(purchase)}
                                disabled={isSubmittingRemoval}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                              >
                                {isSubmittingRemoval ? (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>Yes</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Admin-Only Danger Zone: Delete Customer Account */}
              {role === 'admin' && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-label-md font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Delete Customer Account</span>
                    </h3>
                    <p className="text-xs text-jds-on-surface-variant leading-relaxed">
                      Permanently delete this customer profile, portal access token, login credentials, and all registered equipment warranties from the database.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteCustomerError(null)
                      setDeletingCustomer(selectedCustomer)
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Customer</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-jds-outline-variant/20 bg-jds-surface-container-low/20 flex justify-end shrink-0">
              <button
                type="button"
                onClick={handleCloseCustomerModal}
                className="px-5 py-2 text-xs font-semibold rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface hover:bg-jds-surface-container transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Warranty Modal */}
      {voidingPurchase && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingVoid) {
              setVoidingPurchase(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-body-md font-bold text-jds-on-surface truncate">Void Equipment Warranty</h3>
                <p className="text-label-sm text-jds-on-surface-variant truncate">
                  {voidingPurchase.product_name} {voidingPurchase.serial_number ? `(${voidingPurchase.serial_number})` : ''}
                </p>
              </div>
            </div>

            <div className="text-xs text-jds-on-surface-variant bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl leading-relaxed">
              Voiding marks this equipment as disqualified from warranty claims. You can reactivate this later if marked by mistake.
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1">
                  Reason for Invalidation *
                </label>
                <select
                  value={voidReasonPreset}
                  onChange={(e) => setVoidReasonPreset(e.target.value)}
                  className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary cursor-pointer"
                >
                  <option value="Customer carelessness / Accidental drop fracture">Customer carelessness / Accidental drop fracture</option>
                  <option value="1-Time warranty replacement entitlement fulfilled">1-Time warranty replacement entitlement fulfilled</option>
                  <option value="Broken warranty seal / Tampered">Broken warranty seal / Tampered</option>
                  <option value="Physical impact / Dropped casing">Physical impact / Dropped casing</option>
                  <option value="Water intrusion / Non-certified installation">Water intrusion / Non-certified installation</option>
                  <option value="Unauthorized component modification">Unauthorized component modification</option>
                  <option value="Commercial misuse / Electrical overvoltage">Commercial misuse / Electrical overvoltage</option>
                  <option value="Other / Custom reason">Other / Custom reason</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1">
                  Additional Details or Technician Notes
                </label>
                <textarea
                  rows={2}
                  value={voidReasonCustom}
                  onChange={(e) => setVoidReasonCustom(e.target.value)}
                  placeholder="Add relevant inspection observations or serial notes..."
                  className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-lg px-3 py-2 text-body-sm text-jds-on-surface outline-none focus:border-jds-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setVoidingPurchase(null)
                  setVoidReasonCustom('')
                }}
                disabled={isSubmittingVoid}
                className="px-4 py-2 rounded-xl border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isSubmittingVoid}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {isSubmittingVoid ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <ShieldX className="w-3.5 h-3.5" />
                )}
                <span>Confirm Void</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Warranty Modal */}
      {extendingPurchase && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingExtension) {
              setExtendingPurchase(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-jds-primary/10 text-jds-primary flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-body-md font-bold text-jds-on-surface truncate">Extend Warranty Coverage</h3>
                <p className="text-label-sm text-jds-on-surface-variant truncate">
                  {extendingPurchase.product_name} {extendingPurchase.serial_number ? `(${extendingPurchase.serial_number})` : ''}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1">
                  Current Expiration Date
                </label>
                <div className="text-xs font-medium text-jds-on-surface bg-jds-surface-container/30 p-2.5 rounded-lg border border-jds-outline-variant/30 flex items-center justify-between">
                  <span>Current Expiry:</span>
                  <strong>{formatDate(extendingPurchase.warranty_expires_at)}</strong>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-jds-on-surface-variant uppercase tracking-wider block mb-1.5">
                  Select Extension Period
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[6, 12, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExtensionMonths(m)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${extensionMonths === m
                        ? 'bg-jds-primary text-jds-on-primary border-jds-primary shadow-xs'
                        : 'bg-jds-surface border-jds-outline-variant/40 text-jds-on-surface hover:bg-jds-surface-container'
                        }`}
                    >
                      +{m} Months
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Preview */}
              {(() => {
                const baseExpiry = extendingPurchase.warranty_expires_at
                  ? new Date(extendingPurchase.warranty_expires_at)
                  : new Date()
                const startFrom = baseExpiry > new Date() ? baseExpiry : new Date()
                const preview = new Date(startFrom)
                preview.setMonth(preview.getMonth() + Number(extensionMonths))
                return (
                  <div className="text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center justify-between">
                    <span>Updated Expiry Date:</span>
                    <strong className="font-semibold">{formatDate(preview)}</strong>
                  </div>
                )
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                onClick={() => setExtendingPurchase(null)}
                disabled={isSubmittingExtension}
                className="px-4 py-2 rounded-xl border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExtend}
                disabled={isSubmittingExtension}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-semibold hover:bg-jds-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmittingExtension ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Apply Extension</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Unit Confirmation Modal */}
      {removingPurchase && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingRemoval) {
              setRemovingPurchase(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-body-md font-bold text-jds-on-surface truncate">Are you sure you want to remove?</h3>
                <p className="text-label-sm text-jds-on-surface-variant truncate">
                  Registered Unit: {removingPurchase.product_name} {removingPurchase.serial_number ? `(${removingPurchase.serial_number})` : ''}
                </p>
              </div>
            </div>

            <div className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl leading-relaxed">
              This action will permanently delete this equipment record from the customer profile and remove all linked warranty details.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                onClick={() => setRemovingPurchase(null)}
                disabled={isSubmittingRemoval}
                className="px-4 py-2 rounded-xl border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRemove(removingPurchase)}
                disabled={isSubmittingRemoval}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingRemoval ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Yes</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Delete Customer Account Confirmation Modal (Admin Only) */}
      {deletingCustomer && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingCustomer) {
              setDeletingCustomer(null)
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-jds-surface border border-jds-outline-variant/40 rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-body-md font-bold text-jds-on-surface truncate">
                  Delete Customer Account?
                </h3>
                <p className="text-label-sm text-jds-on-surface-variant truncate">
                  {deletingCustomer.full_name} ({deletingCustomer.phone_number})
                </p>
              </div>
            </div>

            <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl space-y-1.5 leading-relaxed">
              <p className="font-bold">This action is permanent and cannot be undone.</p>
              <p>
                Deleting this customer will permanently remove their profile, portal credentials,{' '}
                <strong>{deletingCustomer.total_purchases || 0} registered unit(s)</strong> (including{' '}
                <strong>{deletingCustomer.active_warranties_count || 0} active warrant{deletingCustomer.active_warranties_count === 1 ? 'y' : 'ies'}</strong>),
                and all associated warranty claim records from the database.
              </p>
            </div>

            {deleteCustomerError && (
              <div className="p-3 rounded-xl bg-jds-error/10 border border-jds-error/20 text-xs font-semibold text-jds-error">
                {deleteCustomerError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-jds-outline-variant/20">
              <button
                type="button"
                onClick={() => {
                  setDeletingCustomer(null)
                  setDeleteCustomerError(null)
                }}
                disabled={isDeletingCustomer}
                className="px-4 py-2 rounded-xl border border-jds-outline-variant/40 text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCustomer}
                disabled={isDeletingCustomer}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeletingCustomer ? (
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
    </div>
  )
}
