import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Zap,
  CircleDollarSign,
  ChevronDown,
  ArrowUpRight,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  SlidersHorizontal,
  Check,
} from 'lucide-react'
import { LOCATIONS, POWER_PRESETS, BUDGET_PRESETS } from './PrototypeGuidedFlow'

export default function PrototypeSpotlightMatrix({
  criteria,
  onCriteriaChange,
  matchResult,
  onConsultAssistant,
}) {
  const [activeDrawer, setActiveDrawer] = useState(null) // 'location' | 'power' | 'budget' | null
  const [injected, setInjected] = useState(false)

  const topMatch = matchResult.matches[0]
  const alternatives = matchResult.matches.slice(1)

  const handleConsult = () => {
    if (!onConsultAssistant) return
    onConsultAssistant()
    setInjected(true)
    setTimeout(() => setInjected(false), 3000)
  }

  const toggleDrawer = (drawerName) => {
    setActiveDrawer((prev) => (prev === drawerName ? null : drawerName))
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Floating Parameter Capsule Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-neutral-100/90 dark:bg-neutral-800/60 rounded-full border border-neutral-200/60 dark:border-neutral-700/50 max-w-2xl mx-auto shadow-inner">
        {/* Location Capsule */}
        <button
          type="button"
          onClick={() => toggleDrawer('location')}
          className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
            activeDrawer === 'location'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-white/60 dark:hover:bg-neutral-800'
          }`}
        >
          <MapPin className="size-3.5 text-amber-600" />
          <span>{LOCATIONS.find((l) => l.id === criteria.location)?.shortLabel || 'Location'}</span>
          <ChevronDown className="size-3 opacity-60" />
        </button>

        {/* Power Capsule */}
        <button
          type="button"
          onClick={() => toggleDrawer('power')}
          className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
            activeDrawer === 'power'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-white/60 dark:hover:bg-neutral-800'
          }`}
        >
          <Zap className="size-3.5 text-amber-600" />
          <span>{criteria.powerNeeds}W Output</span>
          <ChevronDown className="size-3 opacity-60" />
        </button>

        {/* Budget Capsule */}
        <button
          type="button"
          onClick={() => toggleDrawer('budget')}
          className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
            activeDrawer === 'budget'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-white/60 dark:hover:bg-neutral-800'
          }`}
        >
          <CircleDollarSign className="size-3.5 text-amber-600" />
          <span>{criteria.budget === 'any' ? 'Any Budget' : `₱${Number(criteria.budget).toLocaleString()}`}</span>
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </div>

      {/* Inline Parameter Drawer */}
      <AnimatePresence>
        {activeDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden max-w-xl mx-auto"
          >
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              {activeDrawer === 'location' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white mb-2">
                    <span>Select Environment</span>
                    <button
                      onClick={() => setActiveDrawer(null)}
                      className="text-neutral-400 hover:text-neutral-600 cursor-pointer text-[11px]"
                    >
                      Done
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {LOCATIONS.map((loc) => (
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
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          criteria.location === loc.id
                            ? 'border-amber-500 bg-amber-500/10 font-semibold'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div>{loc.label}</div>
                        <div className="text-[10px] text-neutral-400">{loc.recommendedWatt}W Suggested</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeDrawer === 'power' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white">
                    <span>Illumination Wattage</span>
                    <span className="text-amber-600 font-bold">{criteria.powerNeeds}W</span>
                  </div>
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
                    className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none accent-amber-500 cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {POWER_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onCriteriaChange({ ...criteria, powerNeeds: p })}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          criteria.powerNeeds === p
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
                        }`}
                      >
                        {p}W
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeDrawer === 'budget' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white">
                    <span>Unit Target Investment</span>
                    <span className="text-amber-600 font-bold">
                      {criteria.budget === 'any' ? 'Any Budget' : `₱${Number(criteria.budget).toLocaleString()}`}
                    </span>
                  </div>
                  {criteria.budget !== 'any' && (
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
                      className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none accent-amber-500 cursor-pointer"
                    />
                  )}
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {BUDGET_PRESETS.map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => onCriteriaChange({ ...criteria, budget: b.value })}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          criteria.budget === b.value
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Spotlight Hero Card */}
      {topMatch && (
        <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left Info & Engineering Dossier */}
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                <ShieldCheck className="size-3.5" />
                <span>Primary Engineering Recommendation</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">
                {topMatch.product.name}
              </h3>

              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {topMatch.reason}
              </p>

              <div className="flex items-center gap-3 pt-1">
                <span className="text-xl font-bold text-neutral-900 dark:text-white">
                  ₱{topMatch.product.price_range}
                </span>
                <span className="text-xs text-neutral-400">· Estimated Fixture Bracket Unit</span>
              </div>

              {/* Sub-score Indicators */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Photometrics</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {topMatch.breakdown.powerScore}% Match
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Environment</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {topMatch.breakdown.locationScore}% Fit
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Investment</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {topMatch.breakdown.budgetScore}% Index
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Link
                  to={`/product/${topMatch.product.id}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98]"
                >
                  <span>Inquire this Model</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
                {onConsultAssistant && (
                  <button
                    type="button"
                    onClick={handleConsult}
                    disabled={injected}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 text-xs font-medium transition-all duration-200 active:scale-[0.98] cursor-pointer"
                  >
                    <MessageSquare className="size-3.5 text-amber-600" />
                    <span>{injected ? 'Transferred!' : 'Consult Assistant'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Circular Gauge */}
            <div className="shrink-0 flex flex-col items-center justify-center p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800 w-full lg:w-56 text-center">
              <div className="relative size-28 flex items-center justify-center mb-2">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-neutral-200 dark:text-neutral-700"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-500"
                    strokeDasharray={`${topMatch.matchPercentage}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    {topMatch.matchPercentage}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
                    Match
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                High Confidence Fit
              </span>
              <span className="text-[11px] text-neutral-400 mt-0.5">
                Passes {Math.round(criteria.threshold * 100)}% Threshold
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Candidates Tray */}
      {alternatives.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Alternative Qualifying Models ({alternatives.length})
            </span>
            <span className="text-[11px] text-neutral-400">
              Ranked in descending compatibility
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {alternatives.map((item) => {
              const p = item.product
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white/70 dark:bg-neutral-900/70 border border-neutral-200/70 dark:border-neutral-800 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        {item.matchPercentage}% Match
                      </span>
                      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                        ₱{p.price_range}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-white line-clamp-1">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-neutral-400 line-clamp-2">
                      {item.reason}
                    </p>
                  </div>

                  <Link
                    to={`/product/${p.id}`}
                    className="inline-flex items-center justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:text-amber-600 pt-2 border-t border-neutral-100 dark:border-neutral-800"
                  >
                    <span>Inquire this</span>
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
