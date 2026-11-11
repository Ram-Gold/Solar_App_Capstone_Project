import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineXMark,
  HiOutlineSparkles,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineCurrencyDollar,
  HiOutlineMapPin,
  HiOutlineBolt,
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi2'
import { matchSolarProducts } from '../lib/multiCriteriaMatcher'
import useModalBehavior from '../hooks/useModalBehavior'

const LOCATIONS = [
  {
    id: 'road',
    label: 'Main Road / Highway',
    desc: 'Wide beam angle, 6m–9m pole heights',
    recommendedWatt: 500,
  },
  {
    id: 'street',
    label: 'Street / Subdivision',
    desc: 'Community streets, alleys, 4m–6m poles',
    recommendedWatt: 300,
  },
  {
    id: 'home',
    label: 'Home / Gate / Garden',
    desc: 'Perimeters, gates, residential yard, 3m–4m',
    recommendedWatt: 150,
  },
  {
    id: 'commercial',
    label: 'Commercial / Warehouse',
    desc: 'Parking compounds, commercial grounds',
    recommendedWatt: 400,
  },
]

const POWER_PRESETS = [100, 200, 300, 400, 500, 600, 800]
const BUDGET_PRESETS = [
  { label: '₱1,500', value: 1500 },
  { label: '₱2,500', value: 2500 },
  { label: '₱3,500', value: 3500 },
  { label: '₱5,000', value: 5000 },
  { label: 'Any', value: 'any' },
]

