import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlineXMark,
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiOutlineExclamationTriangle,
  HiOutlineChevronDown,
} from 'react-icons/hi2'
import { matchSolarProducts, getCatalogBounds } from '../lib/multiCriteriaMatcher'
import useModalBehavior from '../hooks/useModalBehavior'
import {
  LOCATIONS,
  FORM_FACTORS,
  MOUNTING_OPTIONS,
  QUANTITY_PRESETS,
  formatPriceRange,
  formatEstimatedTotal,
  getBudgetValidationError,
  getWattageValidationError,
} from './matcher/matcherConfig'
import NumericCriterionInput from './matcher/NumericCriterionInput'
import MatchBreakdownPopover from './matcher/MatchBreakdownPopover'

export default function MultiCriteriaMatchModal({ isOpen, onClose, products = [] }) {
  const { backdropProps } = useModalBehavior({ isOpen, onClose })
  const bounds = useMemo(() => getCatalogBounds(products), [products])

  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [location, setLocation] = useState('street')
  const [formFactor, setFormFactor] = useState('any')
  const [mounting, setMounting] = useState('any')
  const [powerNeeds, setPowerNeeds] = useState(300)
  const [wattageManuallyEdited, setWattageManuallyEdited] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [budget, setBudget] = useState(3000)
  const [budgetMode, setBudgetMode] = useState('unit')

  const safeQuantity = Math.max(1, Number(quantity) || 1)
  const selectedLocation = LOCATIONS.find((l) => l.id === location)
  const selectedFormFactor = FORM_FACTORS.find((f) => f.id === formFactor)
  const selectedMounting = MOUNTING_OPTIONS.find((m) => m.id === mounting)

  const matchResult = useMemo(() => {
    return matchSolarProducts(
      products,
      {
        location,
        formFactor,
        mounting,
        powerNeeds: powerNeeds === 'any' || powerNeeds === '' ? 'any' : Number(powerNeeds),
        quantity: safeQuantity,
        budget: budget === 'any' || budget === '' ? 'any' : Number(budget),
        budgetMode,
      },
      {
        threshold: 0.70,
        limit: 6,
        unlistedLimit: 4,
        separateUnlisted: true,
        catalogBounds: bounds,
      }
    )
  }, [products, location, formFactor, mounting, powerNeeds, safeQuantity, budget, budgetMode, bounds])

  const wattageError = getWattageValidationError(powerNeeds)
  const budgetError = getBudgetValidationError(budget)

  const handleBudgetModeSwitch = (nextMode) => {
    if (nextMode === budgetMode) return
    if (budget === 'any' || budget === '' || budget === null || budget === undefined) {
      setBudgetMode(nextMode)
      return
    }
    const currentNum = Number(budget)
    if (isNaN(currentNum) || currentNum <= 0) {
      setBudgetMode(nextMode)
      return
    }
    setBudget(
      nextMode === 'total'
        ? Math.round(currentNum * safeQuantity)
        : Math.max(100, Math.round(currentNum / safeQuantity))
    )
    setBudgetMode(nextMode)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (wattageError || budgetError) return
    if (powerNeeds === '' || powerNeeds === null) setPowerNeeds('any')
    if (budget === '' || budget === null) setBudget('any')
    setQuantity(Math.max(1, Number(quantity) || 1))
    setHasSubmitted(true)
  }

  const powerPresets = [...bounds.powerPresets, { label: 'Any', value: 'any' }]
  const budgetPresets =
    budgetMode === 'total' && safeQuantity > 1
      ? [
          { label: `₱${(1500 * safeQuantity).toLocaleString()}`, value: 1500 * safeQuantity },
          { label: `₱${(2500 * safeQuantity).toLocaleString()}`, value: 2500 * safeQuantity },
          { label: `₱${(3500 * safeQuantity).toLocaleString()}`, value: 3500 * safeQuantity },
          { label: 'Any', value: 'any' },
        ]
      : bounds.budgetPresets

  if (!isOpen) return null

  const selectClasses =
    'w-full appearance-none rounded-xl bg-white border border-jds-outline-variant/60 px-3.5 py-2.5 pr-9 text-sm font-medium text-jds-on-surface outline-none transition-all focus:border-jds-primary focus:ring-2 focus:ring-jds-primary/20 cursor-pointer'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          {...backdropProps}
          className="fixed inset-0 bg-jds-on-surface/40 backdrop-blur-md transition-opacity"
        />

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
                  {hasSubmitted ? 'Your best matches' : 'Find your solar light'}
                </h2>
                <p className="text-body-sm text-jds-on-surface-variant">
                  {hasSubmitted
                    ? 'Here are the closest matches based on your answers.'
                    : 'Fill in what you know, then click Submit to see matching solar lights.'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container-high rounded-full transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <HiOutlineXMark className="size-6" />
            </button>
          </div>

          {/* Body */}
          {!hasSubmitted ? (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Dropdown Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="modal-location" className="block text-label-md font-bold text-jds-on-surface">
                      Where will you put it?
                    </label>
                    <div className="relative">
                      <select
                        id="modal-location"
                        value={location}
                        onChange={(e) => {
                          const nextId = e.target.value
                          const loc = LOCATIONS.find((l) => l.id === nextId)
                          setLocation(nextId)
                          if (!wattageManuallyEdited && loc) {
                            setPowerNeeds(loc.recommendedWatt)
                          }
                        }}
                        className={selectClasses}
                      >
                        {LOCATIONS.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                      <HiOutlineChevronDown className="size-4 text-jds-on-surface-variant pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    {selectedLocation && (
                      <p className="text-[11px] text-jds-on-surface-variant/80">{selectedLocation.desc}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="modal-form-factor" className="block text-label-md font-bold text-jds-on-surface">
                      Light style
                    </label>
                    <div className="relative">
                      <select
                        id="modal-form-factor"
                        value={formFactor}
                        onChange={(e) => setFormFactor(e.target.value)}
                        className={selectClasses}
                      >
                        {FORM_FACTORS.map((ff) => (
                          <option key={ff.id} value={ff.id}>
                            {ff.label}
                          </option>
                        ))}
                      </select>
                      <HiOutlineChevronDown className="size-4 text-jds-on-surface-variant pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    {selectedFormFactor && (
                      <p className="text-[11px] text-jds-on-surface-variant/80">{selectedFormFactor.desc}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="modal-mounting" className="block text-label-md font-bold text-jds-on-surface">
                      How will you mount it?
                    </label>
                    <div className="relative">
                      <select
                        id="modal-mounting"
                        value={mounting}
                        onChange={(e) => setMounting(e.target.value)}
                        className={selectClasses}
                      >
                        {MOUNTING_OPTIONS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <HiOutlineChevronDown className="size-4 text-jds-on-surface-variant pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    {selectedMounting && (
                      <p className="text-[11px] text-jds-on-surface-variant/80">{selectedMounting.desc}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-jds-outline-variant/25" />

                {/* Numeric Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <NumericCriterionInput
                    id="modal-wattage"
                    label="Brightness (watts)"
                    helperText="Leave blank for any wattage"
                    value={powerNeeds}
                    onChange={(val) => {
                      setPowerNeeds(val)
                      setWattageManuallyEdited(true)
                    }}
                    presets={powerPresets}
                    suffix="W"
                    placeholder="Any"
                    min={50}
                    max={2000}
                    allowAny
                    compact
                    variant="modal"
                    error={wattageError}
                  />

                  <NumericCriterionInput
                    id="modal-quantity"
                    label="How many units?"
                    helperText="Shows estimated total cost"
                    value={quantity}
                    onChange={(val) => setQuantity(val === '' ? '' : Math.max(1, Number(val) || 1))}
                    presets={QUANTITY_PRESETS.map((q) => ({ label: q === 50 ? '50+' : `${q}`, value: q }))}
                    suffix={safeQuantity === 1 ? 'unit' : 'units'}
                    placeholder="1"
                    min={1}
                    max={10000}
                    compact
                    variant="modal"
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="modal-budget" className="text-label-md font-bold text-jds-on-surface">
                        Budget
                      </label>
                      <div className="inline-flex rounded-lg bg-jds-surface-container-high p-0.5 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => handleBudgetModeSwitch('unit')}
                          className={`px-2 py-0.5 rounded-md cursor-pointer ${
                            budgetMode === 'unit'
                              ? 'bg-white text-jds-on-surface shadow-2xs'
                              : 'text-jds-on-surface-variant'
                          }`}
                        >
                          Per unit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBudgetModeSwitch('total')}
                          className={`px-2 py-0.5 rounded-md cursor-pointer ${
                            budgetMode === 'total'
                              ? 'bg-white text-jds-on-surface shadow-2xs'
                              : 'text-jds-on-surface-variant'
                          }`}
                        >
                          Total
                        </button>
                      </div>
                    </div>
                    <NumericCriterionInput
                      id="modal-budget"
                      helperText={
                        budgetMode === 'total' && safeQuantity > 1
                          ? `Total for ${safeQuantity} units (leave blank for any)`
                          : 'Max price per light (leave blank for any)'
                      }
                      value={budget}
                      onChange={setBudget}
                      presets={budgetPresets}
                      prefix="₱"
                      placeholder="Any"
                      min={100}
                      allowAny
                      compact
                      variant="modal"
                      error={budgetError}
                    />
                  </div>
                </div>
              </div>

              {/* Form Footer */}
              <div className="px-6 py-3.5 border-t border-jds-outline-variant/20 bg-jds-surface-container-lowest flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-jds-surface-container-high hover:bg-jds-surface-container-highest text-jds-on-surface rounded-xl text-label-sm font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-jds-primary hover:bg-jds-primary/90 text-white rounded-xl text-label-sm font-bold transition-colors cursor-pointer"
                >
                  <span>Submit</span>
                  <HiOutlineArrowRight className="size-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {matchResult.budgetFeedback?.belowMinimumBudget && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-jds-on-surface"
                  >
                    <HiOutlineExclamationTriangle className="size-5 text-jds-primary shrink-0 mt-0.5" />
                    <div className="space-y-0.5 tabular-nums">
                      <div className="font-bold">Budget is below our lowest-priced solar light</div>
                      <p className="text-jds-on-surface-variant">
                        Your budget of ₱{matchResult.budgetFeedback.effectiveUnitBudget?.toLocaleString()} per unit is below our lowest-priced light at ₱
                        {matchResult.budgetFeedback.lowestUnitPrice?.toLocaleString()} each. Here are the closest options by price.
                      </p>
                    </div>
                  </div>
                )}

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
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <MatchBreakdownPopover
                                label={`${item.matchPercentage}% match`}
                                details={item.breakdownDetails}
                                variant="modal"
                                badgeClassName={`text-label-sm font-extrabold px-2.5 py-0.5 rounded-full border tabular-nums ${
                                  item.matchPercentage >= 85
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : item.matchPercentage >= 70
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              />
                              {isTopPick && !item.compromise?.hasCompromise && (
                                <span className="text-[11px] bg-jds-primary-container text-jds-on-primary-container px-2 py-0.5 rounded-full font-bold">
                                  Best fit
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0 tabular-nums">
                              <span className="text-label-md font-bold text-jds-primary block">
                                {product.price_range ? formatPriceRange(product.price_range) : 'Ask for price'}
                              </span>
                              {safeQuantity > 1 && item.totalPriceInfo?.hasPrice && (
                                <span className="text-[10px] font-semibold text-jds-on-surface-variant block">
                                  Total: {formatEstimatedTotal(item.totalPriceInfo)}
                                </span>
                              )}
                            </div>
                          </div>

                          <h4 className="text-label-lg font-bold text-jds-on-surface line-clamp-1 mb-3">
                            {product.name}
                          </h4>

                          <div className="flex flex-wrap gap-1.5 mb-4 text-[11px]">
                            <span className="bg-jds-surface-container-high px-2 py-0.5 rounded-md text-jds-on-surface font-semibold tabular-nums">
                              {product.watt}W
                            </span>
                            <span className="bg-jds-surface-container-high px-2 py-0.5 rounded-md text-jds-on-surface">
                              {item.inferredSpecs?.formFactorLabel}
                            </span>
                            <span className="bg-jds-surface-container-high px-2 py-0.5 rounded-md text-jds-on-surface">
                              {product.waterproof_grade || 'IP65'}
                            </span>
                          </div>
                        </div>

                        <Link
                          to={`/product/${product.id}`}
                          onClick={onClose}
                          className="w-full flex items-center justify-center gap-1.5 text-label-sm font-bold py-2 px-3 rounded-xl bg-jds-primary/10 text-jds-primary hover:bg-jds-primary hover:text-white transition-all text-center"
                        >
                          <span>Inquire this</span>
                          <HiOutlineArrowRight className="text-sm" />
                        </Link>
                      </div>
                    )
                  })}
                </div>

                {matchResult.unlistedMatches?.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-jds-outline-variant/25">
                    <div className="text-label-md font-bold text-jds-on-surface">
                      Price upon inquiry ({matchResult.unlistedMatches.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {matchResult.unlistedMatches.map((item) => {
                        const p = item.product
                        return (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl bg-jds-surface-container-lowest border border-jds-outline-variant/30 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="text-xs font-bold text-jds-on-surface truncate">{p.name}</div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-jds-on-surface-variant tabular-nums">
                                <span>{p.watt}W</span>
                                <span>·</span>
                                <span>{item.inferredSpecs?.formFactorLabel}</span>
                                <MatchBreakdownPopover
                                  label={`${Math.round((item.technicalScore ?? item.compositeScore) * 100)}% fit`}
                                  details={item.breakdownDetails}
                                  variant="modal"
                                  badgeClassName="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-jds-surface-container-high text-jds-on-surface border border-jds-outline-variant/30"
                                />
                              </div>
                            </div>
                            <Link
                              to={`/product/${p.id}`}
                              onClick={onClose}
                              className="shrink-0 text-xs font-bold text-jds-primary hover:underline"
                            >
                              Inquire this
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Results Footer */}
              <div className="px-6 py-3.5 border-t border-jds-outline-variant/20 bg-jds-surface-container-lowest flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setHasSubmitted(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-jds-surface-container-high hover:bg-jds-surface-container-highest text-jds-on-surface rounded-xl text-label-sm font-bold transition-colors cursor-pointer"
                >
                  <HiOutlineArrowLeft className="size-4" />
                  <span>Edit answers</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-jds-primary hover:bg-jds-primary/90 text-white rounded-xl text-label-sm font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
