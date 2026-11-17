/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, useRef } from 'react'
import {
  Trash2,
  Upload,
  Package,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Button } from '../ui/button'
import InspectorDrawer from './InspectorDrawer'
import AnimatedConfirmation from '../ui/AnimatedConfirmation'
import {
  parseProductImages,
  getMainProductImage,
  serializeProductImages,
  fetchDynamicProductImages,
} from '../../lib/productImageUtils'
import {
  getStockQuantity,
  getStockBadgeConfig,
  getBranchBreakdown,
} from '../../lib/inventoryUtils'
import { inventoryOperations as defaultInventoryOps } from '../../lib/inventoryOperations'
import { sanitizeText, sanitizeNumber } from '../../lib/sanitize.js'
import { parseProductPrice } from '../../lib/multiCriteriaMatcher'
import { notifyOpsUpdated } from '../../lib/inquiryStatusUtils'

export const EDIT_FIELDS = [
  { key: 'name', label: 'Product Name', type: 'text', group: 'general' },
  { key: 'type', label: 'Category Type', type: 'text', group: 'general' },
  { key: 'min_price', label: 'Min Price (₱)', type: 'number', group: 'general' },
  { key: 'max_price', label: 'Max Price (₱)', type: 'number', group: 'general' },
  { key: 'recommended_usage', label: 'Recommended Usage', type: 'text', group: 'general' },
  { key: 'ideal_location', label: 'Ideal Location', type: 'text', group: 'general' },
  { key: 'place_of_use', label: 'Place of Use / Recommended Sites', type: 'text', group: 'general' },

  { key: 'watt', label: 'Power (Watts)', type: 'number', group: 'power' },
  { key: 'voltage', label: 'Operating Voltage', type: 'text', group: 'power' },
  { key: 'lumens', label: 'Luminous Flux (Lumens)', type: 'text', group: 'power' },
  { key: 'color_temperature', label: 'Color Temperature', type: 'text', group: 'power' },
  { key: 'beaming_angle', label: 'Beaming Angle', type: 'text', group: 'power' },
  { key: 'solar_panel', label: 'Solar Panel', type: 'text', group: 'power' },
  { key: 'battery', label: 'Battery Spec', type: 'text', group: 'power' },
  { key: 'charging_time', label: 'Charging Time', type: 'text', group: 'power' },
  { key: 'charging_type', label: 'Charging Type', type: 'text', group: 'power' },
  { key: 'smd_lamp_beads', label: 'SMD Lamp Beads', type: 'text', group: 'power' },
  { key: 'lighting_time', label: 'Lighting Time', type: 'text', group: 'power' },

  { key: 'size', label: 'Size / Dimensions', type: 'text', group: 'physical' },
  { key: 'material', label: 'Material', type: 'text', group: 'physical' },
  { key: 'lamp_body_color', label: 'Lamp Body Color', type: 'text', group: 'physical' },
  { key: 'waterproof_grade', label: 'Waterproof Grade', type: 'text', group: 'physical' },
  { key: 'method_control', label: 'Control Method', type: 'text', group: 'physical' },

  { key: 'stock_quantity', label: 'Total Physical Stock (Combined)', type: 'number', group: 'inventory' },
  { key: 'stock_quiapo', label: 'Stock · Quiapo Showroom', type: 'number', group: 'inventory' },
  { key: 'stock_cavite', label: 'Stock · Cavite Hub', type: 'number', group: 'inventory' },
  { key: 'sales', label: 'Total Sales', type: 'number', group: 'inventory' },
  { key: 'warranty', label: 'Warranty Terms', type: 'text', group: 'inventory' },
  { key: 'default_warranty_months', label: 'Warranty (Months)', type: 'number', group: 'inventory' },
  { key: 'life_span', label: 'Expected Lifespan', type: 'text', group: 'inventory' },
]

export const EDIT_FIELD_GROUPS = [
  { id: 'all', label: 'All Specifications' },
  { id: 'general', label: 'General & Media' },
  { id: 'power', label: 'Power & Electrical' },
  { id: 'physical', label: 'Physical & Ingress' },
  { id: 'inventory', label: 'Inventory & Warranty' },
]

