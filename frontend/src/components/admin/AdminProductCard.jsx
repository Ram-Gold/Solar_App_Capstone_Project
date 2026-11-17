import { memo } from 'react'
import {
  Pencil,
  Minus,
  Plus,
  ShoppingBag,
  Boxes,
  Trash2,
  Archive,
  RotateCcw,
} from 'lucide-react'
import { Button } from '../ui/button'
import { getStockBadgeConfig } from '../../lib/inventoryUtils'
import { getMainProductImage } from '../../lib/productImageUtils'

const AdminProductCard = memo(function AdminProductCard({
  product,
  onOpenEdit,
  onOpenStockStepper,
  onOpenRecordSale,
  onRequestDirectStockChange,
  onRequestDirectSaleChange,
  onInitiateDelete,
  onArchiveToggle,
  showDelete = false,
  selectable = false,
  selected = false,
  onToggleSelect,
}) {
  const badge = getStockBadgeConfig(product)
  const availableQty = badge.quantity
  const totalStockQty = badge.total
  const reservedQty = badge.reserved
  const salesQty = Number(product.sales || 0)

  return (
    <div
      onClick={() => onOpenEdit?.(product)}
      className={`flex flex-col justify-between rounded-xl border bg-jds-surface-container-lowest p-4 transition-colors cursor-pointer group ${
        selected
          ? 'ring-2 ring-jds-primary border-jds-primary'
          : `border-jds-outline-variant hover:border-jds-primary/45 ${badge.rowBorderClass}`
      }`}
      title={`Click to view and edit ${product.name}`}
    >
      <div className="space-y-3">
        {/* Card Top: Image + Selection Checkbox + Status Badge + Power Rating */}
        <div className="relative rounded-lg overflow-hidden bg-jds-surface-container-low border border-jds-outline-variant/60 h-40 flex items-center justify-center p-2">
          {selectable && (
            <label
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2.5 left-2.5 z-10 inline-flex items-center justify-center h-7 w-7 rounded-lg bg-jds-surface-container-lowest/95 border border-jds-outline-variant/60 shadow-xs cursor-pointer"
              title={selected ? `Deselect ${product.name}` : `Select ${product.name}`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect?.(product.id)}
                aria-label={`Select ${product.name}`}
                className="h-4 w-4 accent-[#b45309] rounded cursor-pointer"
              />
            </label>
          )}
          <img
            src={getMainProductImage(product.image_url) || 'https://placehold.co/200x200?text=None'}
            alt={product.name}
            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = 'https://placehold.co/200x200?text=None'
            }}
          />
          <span
            className={`absolute top-2.5 right-2.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.cardBadgeClass}`}
          >
            {badge.shortLabel}
          </span>
          <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-white font-mono text-[11px] font-bold">
            {product.watt}W
          </span>
        </div>

        {/* Card Body: Title & Details */}
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-jds-on-surface-variant font-mono">
            <span className="uppercase tracking-wider">{product.type || 'Standard'}</span>
            <span>ID: {product.id}</span>
          </div>
          <h4
            className="font-bold text-jds-on-surface text-body-md line-clamp-1 group-hover:text-jds-primary transition-colors mt-0.5"
            title={product.name}
          >
            {product.name}
          </h4>
          {(product.min_price || product.price_range) && (
            <p className="text-xs font-semibold text-jds-primary mt-0.5">
              {product.min_price && product.max_price
                ? `₱${Number(product.min_price).toLocaleString()} - ₱${Number(product.max_price).toLocaleString()}`
                : product.min_price
                  ? `₱${Number(product.min_price).toLocaleString()}+`
                  : `₱${product.price_range}`}
            </p>
          )}
        </div>

        {/* Stock & Sales Steppers Section */}
        <div className="rounded-lg border border-jds-outline-variant/60 bg-jds-surface-container-low/50 p-2.5 space-y-2">
          {/* Inventory Stock Stepper */}
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-jds-on-surface-variant">Stock Units:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={totalStockQty <= 0}
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDirectStockChange?.(product, -1)
                }}
                className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-6 md:w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                title="Decrease stock by 1"
                aria-label="Decrease stock"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenStockStepper?.(product, 0)
                }}
                className="font-mono font-bold text-jds-on-surface cursor-pointer px-1.5 py-0.5 rounded hover:bg-jds-surface-container hover:text-jds-primary transition-colors text-xs"
                title="Click number to open full stock adjustment modal"
              >
                {totalStockQty}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDirectStockChange?.(product, +1)
                }}
                className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-6 md:w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all text-xs cursor-pointer"
                title="Increase stock by 1"
                aria-label="Increase stock"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {reservedQty > 0 && (
            <div className="pt-1.5 border-t border-jds-outline-variant/15 flex flex-wrap items-center justify-between gap-1 text-[11px]">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                On Hold: {reservedQty}
              </span>
            </div>
          )}

          {/* Branch breakdown indicator if Cavite has stock */}
          {badge.breakdown?.hasCaviteStock && (
            <div className="text-[10px] text-jds-on-surface-variant/80 flex items-center justify-between pt-0.5">
              <span>Quiapo: {badge.breakdown.quiapo.available}</span>
              <span>Cavite: {badge.breakdown.cavite.available}</span>
            </div>
          )}

          {/* Recorded Sales Stepper */}
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-jds-outline-variant/15 font-medium">
            <span className="text-jds-on-surface-variant">Recorded Sales:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={salesQty <= 0}
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDirectSaleChange?.(product, -1)
                }}
                className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-6 md:w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                title="Reverse 1 sale (+1 stock)"
                aria-label="Reverse sale"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenRecordSale?.(product)
                }}
                className="font-mono font-bold text-jds-on-surface cursor-pointer px-1.5 py-0.5 rounded hover:bg-jds-surface-container hover:text-jds-primary transition-colors text-xs"
                title="Click number to open Record Sale modal"
              >
                {salesQty}
              </span>
              <button
                type="button"
                disabled={availableQty <= 0}
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDirectSaleChange?.(product, +1)
                }}
                className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 md:h-6 md:w-6 rounded flex items-center justify-center border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                title={availableQty <= 0 ? 'No unreserved units available to sell' : 'Record 1 walk-in sale (-1 stock)'}
                aria-label="Record sale"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Operational Actions (Record Sale, Stock Adjustment, Edit, Delete) */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-jds-outline-variant/60 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={availableQty <= 0}
          onClick={(e) => {
            e.stopPropagation()
            onOpenRecordSale?.(product)
          }}
          className="flex-1 text-xs font-semibold md:h-8 gap-1 border-jds-outline-variant hover:border-jds-primary hover:text-jds-primary disabled:opacity-40 cursor-pointer"
          title={availableQty <= 0 ? (reservedQty > 0 ? 'All units temporarily reserved - Cannot record walk-in sale' : 'Out of Stock - Cannot record sale') : 'Record Customer Sale'}
        >
          <ShoppingBag className="h-3.5 w-3.5 text-jds-on-surface-variant shrink-0" />
          <span>Sale</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenStockStepper?.(product, 0)
          }}
          className="flex-1 text-xs font-semibold md:h-8 gap-1 border-jds-outline-variant hover:border-jds-primary hover:text-jds-primary cursor-pointer"
          title="Adjust Inventory Stock"
        >
          <Boxes className="h-3.5 w-3.5 text-jds-on-surface-variant shrink-0" />
          <span>Stock</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenEdit?.(product)
          }}
          className="flex-1 text-xs font-semibold md:h-8 gap-1 border-jds-outline-variant hover:border-jds-primary hover:text-jds-primary cursor-pointer"
          title="Edit Product Details"
        >
          <Pencil className="h-3.5 w-3.5 text-jds-on-surface-variant shrink-0" />
          <span>Edit</span>
        </Button>

        {onArchiveToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onArchiveToggle(product)
            }}
            className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary rounded-lg shrink-0 cursor-pointer"
            title={product.is_archived ? 'Restore product to active catalog' : 'Archive product'}
            aria-label={product.is_archived ? `Restore ${product.name}` : `Archive ${product.name}`}
          >
            {product.is_archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          </Button>
        )}

        {showDelete && onInitiateDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onInitiateDelete(product)
            }}
            className="text-jds-error hover:bg-jds-error-container/40 rounded-lg shrink-0 cursor-pointer"
            title="Delete product"
            aria-label="Delete product"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
})

export default AdminProductCard
