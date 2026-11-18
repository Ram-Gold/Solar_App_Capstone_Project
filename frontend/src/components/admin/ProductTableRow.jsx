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
import { TableCell, TableRow } from '../ui/table'
import { getStockBadgeConfig, isProductArchived } from '../../lib/inventoryUtils'
import { getMainProductImage } from '../../lib/productImageUtils'

const ProductTableRow = memo(function ProductTableRow({
  product: p,
  isSelected,
  isStaff,
  isAdmin,
  onToggleSelect,
  onInspect,
  onAdjustStock,
  onAdjustSale,
  onOpenStockAudit,
  onOpenRecordSale,
  onEdit,
  onArchiveToggle,
  onDelete,
}) {
  const badge = getStockBadgeConfig(p)
  const stockQty = badge.quantity
  const archived = isProductArchived(p)
  const staged = p._staged

  return (
    <TableRow
      data-state={isSelected ? 'selected' : undefined}
      onClick={() => onInspect(p, 'inspect')}
      className={`cursor-pointer hover:bg-jds-surface-container-low/40 transition-colors ${badge.rowBorderClass} ${badge.rowBgClass} ${staged?.isPending ? 'border-l-[3px] border-l-amber-500 bg-amber-500/[0.04]' : ''}`}
    >
      {/* Selection Checkbox */}
      <TableCell className="w-10 pl-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(p.id)}
          aria-label={`Select ${p.name}`}
          className="h-4 w-4 accent-[#b45309] rounded cursor-pointer"
        />
      </TableCell>

      {/* Thumbnail */}
      <TableCell className="w-16 py-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onInspect(p, 'inspect')
          }}
          title="Inspect equipment details"
          className="group/img block rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-jds-primary/40 transition-transform active:scale-95"
        >
          <img
            src={getMainProductImage(p.image_url) || 'https://placehold.co/80x80?text=None'}
            alt={p.name}
            className="h-12 w-12 rounded-xl object-contain bg-black/5 border border-jds-outline-variant/30 p-1 group-hover/img:border-jds-primary transition-colors"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = 'https://placehold.co/80x80?text=None'
            }}
          />
        </button>
      </TableCell>

      {/* Title and ID */}
      <TableCell className="max-w-[260px] py-3">
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onInspect(p, 'inspect')
            }}
            title="Click to inspect and edit product"
            className="text-left font-bold text-jds-on-surface hover:text-jds-primary transition-colors focus:outline-none group/title flex items-center gap-1.5 w-full cursor-pointer"
          >
            <span className="truncate">{p.name}</span>
            <Pencil className="h-3 w-3 opacity-0 group-hover/title:opacity-80 text-jds-primary shrink-0 transition-opacity" />
          </button>
          <div className="flex items-center gap-2 text-xs text-jds-on-surface-variant font-mono tabular-nums">
            <span>ID: {p.id}</span>
            {!isStaff && (p.min_price || p.price_range) && (
              <>
                <span>&bull;</span>
                <span className="text-jds-primary font-semibold">
                  {p.min_price && p.max_price
                    ? `₱${Number(p.min_price).toLocaleString()} - ₱${Number(p.max_price).toLocaleString()}`
                    : p.min_price
                      ? `₱${Number(p.min_price).toLocaleString()}+`
                      : `₱${p.price_range}`}
                </span>
              </>
            )}
          </div>
        </div>
      </TableCell>

      {/* Category */}
      <TableCell className="py-3 text-jds-on-surface-variant text-label-sm font-medium">
        {p.type || 'Standard'}
      </TableCell>

      {/* Power */}
      <TableCell className="py-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-jds-surface-container font-mono text-xs font-bold text-jds-on-surface border border-jds-outline-variant/20">
          {p.watt}W
        </span>
      </TableCell>

      {/* Sales + Direct Stepper */}
      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={(p.sales || 0) <= 0}
            onClick={() => onAdjustSale(p, -1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low/40 text-jds-on-surface hover:bg-jds-surface-container-high hover:border-jds-primary active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Decrease sales by 1 (restores 1 stock)"
            aria-label="Decrease sales"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenRecordSale(p)}
            className="px-2.5 py-1.5 rounded-lg border border-jds-outline-variant/40 bg-jds-surface hover:border-jds-primary transition-all font-mono text-xs font-bold text-jds-on-surface group/sale"
            title="Click number to open Record Sale modal"
          >
            <span className="group-hover/sale:text-jds-primary transition-colors">
              {p.sales || 0}
            </span>
          </button>
          {staged?.salesDelta !== 0 && staged?.salesDelta !== undefined && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">
              {staged.salesDelta > 0 ? `+${staged.salesDelta}` : staged.salesDelta}
            </span>
          )}

          <button
            type="button"
            disabled={stockQty <= 0}
            onClick={() => onAdjustSale(p, +1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Increase sales by 1 (deducts 1 stock)"
            aria-label="Increase sales"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>

      {/* Stock Units + Direct Stepper (optimistic + debounced) */}
      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onAdjustStock(p, -1)}
            disabled={stockQty <= 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low/40 text-jds-on-surface hover:bg-jds-surface-container-high hover:border-jds-primary active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            title="Decrease stock by 1 unit"
            aria-label="Decrease stock"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenStockAudit(p)}
            className="px-3 py-1.5 rounded-lg border border-jds-outline-variant/40 bg-jds-surface hover:border-jds-primary transition-all font-mono text-xs font-bold text-jds-on-surface group/qty"
            title="Click number to open stock adjustment modal"
          >
            <span className="group-hover/qty:text-jds-primary transition-colors">
              {stockQty} unit{stockQty === 1 ? '' : 's'}
            </span>
          </button>
          {staged?.stockDelta !== 0 && staged?.stockDelta !== undefined && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-bold">
              {staged.stockDelta > 0 ? `+${staged.stockDelta}` : staged.stockDelta}
            </span>
          )}

          <button
            type="button"
            onClick={() => onAdjustStock(p, +1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low/40 text-jds-on-surface hover:bg-jds-surface-container-high hover:border-jds-primary active:scale-95 transition-all"
            title="Increase stock by 1 unit"
            aria-label="Increase stock"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>

      {/* Status Badge */}
      <TableCell className="py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold ${badge.badgeClass}`}
        >
          {badge.shortLabel}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-3 text-right pr-6">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            title={
              stockQty === 0
                ? 'Out of Stock - Cannot record sale'
                : 'Record Customer Sale (-Stock, +Sales)'
            }
            disabled={stockQty === 0}
            onClick={(e) => {
              e.stopPropagation()
              onOpenRecordSale(p)
            }}
            className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary disabled:opacity-30 disabled:pointer-events-none rounded-lg"
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title="Adjust Inventory Stock"
            onClick={(e) => {
              e.stopPropagation()
              onOpenStockAudit(p)
            }}
            className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary rounded-lg"
          >
            <Boxes className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title="Edit Product Details"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(p)
            }}
            className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary rounded-lg"
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title={archived ? 'Restore to Active Catalog' : 'Archive Product'}
            aria-label={archived ? `Restore ${p.name}` : `Archive ${p.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onArchiveToggle(p)
            }}
            className="text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-primary rounded-lg"
          >
            {archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>

          {isAdmin && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              title="Delete Product"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(p)
              }}
              className="h-8 w-8 text-jds-error hover:bg-jds-error-container/20 rounded-lg"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
})

export default ProductTableRow