export function getChangedFields(orig, curr) {
  if (!orig || !curr) return []
  const changes = []

  EDIT_FIELDS.forEach((f) => {
    const rawOld = orig[f.key]
    const rawNew = curr[f.key]

    if (f.type === 'number') {
      const oldNum = rawOld === '' || rawOld === null || rawOld === undefined ? null : Number(rawOld)
      const newNum = rawNew === '' || rawNew === null || rawNew === undefined ? null : Number(rawNew)
      if (oldNum !== newNum) {
        changes.push({
          key: f.key,
          label: f.label,
          oldValue: oldNum === null ? 'None' : oldNum.toString(),
          newValue: newNum === null ? 'None' : newNum.toString(),
        })
      }
    } else {
      const oldStr = (rawOld ?? '').toString().trim()
      const newStr = (rawNew ?? '').toString().trim()
      if (oldStr !== newStr) {
        changes.push({
          key: f.key,
          label: f.label,
          oldValue: oldStr || 'None',
          newValue: newStr || 'None',
        })
      }
    }
  })

  const oldImg = (orig.image_url ?? '').toString().trim()
  const newImg = (curr.image_url ?? '').toString().trim()
  if (oldImg !== newImg) {
    changes.push({
      key: 'image_url',
      label: 'Product Image',
      oldValue: oldImg ? 'Previous Image' : 'None',
      newValue: newImg ? 'New Image' : 'None',
      isImage: true,
      oldImgUrl: oldImg,
      newImgUrl: newImg,
    })
  }

  const oldStock = Boolean(orig.in_stock)
  const newStock = Boolean(curr.in_stock)
  if (oldStock !== newStock) {
    changes.push({
      key: 'in_stock',
      label: 'Stock Availability Status',
      oldValue: oldStock ? 'In Stock' : 'Out of Stock',
      newValue: newStock ? 'In Stock' : 'Out of Stock',
    })
  }

  return changes
}

/**
 * Shared 3-tab Product Inspector Drawer (Inspect | Audit Stock | Edit Specs)
 * used by both DashboardScreen and ProductsScreen.
 */
