import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Zap,
  CircleDollarSign,
  Check,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  RotateCcw,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'

export const LOCATIONS = [
  {
    id: 'road',
    label: 'Main Road / Highway',
    shortLabel: 'Highway',
    desc: 'High-lumen optical distribution for 6m–9m roadway poles',
    recommendedWatt: 500,
    bracket: 'Roadway Arm',
  },
  {
    id: 'street',
    label: 'Street / Subdivision',
    shortLabel: 'Subdivision',
    desc: 'Balanced perimeter lighting for 4m–6m community poles',
    recommendedWatt: 300,
    bracket: 'Pole Mount',
  },
  {
    id: 'home',
    label: 'Residential / Perimeter',
    shortLabel: 'Residential',
    desc: 'Focused illumination for 3m–4m gates, fences, and yards',
    recommendedWatt: 150,
    bracket: 'Wall / Gate',
  },
  {
    id: 'commercial',
    label: 'Commercial / Logistics Yard',
    shortLabel: 'Commercial',
    desc: 'Wide-area industrial flood lighting for parking and yards',
    recommendedWatt: 400,
    bracket: 'High Mast',
  },
]

export const POWER_PRESETS = [100, 200, 300, 400, 500, 600, 800]
export const BUDGET_PRESETS = [
  { label: '₱1,500', value: 1500 },
  { label: '₱2,500', value: 2500 },
  { label: '₱3,500', value: 3500 },
  { label: '₱5,000', value: 5000 },
  { label: 'Any', value: 'any' },
]

