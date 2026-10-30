import React, { useState, useEffect } from 'react'
import {
  UserPlus,
  Search,
  Plus,
  Trash2,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Store,
  Phone,
  User,
  Package,
  Calendar,
  Sparkles
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { searchCustomerByPhone, registerCustomerAndSale } from '../../lib/customerService'
import QRReceiptModal from './QRReceiptModal'

export default function RegisterSaleScreen({ onNavigate }) {
  const [phoneNumber, setPhoneNumber] = useState('')

  const [fullName, setFullName] = useState('')
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

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

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

    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter the customer phone number.')
      return
    }
    if (!fullName.trim()) {
      setErrorMessage('Please enter the customer full name.')
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
        branchLocation,
        items
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
    setPhoneNumber('')
    setFullName('')
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-jds-on-surface-variant flex items-center justify-between">
                <span>Mobile Phone Number *</span>
                {isSearchingPhone && <span className="text-[11px] text-jds-primary animate-pulse">Checking records...</span>}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-jds-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 09171234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-jds-surface-container/40 border border-jds-outline-variant/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:outline-none focus:border-jds-primary transition-colors font-mono"
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-jds-on-surface-variant">
                Customer Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-jds-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-jds-surface-container/40 border border-jds-outline-variant/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-jds-on-surface placeholder:text-jds-on-surface-variant/50 focus:outline-none focus:border-jds-primary transition-colors"
                />
              </div>
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
        />
      )}
    </div>
  )
}
