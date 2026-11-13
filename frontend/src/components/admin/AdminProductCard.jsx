import {
  Pencil,
  Minus,
  Plus,
  ShoppingBag,
  Boxes,
  Trash2,
} from 'lucide-react'
import { Button } from '../ui/button'
import { getStockBadgeConfig } from '../../lib/inventoryUtils'
import { getMainProductImage } from '../../lib/productImageUtils'

export default function AdminProductCard({
  product,
  onOpenEdit,
  onOpenStockStepper,
  onOpenRecordSale,
  onRequestDirectStockChange,
  onRequestDirectSaleChange,
  onInitiateDelete,
  showDelete = false,
}) {
  const badge = getStockBadgeConfig(product)
  const stockQty = badge.quantity
  const salesQty = Number(product.sales || 0)

  return (
    <div
      onClick={() => onOpenEdit?.(product)}
      className={`flex flex-col justify-between rounded-2xl border bg-jds-surface-container-lowest p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group ${badge.rowBorderClass}`}
      title={`Click to view and edit ${product.name}`}
    >
      <div className="space-y-3">
        {/* Card Top: Image + Status Badge + Power Rating */}
        <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-jds-outline-variant/20 h-44 flex items-center justify-center p-2">
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
        <div className="rounded-xl border border-jds-outline-variant/20 bg-jds-surface-container-low/20 p-2.5 space-y-2">
          {/* Inventory Stock Stepper */}
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-jds-on-surface-variant">Inventory Stock:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={stockQty <= 0}
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDirectStockChange?.(product, -1)
                }}
                className="h-6 w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
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
                {stockQty}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDirectStockChange?.(product, +1)
                }}
                className="h-6 w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all text-xs cursor-pointer"
                title="Increase stock by 1"
                aria-label="Increase stock"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Recorded Sales Stepper */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-jds-outline-variant/15 font-medium">
            <span className="text-jds-on-surface-variant">Recorded Sales:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={salesQty <= 0}
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDirectSaleChange?.(product, -1)
                }}
                className="h-6 w-6 rounded flex items-center justify-center border border-jds-outline-variant/40 bg-jds-surface hover:bg-jds-surface-container-high transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
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
                disabled={stockQty <= 0}
                onClick={(e) => {
                  e.stopPropagation()
                  onRequestDirectSaleChange?.(product, +1)
                }}
                className="h-6 w-6 rounded flex items-center justify-center border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-all disabled:opacity-30 disabled:pointer-events-none text-xs cursor-pointer"
                title="Record 1 sale (-1 stock)"
                aria-label="Record sale"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer: Operational Actions (Record Sale, Stock Adjustment, Edit, Delete) */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-jds-outline-variant/20 gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={stockQty === 0}
          onClick={(e) => {
            e.stopPropagation()
            onOpenRecordSale?.(product)
          }}
          className="flex-1 text-xs font-semibold h-8 gap-1 border-jds-outline-variant hover:border-emerald-500 hover:text-emerald-600 disabled:opacity-40 cursor-pointer"
          title={stockQty === 0 ? 'Out of Stock - Cannot record sale' : 'Record Customer Sale'}
        >
          <ShoppingBag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Sale</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenStockStepper?.(product, 0)
          }}
          className="flex-1 text-xs font-semibold h-8 gap-1 border-jds-outline-variant hover:border-jds-primary hover:text-jds-primary cursor-pointer"
          title="Adjust Inventory Stock"
        >
          <Boxes className="h-3.5 w-3.5 text-jds-primary shrink-0" />
          <span>Stock</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onOpenEdit?.(product)
          }}
          className="flex-1 text-xs font-semibold h-8 gap-1 border-jds-outline-variant hover:border-jds-secondary hover:text-jds-secondary cursor-pointer"
          title="Edit Product Details"
        >
          <Pencil className="h-3.5 w-3.5 text-jds-secondary shrink-0" />
          <span>Edit</span>
        </Button>

        {showDelete && onInitiateDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onInitiateDelete(product)
            }}
            className="h-8 w-8 text-jds-error hover:bg-jds-error-container/20 rounded-lg shrink-0 cursor-pointer"
            title="Delete product"
            aria-label="Delete product"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
