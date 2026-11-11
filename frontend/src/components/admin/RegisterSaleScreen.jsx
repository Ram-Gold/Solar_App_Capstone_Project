import { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Store,
  Phone,
  User,
  Mail,
  Clock,
  Package } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { searchCustomerByPhone, registerCustomerAndSale } from '../../lib/customerService'
import {
  sanitizePhone,
  isValidPhone,
  sanitizeText,
  sanitizeEmail,
  isValidEmail,
  sanitizeSerialNumber,
  sanitizeNumber
} from '../../lib/sanitize.js'
import QRReceiptModal from './QRReceiptModal'

export default function RegisterSaleScreen({ onNavigate }) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [branchLocation, setBranchLocation] = useState('Cavite')
  const [isSearchingPhone, setIsSearchingPhone] = useState(false)
  const [isReturningCustomer, setIsReturningCustomer] = useState(false)
  const [existingCustomerRecord, setExistingCustomerRecord] = useState(null)

  // Catalog products for selection
  const [catalogProducts, setCatalogProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Items in this sale
  const [items, setItems] = useState([
    {
      productId: '',
      serialNumber: '',
      warrantyMonths: 24,
      purchaseDate: new Date().toISOString().split('T')[0]
    }
  ])

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [qrModalData, setQrModalData] = useState(null)
  const [liveEmailStatus, setLiveEmailStatus] = useState(null)

  // Fetch catalog products on mount
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoadingProducts(true)
        const { data, error } = await supabase
          .from('products')
          .select('id, name, type, watt, default_warranty_months, image_url')
          .order('name', { ascending: true })

        if (error) throw error
        setCatalogProducts(data || [])
        // Set default item product if available
        if (data && data.length > 0) {
          setItems([
            {
              productId: String(data[0].id),
              serialNumber: '',
              warrantyMonths: data[0].default_warranty_months || 24,
              purchaseDate: new Date().toISOString().split('T')[0]
            }
          ])
        }
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoadingProducts(false)
      }
    }
    loadProducts()
  }, [])

  // Debounced phone search
  useEffect(() => {
    const cleanPhone = phoneNumber.trim()
    if (cleanPhone.length < 7) {
      setIsReturningCustomer(false)
      setExistingCustomerRecord(null)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearchingPhone(true)
      const { customer } = await searchCustomerByPhone(cleanPhone)
      setIsSearchingPhone(false)
      if (customer) {
        setIsReturningCustomer(true)
        setExistingCustomerRecord(customer)
        if (!fullName) {
          setFullName(customer.full_name)
        }
        if (!email && customer.email) {
          setEmail(customer.email)
        }
      } else {
        setIsReturningCustomer(false)
        setExistingCustomerRecord(null)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [phoneNumber])

  const handleAddItem = () => {
    const defaultProd = catalogProducts[0]
    setItems(prev => [
      ...prev,
      {
        productId: defaultProd ? String(defaultProd.id) : '',
        serialNumber: '',
        warrantyMonths: defaultProd?.default_warranty_months || 24,
        purchaseDate: new Date().toISOString().split('T')[0]
      }
    ])
  }

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handlePhoneChange = (e) => {
    const raw = e.target.value
    const sanitized = sanitizePhone(raw)
    setPhoneNumber(sanitized)
    if (errorMessage) setErrorMessage('')
  }

  const handlePhoneBlur = () => {
    setPhoneTouched(true)
  }

  const handleFullNameChange = (e) => {
    const raw = e.target.value
    const sanitized = sanitizeText(raw, { maxLength: 100, trim: false })
    setFullName(sanitized)
    if (errorMessage) setErrorMessage('')
  }

  const handleEmailChange = (e) => {
    const raw = e.target.value
    const sanitized = sanitizeEmail(raw)
    setEmail(sanitized)
    if (errorMessage) setErrorMessage('')
  }

  const handleEmailBlur = () => {
    setEmailTouched(true)
  }

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev]
      let val = value
      if (field === 'serialNumber') {
        val = sanitizeSerialNumber(value, 64)
      } else if (field === 'warrantyMonths') {
        val = sanitizeNumber(value, { min: 1, max: 360, integer: true, fallback: 24 })
      }
      updated[index] = { ...updated[index], [field]: val }

      // If product changed, update default warranty months
      if (field === 'productId') {
        const prod = catalogProducts.find(p => String(p.id) === String(value))
        if (prod && prod.default_warranty_months) {
          updated[index].warrantyMonths = prod.default_warranty_months
        }
      }

      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setPhoneTouched(true)
    setEmailTouched(true)

    if (!phoneNumber) {
      setErrorMessage('Please enter the customer mobile phone number.')
      return
    }
    if (!isValidPhone(phoneNumber)) {
      setErrorMessage('Please enter a valid 11-digit Philippine mobile phone number starting with 09 (e.g. 09171234567).')
      return
    }
    if (!fullName.trim()) {
      setErrorMessage('Please enter the customer full name.')
      return
    }
    const cleanEmail = sanitizeEmail(email)
    if (!cleanEmail) {
      setErrorMessage('Please enter the customer email address.')
      return
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid customer email address (e.g. maria.santos@email.com).')
      return
    }
    const invalidItems = items.some(item => !item.productId)
    if (invalidItems) {
      setErrorMessage('Please select a valid product for all items.')
      return
    }

    try {
      setSubmitting(true)
      const result = await registerCustomerAndSale({
        phoneNumber,
        fullName,
        email: cleanEmail,
        branchLocation,
        items,
        onEmailStatusChange: (statusUpdate) => {
          setLiveEmailStatus(statusUpdate)
          setQrModalData(prev =>
            prev
              ? {
                  ...prev,
                  emailConfirmation: {
                    ...(prev.emailConfirmation || {}),
                    ...statusUpdate
                  }
                }
              : prev
          )
        }
      })

      setQrModalData(result)
    } catch (err) {
      console.error('Registration failed:', err)
      setErrorMessage(err.message || 'Failed to complete registration and generate QR.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetForm = () => {
    setQrModalData(null)
    setLiveEmailStatus(null)
    setPhoneNumber('')
    setPhoneTouched(false)
    setFullName('')
    setEmail('')
    setEmailTouched(false)
    setIsReturningCustomer(false)
    setExistingCustomerRecord(null)
    setErrorMessage('')
    if (catalogProducts.length > 0) {
      setItems([
        {
          productId: String(catalogProducts[0].id),
          serialNumber: '',
          warrantyMonths: catalogProducts[0].default_warranty_months || 24,
          purchaseDate: new Date().toISOString().split('T')[0]
        }
      ])
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">


      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-jds-outline-variant/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-jds-primary/10 text-jds-primary">
              Point of Sale
            </span>
            <h1 className="text-2xl font-bold text-jds-on-surface">Register In-Store Sale</h1>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-2 bg-jds-surface border border-jds-outline-variant/40 rounded-xl px-3 py-2 text-sm">
          <Store className="w-4 h-4 text-jds-primary shrink-0" />
          <span className="text-xs text-jds-on-surface-variant">Store Branch:</span>
          <select
            value={branchLocation}
            onChange={(e) => setBranchLocation(e.target.value)}
            className="bg-transparent font-semibold text-jds-on-surface focus:outline-none cursor-pointer"
          >
            <option value="Cavite">Cavite Branch</option>
            <option value="Quiapo">Quiapo Branch</option>
          </select>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* CARD 1: Customer Information */}
        <div className="p-6 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-jds-on-surface">
              <User className="w-4 h-4 text-jds-primary" />
              <span>Customer Identification</span>
            </div>

            {/* Returning customer indicator */}
            {isReturningCustomer && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Returning Customer
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {/* Phone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-5 text-xs font-semibold text-jds-on-surface-variant">
                <label htmlFor="reg-sale-phone">Mobile Phone Number *</label>
                {isSearchingPhone && (
                  <span className="text-[11px] text-jds-primary animate-pulse">Checking records...</span>
                )}
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-jds-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-sale-phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  required
                  placeholder="09171234567"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  className={`w-full h-11 bg-jds-surface-container/40 border rounded-xl pl-9 pr-4 py-2.5 text-sm text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:outline-none transition-colors font-mono ${phoneTouched && phoneNumber && !isValidPhone(phoneNumber)
                    ? 'border-jds-error focus:border-jds-error bg-jds-error/5'
                    : phoneNumber.length === 11 && isValidPhone(phoneNumber)
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : 'border-jds-outline-variant/50 focus:border-jds-primary'
                    }`}
                />
              </div>
              {phoneTouched && phoneNumber && !isValidPhone(phoneNumber) && (
                <p className="text-[11px] font-medium text-jds-error flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Must be an 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-5 text-xs font-semibold text-jds-on-surface-variant">
                <label htmlFor="reg-sale-name">Customer Full Name *</label>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-jds-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-sale-name"
                  type="text"
                  maxLength={100}
                  required
                  placeholder="e.g. Maria Santos"
                  value={fullName}
                  onChange={handleFullNameChange}
                  onBlur={() => setFullName(prev => prev.trim())}
                  className="w-full h-11 bg-jds-surface-container/40 border border-jds-outline-variant/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:outline-none focus:border-jds-primary transition-colors"
                />
              </div>
            </div>

            {/* Customer Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between h-5 text-xs font-semibold text-jds-on-surface-variant">
                <label htmlFor="reg-sale-email">Customer Email Address *</label>
                {existingCustomerRecord?.email && existingCustomerRecord.email.toLowerCase() === email.trim().toLowerCase() && (
                  existingCustomerRecord.email_confirmed ? (
                    <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Confirmed
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Awaiting Verification
                    </span>
                  )
                )}
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-jds-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-sale-email"
                  type="email"
                  maxLength={120}
                  required
                  placeholder="e.g. maria.santos@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  className={`w-full h-11 bg-jds-surface-container/40 border rounded-xl pl-9 pr-4 py-2.5 text-sm text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:outline-none transition-colors ${emailTouched && email && !isValidEmail(email)
                    ? 'border-jds-error focus:border-jds-error bg-jds-error/5'
                    : email && isValidEmail(email)
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : 'border-jds-outline-variant/50 focus:border-jds-primary'
                    }`}
                />
              </div>
              {emailTouched && email && !isValidEmail(email) ? (
                <p className="text-[11px] font-medium text-jds-error flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Enter a valid email address for account creation confirmation.
                </p>
              ) : (
                <p className="text-[11px] text-jds-on-surface-variant">
                  Account creation & warranty portal confirmation will be sent to this address.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: Products & Warranties */}
        <div className="p-6 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-jds-on-surface">
              <Package className="w-4 h-4 text-jds-primary" />
              <span>Purchased Products ({items.length})</span>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-jds-primary/10 text-jds-primary hover:bg-jds-primary/20 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Product
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-jds-surface-container/20 border border-jds-outline-variant/30 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
              >
                {/* Product Select */}
                <div className="md:col-span-5 space-y-1">
                  <label className="text-[11px] font-semibold text-jds-on-surface-variant">
                    Solar Product #{idx + 1} *
                  </label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                    className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-xl px-3 py-2 text-sm text-jds-on-surface focus:outline-none focus:border-jds-primary cursor-pointer truncate"
                  >
                    {catalogProducts.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.watt || prod.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Serial Number */}
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[11px] font-semibold text-jds-on-surface-variant">
                    Hardware Serial # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-882910"
                    value={item.serialNumber}
                    onChange={(e) => handleItemChange(idx, 'serialNumber', e.target.value)}
                    className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-xl px-3 py-2 text-sm text-jds-on-surface placeholder:text-jds-on-surface-variant/40 font-mono focus:outline-none focus:border-jds-primary"
                  />
                </div>

                {/* Warranty Duration */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-jds-on-surface-variant">
                    Warranty Term
                  </label>
                  <select
                    value={item.warrantyMonths}
                    onChange={(e) => handleItemChange(idx, 'warrantyMonths', Number(e.target.value))}
                    className="w-full bg-jds-surface border border-jds-outline-variant/40 rounded-xl px-3 py-2 text-sm text-jds-on-surface focus:outline-none focus:border-jds-primary cursor-pointer"
                  >
                    <option value={6}>6 Months</option>
                    <option value={12}>1 Year (12 Mos)</option>
                    <option value={24}>2 Years (24 Mos) - Standard Solar</option>
                    <option value={36}>3 Years (36 Mos)</option>
                  </select>
                </div>

                {/* Delete Item */}
                <div className="md:col-span-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    className="p-2 text-jds-on-surface-variant hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-jds-surface border border-jds-outline-variant/40">
          <div className="text-xs text-jds-on-surface-variant">
            Total Items to Register: <strong className="text-jds-on-surface font-semibold">{items.length}</strong>
          </div>
          <button
            type="submit"
            disabled={submitting || loadingProducts}
            className="px-6 py-2.5 rounded-xl bg-jds-primary text-jds-on-primary font-semibold hover:bg-jds-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Registering...
              </span>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                Complete Sale & Generate QR
              </>
            )}
          </button>
        </div>
      </form>

      {/* QR & Print Slip Modal */}
      {qrModalData && (
        <QRReceiptModal
          isOpen={Boolean(qrModalData)}
          onClose={handleResetForm}
          customer={qrModalData.customer}
          purchases={qrModalData.purchases}
          qrUrl={qrModalData.qrUrl}
          emailConfirmation={qrModalData.emailConfirmation || liveEmailStatus}
        />
      )}
    </div>
  )
}
