import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
/* eslint-disable react-refresh/only-export-components */
import {
  Zap,
  Check,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'

import { getCatalogBounds } from '../../lib/multiCriteriaMatcher'

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

export const POWER_PRESETS = [100, 200, 300, 400, 500, 600, 800, 1000]
export const BUDGET_PRESETS = [
  { label: '₱1,500', value: 1500 },
  { label: '₱2,500', value: 2500 },
  { label: '₱3,500', value: 3500 },
  { label: '₱5,000', value: 5000 },
  { label: 'Any', value: 'any' },
]

// Helper to format price ranges cleanly without double currency symbols
function formatPriceRange(raw) {
  if (!raw) return 'Inquire at Branch'
  const str = String(raw).trim()
  const cleaned = str.replace(/₱/g, '').trim()
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map((s) => s.trim())
    const min = Number(parts[0]?.replace(/[^0-9]/g, ''))
    const max = Number(parts[1]?.replace(/[^0-9]/g, ''))
    if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0) {
      return `₱${min.toLocaleString()} – ₱${max.toLocaleString()}`
    }
    return `₱${parts[0]} – ₱${parts[1]}`
  }
  if (cleaned.endsWith('+')) {
    const num = Number(cleaned.replace(/[^0-9]/g, ''))
    if (!isNaN(num) && num > 0) {
      return `From ₱${num.toLocaleString()}`
    }
  }
  const singleNum = Number(cleaned.replace(/[^0-9]/g, ''))
  if (!isNaN(singleNum) && singleNum > 0) {
    return `₱${singleNum.toLocaleString()}`
  }
  return `₱${cleaned}`
}

