import { AlertTriangle, Check, RotateCcw, Save } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

/**
 * Sticky Save Changes bar and confirmation dialog for staged Stock/Sale edits.
 */
export default function StagedInventoryBar({
  pendingList,
  pendingCount,
  confirmOpen,
  setConfirmOpen,
  saving,
  onDiscard,
  onRequestSave,
  onConfirmSave,
}) {
  if (pendingCount === 0 && !confirmOpen) return null

  return (
    <>
      {pendingCount > 0 && (
        <div
          role="region"
          aria-label="Pending inventory changes"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl rounded-xl border border-jds-primary/40 bg-jds-surface/95 backdrop-blur-md px-4 py-3 shadow-xl flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-bold text-jds-on-surface">
              {pendingCount} unsaved {pendingCount === 1 ? 'product change' : 'product changes'}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {pendingList.map((entry) => {
                const stockDelta = entry.targetStock - entry.baseStock
                const salesDelta = entry.targetSales - entry.baseSales
                const parts = []
                if (stockDelta !== 0) parts.push(`Stock ${stockDelta > 0 ? `+${stockDelta}` : stockDelta}`)
                if (salesDelta !== 0) parts.push(`Sales ${salesDelta > 0 ? `+${salesDelta}` : salesDelta}`)
                return (
                  <span
                    key={entry.product.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] font-medium text-jds-on-surface max-w-full"
                  >
                    <span className="font-semibold truncate max-w-[160px]">{entry.product.name}</span>
                    <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 font-bold shrink-0">
                      ({parts.join(', ')})
                    </span>
                  </span>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={saving}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onRequestSave}
              disabled={saving}
              className="gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes ({pendingCount})
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={(open) => !saving && setConfirmOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              Confirm Stock &amp; Sales Changes
            </DialogTitle>
            <DialogDescription>
              Review the {pendingCount} pending {pendingCount === 1 ? 'update' : 'updates'} below before saving to the database.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-60 overflow-y-auto space-y-2 py-1">
            {pendingList.map((entry) => {
              const stockChanged = entry.targetStock !== entry.baseStock
              const salesChanged = entry.targetSales !== entry.baseSales
              return (
                <div
                  key={entry.product.id}
                  className="rounded-lg border border-jds-outline-variant/40 bg-jds-surface-container-low/60 px-3 py-2 text-xs space-y-1"
                >
                  <div className="font-semibold text-jds-on-surface truncate">
                    {entry.product.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-jds-on-surface-variant">
                    {stockChanged && (
                      <span>
                        Stock: <strong className="text-jds-on-surface">{entry.baseStock}</strong> {'->'}{' '}
                        <strong className="text-jds-primary">{entry.targetStock}</strong>
                      </span>
                    )}
                    {salesChanged && (
                      <span>
                        Sales: <strong className="text-jds-on-surface">{entry.baseSales}</strong> {'->'}{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">{entry.targetSales}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirmSave}
              disabled={saving}
              className="gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
