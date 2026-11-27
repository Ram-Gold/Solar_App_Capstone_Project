import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { matchSolarProducts, getCatalogBounds } from '../lib/multiCriteriaMatcher'
import PrototypeGuidedFlow, { LOCATIONS } from '../components/matcher/PrototypeGuidedFlow'
import { FORM_FACTORS, MOUNTING_OPTIONS, formatEstimatedTotal } from '../components/matcher/matcherConfig'

const INITIAL_CRITERIA = {
  location: 'street',
  formFactor: 'any',
  mounting: 'any',
  powerNeeds: 300,
  wattageManuallyEdited: false,
  quantity: 1,
  budget: 3500,
  budgetMode: 'unit',
  threshold: 0.70,
}

export default function MatchWizardPage() {
  const navigate = useNavigate()
  const { products, setInitialMessage } = useChat()

  const catalogBounds = useMemo(() => getCatalogBounds(products), [products])

  // Criteria state shared between Guided Assessment and Direct Spec Entry
  const [criteria, setCriteria] = useState(INITIAL_CRITERIA)

  // Real-time multi-attribute scoring with segregated null-price inquiry items
  const matchResult = useMemo(() => {
    return matchSolarProducts(
      products,
      {
        location: criteria.location,
        formFactor: criteria.formFactor,
        mounting: criteria.mounting,
        powerNeeds:
          criteria.powerNeeds === 'any' || criteria.powerNeeds === ''
            ? 'any'
            : Number(criteria.powerNeeds),
        quantity: Math.max(1, Number(criteria.quantity) || 1),
        budget:
          criteria.budget === 'any' || criteria.budget === ''
            ? 'any'
            : Number(criteria.budget),
        budgetMode: criteria.budgetMode,
      },
      {
        threshold: Number(criteria.threshold),
        limit: 4,
        unlistedLimit: 4,
        separateUnlisted: true,
        catalogBounds,
      }
    )
  }, [products, criteria, catalogBounds])

  const handleConsultAssistant = () => {
    const locLabel = LOCATIONS.find((l) => l.id === criteria.location)?.label || criteria.location
    const formLabel = FORM_FACTORS.find((f) => f.id === criteria.formFactor)?.label || 'Any'
    const mountLabel = MOUNTING_OPTIONS.find((m) => m.id === criteria.mounting)?.label || 'Any'
    const qty = Math.max(1, Number(criteria.quantity) || 1)
    const isPowerAny =
      criteria.powerNeeds === 'any' ||
      criteria.powerNeeds === '' ||
      criteria.powerNeeds === null ||
      criteria.powerNeeds === undefined
    const powerLabel = isPowerAny ? 'Any Wattage' : `${criteria.powerNeeds}W Output`
    const isBudgetAny =
      criteria.budget === 'any' ||
      criteria.budget === '' ||
      criteria.budget === null ||
      criteria.budget === undefined
    const budgetLabel = isBudgetAny
      ? 'Any Budget'
      : `PHP ${Number(criteria.budget).toLocaleString()} (${
          criteria.budgetMode === 'total' && qty > 1 ? 'Total Project' : 'Per Unit'
        })`

    let report = `### Solar Product Match Summary\n\n`
    report += `* **Target Location:** ${locLabel}\n`
    report += `* **Form Factor:** ${formLabel}\n`
    report += `* **Mounting / Pole:** ${mountLabel}\n`
    report += `* **Power Needs:** ${powerLabel}\n`
    report += `* **Quantity:** ${qty} ${qty === 1 ? 'unit' : 'units'}\n`
    report += `* **Budget Target:** ${budgetLabel}\n`
    report += `* **Sensitivity Threshold:** ${Math.round(criteria.threshold * 100)}% Match\n\n`
    report += `**Qualified Models:**\n`

    matchResult.matches.forEach((item, idx) => {
      const p = item.product
      const totalNote =
        qty > 1 && item.totalPriceInfo?.hasPrice
          ? `, Est. Total: ${formatEstimatedTotal(item.totalPriceInfo)}`
          : ''
      report += `${idx + 1}. **[${p.name}](/product/${p.id})**, **${item.matchPercentage}% Compatibility** (Environment: ${item.breakdown.locationScore}%, Form & Mount: ${item.breakdown.formAndMountScore}%, Power: ${item.breakdown.powerScore}%, Budget: ${item.breakdown.budgetScore}%${totalNote})\n`
    })

    if (matchResult.unlistedMatches?.length > 0) {
      report += `\n**Additional Price-upon-Inquiry Models:**\n`
      matchResult.unlistedMatches.slice(0, 2).forEach((item, idx) => {
        const p = item.product
        report += `${idx + 1}. **[${p.name}](/product/${p.id})** (${p.watt}W, ${item.inferredSpecs?.formFactorLabel})\n`
      })
    }

    report += `\nI have evaluated these models against my project requirements. Please provide verified stock availability, bulk package options, and delivery timelines for these units.`

    setInitialMessage(report)
    navigate('/chat')
  }

  return (
    <div className="min-h-screen flex-1 flex flex-col justify-between w-full pt-16 sm:pt-20 pb-6 sm:pb-8 px-4 sm:px-6 lg:px-8 sunlight-bg relative font-inter text-neutral-900 dark:text-neutral-100 overflow-x-hidden">
      {/* Background Solar Accents */}
      <div className="absolute top-12 left-1/3 w-96 h-96 bg-amber-400/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 bg-orange-400/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 w-full flex-1 flex flex-col justify-between">
        {/* Top Header Section */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Catalog</span>
            </Link>

            <Link
              to="/chat"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white/70 dark:bg-neutral-800/60 hover:bg-white dark:hover:bg-neutral-800 px-3.5 py-1.5 rounded-full border border-neutral-200/80 dark:border-neutral-700 backdrop-blur-md transition-all shadow-xs"
            >
              <MessageSquare className="size-3.5 text-amber-600" />
              <span>Solar Assistant</span>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-4 sm:mb-6"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-neutral-900 dark:text-white">
              Find your solar light
            </h1>
          </motion.div>
        </div>

        {/* Hybrid Product Matcher View */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="my-auto py-2"
        >
          <PrototypeGuidedFlow
            criteria={criteria}
            onCriteriaChange={setCriteria}
            matchResult={matchResult}
            onConsultAssistant={handleConsultAssistant}
            onResetCriteria={() => setCriteria(INITIAL_CRITERIA)}
            catalogBounds={catalogBounds}
          />
        </motion.div>
      </div>
    </div>
  )
}
