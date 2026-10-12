import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineSparkles,
  HiOutlineMapPin,
  HiOutlineBolt,
  HiOutlineCurrencyDollar,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineArrowPath,
  HiOutlineCheck,
} from 'react-icons/hi2'
import { matchSolarProducts } from '../lib/multiCriteriaMatcher'

const LOCATIONS = [
  {
    id: 'road',
    label: 'Main Road / Highway',
    desc: 'High lumen output, wide beam angle (6m–9m pole)',
    recommendedWatt: 500,
  },
  {
    id: 'street',
    label: 'Street / Subdivision',
    desc: 'Community streets, alleys, intersections (4m–6m pole)',
    recommendedWatt: 300,
  },
  {
    id: 'home',
    label: 'Home / Gate / Garden',
    desc: 'Perimeters, gates, residential yards (3m–4m mounting)',
    recommendedWatt: 150,
  },
  {
    id: 'commercial',
    label: 'Commercial / Warehouse',
    desc: 'Parking compounds, yards, commercial facilities',
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

export default function MultiCriteriaWizard({
  products = [],
  onInjectToChat,
  isExpanded = true,
  onToggleExpand,
  standalone = false,
  consultButtonLabel = 'Inject Results into Chat Assistant',
}) {
  const [step, setStep] = useState(1) // 1: Location, 2: Power, 3: Budget, 4: Results
  const [location, setLocation] = useState('street')
  const [powerNeeds, setPowerNeeds] = useState(300)
  const [budget, setBudget] = useState(3000)
  const [threshold, setThreshold] = useState(0.70)
  const [injected, setInjected] = useState(false)

  // Real-time multi-criteria calculation
  const matchResult = useMemo(() => {
    return matchSolarProducts(
      products,
      {
        location,
        powerNeeds: Number(powerNeeds),
        budget: budget === 'any' ? 'any' : Number(budget),
      },
      {
        threshold: Number(threshold),
        limit: 4,
      }
    )
  }, [products, location, powerNeeds, budget, threshold])

  const handleInject = () => {
    if (!onInjectToChat) return

    const locLabel = LOCATIONS.find((l) => l.id === location)?.label || location
    const budgetLabel = budget === 'any' ? 'Any Budget' : `₱${Number(budget).toLocaleString()}`

    let summaryText = `### Multi-Criteria Wizard Assessment Report\n\n`
    summaryText += `* **Target Location:** ${locLabel}\n`
    summaryText += `* **Power Needs:** ${powerNeeds}W\n`
    summaryText += `* **Target Budget:** ${budgetLabel}\n`
    summaryText += `* **Evaluation Threshold:** ${Math.round(threshold * 100)}% Match\n\n`
    summaryText += `**Top Matched Models:**\n`

    matchResult.matches.forEach((item, idx) => {
      const p = item.product
      summaryText += `${idx + 1}. **[${p.name}](/product/${p.id})** — **${item.matchPercentage}% Match** (Budget: ${item.breakdown.budgetScore}%, Location: ${item.breakdown.locationScore}%, Power: ${item.breakdown.powerScore}%)\n`
    })

    summaryText += `\nI have evaluated these models against my project requirements. Can you provide further details on stock availability and wholesale packages for these selections?`

    onInjectToChat(summaryText)
    setInjected(true)
    setTimeout(() => setInjected(false), 3000)
  }

  const restartWizard = () => {
    setStep(1)
  }

  return (
    <div className="w-full mb-6">
      {/* Outer Wizard Card with distinctive Solar Amber Glow & Border */}
      <div className="relative rounded-3xl bg-gradient-to-br from-amber-500/10 via-white to-orange-500/10 p-[1.5px] shadow-[0_4px_24px_rgba(253,184,19,0.18)] transition-all">
        <div className="rounded-[22px] bg-white/95 backdrop-blur-xl p-4 sm:p-5 text-jds-on-surface">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-jds-outline-variant/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-jds-primary to-amber-400 text-white flex items-center justify-center shadow-md shadow-jds-primary/25">
                <HiOutlineSparkles className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-label-md sm:text-title-sm font-extrabold text-jds-on-surface tracking-tight">
                    Multi-Criteria Product Matching Wizard
                  </h3>
                  <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-jds-primary-container text-jds-on-primary-container">
                    Decision Engine
                  </span>
                </div>
                <p className="text-[12px] text-jds-on-surface-variant/75">
                  Algorithmically score products against Budget, Location, and Power thresholds
                </p>
              </div>
            </div>

            {!standalone && onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1.5 text-label-sm font-bold text-jds-on-surface-variant hover:text-jds-primary bg-jds-surface-container-high/60 hover:bg-jds-surface-container-high px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0"
                aria-label={isExpanded ? 'Minimize Wizard' : 'Expand Wizard'}
              >
                <span>{isExpanded ? 'Minimize' : 'Expand Wizard'}</span>
                {isExpanded ? <HiOutlineChevronUp size={16} /> : <HiOutlineChevronDown size={16} />}
              </button>
            )}
          </div>

          {/* Collapsible Content */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="pt-4 overflow-hidden"
              >
                {/* Stepper Progress Bar */}
                <div className="flex items-center justify-between mb-5 max-w-xl mx-auto px-2">
                  {[
                    { num: 1, label: 'Location' },
                    { num: 2, label: 'Power Needs' },
                    { num: 3, label: 'Budget' },
                    { num: 4, label: 'Results' },
                  ].map((s, idx) => {
                    const isDone = step > s.num
                    const isCurrent = step === s.num
                    return (
                      <div key={s.num} className="flex items-center flex-1 last:flex-none">
                        <button
                          type="button"
                          onClick={() => setStep(s.num)}
                          className={`flex items-center gap-1.5 group cursor-pointer transition-all ${
                            isCurrent
                              ? 'text-jds-primary font-bold'
                              : isDone
                              ? 'text-emerald-700 font-semibold'
                              : 'text-jds-on-surface-variant/50'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-all ${
                              isCurrent
                                ? 'bg-jds-primary text-white shadow-sm shadow-jds-primary/30 scale-110'
                                : isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-jds-surface-container-high text-jds-on-surface-variant'
                            }`}
                          >
                            {isDone ? <HiOutlineCheck size={13} /> : s.num}
                          </div>
                          <span className="text-[12px] hidden sm:inline">{s.label}</span>
                        </button>
                        {idx < 3 && (
                          <div
                            className={`h-0.5 flex-1 mx-2 transition-colors ${
                              step > idx + 1 ? 'bg-emerald-500' : 'bg-jds-outline-variant/30'
                            }`}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Step 1: Location */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HiOutlineMapPin className="text-jds-primary text-lg" />
                        <h4 className="text-label-md font-bold text-jds-on-surface">
                          Step 1: Where will the solar lighting be installed?
                        </h4>
                      </div>
                      <span className="text-xs text-jds-on-surface-variant/70">1 of 4</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-jds-primary bg-jds-primary/10 shadow-sm ring-1 ring-jds-primary/30'
                                : 'border-jds-outline-variant/30 bg-jds-surface-container-lowest/50 hover:border-jds-primary/50 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-label-md font-bold text-jds-on-surface">
                                {loc.label}
                              </span>
                              {isSelected && <HiOutlineCheck className="text-jds-primary text-base" />}
                            </div>
                            <p className="text-[12px] text-jds-on-surface-variant/80 leading-snug">
                              {loc.desc}
                            </p>
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex items-center gap-1.5 bg-jds-primary hover:bg-jds-primary/90 text-white font-bold text-label-sm px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <span>Next: Power Needs</span>
                        <HiOutlineArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Power Needs */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HiOutlineBolt className="text-jds-primary text-lg" />
                        <h4 className="text-label-md font-bold text-jds-on-surface">
                          Step 2: What is your required illumination power?
                        </h4>
                      </div>
                      <span className="text-xs text-jds-on-surface-variant/70">2 of 4</span>
                    </div>

                    <div className="bg-jds-surface-container-lowest p-4 rounded-2xl border border-jds-outline-variant/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm text-jds-on-surface-variant">
                          Target Wattage Output
                        </span>
                        <span className="text-label-lg font-extrabold text-jds-primary bg-jds-primary/10 px-3 py-1 rounded-xl">
                          {powerNeeds}W
                        </span>
                      </div>

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
                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              powerNeeds === preset
                                ? 'bg-jds-primary text-white border-jds-primary shadow-xs'
                                : 'bg-white border-jds-outline-variant/40 text-jds-on-surface-variant hover:border-jds-primary'
                            }`}
                          >
                            {preset}W
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex items-center gap-1.5 text-label-sm font-semibold text-jds-on-surface-variant hover:text-jds-on-surface px-3 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        <HiOutlineArrowLeft size={16} />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex items-center gap-1.5 bg-jds-primary hover:bg-jds-primary/90 text-white font-bold text-label-sm px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <span>Next: Target Budget</span>
                        <HiOutlineArrowRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Budget */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HiOutlineCurrencyDollar className="text-jds-primary text-lg" />
                        <h4 className="text-label-md font-bold text-jds-on-surface">
                          Step 3: What is your target budget per unit?
                        </h4>
                      </div>
                      <span className="text-xs text-jds-on-surface-variant/70">3 of 4</span>
                    </div>

                    <div className="bg-jds-surface-container-lowest p-4 rounded-2xl border border-jds-outline-variant/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-body-sm text-jds-on-surface-variant">
                          Maximum Target Unit Price
                        </span>
                        <span className="text-label-lg font-extrabold text-jds-primary bg-jds-primary/10 px-3 py-1 rounded-xl">
                          {budget === 'any' ? 'Any Budget' : `₱${Number(budget).toLocaleString()}`}
                        </span>
                      </div>

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
                            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              budget === b.value
                                ? 'bg-jds-primary text-white border-jds-primary shadow-xs'
                                : 'bg-white border-jds-outline-variant/40 text-jds-on-surface-variant hover:border-jds-primary'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex items-center gap-1.5 text-label-sm font-semibold text-jds-on-surface-variant hover:text-jds-on-surface px-3 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        <HiOutlineArrowLeft size={16} />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="flex items-center gap-1.5 bg-jds-primary hover:bg-jds-primary/90 text-white font-bold text-label-sm px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <span>Calculate Multi-Criteria Match</span>
                        <HiOutlineSparkles size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Results & Threshold Filter */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    {/* Sensitivity Threshold & Active Criteria Pill */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-jds-primary/5 rounded-2xl border border-jds-primary/20">
                      <div className="flex items-center gap-2">
                        <HiOutlineAdjustmentsHorizontal className="text-jds-primary text-base shrink-0" />
                        <span className="text-label-sm font-bold text-jds-on-surface">
                          Match Sensitivity Threshold:
                        </span>
                        <span className="text-label-sm font-extrabold text-jds-primary bg-white px-2 py-0.5 rounded-lg border border-jds-primary/30 shadow-xs">
                          {Math.round(threshold * 100)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-56">
                        <span className="text-[10px] text-jds-on-surface-variant shrink-0">50%</span>
                        <input
                          type="range"
                          min="0.50"
                          max="0.90"
                          step="0.05"
                          value={threshold}
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          className="w-full h-1.5 bg-jds-surface-container-highest rounded-lg appearance-none cursor-pointer accent-jds-primary"
                        />
                        <span className="text-[10px] text-jds-on-surface-variant shrink-0">90%</span>
                      </div>
                    </div>

                    {/* Matched Product Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {matchResult.matches.map((item, idx) => {
                        const p = item.product
                        return (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-2xl border border-jds-outline-variant/30 bg-white hover:border-jds-primary/60 shadow-xs transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span
                                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                                    item.matchPercentage >= 85
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : item.matchPercentage >= 70
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {item.matchPercentage}% Match {idx === 0 && '· Top Pick'}
                                </span>
                                <span className="text-label-sm font-bold text-jds-primary">
                                  ₱{p.price_range}
                                </span>
                              </div>

                              <h5 className="text-label-md font-bold text-jds-on-surface line-clamp-1 mb-1">
                                {p.name}
                              </h5>

                              <div className="grid grid-cols-3 gap-1 bg-jds-surface-container-lowest p-1.5 rounded-xl mb-2 text-center text-[10px]">
                                <div>
                                  <span className="text-jds-on-surface-variant/70">Budget</span>
                                  <div className="font-bold text-jds-on-surface">{item.breakdown.budgetScore}%</div>
                                </div>
                                <div>
                                  <span className="text-jds-on-surface-variant/70">Location</span>
                                  <div className="font-bold text-jds-on-surface">{item.breakdown.locationScore}%</div>
                                </div>
                                <div>
                                  <span className="text-jds-on-surface-variant/70">Power</span>
                                  <div className="font-bold text-jds-on-surface">{item.breakdown.powerScore}%</div>
                                </div>
                              </div>
                            </div>

                            <Link
                              to={`/product/${p.id}`}
                              className="text-center text-xs font-bold py-1.5 rounded-lg border border-jds-secondary text-jds-secondary hover:bg-jds-secondary hover:text-white transition-colors"
                            >
                              View Product Details
                            </Link>
                          </div>
                        )
                      })}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-jds-outline-variant/20">
                      <button
                        type="button"
                        onClick={restartWizard}
                        className="flex items-center gap-1.5 text-xs font-semibold text-jds-on-surface-variant hover:text-jds-on-surface px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <HiOutlineArrowPath size={14} />
                        <span>Restart Wizard</span>
                      </button>

                      {onInjectToChat && (
                        <button
                          type="button"
                          onClick={handleInject}
                          disabled={injected}
                          className="flex items-center gap-1.5 bg-jds-primary hover:bg-jds-primary/90 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-70"
                        >
                          <HiOutlineChatBubbleLeftRight size={15} />
                          <span>{injected ? 'Results Transferred!' : consultButtonLabel}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
