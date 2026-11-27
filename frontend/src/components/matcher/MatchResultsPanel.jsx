import { Link } from 'react-router-dom'
import {
  Zap,
  Check,
  ArrowUpRight,
  AlertTriangle,
  MessageSquare,
  RotateCcw,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import {
  LOCATIONS,
  FORM_FACTORS,
  MOUNTING_OPTIONS,
  formatPriceRange,
  formatEstimatedTotal,
} from './matcherConfig'
import MatchBreakdownPopover from './MatchBreakdownPopover'

export default function MatchResultsPanel({
  criteria,
  matchResult,
  onAdjustSpecs,
  onRestart,
  onConsultAssistant,
  showFooterActions = true,
}) {
  const topMatch = matchResult?.matches?.[0]
  const otherMatches = matchResult?.matches?.slice(1) || []
  const unlistedMatches = matchResult?.unlistedMatches || []
  const budgetFeedback = matchResult?.budgetFeedback
  const quantity = Math.max(1, Number(criteria.quantity) || 1)

  const locLabel = LOCATIONS.find((l) => l.id === criteria.location)?.shortLabel
  const formLabel =
    criteria.formFactor && criteria.formFactor !== 'any'
      ? FORM_FACTORS.find((f) => f.id === criteria.formFactor)?.shortLabel
      : null
  const mountLabel =
    criteria.mounting && criteria.mounting !== 'any'
      ? MOUNTING_OPTIONS.find((m) => m.id === criteria.mounting)?.shortLabel
      : null
  const isPowerAny =
    criteria.powerNeeds === 'any' ||
    criteria.powerNeeds === '' ||
    criteria.powerNeeds === null ||
    criteria.powerNeeds === undefined
  const wattLabel = isPowerAny ? null : `${criteria.powerNeeds}W`
  const isBudgetAny =
    criteria.budget === 'any' ||
    criteria.budget === '' ||
    criteria.budget === null ||
    criteria.budget === undefined
  const budgetLabel = isBudgetAny
    ? 'Any budget'
    : `₱${Number(criteria.budget).toLocaleString()} ${criteria.budgetMode === 'total' && quantity > 1 ? 'total' : 'each'}`

  const summaryChips = [
    locLabel,
    formLabel,
    mountLabel,
    wattLabel,
    quantity > 1 ? `${quantity} units` : '1 unit',
    budgetLabel,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Your best matches
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {summaryChips.map((chip) => (
              <span
                key={chip}
                className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/70 dark:border-neutral-700/70 tabular-nums"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onAdjustSpecs && (
            <button
              type="button"
              onClick={onAdjustSpecs}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer py-1.5 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Edit answers</span>
            </button>
          )}
          {onConsultAssistant && (
            <button
              type="button"
              onClick={onConsultAssistant}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 transition-colors cursor-pointer py-1.5 px-3 rounded-lg"
            >
              <MessageSquare className="size-3.5" />
              <span>Ask assistant</span>
            </button>
          )}
        </div>
      </div>

      {/* Below-Minimum-Budget Banner */}
      {budgetFeedback?.belowMinimumBudget && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/35 bg-amber-500/[0.08] dark:bg-amber-500/[0.12] p-4 flex items-start gap-3"
        >
          <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-neutral-900 dark:text-white">
              Budget is below our lowest-priced solar light
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed tabular-nums">
              Your budget of ₱{budgetFeedback.effectiveUnitBudget?.toLocaleString()} per unit is ₱
              {budgetFeedback.gapPerUnit?.toLocaleString()} below our most affordable solar light, which starts at ₱
              {budgetFeedback.lowestUnitPrice?.toLocaleString()} each
              {quantity > 1
                ? ` (about ₱${budgetFeedback.lowestTotalPrice?.toLocaleString()} for ${quantity} units)`
                : ''}
              . Here are the closest options by price.
            </p>
          </div>
        </div>
      )}

      {/* Primary Priced Matches */}
      {topMatch ? (
        <div className="space-y-6">
          {/* Top Pick Card */}
          <div className="relative rounded-2xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
            <div className="p-5 sm:p-6 lg:p-7 space-y-5">
              {/* Top Row: Badges & Price */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    {budgetFeedback?.belowMinimumBudget ? 'Closest price option' : 'Best match'}
                  </span>
                  <MatchBreakdownPopover
                    label={`${topMatch.matchPercentage}% match`}
                    details={topMatch.breakdownDetails}
                    badgeClassName={`px-2.5 py-1 rounded-full text-xs font-bold tabular-nums border ${
                      topMatch.matchPercentage >= 85
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25'
                    }`}
                  />
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <Check className="size-3 stroke-[2.5]" />
                    <span>In stock</span>
                  </span>
                </div>

                <div className="text-right tabular-nums">
                  <span className="text-[11px] text-neutral-400 block">
                    Estimated price per light
                  </span>
                  <span className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white block">
                    {topMatch.product.price_range ? formatPriceRange(topMatch.product.price_range) : 'Ask for price'}
                  </span>
                  {quantity > 1 && topMatch.totalPriceInfo?.hasPrice && (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block mt-0.5">
                      Estimated total ({quantity} units): {formatEstimatedTotal(topMatch.totalPriceInfo)}
                    </span>
                  )}
                </div>
              </div>

              {/* Image + Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-4 flex flex-col items-center">
                  <Link
                    to={`/product/${topMatch.product.id}`}
                    className="w-full aspect-square max-w-[210px] rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60 p-4 flex items-center justify-center relative shadow-xs group cursor-pointer"
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
                        <span className="text-xs font-medium text-neutral-500">Solar light</span>
                      </div>
                    )}
                    <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-neutral-900/85 text-white text-[11px] font-bold tabular-nums">
                      {topMatch.product.watt}W
                    </div>
                  </Link>
                </div>

                <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {topMatch.inferredSpecs?.formFactorLabel}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {topMatch.inferredSpecs?.mountingLabel}
                      </span>
                    </div>
                    <Link to={`/product/${topMatch.product.id}`} className="group block">
                      <h4 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {topMatch.product.name}
                      </h4>
                    </Link>
                  </div>

                  {/* Plain Key Details */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[11px] text-neutral-400 block">Brightness</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                        {topMatch.product.watt}W
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[11px] text-neutral-400 block">Weatherproof</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {topMatch.product.waterproof_grade || 'IP65'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                      <span className="text-[11px] text-neutral-400 block">Warranty</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {topMatch.product.default_warranty_months
                          ? `${topMatch.product.default_warranty_months} months`
                          : '1 year'}
                      </span>
                    </div>
                  </div>

                  {/* Single Clear CTA */}
                  <div className="pt-1">
                    <Link
                      to={`/product/${topMatch.product.id}`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 text-xs font-semibold shadow-xs transition-all duration-150 active:scale-[0.98]"
                    >
                      <span>Inquire this</span>
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Other Good Options */}
          {otherMatches.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Other good options ({otherMatches.length})
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {otherMatches.map((item) => {
                  const p = item.product
                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/70 hover:border-amber-400/80 dark:hover:border-amber-500/50 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <MatchBreakdownPopover
                            label={`${item.matchPercentage}% match`}
                            details={item.breakdownDetails}
                            badgeClassName={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums border ${
                              item.matchPercentage >= 85
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25'
                            }`}
                          />
                          <div className="text-right shrink-0 tabular-nums">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                              {p.price_range ? formatPriceRange(p.price_range) : 'Ask for price'}
                            </span>
                            {quantity > 1 && item.totalPriceInfo?.hasPrice && (
                              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 block">
                                Total: {formatEstimatedTotal(item.totalPriceInfo)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <Link
                            to={`/product/${p.id}`}
                            className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-1"
                          >
                            {p.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                            <span>{p.watt}W</span>
                            <span>·</span>
                            <span>{item.inferredSpecs?.formFactorLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                        <span className="text-[11px] text-neutral-400">
                          {item.inferredSpecs?.mountingLabel}
                        </span>
                        <Link
                          to={`/product/${p.id}`}
                          className="text-xs font-semibold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Inquire this</span>
                          <ArrowUpRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-10 space-y-3 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            No priced solar lights matched these exact choices.
          </p>
          {onAdjustSpecs && (
            <button
              type="button"
              onClick={onAdjustSpecs}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Edit answers</span>
            </button>
          )}
        </div>
      )}

      {/* Price upon inquiry section */}
      {unlistedMatches.length > 0 && (
        <div className="pt-4 border-t border-neutral-200/70 dark:border-neutral-800 space-y-3">
          <div>
            <h5 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Price upon inquiry ({unlistedMatches.length})
            </h5>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              These solar lights fit what you need. Ask our branch for the latest price.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {unlistedMatches.map((item) => {
              const p = item.product
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        Price upon inquiry
                      </span>
                      <MatchBreakdownPopover
                        label={`${Math.round((item.technicalScore ?? item.compositeScore) * 100)}% fit`}
                        details={item.breakdownDetails}
                        align="right"
                        badgeClassName="px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums text-neutral-600 dark:text-neutral-300 bg-neutral-200/60 dark:bg-neutral-700/60 border border-neutral-200/80 dark:border-neutral-700"
                      />
                    </div>
                    <Link
                      to={`/product/${p.id}`}
                      className="text-sm font-semibold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors block line-clamp-1"
                    >
                      {p.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                      <span>{p.watt}W</span>
                      <span>·</span>
                      <span>{item.inferredSpecs?.formFactorLabel}</span>
                      <span>·</span>
                      <span>{item.inferredSpecs?.mountingLabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {quantity > 1 ? `Quote for ${quantity} units` : 'Ask at branch'}
                    </span>
                    <Link
                      to={`/product/${p.id}`}
                      className="text-xs font-semibold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 inline-flex items-center gap-1"
                    >
                      <span>Inquire this</span>
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      {showFooterActions && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
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

          <div className="flex flex-wrap items-center gap-2.5">
            {onConsultAssistant && (
              <button
                type="button"
                onClick={onConsultAssistant}
                className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 py-2 px-4 rounded-full transition-all cursor-pointer"
              >
                <MessageSquare className="size-3.5" />
                <span>Ask assistant about these</span>
              </button>
            )}
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white py-2 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              <span>Browse all lights</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