export default function PrototypeGuidedFlow({
  criteria,
  onCriteriaChange,
  matchResult,
  // eslint-disable-next-line no-unused-vars
  onConsultAssistant,
  catalogBounds,
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const bounds = catalogBounds || matchResult?.catalogBounds || getCatalogBounds()
  const midWatt = Math.round((bounds.minWatt + bounds.maxWatt) / 2)
  const midPrice = Math.round((bounds.minPrice + bounds.maxPrice) / 2)

  const steps = [
    { num: 1, label: 'Environment' },
    { num: 2, label: 'Illumination' },
    { num: 3, label: 'Budget' },
    { num: 4, label: 'Results' },
  ]

  const selectedLocation = LOCATIONS.find((l) => l.id === criteria.location)
  const topMatch = matchResult?.matches?.[0]
  const otherMatches = matchResult?.matches?.slice(1) || []

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
                    {Number(criteria.powerNeeds) >= bounds.maxWatt
                      ? `Maximum database wattage (${bounds.maxWatt}W industrial class)`
                      : `Estimated ${criteria.powerNeeds * 15} – ${criteria.powerNeeds * 22} Lumens`}
                  </span>
                </div>

                {/* Tactile Slider */}
                <div className="px-2 pt-2">
                  <input
                    type="range"
                    min={bounds.minWatt}
                    max={bounds.maxWatt}
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
                    <span>{bounds.minWatt > 0 ? `${bounds.minWatt}W` : '50W'} Compact</span>
                    <span>{midWatt}W Standard</span>
                    <span>{bounds.maxWatt}W Maximum</span>
                  </div>
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
                    {criteria.budget === 'any' || Number(criteria.budget) >= bounds.maxPrice
                      ? `₱${bounds.maxPrice.toLocaleString()}+`
                      : `₱${Number(criteria.budget).toLocaleString()}`}
                  </span>
                  <span className="text-xs text-neutral-400 mt-1">
                    {criteria.budget === 'any' || Number(criteria.budget) >= bounds.maxPrice
                      ? `Maximum database price range (₱${bounds.maxPrice.toLocaleString()}+ / all tiers)`
                      : 'Target ceiling per lighting unit'}
                  </span>
                </div>

                {/* Tactile Slider */}
                <div className="px-2 pt-2">
                  <input
                    type="range"
                    min={bounds.minPrice}
                    max={bounds.maxPrice}
                    step={bounds.maxPrice > 10000 ? 500 : 250}
                    value={criteria.budget === 'any' ? bounds.maxPrice : Number(criteria.budget)}
                    onChange={(e) => {
                      // Always keep budget numeric; 'any' is set only by preset buttons
                      onCriteriaChange({
                        ...criteria,
                        budget: Number(e.target.value),
                      })
                    }}
                    className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-400 mt-2 font-medium">
                    <span>₱{bounds.minPrice.toLocaleString()}</span>
                    <span>₱{midPrice.toLocaleString()}</span>
                    <span>₱{bounds.maxPrice.toLocaleString()}+</span>
                  </div>
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
                  <span>View Recommended Solutions</span>
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
              {/* Clean User-Centric Header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500">
                      Step 04 of 04 · Recommendation
                    </span>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Evaluated {matchResult?.totalEvaluated || 23} Models
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    Recommended Solar Configuration
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                    Configured for {selectedLocation?.label || 'selected environment'} with {criteria.powerNeeds}W target illumination.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Adjust Criteria</span>
                </button>
              </div>

              {/* Recommendation Content */}
              {topMatch ? (
                <div className="space-y-6">
                  {/* Hero Showcase Card */}
                  <div className="relative overflow-hidden rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs transition-all">
                    <div className="p-5 sm:p-6 lg:p-7">
                      {/* Top Status Bar within Hero Card */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <ShieldCheck className="size-3.5 stroke-[2.2]" />
                            <span>Top Recommended Model</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="size-3 stroke-[2.5]" />
                            <span>In Stock at Branch</span>
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                            Price Range
                          </span>
                          <span className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            {formatPriceRange(topMatch.product.price_range)}
                          </span>
                        </div>
                      </div>

                      {/* Hero Layout: Image + Details */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 items-center">
                        {/* Product Visual Box */}
                        <div className="md:col-span-5 flex flex-col items-center">
                          <Link
                            to={`/product/${topMatch.product.id}`}
                            className="w-full aspect-square max-w-[220px] rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60 p-4 flex items-center justify-center relative shadow-xs group cursor-pointer block"
                          >
                            {topMatch.product.image_url ? (
                              <img
                                src={topMatch.product.image_url}
                                alt={topMatch.product.name}
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="size-full flex flex-col items-center justify-center text-neutral-400">
                                <Zap className="size-10 text-amber-500/80 mb-2 stroke-[1.5]" />
                                <span className="text-xs font-medium text-neutral-500">Commercial Solar Luminaire</span>
                              </div>
                            )}

                            <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-neutral-900/85 text-white text-[11px] font-bold backdrop-blur-xs">
                              {topMatch.product.watt}W
                            </div>
                          </Link>
                        </div>

                        {/* Engineering Specs & Actions */}
                        <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 block mb-1">
                              {topMatch.product.type || 'Commercial Grade Solar Luminaire'}
                            </span>
                            <Link
                              to={`/product/${topMatch.product.id}`}
                              className="group block"
                            >
                              <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {topMatch.product.name}
                              </h4>
                            </Link>
                          </div>

                          {/* 4-Item Key Technical Specs Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                              <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                                Power Output
                              </span>
                              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {topMatch.product.watt}W Luminaire
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                              <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                                Protection
                              </span>
                              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {topMatch.product.waterproof_grade || 'IP65'} Rated
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                              <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                                Battery Spec
                              </span>
                              <span
                                className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block"
                                title={topMatch.product.battery || 'LiFePO4 Storage'}
                              >
                                {topMatch.product.battery || 'LiFePO4 Storage'}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                              <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                                Warranty
                              </span>
                              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {topMatch.product.default_warranty_months
                                  ? `${topMatch.product.default_warranty_months}-Month Coverage`
                                  : '1-Year Distributor'}
                              </span>
                            </div>
                          </div>

                          {/* Direct User-Centric Action CTAs */}
                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Link
                              to={`/product/${topMatch.product.id}`}
                              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer"
                            >
                              <span>Inquire this</span>
                              <ArrowUpRight className="size-3.5" />
                            </Link>

                            <Link
                              to={`/product/${topMatch.product.id}`}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 text-neutral-700 dark:text-neutral-200 text-xs font-semibold transition-all hover:bg-neutral-100/50 dark:hover:bg-neutral-800 cursor-pointer"
                            >
                              <span>View Technical Specifications</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alternative Runner-up Candidates */}
                  {otherMatches.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Other Compatible Solutions ({otherMatches.length})
                        </h5>
                        <span className="text-[11px] text-neutral-400">
                          Alternative wattage & price options
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {otherMatches.map((item) => {
                          const p = item.product
                          return (
                            <Link
                              key={p.id}
                              to={`/product/${p.id}`}
                              className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-850/40 hover:border-amber-400/80 dark:hover:border-amber-500/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer block"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <h6 className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                    {p.name}
                                  </h6>
                                  <span className="text-xs font-bold text-neutral-900 dark:text-white shrink-0">
                                    {formatPriceRange(p.price_range)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-[10px] text-neutral-400 font-medium">
                                  <span>{p.watt}W · {p.waterproof_grade || 'IP65'}</span>
                                </div>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                                  {item.explanation || item.reason || 'Compatible secondary recommendation.'}
                                </p>
                              </div>

                              <div className="pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                <span className="text-[10px] text-neutral-400 font-medium">
                                  Ready to dispatch
                                </span>
                                <span className="text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 inline-flex items-center gap-1 transition-colors">
                                  <span>Inquire this</span>
                                  <ArrowUpRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </span>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <p className="text-sm text-neutral-500">
                    No models satisfied the current criteria combination.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Adjust Match Criteria</span>
                  </button>
                </div>
              )}

              {/* Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-auto border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer py-2 px-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Restart Flow</span>
                </button>

                <Link
                  to="/browse"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white py-2 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  <span>Browse Full Catalog</span>
                  <ChevronRight className="size-3.5" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