export default function PrototypeGuidedFlow({
  criteria,
  onCriteriaChange,
  matchResult,
  onConsultAssistant,
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [injected, setInjected] = useState(false)

  const steps = [
    { num: 1, label: 'Environment' },
    { num: 2, label: 'Illumination' },
    { num: 3, label: 'Budget' },
    { num: 4, label: 'Results' },
  ]

  const handleConsult = () => {
    if (!onConsultAssistant) return
    onConsultAssistant()
    setInjected(true)
    setTimeout(() => setInjected(false), 3000)
  }

  return (
    <div className="w-full">
      {/* Minimal Linear Progress Stepper (matches reference image) */}
      <div className="max-w-md mx-auto mb-8 px-4 select-none" aria-label={`Step ${currentStep} of ${steps.length}`}>
        <div className="relative">
          {/* Base Track Line (runs precisely from center of first dot to center of last dot) */}
          <div className="absolute top-2.5 left-[12.5%] right-[12.5%] h-[2px] -translate-y-1/2 bg-neutral-300 dark:bg-neutral-700 z-0">
            {/* Active Accent Fill Line */}
            <div
              className="h-full bg-amber-500 transition-all duration-300 ease-out"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Equidistant Step Columns */}
          <div className="grid grid-cols-4 relative z-10">
            {steps.map((s) => {
              const isCompleted = currentStep > s.num
              const isCurrent = currentStep === s.num

              return (
                <div key={s.num} className="flex flex-col items-center">
                  {/* Dot Container (h-5 so center is at top-2.5 / 10px) */}
                  <div className="h-5 flex items-center justify-center">
                    {isCurrent ? (
                      /* Active Bullseye Target Dot */
                      <div className="size-[18px] rounded-full border-2 border-amber-500 bg-white dark:bg-neutral-900 flex items-center justify-center shadow-xs">
                        <div className="size-2 rounded-full bg-amber-500" />
                      </div>
                    ) : isCompleted ? (
                      /* Completed Solid Accent Dot */
                      <div className="size-2.5 rounded-full bg-amber-500" />
                    ) : (
                      /* Upcoming Muted Gray Dot */
                      <div className="size-2.5 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                    )}
                  </div>

                  {/* Step Label */}
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
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Step Card Container */}
      <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 lg:p-9 min-h-[460px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* STEP 1: Environment */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="text-center max-w-md mx-auto space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Step 01 of 04
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Installation Environment
                </h3>
                <p className="text-sm text-neutral-500">
                  Select the structural deployment setting to match optical beam angle and pole height.
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
                          powerNeeds: loc.recommendedWatt,
                        })
                      }}
                      className={`group relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-amber-500/80 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] ring-1 ring-amber-500/30'
                          : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {loc.label}
                        </span>
                        <div
                          className={`size-5 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-white'
                              : 'border border-neutral-300 dark:border-neutral-600'
                          }`}
                        >
                          {isSelected && <Check className="size-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3">
                        {loc.desc}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                          {loc.recommendedWatt}W Suggested
                        </span>
                        <span>{loc.bracket}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-end pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <span>Continue to Illumination</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Illumination */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="text-center max-w-md mx-auto space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Step 02 of 04
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Target Illumination Output
                </h3>
                <p className="text-sm text-neutral-500">
                  Configure wattage rating based on lumen throw and site perimeter security needs.
                </p>
              </div>

              {/* Minimal Numeric Readout Card */}
              <div className="max-w-md mx-auto p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 text-center space-y-4">
                <div className="inline-flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {criteria.powerNeeds}
                    <span className="text-xl sm:text-2xl font-normal text-amber-600 ml-1">W</span>
                  </span>
                  <span className="text-xs text-neutral-400 mt-1">
                    Estimated {criteria.powerNeeds * 15} – {criteria.powerNeeds * 22} Lumens
                  </span>
                </div>

                {/* Tactile Slider */}
                <div className="px-2 pt-2">
                  <input
                    type="range"
                    min="50"
                    max="800"
                    step="50"
                    value={criteria.powerNeeds}
                    onChange={(e) =>
                      onCriteriaChange({
                        ...criteria,
                        powerNeeds: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-400 mt-2 font-medium">
                    <span>50W Compact</span>
                    <span>400W Medium</span>
                    <span>800W High Mast</span>
                  </div>
                </div>

                {/* Quick Selection Chips */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  {POWER_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        onCriteriaChange({
                          ...criteria,
                          powerNeeds: preset,
                        })
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                        criteria.powerNeeds === preset
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                          : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/70 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      {preset}W
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer py-2 px-3 rounded-lg hover:bg-neutral-100"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <span>Continue to Budget</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Budget */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="text-center max-w-md mx-auto space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Step 03 of 04
                </span>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                  Target Unit Investment
                </h3>
                <p className="text-sm text-neutral-500">
                  Define budget tolerance per fixture for consultative price utility weighting.
                </p>
              </div>

              {/* Minimal Budget Display Card */}
              <div className="max-w-md mx-auto p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 text-center space-y-4">
                <div className="inline-flex flex-col items-center">
                  <span className="text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    {criteria.budget === 'any' ? 'Unconstrained' : `₱${Number(criteria.budget).toLocaleString()}`}
                  </span>
                  <span className="text-xs text-neutral-400 mt-1">
                    {criteria.budget === 'any'
                      ? 'Displaying all matching tiers'
                      : 'Target ceiling per lighting unit'}
                  </span>
                </div>

                {criteria.budget !== 'any' && (
                  <div className="px-2 pt-2">
                    <input
                      type="range"
                      min="1000"
                      max="6000"
                      step="250"
                      value={criteria.budget}
                      onChange={(e) =>
                        onCriteriaChange({
                          ...criteria,
                          budget: Number(e.target.value),
                        })
                      }
                      className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[11px] text-neutral-400 mt-2 font-medium">
                      <span>₱1,000</span>
                      <span>₱3,500</span>
                      <span>₱6,000</span>
                    </div>
                  </div>
                )}

                {/* Budget Presets */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  {BUDGET_PRESETS.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() =>
                        onCriteriaChange({
                          ...criteria,
                          budget: b.value,
                        })
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                        criteria.budget === b.value
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                          : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/70 dark:border-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer py-2 px-3 rounded-lg hover:bg-neutral-100"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  <span>Evaluate Compatibility</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Recommendations */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Step 04 of 04 · Results
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                    Ranked Candidates ({matchResult.matches.length})
                  </h3>
                </div>

                {/* Sensitivity Slider in Apple capsule */}
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700 text-xs">
                  <span className="text-neutral-500 font-medium">Cutoff:</span>
                  <input
                    type="range"
                    min="0.50"
                    max="0.90"
                    step="0.05"
                    value={criteria.threshold}
                    onChange={(e) =>
                      onCriteriaChange({
                        ...criteria,
                        threshold: Number(e.target.value),
                      })
                    }
                    className="w-24 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full appearance-none accent-amber-500 cursor-pointer"
                  />
                  <span className="font-semibold text-neutral-900 dark:text-white w-8 text-right">
                    {Math.round(criteria.threshold * 100)}%
                  </span>
                </div>
              </div>

              {/* Matched List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {matchResult.matches.map((item, idx) => {
                  const p = item.product
                  const isTop = idx === 0
                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                        isTop
                          ? 'border-amber-500/40 bg-amber-500/[0.02] shadow-[0_4px_16px_rgba(245,158,11,0.06)]'
                          : 'border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              item.matchPercentage >= 85
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            <ShieldCheck className="size-3" />
                            <span>{item.matchPercentage}% Compatibility</span>
                            {isTop && <span className="opacity-75 font-normal">· Optimal</span>}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                            ₱{p.price_range}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-1 mb-1">
                          {p.name}
                        </h4>

                        <p className="text-xs text-neutral-500 line-clamp-2 mb-3">
                          {item.reason}
                        </p>

                        {/* Minimal Score Bars */}
                        <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/80 mb-3 text-[10px]">
                          <div>
                            <span className="text-neutral-400 block">Photometrics</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {item.breakdown.powerScore}%
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-400 block">Environment</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {item.breakdown.locationScore}%
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-400 block">Budget Fit</span>
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {item.breakdown.budgetScore}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <Link
                          to={`/product/${p.id}`}
                          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white inline-flex items-center gap-1"
                        >
                          <span>Inquire this</span>
                          <ArrowUpRight className="size-3" />
                        </Link>
                        <Link
                          to={`/product/${p.id}`}
                          className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600"
                        >
                          Specs
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Restart Flow</span>
                </button>

                {onConsultAssistant && (
                  <button
                    type="button"
                    onClick={handleConsult}
                    disabled={injected}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>{injected ? 'Transferred to Chat' : 'Consult Solar Assistant'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
