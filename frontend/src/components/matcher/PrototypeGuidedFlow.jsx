import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Compass,
  SlidersHorizontal,
  Sun,
  Wrench,
} from 'lucide-react'

import { getCatalogBounds } from '../../lib/multiCriteriaMatcher'
import {
  LOCATIONS,
  FORM_FACTORS,
  MOUNTING_OPTIONS,
  POWER_PRESETS,
  BUDGET_PRESETS,
  QUANTITY_PRESETS,
  getBudgetValidationError,
  getWattageValidationError,
} from './matcherConfig'
import NumericCriterionInput from './NumericCriterionInput'
import MatchResultsPanel from './MatchResultsPanel'
import DirectSpecForm from './DirectSpecForm'

export { LOCATIONS, POWER_PRESETS, BUDGET_PRESETS }

const GUIDED_STEPS = [
  { num: 1, label: 'Place' },
  { num: 2, label: 'Style' },
  { num: 3, label: 'Power' },
  { num: 4, label: 'Budget' },
  { num: 5, label: 'Matches' },
]

export default function PrototypeGuidedFlow({
  criteria,
  onCriteriaChange,
  matchResult,
  onConsultAssistant,
  catalogBounds,
  onResetCriteria,
}) {
  const [mode, setMode] = useState('entry')
  const [currentStep, setCurrentStep] = useState(1)

  const bounds = catalogBounds || matchResult?.catalogBounds || getCatalogBounds()
  const quantity = Math.max(1, Number(criteria.quantity) || 1)
  const budgetMode = criteria.budgetMode === 'total' ? 'total' : 'unit'
  const selectedLocation = LOCATIONS.find((l) => l.id === criteria.location)

  const powerPresets = [
    ...(bounds.powerPresets || [100, 150, 200, 300, 400, 500, 600, 800]),
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
      : bounds.budgetPresets || BUDGET_PRESETS

  const wattageError = getWattageValidationError(criteria.powerNeeds)
  const budgetError = getBudgetValidationError(criteria.budget)

  const handleStepSelect = (stepNum) => {
    if (stepNum === 5) {
      if (wattageError) {
        setCurrentStep(3)
        return
      }
      if (budgetError) {
        setCurrentStep(4)
        return
      }
    }
    setCurrentStep(stepNum)
  }

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

  const handleRestart = () => {
    if (onResetCriteria) onResetCriteria()
    setCurrentStep(1)
    setMode('entry')
  }

  return (
    <div className="w-full space-y-5">
      {/* Mode Switcher */}
      {mode !== 'entry' && (
        <div className="flex justify-center sm:justify-start">
          <div
            role="tablist"
            aria-label="Product Matcher mode"
            className="inline-flex items-center p-1 rounded-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 shadow-2xs backdrop-blur-md"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'guided'}
              onClick={() => setMode('guided')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                mode === 'guided'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Compass className="size-3.5" />
              <span>Step-by-step</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'direct'}
              onClick={() => setMode('direct')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                mode === 'direct'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Direct entry</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress Stepper */}
      {mode === 'guided' && (
        <div
          className="max-w-lg mx-auto pt-1 pb-2 px-4 select-none"
          aria-label={`Step ${currentStep} of ${GUIDED_STEPS.length}`}
        >
          <div className="relative">
            <div className="absolute top-2.5 left-[10%] right-[10%] h-[2px] -translate-y-1/2 bg-neutral-300 dark:bg-neutral-700 z-0">
              <div
                className="h-full bg-amber-500 transition-all duration-300 ease-out"
                style={{
                  width: `${((currentStep - 1) / (GUIDED_STEPS.length - 1)) * 100}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-5 relative z-10">
              {GUIDED_STEPS.map((s) => {
                const isCompleted = currentStep > s.num
                const isCurrent = currentStep === s.num

                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => handleStepSelect(s.num)}
                    className="flex flex-col items-center cursor-pointer group"
                  >
                    <div className="h-5 flex items-center justify-center">
                      {isCurrent ? (
                        <div className="size-[18px] rounded-full border-2 border-amber-500 bg-white dark:bg-neutral-900 flex items-center justify-center shadow-xs">
                          <div className="size-2 rounded-full bg-amber-500" />
                        </div>
                      ) : isCompleted ? (
                        <div className="size-2.5 rounded-full bg-amber-500" />
                      ) : (
                        <div className="size-2.5 rounded-full bg-neutral-400 dark:bg-neutral-600 group-hover:bg-amber-500/70 transition-colors" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs text-center transition-colors ${
                        isCurrent
                          ? 'text-neutral-900 dark:text-white font-semibold'
                          : isCompleted
                          ? 'text-neutral-600 dark:text-neutral-300 font-medium'
                          : 'text-neutral-400 dark:text-neutral-500 font-normal'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Card Container */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 lg:p-9 min-h-[440px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* ENTRY SCREEN */}
          {mode === 'entry' && (
            <motion.div
              key="mode-entry"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="text-center max-w-lg mx-auto space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  How would you like to find your solar light?
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Pick a quick guide or enter your numbers on one page.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1)
                    setMode('guided')
                  }}
                  className="group text-left p-6 rounded-2xl border border-amber-500/40 bg-white dark:bg-neutral-900 hover:border-amber-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-5 cursor-pointer"
                >
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      <Compass className="size-3.5" />
                      <span>Best for first-time buyers</span>
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        Help me choose
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                        Answer 4 short questions about where the light goes, sunlight, and your budget.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white">
                    <span>Start step-by-step</span>
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('direct')}
                  className="group text-left p-6 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-amber-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-5 cursor-pointer"
                >
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700">
                      <SlidersHorizontal className="size-3.5" />
                      <span>Fastest for bulk or repeat orders</span>
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        I know what I need
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                        Enter your watts, quantity, light style, and budget all on one screen.
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white">
                    <span>Go to direct entry</span>
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}

          {/* DIRECT ENTRY MODE */}
          {mode === 'direct' && (
            <motion.div
              key="mode-direct"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1"
            >
              <DirectSpecForm
                criteria={criteria}
                onCriteriaChange={onCriteriaChange}
                matchResult={matchResult}
                catalogBounds={bounds}
                onConsultAssistant={onConsultAssistant}
                onRestart={handleRestart}
              />
            </motion.div>
          )}

          {/* STEP 1: Place */}
          {mode === 'guided' && currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="text-center max-w-lg mx-auto space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Step 1 of 5
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Where will you put the light?
                </h3>
                <p className="text-sm text-neutral-500">
                  This sets a starting wattage that you can change later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {LOCATIONS.map((loc) => {
                  const isSelected = criteria.location === loc.id
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        onCriteriaChange({
                          ...criteria,
                          location: loc.id,
                          ...(criteria.wattageManuallyEdited ? {} : { powerNeeds: loc.recommendedWatt }),
                        })
                      }}
                      className={`group relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-amber-500/80 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] ring-1 ring-amber-500/30'
                          : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {loc.label}
                        </span>
                        <div
                          className={`size-5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 text-white'
                              : 'border border-neutral-300 dark:border-neutral-600'
                          }`}
                        >
                          {isSelected && <Check className="size-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-2.5">
                        {loc.desc}
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-200 tabular-nums">
                        Usually {loc.recommendedWatt}W
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setMode('entry')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Sunlight & Mounting */}
          {mode === 'guided' && currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="text-center max-w-lg mx-auto space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Step 2 of 5
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Sunlight and mounting
                </h3>
                <p className="text-sm text-neutral-500">
                  Shaded spots need a separate solar panel so the battery still charges.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-white">
                    <Sun className="size-4 text-amber-600 dark:text-amber-400" />
                    <span>Does the spot get direct sun?</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {FORM_FACTORS.map((ff) => {
                      const isSelected = (criteria.formFactor || 'any') === ff.id
                      return (
                        <button
                          key={ff.id}
                          type="button"
                          onClick={() => onCriteriaChange({ ...criteria, formFactor: ff.id })}
                          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500/80 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] ring-1 ring-amber-500/30'
                              : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">
                              {ff.label}
                            </span>
                            <div
                              className={`size-4 rounded-full flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 text-white'
                                  : 'border border-neutral-300 dark:border-neutral-600'
                              }`}
                            >
                              {isSelected && <Check className="size-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1">
                            {ff.sunPrompt}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {ff.desc}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-white">
                    <Wrench className="size-4 text-amber-600 dark:text-amber-400" />
                    <span>How will you mount it?</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {MOUNTING_OPTIONS.map((m) => {
                      const isSelected = (criteria.mounting || 'any') === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => onCriteriaChange({ ...criteria, mounting: m.id })}
                          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500/80 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] ring-1 ring-amber-500/30'
                              : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">
                              {m.label}
                            </span>
                            <div
                              className={`size-4 rounded-full flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 text-white'
                                  : 'border border-neutral-300 dark:border-neutral-600'
                              }`}
                            >
                              {isSelected && <Check className="size-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                            {m.desc}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Brightness & Quantity */}
          {mode === 'guided' && currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="text-center max-w-lg mx-auto space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Step 3 of 5
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Brightness and quantity
                </h3>
                <p className="text-sm text-neutral-500">
                  Pre-filled for {selectedLocation?.label?.toLowerCase() || 'your area'}. Type any number or tap a button.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800">
                  <NumericCriterionInput
                    id="guided-wattage"
                    label="Brightness (watts)"
                    helperText="Higher watts give brighter light for wider spaces."
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
                    placeholder="e.g. 300"
                    min={50}
                    max={2000}
                    allowAny
                    error={wattageError}
                  />
                </div>

                <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800">
                  <NumericCriterionInput
                    id="guided-quantity"
                    label="How many units do you need?"
                    helperText="We will show the estimated total price for your order."
                    value={criteria.quantity}
                    onChange={(val) =>
                      onCriteriaChange({
                        ...criteria,
                        quantity: val === '' ? '' : Math.max(1, Number(val) || 1),
                      })
                    }
                    presets={QUANTITY_PRESETS.map((q) => ({ label: q === 50 ? '50 units' : `${q}`, value: q }))}
                    suffix={quantity === 1 ? 'unit' : 'units'}
                    placeholder="1"
                    min={1}
                    max={10000}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (wattageError) return
                    setCurrentStep(4)
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Budget */}
          {mode === 'guided' && currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="text-center max-w-lg mx-auto space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Step 4 of 5
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  What is your budget?
                </h3>
                <p className="text-sm text-neutral-500">
                  Type an amount in pesos or pick a preset.
                </p>
              </div>

              <div className="max-w-xl mx-auto w-full p-5 sm:p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Budget for
                  </span>
                  <div className="inline-flex rounded-full bg-neutral-200/80 dark:bg-neutral-800 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handleBudgetModeSwitch('unit')}
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
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
                      className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                        budgetMode === 'total'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      All {quantity} {quantity === 1 ? 'unit' : 'units'}
                    </button>
                  </div>
                </div>

                <NumericCriterionInput
                  id="guided-budget"
                  label={
                    budgetMode === 'total' && quantity > 1
                      ? `Total budget for ${quantity} units`
                      : 'Budget per unit'
                  }
                  helperText={
                    criteria.budget === 'any' ||
                    criteria.budget === '' ||
                    criteria.budget === null ||
                    criteria.budget === undefined
                      ? 'Showing lights at all prices.'
                      : Number(criteria.budget) <= 0
                      ? `Solar lights start at ₱${(bounds.lowestCatalogPrice || bounds.minPrice).toLocaleString()}.`
                      : budgetMode === 'total' && quantity > 1
                      ? `About ₱${Math.round(Number(criteria.budget) / quantity).toLocaleString()} per unit`
                      : quantity > 1
                      ? `About ₱${(Number(criteria.budget) * quantity).toLocaleString()} total for ${quantity} units`
                      : `Solar lights start at ₱${(bounds.lowestCatalogPrice || bounds.minPrice).toLocaleString()}.`
                  }
                  value={criteria.budget}
                  onChange={(val) => onCriteriaChange({ ...criteria, budget: val })}
                  presets={budgetPresets}
                  prefix="₱"
                  placeholder="Any budget"
                  min={100}
                  allowAny
                  error={budgetError}
                />
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStepSelect(5)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <span>See my matches</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Matches */}
          {mode === 'guided' && currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1"
            >
              <MatchResultsPanel
                criteria={criteria}
                matchResult={matchResult}
                onAdjustSpecs={() => setMode('direct')}
                onRestart={handleRestart}
                onConsultAssistant={onConsultAssistant}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
