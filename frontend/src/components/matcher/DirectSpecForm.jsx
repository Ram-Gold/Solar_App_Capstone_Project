// Single-screen form with dropdowns and a Submit button for Direct entry (RAM-10, RAM-11, RAM-12)
import { useState } from 'react'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import {
  LOCATIONS,
  FORM_FACTORS,
  MOUNTING_OPTIONS,
  QUANTITY_PRESETS,
  getBudgetValidationError,
  getWattageValidationError,
} from './matcherConfig'
import NumericCriterionInput from './NumericCriterionInput'
import MatchResultsPanel from './MatchResultsPanel'

export default function DirectSpecForm({
  criteria,
  onCriteriaChange,
  matchResult,
  catalogBounds,
  onConsultAssistant,
  onRestart,
}) {
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const quantity = Math.max(1, Number(criteria.quantity) || 1)
  const budgetMode = criteria.budgetMode === 'total' ? 'total' : 'unit'
  const selectedLocation = LOCATIONS.find((l) => l.id === criteria.location)
  const selectedFormFactor = FORM_FACTORS.find((f) => f.id === (criteria.formFactor || 'any'))
  const selectedMounting = MOUNTING_OPTIONS.find((m) => m.id === (criteria.mounting || 'any'))

  const powerPresets = [
    ...(catalogBounds?.powerPresets || [100, 150, 200, 300, 400, 500, 600, 800]),
    { label: 'Any', value: 'any' },
  ]

  const budgetPresets =
    budgetMode === 'total' && quantity > 1
      ? [
          { label: `₱${(1500 * quantity).toLocaleString()}`, value: 1500 * quantity },
          { label: `₱${(2500 * quantity).toLocaleString()}`, value: 2500 * quantity },
          { label: `₱${(3500 * quantity).toLocaleString()}`, value: 3500 * quantity },
          { label: 'Any', value: 'any' },
        ]
      : catalogBounds?.budgetPresets || [
          { label: '₱1,500', value: 1500 },
          { label: '₱2,500', value: 2500 },
          { label: '₱3,500', value: 3500 },
          { label: '₱5,000', value: 5000 },
          { label: 'Any', value: 'any' },
        ]

  const wattageError = getWattageValidationError(criteria.powerNeeds)
  const budgetError = getBudgetValidationError(criteria.budget)

  const handleBudgetModeSwitch = (nextMode) => {
    if (nextMode === budgetMode) return
    if (
      criteria.budget === 'any' ||
      criteria.budget === '' ||
      criteria.budget === null ||
      criteria.budget === undefined
    ) {
      onCriteriaChange({ ...criteria, budgetMode: nextMode })
      return
    }
    const currentNum = Number(criteria.budget)
    if (isNaN(currentNum) || currentNum <= 0) {
      onCriteriaChange({ ...criteria, budgetMode: nextMode })
      return
    }
    const converted =
      nextMode === 'total'
        ? Math.round(currentNum * quantity)
        : Math.max(100, Math.round(currentNum / quantity))
    onCriteriaChange({ ...criteria, budgetMode: nextMode, budget: converted })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (wattageError || budgetError) return
    onCriteriaChange({
      ...criteria,
      powerNeeds: criteria.powerNeeds === '' || criteria.powerNeeds === null ? 'any' : criteria.powerNeeds,
      budget: criteria.budget === '' || criteria.budget === null ? 'any' : criteria.budget,
      quantity: Math.max(1, Number(criteria.quantity) || 1),
    })
    setHasSubmitted(true)
  }

  if (hasSubmitted) {
    return (
      <MatchResultsPanel
        criteria={criteria}
        matchResult={matchResult}
        onAdjustSpecs={() => setHasSubmitted(false)}
        onConsultAssistant={onConsultAssistant}
        onRestart={() => {
          setHasSubmitted(false)
          if (onRestart) onRestart()
        }}
      />
    )
  }

  const selectClasses =
    'w-full appearance-none rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-700 px-3.5 py-2.5 pr-9 text-sm font-medium text-neutral-900 dark:text-white outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer'

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-6">
      <div className="space-y-6">
        <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Tell us what you need
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Fill in the fields you know, leave the rest blank, then click Submit.
          </p>
        </div>

        {/* Dropdown Fields: Location, Light style, Mounting */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="direct-location"
              className="block text-xs font-semibold text-neutral-900 dark:text-white"
            >
              Where will you put it?
            </label>
            <div className="relative">
              <select
                id="direct-location"
                value={criteria.location}
                onChange={(e) => {
                  const nextId = e.target.value
                  const loc = LOCATIONS.find((l) => l.id === nextId)
                  onCriteriaChange({
                    ...criteria,
                    location: nextId,
                    ...(criteria.wattageManuallyEdited || !loc ? {} : { powerNeeds: loc.recommendedWatt }),
                  })
                }}
                className={selectClasses}
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 text-neutral-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            {selectedLocation && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                {selectedLocation.desc}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="direct-form-factor"
              className="block text-xs font-semibold text-neutral-900 dark:text-white"
            >
              Light style
            </label>
            <div className="relative">
              <select
                id="direct-form-factor"
                value={criteria.formFactor || 'any'}
                onChange={(e) => onCriteriaChange({ ...criteria, formFactor: e.target.value })}
                className={selectClasses}
              >
                {FORM_FACTORS.map((ff) => (
                  <option key={ff.id} value={ff.id}>
                    {ff.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 text-neutral-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            {selectedFormFactor && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                {selectedFormFactor.desc}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="direct-mounting"
              className="block text-xs font-semibold text-neutral-900 dark:text-white"
            >
              How will you mount it?
            </label>
            <div className="relative">
              <select
                id="direct-mounting"
                value={criteria.mounting || 'any'}
                onChange={(e) => onCriteriaChange({ ...criteria, mounting: e.target.value })}
                className={selectClasses}
              >
                {MOUNTING_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-4 text-neutral-400 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            {selectedMounting && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                {selectedMounting.desc}
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-100 dark:border-neutral-800" />

        {/* Numeric Input Fields: Brightness, Quantity, Budget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <NumericCriterionInput
            id="direct-wattage"
            label="Brightness (watts)"
            helperText="Leave blank for any wattage"
            value={criteria.powerNeeds}
            onChange={(val) =>
              onCriteriaChange({
                ...criteria,
                powerNeeds: val,
                wattageManuallyEdited: true,
              })
            }
            presets={powerPresets}
            suffix="W"
            placeholder="Any"
            min={50}
            max={2000}
            allowAny
            compact
            error={wattageError}
          />

          <NumericCriterionInput
            id="direct-quantity"
            label="How many units?"
            helperText="Shows estimated total cost"
            value={criteria.quantity}
            onChange={(val) =>
              onCriteriaChange({
                ...criteria,
                quantity: val === '' ? '' : Math.max(1, Number(val) || 1),
              })
            }
            presets={QUANTITY_PRESETS.map((q) => ({ label: q === 50 ? '50+' : `${q}`, value: q }))}
            suffix={quantity === 1 ? 'unit' : 'units'}
            placeholder="1"
            min={1}
            max={10000}
            compact
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="direct-budget"
                className="text-xs font-semibold text-neutral-900 dark:text-white"
              >
                Budget
              </label>
              <div className="inline-flex rounded-lg bg-neutral-200/70 dark:bg-neutral-800 p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => handleBudgetModeSwitch('unit')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    budgetMode === 'unit'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  Per unit
                </button>
                <button
                  type="button"
                  onClick={() => handleBudgetModeSwitch('total')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    budgetMode === 'total'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  Total
                </button>
              </div>
            </div>
            <NumericCriterionInput
              id="direct-budget"
              helperText={
                budgetMode === 'total' && quantity > 1
                  ? `Total for ${quantity} units (leave blank for any)`
                  : 'Max price per light (leave blank for any)'
              }
              value={criteria.budget}
              onChange={(val) => onCriteriaChange({ ...criteria, budget: val })}
              presets={budgetPresets}
              prefix="₱"
              placeholder="Any"
              min={100}
              allowAny
              compact
              error={budgetError}
            />
          </div>
        </div>
      </div>

      {/* Form Footer with Submit Button */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw className="size-3.5" />
            <span>Start over</span>
          </button>
        ) : (
          <div />
        )}

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <span>Submit</span>
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </form>
  )
}
