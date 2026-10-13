import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MessageSquare,
  Info,
} from 'lucide-react'
import { useChat } from '../context/ChatContext'
import { matchSolarProducts } from '../lib/multiCriteriaMatcher'
import PrototypeGuidedFlow, { LOCATIONS } from '../components/matcher/PrototypeGuidedFlow'

export default function MatchWizardPage() {
  const navigate = useNavigate()
  const { products, setInitialMessage } = useChat()

  // Criteria state
  const [criteria, setCriteria] = useState({
    location: 'street',
    powerNeeds: 300,
    budget: 3500,
    threshold: 0.70,
  })

  // Real-time calculation using multi-attribute scoring
  const matchResult = useMemo(() => {
    return matchSolarProducts(
      products,
      {
        location: criteria.location,
        powerNeeds: Number(criteria.powerNeeds),
        budget: criteria.budget === 'any' ? 'any' : Number(criteria.budget),
      },
      {
        threshold: Number(criteria.threshold),
        limit: 4,
      }
    )
  }, [products, criteria])

  const handleConsultAssistant = () => {
    const locLabel = LOCATIONS.find((l) => l.id === criteria.location)?.label || criteria.location
    const budgetLabel =
      criteria.budget === 'any' ? 'Any Budget' : `PHP ${Number(criteria.budget).toLocaleString()}`

    let report = `### Solar Product Matcher Assessment Dossier\n\n`
    report += `* **Target Location:** ${locLabel}\n`
    report += `* **Power Needs:** ${criteria.powerNeeds}W Output\n`
    report += `* **Target Unit Investment:** ${budgetLabel}\n`
    report += `* **Sensitivity Threshold:** ${Math.round(criteria.threshold * 100)}% Match\n\n`
    report += `**Qualified Models:**\n`

    matchResult.matches.forEach((item, idx) => {
      const p = item.product
      report += `${idx + 1}. **[${p.name}](/product/${p.id})** — **${item.matchPercentage}% Compatibility** (Optics: ${item.breakdown.locationScore}%, Power: ${item.breakdown.powerScore}%, Budget: ${item.breakdown.budgetScore}%)\n`
    })

    report += `\nI have evaluated these models against my project requirements. Please provide verified stock availability, bulk package options, and delivery timelines for these units.`

    setInitialMessage(report)
    navigate('/chat')
  }

  return (
    <div className="min-h-screen flex-1 flex flex-col justify-between w-full pt-16 sm:pt-20 pb-6 sm:pb-8 px-4 sm:px-6 lg:px-8 sunlight-bg relative font-inter text-neutral-900 dark:text-neutral-100 overflow-x-hidden">
      {/* Background Solar Accents */}
      <div className="absolute top-12 left-1/3 w-96 h-96 bg-amber-400/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-96 h-96 bg-orange-400/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 w-full flex-1 flex flex-col justify-between">
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
              Solar Product Matcher
            </h1>
          </motion.div>
        </div>

        {/* Guided Flow View - Centered and fills primary vertical space */}
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
          />
        </motion.div>

        {/* Bottom Context Banner */}
        <div className="mt-6 sm:mt-8 p-4 rounded-2xl bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200/70 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Info className="size-4 text-amber-600 shrink-0" />
            <span>
              Have specific engineering requirements, Quiapo / Cavite branch pickup queries, or custom bracket requests?
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="shrink-0 font-semibold text-neutral-900 dark:text-white hover:text-amber-600 transition-colors cursor-pointer"
          >
            Inquire via Assistant
          </button>
        </div>
      </div>
    </div>
  )
}
