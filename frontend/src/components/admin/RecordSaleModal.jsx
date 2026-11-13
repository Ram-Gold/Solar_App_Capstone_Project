import { useState, useEffect } from 'react'
import {
  X,
  ShoppingBag,
  AlertTriangle,
  Check,
  Plus,
  Minus } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import {
  getStockQuantity,
  getAvailableQuantity,
  getReservedQuantity,
  executeManualSale,
  LOW_STOCK_THRESHOLD
} from '../../lib/inventoryUtils'
import { Button } from '../ui/button'
import useModalBehavior from '../../hooks/useModalBehavior'
import AnimatedConfirmation from '../ui/AnimatedConfirmation'

export default function RecordSaleModal({ product, onClose, onSaleSuccess }) {
  const { backdropProps } = useModalBehavior({
    isOpen: Boolean(product),
    onClose,
  })
  const [unitsSold, setUnitsSold] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isConfirmedTransition, setIsConfirmedTransition] = useState(false)
  const [confirmedData, setConfirmedData] = useState(null)

  useEffect(() => {
    if (product) {
      setUnitsSold(1)
      setErrorMsg('')
      setIsConfirmedTransition(false)
      setConfirmedData(null)
    }
  }, [product])

  if (!product) return null

  const currentStock = getStockQuantity(product)
  const currentReserved = getReservedQuantity(product)
  const currentAvailable = getAvailableQuantity(product)
  const currentSales = Number(product.sales || 0)
  const isOutOfStock = currentAvailable <= 0
  const maxSellable = Math.max(0, currentAvailable)

  const projectedStock = Math.max(0, currentStock - (Number(unitsSold) || 0))
  const projectedAvailable = Math.max(0, currentAvailable - (Number(unitsSold) || 0))
  const projectedSales = currentSales + (Number(unitsSold) || 0)

  const willBeLowStock = projectedAvailable > 0 && projectedAvailable <= LOW_STOCK_THRESHOLD
  const willBeOutOfStock = projectedAvailable === 0

  const handleUnitsChange = (val) => {
    setErrorMsg('')
    if (val === '') {
      setUnitsSold('')
      return
    }
    const num = Math.max(1, Number(val))
    if (num > currentAvailable) {
      setUnitsSold(currentAvailable)
      setErrorMsg(`Maximum unreserved inventory available for walk-in sale is ${currentAvailable} unit(s)${currentReserved > 0 ? ` (${currentReserved} held for reservations)` : ''}.`)
    } else {
      setUnitsSold(num)
    }
  }

  const handlePresetClick = (qty) => {
    if (qty > currentAvailable) {
      setUnitsSold(currentAvailable)
      setErrorMsg(`Selected preset capped at current available inventory of ${currentAvailable} units.`)
    } else {
      setUnitsSold(qty)
      setErrorMsg('')
    }
  }

  const handleConfirmSale = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    const qty = Number(unitsSold)
    if (!qty || qty <= 0) {
      setErrorMsg('Please specify at least 1 unit sold.')
      return
    }

    if (qty > currentAvailable) {
      setErrorMsg(`Cannot sell ${qty} units for direct walk-in. Only ${currentAvailable} unreserved unit(s) available (${currentReserved} held for reservations).`)
      return
    }

    try {
      setSubmitting(true)
      const result = await executeManualSale(supabase, product, qty)
      const updatedProduct = {
        ...product,
        stock_quantity: result.newStock,
        sales: result.newSales,
        in_stock: result.newInStock,
      }
      setConfirmedData({
        updatedProduct,
        qty,
        newStock: result.newStock,
      })
      setIsConfirmedTransition(true)
    } catch (err) {
      console.error('Failed to record sale:', err)
      setErrorMsg(err.message || 'Failed to record customer sale.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      {...backdropProps}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-jds-outline-variant/40 bg-jds-surface p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
      >
        {isConfirmedTransition ? (
          <AnimatedConfirmation
            title="Sale Recorded Successfully"
            description={`Processed deduction of ${confirmedData?.qty || 1} unit(s). Current available inventory: ${confirmedData?.newStock ?? ''} units.`}
            duration={1800}
            onComplete={() => {
              if (onSaleSuccess && confirmedData?.updatedProduct) {
                onSaleSuccess(confirmedData.updatedProduct)
              }
              onClose()
            }}
          />
        ) : (
          <>
            {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-jds-outline-variant/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-body-lg font-bold text-jds-on-surface">Record Customer Sale</h3>
              <p className="text-label-sm text-jds-on-surface-variant font-medium line-clamp-1">
                {product.name} ({product.watt}W)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-jds-on-surface-variant/70 hover:bg-jds-surface-container-high hover:text-jds-on-surface transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Depleted Warning */}
        {isOutOfStock ? (
          <div className="rounded-xl border border-jds-error/30 bg-jds-error-container/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-jds-error font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              <span>Inventory Depleted</span>
            </div>
            <p className="text-xs text-jds-on-surface-variant leading-relaxed">
              This product is currently <strong>Out of Stock (0 units)</strong>. Inventory must be restocked before customer sales can be recorded.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="w-full text-xs font-semibold border-jds-outline-variant text-jds-on-surface"
              >
                Close Window
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmSale} className="space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-jds-error-container/15 border border-jds-error/30 text-jds-error text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Current Stats */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-jds-surface-container-low/40 border border-jds-outline-variant/20 text-xs">
              <div>
                <span className="text-jds-on-surface-variant font-medium">Total Stock</span>
                <div className="text-sm font-bold font-mono text-jds-on-surface mt-0.5">
                  {currentStock}
                </div>
              </div>
              <div>
                <span className="text-jds-on-surface-variant font-medium">Available</span>
                <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {currentAvailable} {currentReserved > 0 && <span className="text-[10px] text-amber-600 font-normal">({currentReserved} res)</span>}
                </div>
              </div>
              <div>
                <span className="text-jds-on-surface-variant font-medium">Total Sales</span>
                <div className="text-sm font-bold font-mono text-jds-on-surface mt-0.5">
                  {currentSales}
                </div>
              </div>
            </div>

            {/* Units Sold Stepper Input */}
            <div className="space-y-2">
              <label className="text-label-sm font-bold uppercase tracking-wider text-jds-on-surface-variant/80">
                Number of Units Sold
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={unitsSold <= 1}
                  onClick={() => setUnitsSold((prev) => Math.max(1, Number(prev || 1) - 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 text-jds-on-surface hover:bg-jds-surface-container-high active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Minus className="h-5 w-5" />
                </button>

                <input
                  type="number"
                  min="1"
                  max={maxSellable}
                  value={unitsSold}
                  onChange={(e) => handleUnitsChange(e.target.value)}
                  className="h-12 flex-1 rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/20 px-4 text-center font-mono text-headline-sm font-bold text-jds-on-surface outline-none focus:border-jds-primary focus:bg-jds-surface-container-lowest transition-all"
                />

                <button
                  type="button"
                  disabled={unitsSold >= currentStock}
                  onClick={() => setUnitsSold((prev) => Math.min(currentStock, Number(prev || 0) + 1))}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 text-jds-on-surface hover:bg-jds-surface-container-high active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-label-sm font-medium text-jds-on-surface-variant/70">Quick Sale Presets</span>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((preset) => {
                  const isApplicable = preset <= currentStock
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={!isApplicable}
                      onClick={() => handlePresetClick(preset)}
                      className={`rounded-lg border py-2 text-label-sm font-semibold transition-all ${
                        Number(unitsSold) === preset
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold'
                          : 'border-jds-outline-variant/30 bg-jds-surface-container-low/30 text-jds-on-surface hover:bg-jds-surface-container-high'
                      } ${!isApplicable ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      {preset} Unit{preset > 1 ? 's' : ''}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Impact & Projection Card */}
            <div className="rounded-xl border border-jds-outline-variant/30 bg-jds-surface-container-low/30 p-4 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                Inventory Impact Preview
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-jds-on-surface-variant">Stock After Sale:</span>
                  <span className="font-mono font-bold text-jds-on-surface">
                    {currentStock} &rarr; <span className={willBeOutOfStock ? 'text-jds-error font-extrabold' : willBeLowStock ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-emerald-600 font-bold'}>{projectedStock}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-jds-on-surface-variant">Sales After Sale:</span>
                  <span className="font-mono font-bold text-jds-on-surface">
                    {currentSales} &rarr; <span className="text-jds-primary font-bold">{projectedSales}</span>
                  </span>
                </div>
              </div>

              {willBeOutOfStock && (
                <div className="text-[11px] text-jds-error font-semibold flex items-center gap-1.5 pt-1 border-t border-jds-outline-variant/20">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>This sale will deplete all stock and trigger the Out of Stock alert.</span>
                </div>
              )}
              {willBeLowStock && !willBeOutOfStock && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5 pt-1 border-t border-jds-outline-variant/20">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>This sale will reduce stock to &le; 5 units, moving this item to the top of lists.</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-3 pt-3 border-t border-jds-outline-variant/20">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-jds-outline-variant text-jds-on-surface-variant h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || isOutOfStock || !unitsSold || unitsSold <= 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 gap-1.5"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    Recording...
                  </div>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm Sale (-{unitsSold || 0} Stock)</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
          </>
        )}
      </div>
    </div>
  )
}