export default function ProductInspectorDrawer({
  product,
  initialTab = 'inspect',
  isStaff = false,
  categories = [],
  inventoryOps = defaultInventoryOps,
  onProductUpdated,
  onRequestDelete,
  onOpenCategories,
  onOpenRecordSale,
  onClose,
  onToast,
}) {
  const [inspectorTab, setInspectorTab] = useState(initialTab)
  const [inspectedProduct, setInspectedProduct] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [originalProduct, setOriginalProduct] = useState(null)
  const [activeEditTab, setActiveEditTab] = useState('all')
  const [quickQuantity, setQuickQuantity] = useState(0)
  const [updatingStock, setUpdatingStock] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingChanges, setPendingChanges] = useState([])
  const [validationErrors, setValidationErrors] = useState({})
  const [editingImageUploading, setEditingImageUploading] = useState(false)
  const [editSuccessMessage, setEditSuccessMessage] = useState('')
  const [newImageUrlInput, setNewImageUrlInput] = useState('')
  const editFileInputRef = useRef(null)

  useEffect(() => {
    if (!product) {
      setInspectedProduct(null)
      setEditingProduct(null)
      setOriginalProduct(null)
      setShowConfirmModal(false)
      setPendingChanges([])
      setValidationErrors({})
      setEditSuccessMessage('')
      setNewImageUrlInput('')
      return
    }

    let minPrice = product.min_price !== undefined && product.min_price !== null ? product.min_price : ''
    let maxPrice = product.max_price !== undefined && product.max_price !== null ? product.max_price : ''

    if ((minPrice === '' || maxPrice === '') && product.price_range) {
      const parsed = parseProductPrice(product)
      if (parsed.hasPrice) {
        if (minPrice === '' && parsed.min !== null) minPrice = parsed.min
        if (maxPrice === '' && parsed.max !== null) maxPrice = parsed.max
      }
    }

    const prepared = {
      ...product,
      min_price: minPrice,
      max_price: maxPrice,
      stock_quantity: getStockQuantity(product),
    }

    setInspectedProduct(prepared)
    setInspectorTab(initialTab || 'inspect')
    setQuickQuantity(getStockQuantity(prepared))
    setEditingProduct(prepared)
    setOriginalProduct(prepared)
    setActiveEditTab('all')
    setShowConfirmModal(false)
    setPendingChanges([])
    setValidationErrors({})
    setEditSuccessMessage('')
    setNewImageUrlInput('')

    let cancelled = false
    fetchDynamicProductImages(product, supabase)
      .then((dynamicImages) => {
        if (cancelled || dynamicImages.length <= 1) return
        const serialized = serializeProductImages(dynamicImages)
        setEditingProduct((prev) => (prev && prev.id === product.id ? { ...prev, image_url: serialized } : prev))
        setInspectedProduct((prev) => (prev && prev.id === product.id ? { ...prev, image_url: serialized } : prev))
      })
      .catch((err) => {
        console.warn('Could not fetch extra product pictures:', err)
      })

    return () => {
      cancelled = true
    }
  }, [product, initialTab])

  const handleFieldChange = (key, value, type) => {
    let finalVal = value
    if (type === 'number') {
      finalVal = value === '' ? '' : Number(value)
    }

    setEditingProduct((prev) => {
      const updated = { ...prev, [key]: finalVal }
      if (key === 'stock_quantity') {
        const num = finalVal === '' ? 0 : Number(finalVal)
        updated.in_stock = num > 0
      }
      return updated
    })

    if (key === 'watt') {
      if (value === '' || Number.isNaN(Number(value)) || Number(value) <= 0) {
        setValidationErrors((prev) => ({ ...prev, watt: 'Power must be a positive number' }))
      } else {
        setValidationErrors((prev) => {
          const next = { ...prev }
          delete next.watt
          return next
        })
      }
    }
  }

  const handleEditImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditingImageUploading(true)
    try {
      const sanitizedName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
      const dotIdx = sanitizedName.lastIndexOf('.')
      const fileExt = dotIdx >= 0 ? sanitizedName.substring(dotIdx) : ''
      const baseName = dotIdx >= 0 ? sanitizedName.substring(0, dotIdx) : sanitizedName
      const uniqueFileName = `${baseName}_${Date.now()}${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(uniqueFileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(uniqueFileName)

      if (publicUrlData?.publicUrl) {
        const currentImages = parseProductImages(editingProduct?.image_url)
        const updatedImages = [...currentImages, publicUrlData.publicUrl]
        setEditingProduct((prev) => ({ ...prev, image_url: serializeProductImages(updatedImages) }))
        onToast?.('Picture Added', 'New product picture uploaded and attached successfully.', 'info')
      }
    } catch (err) {
      console.error('Failed to upload image:', err)
      onToast?.('Upload Failed', err.message || 'Could not upload image.', 'error')
    } finally {
      setEditingImageUploading(false)
      if (editFileInputRef.current) editFileInputRef.current.value = ''
    }
  }

  const handleRemoveProductImage = (indexToRemove) => {
    const list = parseProductImages(editingProduct?.image_url)
    const updated = list.filter((_, i) => i !== indexToRemove)
    handleFieldChange('image_url', serializeProductImages(updated), 'text')
  }

  const handleSetPrimaryProductImage = (indexToPrimary) => {
    const list = parseProductImages(editingProduct?.image_url)
    if (indexToPrimary <= 0 || indexToPrimary >= list.length) return
    const target = list[indexToPrimary]
    const remaining = list.filter((_, i) => i !== indexToPrimary)
    handleFieldChange('image_url', serializeProductImages([target, ...remaining]), 'text')
  }

  const handleAddNewImageUrl = () => {
    const trimmed = newImageUrlInput.trim()
    if (!trimmed) return
    const currentList = parseProductImages(editingProduct?.image_url)
    handleFieldChange('image_url', serializeProductImages([...currentList, trimmed]), 'text')
    setNewImageUrlInput('')
  }

  const handleQuickRestockSave = async () => {
    if (!inspectedProduct) return
    setUpdatingStock(true)
    try {
      const targetQty = Math.max(0, Number(quickQuantity) || 0)
      const updated = await inventoryOps.setStockLevel(inspectedProduct, targetQty)
      onProductUpdated?.(updated)
      notifyOpsUpdated('inventory')
      onToast?.(
        'Stock Updated',
        `${inspectedProduct.name} stock updated to ${updated.stock_quantity} units.`,
        'success'
      )
      onClose?.()
    } catch (err) {
      console.error('Failed to update stock:', err)
      onToast?.('Stock Update Failed', err.message || 'Could not save stock adjustment.', 'error')
    } finally {
      setUpdatingStock(false)
    }
  }

  const handleInitiateSave = () => {
    if (!editingProduct) return

    const wattVal = editingProduct.watt
    if (
      wattVal === '' ||
      wattVal === null ||
      wattVal === undefined ||
      Number.isNaN(Number(wattVal)) ||
      Number(wattVal) <= 0
    ) {
      setValidationErrors((prev) => ({ ...prev, watt: 'Power must be a positive number' }))
      setActiveEditTab('power')
      return
    }

    const changes = getChangedFields(originalProduct, editingProduct)
    if (changes.length === 0) {
      onToast?.('No Modifications', 'No specifications were changed for this product.', 'info')
      return
    }

    setPendingChanges(changes)
    setShowConfirmModal(true)
  }

  const handleEditSave = async () => {
    if (!editingProduct) return

    setSavingProduct(true)
    try {
      const { id, ...rest } = editingProduct
      delete rest.embedding

      if (rest.name) rest.name = sanitizeText(rest.name, { maxLength: 200 })
      if (rest.type) rest.type = sanitizeText(rest.type, { maxLength: 100 })
      if (rest.description) rest.description = sanitizeText(rest.description, { maxLength: 2000, allowMultiline: true })

      let parsedQty =
        rest.stock_quantity !== undefined && rest.stock_quantity !== ''
          ? sanitizeNumber(rest.stock_quantity, { min: 0, integer: true, fallback: 0 })
          : rest.in_stock
            ? 10
            : 0

      if (rest.stock_quiapo !== undefined || rest.stock_cavite !== undefined) {
        const qStock = sanitizeNumber(rest.stock_quiapo ?? 0, { min: 0, integer: true, fallback: 0 })
        const cStock = sanitizeNumber(rest.stock_cavite ?? 0, { min: 0, integer: true, fallback: 0 })
        const branchChanged =
          originalProduct &&
          (qStock !== Number(originalProduct.stock_quiapo || 0) ||
            cStock !== Number(originalProduct.stock_cavite || 0))
        if (branchChanged) {
          parsedQty = qStock + cStock
          rest.stock_quiapo = qStock
          rest.stock_cavite = cStock
        } else {
          rest.stock_quiapo = Math.max(0, parsedQty - cStock)
          rest.stock_cavite = cStock
        }
      }

      rest.stock_quantity = parsedQty
      rest.in_stock = parsedQty > 0
      if (rest.sales !== undefined) {
        rest.sales = sanitizeNumber(rest.sales, { min: 0, integer: true, fallback: 0 })
      }

      const minP = rest.min_price !== undefined && rest.min_price !== '' && rest.min_price !== null
        ? sanitizeNumber(rest.min_price, { min: 0, fallback: null })
        : null
      const maxP = rest.max_price !== undefined && rest.max_price !== '' && rest.max_price !== null
        ? sanitizeNumber(rest.max_price, { min: 0, fallback: null })
        : null

      rest.min_price = minP
      rest.max_price = maxP

      if (minP !== null && maxP !== null) {
        rest.price_range = minP === maxP ? String(minP) : `${minP}-${maxP}`
      } else if (minP !== null) {
        rest.price_range = `${minP}+`
      } else if (maxP !== null) {
        rest.price_range = `Up to ${maxP}`
      } else {
        rest.price_range = null
      }

      let { data, error } = await supabase
        .from('products')
        .update(rest)
        .eq('id', id)
        .select()

      if (error && (error.message?.includes('min_price') || error.message?.includes('max_price'))) {
        const legacyRest = { ...rest }
        delete legacyRest.min_price
        delete legacyRest.max_price
        const retry = await supabase
          .from('products')
          .update(legacyRest)
          .eq('id', id)
          .select()
        data = retry.data
        error = retry.error
      }

      if (error) throw error

      const updated =
        data && data.length > 0
          ? data[0]
          : { ...editingProduct, stock_quantity: parsedQty, in_stock: parsedQty > 0 }

      onProductUpdated?.(updated)
      setShowConfirmModal(false)
      setEditSuccessMessage(`Modifications saved for ${editingProduct.name || `Product #${id}`}.`)
      notifyOpsUpdated('inventory')
      onToast?.('Product Updated', `Modifications saved for ${editingProduct.name || `Product #${id}`}.`, 'success')
    } catch (err) {
      console.error('Failed to save product:', err)
      onToast?.('Save Error', err.message || 'Failed to save product modifications.', 'error')
    } finally {
      setSavingProduct(false)
    }
  }

  return (
    <InspectorDrawer
      isOpen={Boolean(inspectedProduct)}
      onClose={onClose}
      disableClose={updatingStock || savingProduct}
      widthClass="max-w-[520px]"
      subtitle={`Equipment #${inspectedProduct?.id ?? ''} · ${inspectedProduct?.type || 'Solar Hardware'}`}
      title={inspectedProduct?.name}
      tabs={
        editSuccessMessage
          ? []
          : [
              { id: 'inspect', label: 'Inspect' },
              { id: 'audit', label: 'Audit Stock' },
              { id: 'edit', label: 'Edit Specs' },
            ]
      }
      activeTab={inspectorTab}
      onTabChange={(nextTab) => {
        setInspectorTab(nextTab)
        setShowConfirmModal(false)
      }}
      footer={
        editSuccessMessage ? null : inspectorTab === 'inspect' ? (
          <>
            {onOpenRecordSale && (
              <Button
                type="button"
                variant="outline"
                disabled={getStockQuantity(inspectedProduct) === 0}
                onClick={() => onOpenRecordSale(inspectedProduct)}
                className="jds-btn-motion border-jds-outline-variant text-jds-on-surface h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                Record Sale
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInspectorTab('audit')}
                className="jds-btn-motion border-jds-outline-variant text-jds-on-surface h-10 px-3.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Audit Stock
              </Button>
              <Button
                type="button"
                onClick={() => setInspectorTab('edit')}
                className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-4 rounded-lg text-xs font-bold cursor-pointer"
              >
                Edit Specs
              </Button>
            </div>
          </>
        ) : inspectorTab === 'audit' ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={updatingStock}
              onClick={onClose}
              className="jds-btn-motion border-jds-outline-variant text-jds-on-surface-variant h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={updatingStock}
              onClick={handleQuickRestockSave}
              className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-5 rounded-lg text-xs font-bold cursor-pointer ml-auto"
            >
              {updatingStock ? 'Saving Stock...' : 'Save Stock Adjustment'}
            </Button>
          </>
        ) : showConfirmModal ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={savingProduct}
              onClick={() => setShowConfirmModal(false)}
              className="jds-btn-motion border-jds-outline-variant text-jds-on-surface-variant h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              disabled={savingProduct}
              onClick={handleEditSave}
              className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-5 rounded-lg text-xs font-bold cursor-pointer ml-auto"
            >
              {savingProduct ? 'Saving Changes...' : 'Confirm & Save'}
            </Button>
          </>
        ) : (
          <>
            {!isStaff && inspectedProduct && onRequestDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const target = inspectedProduct
                  onClose?.()
                  onRequestDelete(target)
                }}
                className="jds-btn-motion border-jds-error/30 text-jds-error hover:bg-jds-error/10 h-10 px-3.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                disabled={savingProduct}
                onClick={onClose}
                className="jds-btn-motion border-jds-outline-variant text-jds-on-surface-variant h-10 px-4 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Discard
              </Button>
              <Button
                type="button"
                disabled={savingProduct}
                onClick={handleInitiateSave}
                className="jds-btn-motion bg-jds-primary text-jds-on-primary h-10 px-5 rounded-lg text-xs font-bold cursor-pointer"
              >
                Review &amp; Save
              </Button>
            </div>
          </>
        )
      }
    >
      {editSuccessMessage ? (
        <div className="py-12 flex items-center justify-center">
          <AnimatedConfirmation
            title="Product Specifications Saved"
            description={editSuccessMessage}
            duration={1800}
            onComplete={() => onClose?.()}
          />
        </div>
      ) : inspectedProduct && inspectorTab === 'inspect' ? (() => {
        const badge = getStockBadgeConfig(inspectedProduct)
        const branch = getBranchBreakdown(inspectedProduct)
        const mainImg = getMainProductImage(inspectedProduct.image_url)
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-[1fr_96px] gap-4 items-start">
              <dl className="space-y-2 text-xs">
                <div className="grid grid-cols-[96px_1fr] gap-2">
                  <dt className="text-jds-on-surface-variant">Category</dt>
                  <dd className="font-semibold text-jds-on-surface">{inspectedProduct.type || 'Solar Hardware'}</dd>
                </div>
                <div className="grid grid-cols-[96px_1fr] gap-2">
                  <dt className="text-jds-on-surface-variant">Power</dt>
                  <dd className="font-semibold text-jds-on-surface tabular-nums">{inspectedProduct.watt}W</dd>
                </div>
                {!isStaff && (
                  <div className="grid grid-cols-[96px_1fr] gap-2">
                    <dt className="text-jds-on-surface-variant">Price</dt>
                    <dd className="font-semibold text-jds-on-surface tabular-nums">
                      {inspectedProduct.min_price && inspectedProduct.max_price
                        ? `₱${Number(inspectedProduct.min_price).toLocaleString()} - ₱${Number(inspectedProduct.max_price).toLocaleString()}`
                        : inspectedProduct.price_range || (inspectedProduct.min_price ? `₱${Number(inspectedProduct.min_price).toLocaleString()}` : 'Not set')}
                    </dd>
                  </div>
                )}
                <div className="grid grid-cols-[96px_1fr] gap-2">
                  <dt className="text-jds-on-surface-variant">On Hand</dt>
                  <dd className="font-bold text-jds-on-surface tabular-nums">{badge.quantity} units</dd>
                </div>
                <div className="grid grid-cols-[96px_1fr] gap-2">
                  <dt className="text-jds-on-surface-variant">Total Sales</dt>
                  <dd className="font-semibold text-jds-on-surface tabular-nums">{Number(inspectedProduct.sales || 0)} sold</dd>
                </div>
                <div className="grid grid-cols-[96px_1fr] gap-2">
                  <dt className="text-jds-on-surface-variant">Status</dt>
                  <dd>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.badgeClass}`}>
                      {badge.shortLabel}
                    </span>
                  </dd>
                </div>
              </dl>

              <div className="h-24 w-24 rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container flex items-center justify-center overflow-hidden p-1.5">
                {mainImg ? (
                  <img src={mainImg} alt={inspectedProduct.name} className="h-full w-full object-contain" />
                ) : (
                  <Package className="h-7 w-7 text-jds-on-surface-variant/50" />
                )}
              </div>
            </div>

            <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low p-3.5 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-jds-on-surface-variant">
                Branch Stock Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-jds-surface-container-lowest p-2.5 border border-jds-outline-variant/25">
                  <span className="text-jds-on-surface-variant block text-[11px]">Quiapo Showroom</span>
                  <span className="font-bold text-sm text-jds-on-surface tabular-nums">{branch.quiapo.stock} units</span>
                  {branch.quiapo.reserved > 0 && (
                    <span className="text-[11px] text-amber-700 block tabular-nums">{branch.quiapo.reserved} on hold</span>
                  )}
                </div>
                <div className="rounded-lg bg-jds-surface-container-lowest p-2.5 border border-jds-outline-variant/25">
                  <span className="text-jds-on-surface-variant block text-[11px]">Cavite Hub</span>
                  <span className="font-bold text-sm text-jds-on-surface tabular-nums">{branch.cavite.stock} units</span>
                  {branch.cavite.reserved > 0 && (
                    <span className="text-[11px] text-amber-700 block tabular-nums">{branch.cavite.reserved} on hold</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })() : inspectedProduct && inspectorTab === 'audit' ? (() => {
        const origQty = getStockQuantity(inspectedProduct)
        const newQty = Math.max(0, Number(quickQuantity) || 0)
        const delta = newQty - origQty
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-xs rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low p-3.5">
              <div>
                <span className="text-jds-on-surface-variant block text-[10px] uppercase">Previous</span>
                <span className="font-bold text-jds-on-surface text-base tabular-nums">{origQty}</span>
              </div>
              <div>
                <span className="text-jds-on-surface-variant block text-[10px] uppercase">Shift</span>
                <span className={`font-bold text-base tabular-nums ${delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-jds-error' : 'text-jds-on-surface-variant'}`}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              </div>
              <div className="text-right">
                <span className="text-jds-on-surface-variant block text-[10px] uppercase">Adjusted</span>
                <span className="font-bold text-jds-primary text-base tabular-nums">{newQty}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="prod-drawer-stock-target" className="text-xs font-bold text-jds-on-surface block">
                Target units in stock
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={newQty <= 0}
                  onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) - 1))}
                  aria-label="Decrease stock quantity"
                  className="h-11 w-11 rounded-lg border border-jds-outline-variant bg-jds-surface-container-low flex items-center justify-center hover:bg-jds-surface-container disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  id="prod-drawer-stock-target"
                  type="number"
                  min="0"
                  value={quickQuantity}
                  onChange={(e) => setQuickQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="h-11 flex-1 text-center font-mono font-bold text-lg rounded-lg border border-jds-outline-variant bg-jds-surface-container-lowest outline-none focus:border-jds-primary tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setQuickQuantity((prev) => Number(prev || 0) + 1)}
                  aria-label="Increase stock quantity"
                  className="h-11 w-11 rounded-lg border border-jds-outline-variant bg-jds-surface-container-low flex items-center justify-center hover:bg-jds-surface-container cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setQuickQuantity(0)}
                  className="min-h-[36px] rounded-lg border border-jds-error/30 bg-jds-error-container/15 text-xs font-bold text-jds-error hover:bg-jds-error-container/25 cursor-pointer"
                >
                  Set 0
                </button>
                {[-5, 1, 5, 10].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setQuickQuantity((prev) => Math.max(0, Number(prev || 0) + step))}
                    className="min-h-[36px] rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container cursor-pointer tabular-nums"
                  >
                    {step > 0 ? `+${step}` : step}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      })() : editingProduct && inspectorTab === 'edit' ? (
        showConfirmModal ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-jds-primary/30 bg-jds-surface-container-low p-3.5">
              <h3 className="text-sm font-bold text-jds-on-surface">Review &amp; Confirm Updates</h3>
              <p className="text-xs text-jds-on-surface-variant mt-0.5">
                {pendingChanges.length} specification{pendingChanges.length === 1 ? '' : 's'} modified.
              </p>
            </div>
            <div className="space-y-2">
              {pendingChanges.map((chg) => (
                <div
                  key={chg.key}
                  className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/50 p-3 text-xs space-y-1"
                >
                  <div className="font-bold text-jds-on-surface flex items-center justify-between">
                    <span>{chg.label}</span>
                    <span className="font-mono text-[11px] text-jds-on-surface-variant">{chg.key}</span>
                  </div>
                  {!chg.isImage && (
                    <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
                      <span className="line-through text-jds-error bg-jds-error-container/20 px-2 py-0.5 rounded">
                        {chg.oldValue}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-jds-primary shrink-0" />
                      <span className="font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded">
                        {chg.newValue}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {EDIT_FIELD_GROUPS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEditTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    activeEditTab === tab.id
                      ? 'bg-jds-primary text-jds-on-primary'
                      : 'bg-jds-surface-container text-jds-on-surface-variant hover:text-jds-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {(activeEditTab === 'all' || activeEditTab === 'general') && (
              <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-jds-on-surface-variant">
                    Catalog Media
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-jds-on-surface-variant">
                    {parseProductImages(editingProduct.image_url).length} picture(s)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {parseProductImages(editingProduct.image_url).map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative rounded-lg border border-jds-outline-variant/40 bg-white p-1">
                      <img
                        src={url}
                        alt={`Product media ${idx + 1}`}
                        className="h-16 w-full object-contain rounded"
                      />
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        {idx > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryProductImage(idx)}
                            className="text-jds-primary font-semibold hover:underline cursor-pointer"
                          >
                            Primary
                          </button>
                        ) : (
                          <span className="text-jds-on-surface-variant">#1</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveProductImage(idx)}
                          aria-label="Remove picture"
                          className="text-jds-error p-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="border-2 border-dashed border-jds-outline-variant/50 rounded-lg min-h-[82px] flex flex-col items-center justify-center p-2 text-center cursor-pointer hover:border-jds-primary"
                  >
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={handleEditImageUpload}
                      className="hidden"
                    />
                    <Upload className="h-4 w-4 text-jds-primary mb-1" />
                    <span className="text-[11px] font-semibold text-jds-on-surface">
                      {editingImageUploading ? 'Uploading...' : 'Upload'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={newImageUrlInput}
                    onChange={(e) => setNewImageUrlInput(e.target.value)}
                    placeholder="Paste Storage image URL..."
                    className="h-9 flex-1 rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-lowest px-2.5 text-xs outline-none focus:border-jds-primary"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddNewImageUrl}
                    className="h-9 px-3 text-xs font-semibold border-jds-outline-variant cursor-pointer"
                  >
                    Add URL
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {EDIT_FIELDS.filter(
                (f) =>
                  (activeEditTab === 'all' || f.group === activeEditTab) &&
                  (!isStaff || (f.key !== 'min_price' && f.key !== 'max_price'))
              ).map((f) => (
                <div key={f.key} className="space-y-1">
                  <label htmlFor={`prod-drawer-field-${f.key}`} className="text-xs font-semibold text-jds-on-surface-variant block">
                    {f.label}
                  </label>
                  {f.key === 'type' ? (
                    <div className="flex items-center gap-2">
                      <select
                        id={`prod-drawer-field-${f.key}`}
                        value={editingProduct.type ?? ''}
                        onChange={(e) => handleFieldChange('type', e.target.value, 'text')}
                        className="h-10 flex-1 rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-lowest px-3 text-sm outline-none focus:border-jds-primary"
                      >
                        <option value="">Select Category</option>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {onOpenCategories && (
                        <button
                          type="button"
                          onClick={onOpenCategories}
                          aria-label="Manage Categories"
                          className="h-10 w-10 flex items-center justify-center rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low hover:text-jds-primary cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <input
                      id={`prod-drawer-field-${f.key}`}
                      type={f.type}
                      value={editingProduct[f.key] ?? ''}
                      onChange={(e) => handleFieldChange(f.key, e.target.value, f.type)}
                      className={`h-10 w-full rounded-lg border bg-jds-surface-container-lowest px-3 text-sm outline-none ${
                        validationErrors[f.key] ? 'border-jds-error' : 'border-jds-outline-variant/40 focus:border-jds-primary'
                      }`}
                    />
                  )}
                  {validationErrors[f.key] && (
                    <p className="text-xs text-jds-error font-medium">{validationErrors[f.key]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      ) : null}
    </InspectorDrawer>
  )
}
