import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MapPin,
  Zap,
  CircleDollarSign,
  SlidersHorizontal,
  ArrowUpRight,
  ShieldCheck,
  MessageSquare } from 'lucide-react'
import { LOCATIONS } from './PrototypeGuidedFlow'
import { getCatalogBounds } from '../../lib/multiCriteriaMatcher'

export default function PrototypeSpatialBento({
  criteria,
  onCriteriaChange,
  matchResult,
  onConsultAssistant,
}) {
  const bounds = matchResult?.catalogBounds || getCatalogBounds()
  const [injected, setInjected] = useState(false)

  const handleConsult = () => {
    if (!onConsultAssistant) return
    onConsultAssistant()
    setInjected(true)
    setTimeout(() => setInjected(false), 3000)
  }

  return (
    <div className="w-full space-y-6">
      {/* 2-Column Bento Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Parameter Console (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tile 1: Environment */}
          <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <MapPin className="size-3.5 text-amber-600" />
                <span>01 · Installation Environment</span>
              </span>
              <span className="text-xs font-medium text-neutral-500">
                {LOCATIONS.find((l) => l.id === criteria.location)?.shortLabel || 'Standard'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
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
                    className={`p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'border-amber-500/80 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] ring-1 ring-amber-500/30'
                        : 'border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 hover:border-neutral-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                      {loc.shortLabel}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                      {loc.recommendedWatt}W · {loc.bracket}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tile 2: Power Needs */}
          <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-600" />
                <span>02 · Power & Lumens</span>
              </span>
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                {Number(criteria.powerNeeds) >= bounds.maxWatt
                  ? `${bounds.maxWatt}W (Max Power)`
                  : `${criteria.powerNeeds}W`}
              </span>
            </div>

            <div className="pt-1">
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
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {bounds.powerPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onCriteriaChange({
                      ...criteria,
                      powerNeeds: preset,
                    })
                  }
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                    criteria.powerNeeds === preset
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                  }`}
                >
                  {preset}W
                </button>
              ))}
            </div>
          </div>

          {/* Tile 3: Target Investment & Tolerance */}
          <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <CircleDollarSign className="size-3.5 text-amber-600" />
                <span>03 · Unit Investment</span>
              </span>
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                {criteria.budget === 'any' || Number(criteria.budget) >= bounds.maxPrice
                  ? `₱${bounds.maxPrice.toLocaleString()}+ (Any)`
                  : `₱${Number(criteria.budget).toLocaleString()}`}
              </span>
            </div>

            {criteria.budget !== 'any' && (
              <input
                type="range"
                min={bounds.minPrice}
                max={bounds.maxPrice}
                step={bounds.maxPrice > 10000 ? 500 : 250}
                value={criteria.budget}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  onCriteriaChange({
                    ...criteria,
                    budget: val >= bounds.maxPrice ? 'any' : val,
                  })
                }}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer accent-amber-500"
              />
            )}

            <div className="flex flex-wrap gap-1.5">
              {bounds.budgetPresets.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() =>
                    onCriteriaChange({
                      ...criteria,
                      budget: b.value,
                    })
                  }
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                    criteria.budget === b.value
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Inset Sensitivity Cutoff */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs">
              <span className="text-neutral-400 flex items-center gap-1">
                <SlidersHorizontal className="size-3" />
                <span>Sensitivity Cutoff:</span>
              </span>
              <div className="flex items-center gap-2">
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
                  className="w-20 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none accent-amber-500 cursor-pointer"
                />
                <span className="font-semibold text-neutral-900 dark:text-white text-[11px]">
                  {Math.round(criteria.threshold * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Stream (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] h-full flex flex-col justify-between">
            <div>
              {/* Live Status Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    Live Reactive Ranking
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400">
                  {matchResult.matches.length} Models Qualifying
                </span>
              </div>

              {/* Real-time Cards */}
              <div className="space-y-3">
                {matchResult.matches.map((item, idx) => {
                  const p = item.product
                  const isTop = idx === 0

                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                        isTop
                          ? 'border-amber-500/40 bg-amber-500/[0.02] shadow-[0_2px_12px_rgba(245,158,11,0.06)]'
                          : 'border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase">
                              #{idx + 1}
                            </span>
                            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-1">
                              {p.name}
                            </h4>
                          </div>
                          <p className="text-[11px] text-neutral-500 line-clamp-1">
                            {item.reason}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-semibold text-neutral-900 dark:text-white block">
                            ₱{p.price_range}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              item.matchPercentage >= 85
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            <ShieldCheck className="size-3" />
                            <span>{item.matchPercentage}%</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px]">
                        <div className="flex items-center gap-3 text-neutral-400 font-medium">
                          <span>Optics: {item.breakdown.locationScore}%</span>
                          <span>Budget: {item.breakdown.budgetScore}%</span>
                          <span>Power: {item.breakdown.powerScore}%</span>
                        </div>

                        <Link
                          to={`/product/${p.id}`}
                          className="font-semibold text-neutral-900 dark:text-white hover:text-amber-600 inline-flex items-center gap-1"
                        >
                          <span>Inquire this</span>
                          <ArrowUpRight className="size-3" />
                        </Link>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Bottom Assistant Handoff */}
            {onConsultAssistant && (
              <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={handleConsult}
                  disabled={injected}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  <MessageSquare className="size-3.5" />
                  <span>{injected ? 'Transferred to Chat' : 'Consult Solar Assistant With Live Selections'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
