import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineXMark,
  HiOutlineBolt,
  HiOutlineArrowRight,
  HiOutlineSparkles,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineShieldCheck,
} from 'react-icons/hi2'

const BILL_PRESETS = [
  { label: '₱3,000', value: 3000 },
  { label: '₱6,000', value: 6000 },
  { label: '₱12,000', value: 12000 },
  { label: '₱25,000', value: 25000 },
]

const PERCENT_PRESETS = [
  { label: 'Minimal (10%)', desc: '1–2 gate/entry lights', value: 10 },
  { label: 'Typical (20%)', desc: 'Yard & perimeter lighting', value: 20 },
  { label: 'Substantial (35%)', desc: 'Compound / parking lots', value: 35 },
]

export default function SolarSavingsCalculatorModal({
  isOpen,
  onClose,
  onSendToChat,
}) {
  const navigate = useNavigate()
  const [totalBill, setTotalBill] = useState(6000)
  const [outdoorPercent, setOutdoorPercent] = useState(20)

  // Calculations
  const calculations = useMemo(() => {
    const validBill = Math.max(0, Number(totalBill) || 0)
    const validPercent = Math.min(100, Math.max(1, Number(outdoorPercent) || 20))
    const monthlyOutdoorSpend = Math.round(validBill * (validPercent / 100))
    const annualSavings = monthlyOutdoorSpend * 12
    const threeYearSavings = monthlyOutdoorSpend * 36

    // Typical JD Solar fixture cost estimation for ROI estimation
    let recommendedTier = '100W – 150W Residential Streetlights'
    let unitCostEst = 1800
    let recommendedWattage = '150W'
    let recommendedScope = 'Home gates, residential perimeter, and garden pathways'

    if (monthlyOutdoorSpend >= 2500) {
      recommendedTier = '400W – 800W Heavy-Duty Highway & Road Lights'
      unitCostEst = 3500
      recommendedWattage = '500W'
      recommendedScope = 'Commercial compounds, logistics yards, and road frontage'
    } else if (monthlyOutdoorSpend >= 1000) {
      recommendedTier = '200W – 300W Subdivision & Compound Lights'
      unitCostEst = 2600
      recommendedWattage = '300W'
      recommendedScope = 'Subdivision streets, driveways, and property perimeters'
    }

    // Payback period in months
    const paybackMonths = monthlyOutdoorSpend > 0
      ? Math.max(2, Math.round((unitCostEst / monthlyOutdoorSpend) * 10) / 10)
      : 0

    return {
      monthlyOutdoorSpend,
      annualSavings,
      threeYearSavings,
      paybackMonths,
      recommendedTier,
      recommendedWattage,
      recommendedScope,
    }
  }, [totalBill, outdoorPercent])

  const handleBillChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setTotalBill(val === '' ? 0 : Number(val))
  }

  const handleSendSummary = () => {
    if (onSendToChat) {
      onSendToChat({
        totalBill,
        outdoorPercent,
        monthlyOutdoorSpend: calculations.monthlyOutdoorSpend,
        annualSavings: calculations.annualSavings,
        threeYearSavings: calculations.threeYearSavings,
        paybackMonths: calculations.paybackMonths,
        recommendedTier: calculations.recommendedTier,
      })
    }
    onClose()
  }

  const handleInquireNow = () => {
    onClose()
    navigate(`/browse?wattage=${calculations.recommendedWattage}`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-jds-on-surface/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-3xl bg-white rounded-3xl border border-jds-outline-variant/40 shadow-2xl overflow-hidden z-10 my-auto"
          >
            {/* Header */}
            <div className="px-6 py-4.5 bg-jds-surface-container-low border-b border-jds-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-jds-primary/10 border border-jds-primary/20 flex items-center justify-center text-jds-primary">
                  <HiOutlineBolt className="text-xl" />
                </div>
                <div>
                  <h3 className="text-title-md font-bold text-jds-on-surface flex items-center gap-2">
                    Solar Electricity Savings Calculator
                  </h3>
                  <p className="text-body-sm text-jds-on-surface-variant font-medium">
                    Estimate monthly bill reduction and capital payback from zero-grid outdoor lighting
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-jds-on-surface-variant hover:text-jds-on-surface border border-jds-outline-variant/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                aria-label="Close calculator"
              >
                <HiOutlineXMark className="text-xl" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[calc(85vh-140px)] overflow-y-auto">
              {/* Left Column: Inputs */}
              <div className="md:col-span-6 flex flex-col gap-5">
                {/* Bill Input */}
                <div className="bg-jds-surface-container-lowest p-4.5 rounded-2xl border border-jds-outline-variant/40">
                  <label className="block text-label-md font-bold text-jds-on-surface mb-1">
                    Monthly Electric Bill
                  </label>
                  <p className="text-body-xs text-jds-on-surface-variant mb-3">
                    Enter your average total monthly Meralco or utility invoice.
                  </p>
                  
                  <div className="relative mb-3">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-title-md font-bold text-jds-on-surface-variant">
                      ₱
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={totalBill.toLocaleString()}
                      onChange={handleBillChange}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-jds-outline-variant rounded-xl text-title-md font-bold text-jds-on-surface focus:outline-none focus:ring-2 focus:ring-jds-primary/40 focus:border-jds-primary transition-all"
                    />
                  </div>

                  {/* Preset chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {BILL_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setTotalBill(preset.value)}
                        className={`text-label-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          totalBill === preset.value
                            ? 'bg-jds-primary text-white border-jds-primary shadow-xs'
                            : 'bg-white text-jds-on-surface border-jds-outline-variant/60 hover:bg-jds-surface-container-low'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Percentage Slider */}
                <div className="bg-jds-surface-container-lowest p-4.5 rounded-2xl border border-jds-outline-variant/40">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-label-md font-bold text-jds-on-surface">
                      Outdoor Lighting Proportion
                    </label>
                    <span className="text-label-md font-bold text-jds-primary bg-jds-primary/10 px-2.5 py-0.5 rounded-full border border-jds-primary/20">
                      {outdoorPercent}%
                    </span>
                  </div>
                  <p className="text-body-xs text-jds-on-surface-variant mb-3">
                    Portion of power dedicated to dusk-to-dawn exterior or perimeter lights.
                  </p>

                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={outdoorPercent}
                    onChange={(e) => setOutdoorPercent(Number(e.target.value))}
                    className="w-full accent-jds-primary cursor-pointer mb-3"
                  />

                  {/* Fast Percentage Presets */}
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {PERCENT_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setOutdoorPercent(p.value)}
                        className={`text-left p-2 rounded-xl border text-[11px] transition-all cursor-pointer ${
                          outdoorPercent === p.value
                            ? 'bg-jds-primary-container/40 border-jds-primary text-jds-on-primary-container font-bold'
                            : 'bg-white border-jds-outline-variant/40 text-jds-on-surface-variant hover:bg-jds-surface-container-low'
                        }`}
                      >
                        <div className="font-semibold text-jds-on-surface">{p.label}</div>
                        <div className="text-[10px] opacity-75">{p.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-jds-surface-container-low rounded-xl border border-jds-outline-variant/30 flex items-center justify-between text-body-xs">
                    <span className="text-jds-on-surface-variant font-medium">Estimated Monthly Outdoor Spend:</span>
                    <span className="font-bold text-jds-on-surface text-label-sm">
                      ₱{calculations.monthlyOutdoorSpend.toLocaleString()} / mo
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Savings & ROI Analysis */}
              <div className="md:col-span-6 flex flex-col gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-jds-surface-container-high/60 via-jds-surface-container-low to-white border border-jds-outline-variant/40 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-jds-on-surface-variant">
                        Calculated Zero-Grid Savings
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                        <HiOutlineShieldCheck className="text-xs" />
                        100% Bill Elimination
                      </span>
                    </div>

                    {/* Big Numbers Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3.5 bg-white rounded-xl border border-jds-outline-variant/30 shadow-xs">
                        <div className="text-[11px] text-jds-on-surface-variant font-medium mb-0.5">
                          Monthly Savings
                        </div>
                        <div className="text-title-lg font-bold text-jds-primary">
                          ₱{calculations.monthlyOutdoorSpend.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-jds-on-surface-variant/75 mt-0.5">
                          Grid cost drops to ₱0.00
                        </div>
                      </div>

                      <div className="p-3.5 bg-white rounded-xl border border-jds-outline-variant/30 shadow-xs">
                        <div className="text-[11px] text-jds-on-surface-variant font-medium mb-0.5">
                          1-Year Savings
                        </div>
                        <div className="text-title-lg font-bold text-jds-on-surface">
                          ₱{calculations.annualSavings.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                          ₱{(calculations.annualSavings).toLocaleString()} saved / year
                        </div>
                      </div>
                    </div>

                    {/* 3-Year Projection */}
                    <div className="p-3.5 bg-white rounded-xl border border-jds-outline-variant/30 mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-jds-on-surface-variant font-medium">
                          3-Year Projected Savings
                        </div>
                        <div className="text-headline-xs font-bold text-jds-on-surface">
                          ₱{calculations.threeYearSavings.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold text-jds-primary bg-jds-primary/10 px-2.5 py-1 rounded-lg border border-jds-primary/20">
                          ~{calculations.paybackMonths} Mo. Payback
                        </span>
                      </div>
                    </div>

                    {/* Recommended Tier Guidance */}
                    <div className="p-3.5 bg-jds-surface-container rounded-xl border border-jds-outline-variant/30 text-body-xs">
                      <div className="font-bold text-jds-on-surface text-label-sm mb-1 flex items-center gap-1.5">
                        <HiOutlineSparkles className="text-jds-primary text-sm" />
                        Recommended Replacement:
                      </div>
                      <div className="font-bold text-jds-primary">
                        {calculations.recommendedTier}
                      </div>
                      <div className="text-jds-on-surface-variant mt-0.5 text-[11px]">
                        {calculations.recommendedScope}. Features dusk-to-dawn radar motion sensor and LiFePO4 battery storage.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="px-6 py-4 bg-jds-surface-container-low border-t border-jds-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
              <div className="text-body-xs text-jds-on-surface-variant font-medium">
                Estimates based on prevailing Meralco residential/commercial tariffs.
              </div>

              <div className="flex items-center gap-2.5">
                {onSendToChat && (
                  <button
                    type="button"
                    onClick={handleSendSummary}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-jds-outline-variant/60 bg-white hover:bg-jds-surface-container text-jds-on-surface font-semibold text-label-sm transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <HiOutlineChatBubbleBottomCenterText className="text-base text-jds-primary" />
                    <span>Send Summary to Chat</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleInquireNow}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-jds-primary text-white hover:opacity-95 font-bold text-label-sm transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  <span>Inquire Now</span>
                  <HiOutlineArrowRight className="text-sm" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