export default function MultiCriteriaMatchModal({ isOpen, onClose, products = [] }) {
  const { backdropProps } = useModalBehavior({ isOpen, onClose })
  const [location, setLocation] = useState('street')
  const [powerNeeds, setPowerNeeds] = useState(300)
  const [budget, setBudget] = useState(3000)
  const [threshold, setThreshold] = useState(0.70) // 70% threshold

  // Real-time multi-criteria calculation
  const matchResult = useMemo(() => {
    return matchSolarProducts(products, {
      location,
      powerNeeds: Number(powerNeeds),
      budget: budget === 'any' ? 'any' : Number(budget),
    }, {
      threshold: Number(threshold),
      limit: 6,
    })
  }, [products, location, powerNeeds, budget, threshold])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          {...backdropProps}
          className="fixed inset-0 bg-jds-on-surface/40 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl bg-jds-surface rounded-2xl shadow-2xl border border-jds-outline-variant/30 overflow-hidden z-10 flex flex-col max-h-[92vh] font-inter"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-jds-outline-variant/20 bg-jds-surface-container-lowest">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-jds-primary/10 flex items-center justify-center text-jds-primary">
                <HiOutlineSparkles className="size-6" />
              </div>
              <div>
                <h2 className="text-title-lg font-bold text-jds-on-surface">
                  Multi-Criteria Product Matching Engine
                </h2>
                <p className="text-body-sm text-jds-on-surface-variant">
                  Evaluate candidates by Location, Power Needs, and Budget threshold
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container-high rounded-full transition-colors"
              aria-label="Close modal"
            >
              <HiOutlineXMark className="size-6" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Input Criteria Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-jds-surface-container-lowest p-5 rounded-2xl border border-jds-outline-variant/30">
              
              {/* Criterion 1: Location */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-label-md font-bold text-jds-on-surface">
                  <HiOutlineMapPin className="text-jds-primary" />
                  <span>1. Installation Location</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {LOCATIONS.map((loc) => {
                    const isSelected = location === loc.id
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setLocation(loc.id)
                          setPowerNeeds(loc.recommendedWatt)
                        }}
                        className={`text-left p-2.5 rounded-xl border text-sm transition-all ${
                          isSelected
                            ? 'border-jds-primary bg-jds-primary/10 text-jds-on-surface font-semibold shadow-sm'
                            : 'border-jds-outline-variant/30 hover:border-jds-outline-variant text-jds-on-surface-variant hover:bg-white'
                        }`}
                      >
                        <div className="font-bold text-label-sm">{loc.label}</div>
                        <div className="text-[11px] text-jds-on-surface-variant/70 leading-tight">
                          {loc.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Criterion 2: Power Needs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-label-md font-bold text-jds-on-surface">
                    <HiOutlineBolt className="text-jds-primary" />
                    <span>2. Power Needs</span>
                  </label>
                  <span className="text-label-md font-bold text-jds-primary bg-jds-primary/10 px-2 py-0.5 rounded-lg">
                    {powerNeeds}W
                  </span>
                </div>

                <p className="text-[12px] text-jds-on-surface-variant/80">
                  Target light output required for your pole height and area size.
                </p>

                <input
                  type="range"
                  min="50"
                  max="800"
                  step="50"
                  value={powerNeeds}
                  onChange={(e) => setPowerNeeds(Number(e.target.value))}
                  className="w-full h-2 bg-jds-surface-container-highest rounded-lg appearance-none cursor-pointer accent-jds-primary"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POWER_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPowerNeeds(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        powerNeeds === preset
                          ? 'bg-jds-primary text-white border-jds-primary'
                          : 'bg-white border-jds-outline-variant/30 text-jds-on-surface-variant hover:border-jds-primary'
                      }`}
                    >
                      {preset}W
                    </button>
                  ))}
                </div>
              </div>

              {/* Criterion 3: Budget */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-label-md font-bold text-jds-on-surface">
                    <HiOutlineCurrencyDollar className="text-jds-primary" />
                    <span>3. Target Budget</span>
                  </label>
                  <span className="text-label-md font-bold text-jds-primary bg-jds-primary/10 px-2 py-0.5 rounded-lg">
                    {budget === 'any' ? 'Any Budget' : `₱${Number(budget).toLocaleString()}`}
                  </span>
                </div>

                <p className="text-[12px] text-jds-on-surface-variant/80">
                  Maximum target unit price in Philippine Peso.
                </p>

                {budget !== 'any' && (
                  <input
                    type="range"
                    min="1000"
                    max="6000"
                    step="250"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full h-2 bg-jds-surface-container-highest rounded-lg appearance-none cursor-pointer accent-jds-primary"
                  />
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {BUDGET_PRESETS.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => setBudget(b.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        budget === b.value
                          ? 'bg-jds-primary text-white border-jds-primary'
                          : 'bg-white border-jds-outline-variant/30 text-jds-on-surface-variant hover:border-jds-primary'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Threshold Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-jds-primary/5 rounded-2xl border border-jds-primary/20">
              <div className="flex items-center gap-2">
                <HiOutlineAdjustmentsHorizontal className="text-jds-primary text-lg" />
                <span className="text-label-sm font-bold text-jds-on-surface">
                  Matching Sensitivity Threshold:
                </span>
                <span className="text-label-sm font-extrabold text-jds-primary bg-white px-2 py-0.5 rounded-lg border border-jds-primary/30 shadow-xs">
                  {Math.round(threshold * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-64">
                <span className="text-[11px] text-jds-on-surface-variant">Loose (50%)</span>
                <input
                  type="range"
                  min="0.50"
                  max="0.90"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-jds-surface-container-highest rounded-lg appearance-none cursor-pointer accent-jds-primary"
                />
                <span className="text-[11px] text-jds-on-surface-variant">Strict (90%)</span>
              </div>
            </div>

            {/* Matching Results Header */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-label-md font-bold text-jds-on-surface">
                Matched Candidates ({matchResult.matches.length})
                {matchResult.thresholdRelaxed && (
                  <span className="ml-2 text-xs font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Threshold relaxed to show closest alternatives
                  </span>
                )}
              </div>
              <span className="text-xs text-jds-on-surface-variant">
                Evaluated against {matchResult.totalEvaluated} inventory items
              </span>
            </div>

            {/* Candidate Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchResult.matches.map((item, index) => {
                const product = item.product
                const isTopPick = index === 0 && item.matchPercentage >= 80

                return (
                  <div
                    key={product.id}
                    className="p-4 rounded-2xl bg-white border border-jds-outline-variant/30 hover:border-jds-primary shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badge Row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-label-sm font-extrabold px-2.5 py-0.5 rounded-full border ${
                              item.matchPercentage >= 85
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.matchPercentage >= 70
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.matchPercentage}% Match
                          </span>
                          {isTopPick && (
                            <span className="text-[11px] bg-jds-primary-container text-jds-on-primary-container px-2 py-0.5 rounded-full font-bold">
                              Best Fit
                            </span>
                          )}
                        </div>
                        <span className="text-label-md font-bold text-jds-primary">
                          ₱{product.price_range}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h4 className="text-label-lg font-bold text-jds-on-surface line-clamp-1 mb-1">
                        {product.name}
                      </h4>

                      {/* Match Explanation */}
                      <p className="text-[12px] text-jds-on-surface-variant/80 mb-3 line-clamp-2">
                        {item.explanation}
                      </p>

                      {/* Criteria Score Mini-Bars */}
                      <div className="grid grid-cols-3 gap-2 bg-jds-surface-container-lowest p-2 rounded-xl mb-3 border border-jds-outline-variant/20">
                        <div>
                          <div className="text-[10px] text-jds-on-surface-variant font-medium">Budget Fit</div>
                          <div className="text-label-sm font-bold text-jds-on-surface">{item.breakdown.budgetScore}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-jds-on-surface-variant font-medium">Location Fit</div>
                          <div className="text-label-sm font-bold text-jds-on-surface">{item.breakdown.locationScore}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-jds-on-surface-variant font-medium">Power Fit</div>
                          <div className="text-label-sm font-bold text-jds-on-surface">{item.breakdown.powerScore}%</div>
                        </div>
                      </div>

                      {/* Specs Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4 text-[11px]">
                        <span className="bg-jds-surface-container-high px-2 py-0.5 rounded-md text-jds-on-surface font-semibold">
                          {product.watt}W
                        </span>
                        <span className="bg-jds-surface-container-high px-2 py-0.5 rounded-md text-jds-on-surface">
                          {product.waterproof_grade || 'IP65'}
                        </span>
                        {product.battery && (
                          <span className="bg-jds-surface-container-high px-2 py-0.5 rounded-md text-jds-on-surface truncate max-w-[180px]">
                            {product.battery.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      to={`/product/${product.id}`}
                      onClick={onClose}
                      className="w-full flex items-center justify-center gap-1.5 text-label-sm font-bold py-2 px-3 rounded-xl bg-jds-primary/10 text-jds-primary hover:bg-jds-primary hover:text-white transition-all text-center"
                    >
                      <span>View Specifications</span>
                      <HiOutlineArrowRight className="text-sm" />
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-jds-outline-variant/20 bg-jds-surface-container-lowest flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-jds-on-surface-variant">
              <HiOutlineQuestionMarkCircle className="text-base" />
              <span>Multi-criteria weights: Budget (35%), Location (35%), Power Needs (30%)</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-jds-surface-container-high hover:bg-jds-surface-container-highest text-jds-on-surface rounded-xl text-label-sm font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
