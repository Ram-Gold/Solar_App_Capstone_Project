import { useState } from 'react'
import {
  X,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Loader2,
  Sun,
  Zap,
  Battery,
  Radio,
  Eye,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Wrench,
  Activity,
  Layers,
} from 'lucide-react'
import { uploadEvidenceFile, submitWarrantyClaim } from '../lib/customerService'
import { sanitizeText } from '../lib/sanitize.js'
import {
  DIAGNOSTIC_TREE,
  DEFAULT_CRITERIA_STATE,
  analyzeProductContext,
  evaluateDiagnosticCriteria,
  enrichDiagnosisNode,
} from '../lib/solarDiagnosticEngine'

const ISSUE_CATEGORIES = [
  { id: 'No Power / Won\'t Turn On', label: 'No Power / Won\'t Turn On', icon: Zap },
  { id: 'Battery / Rapid Discharge', label: 'Battery / Rapid Discharge', icon: Battery },
  { id: 'Dim Lighting / Low Lux', label: 'Dim Lighting / Low Output', icon: Sun },
  { id: 'Remote Control Failure', label: 'Remote Control Issue', icon: Radio },
  { id: 'Sensor / Dusk-Dawn Failure', label: 'Sensor Not Detecting', icon: Eye },
  { id: 'Physical / Water Ingress', label: 'Physical / Water Damage', icon: AlertTriangle },
]

const SYMPTOM_META = {
  SYMPTOM_NO_POWER: {
    icon: Zap,
    label: 'Light Does NOT Turn On at Night',
    desc: 'Fixture remains completely unlit after dusk despite daytime sun exposure.',
  },
  SYMPTOM_SHORT_RUNTIME: {
    icon: Battery,
    label: 'Shuts Off Prematurely (1–3 Hours)',
    desc: 'Illuminates normally at dusk but depletes battery rapidly before morning.',
  },
  SYMPTOM_DIM_FLICKER: {
    icon: Sun,
    label: 'Dim Illumination or Flickering LEDs',
    desc: 'Sub-nominal brightness, strobing LED modules, or partial array blackout.',
  },
  SYMPTOM_DAYTIME_ON: {
    icon: Eye,
    label: 'Light Stays ON During Bright Daytime',
    desc: 'LEDs fail to power off in full sunlight, bypassing dusk-to-dawn sensor.',
  },
  SYMPTOM_PHYSICAL_HOTSPOT: {
    icon: AlertTriangle,
    label: 'Panel Heat / Discoloration / Broken Glass',
    desc: 'Burned cell discoloration, shattered tempered glass, or loose mounting hardware.',
  },
  SYMPTOM_SENSOR_REMOTE: {
    icon: Radio,
    label: 'Remote Control / Radar Not Responding',
    desc: 'Handheld infrared controller or radar microwave induction fails to trigger.',
  },
}

const STEPS = [
  { num: 1, label: 'Symptom', short: 'Symptom' },
  { num: 2, label: 'Electrical', short: 'Electric' },
  { num: 3, label: 'Enclosure', short: 'Seal' },
  { num: 4, label: 'Environment', short: 'Sun' },
  { num: 5, label: 'Solution', short: 'Solution' },
]

/**
 * Strips markdown symbols (# headings, asterisks, backticks) leaving clean text.
 */
function cleanMarkdown(str) {
  if (!str) return ''
  return String(str)
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[*-]\s+/gm, '')
    .replace(/\*\*/g, '')
    .trim()
}

/**
 * Parses inline **bold** and `code` tokens and renders them as styled React elements
 * instead of displaying literal markdown asterisks.
 */
function renderFormattedText(text) {
  if (!text) return null
  const cleaned = String(text)
    .replace(/^#+\s*/gm, '')
    .trim()

  const parts = cleaned.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-jds-on-surface">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="px-1 py-0.5 rounded bg-jds-surface-container font-mono text-[11px] text-jds-primary font-semibold">
          {part.slice(1, -1)}
        </code>
      )
    }
    // Clean any stray asterisks
    const plain = part.replace(/\*\*/g, '')
    return <span key={index}>{plain}</span>
  })
}

function getQuestionTitle(nodeKey, node) {
  if (nodeKey === 'ROOT') {
    return 'What issue is your solar lighting unit experiencing?'
  }
  if (nodeKey.startsWith('SYMPTOM_')) {
    return 'Check Electrical Continuity & Switch State'
  }
  if (nodeKey.includes('_PHYSICAL') || nodeKey.includes('_ELECTRICAL')) {
    return 'Inspect Physical Enclosure & Cable Connection'
  }
  if (nodeKey.includes('_ENV') || nodeKey.includes('_CONTROL')) {
    return 'Verify Sunlight Exposure & Environmental Factors'
  }
  return cleanMarkdown(node?.title) || 'Solar Hardware Assessment'
}

function getQuestionPrompt(nodeKey, node, product) {
  if (nodeKey === 'ROOT') {
    return `Select the primary physical symptom or behavior observed on your ${product?.product_name || 'equipment'}:`
  }
  if (nodeKey.startsWith('SYMPTOM_')) {
    return 'During peak daylight hours (11:00 AM – 2:00 PM), observe the small charging indicator LED bead and verify whether the master push-button switch is toggled.'
  }
  if (nodeKey.includes('_PHYSICAL') || nodeKey.includes('_ELECTRICAL')) {
    return 'Examine the optical polycarbonate lens, tempered solar glass, and waterproof rotary cable collar for loose connections or seal compromises.'
  }
  if (nodeKey.includes('_ENV') || nodeKey.includes('_CONTROL')) {
    return 'Assess recent weather patterns, tree shading, or roof overhang obstructions affecting daily battery harvesting over the past 72 hours.'
  }
  if (typeof node?.message === 'function') {
    return cleanMarkdown(node.message(product))
  }
  return cleanMarkdown(node?.message)
}

function getDiagnosisSummary(node, product) {
  if (!node) return ''
  const raw = typeof node.message === 'function' ? node.message(product) : (node.message || '')
  const lines = raw.split('\n').filter((l) => !l.trim().startsWith('#'))
  const paragraphs = lines.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const narrative = paragraphs.filter(
    (p) => !p.startsWith('*') && !p.startsWith('1.') && !p.toLowerCase().includes('probable root') && !p.toLowerCase().includes('remedy')
  )
  return narrative.join(' ') || paragraphs[0] || ''
}

function getDiagnosisRootCauses(node, product) {
  if (!node) return []
  const raw = typeof node.message === 'function' ? node.message(product) : (node.message || '')
  const causes = []
  const lines = raw.split('\n')
  let inCausesSection = false

  for (const line of lines) {
    const trimmed = line.trim()
    const lower = trimmed.toLowerCase()

    if (
      lower.includes('probable root cause') ||
      lower.includes('why this criterion triggered') ||
      lower.includes('immediate safety protocol') ||
      lower.includes('why did this happen')
    ) {
      inCausesSection = true
      continue
    }

    if (inCausesSection && trimmed.startsWith('#')) {
      break
    }

    if (inCausesSection && (trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
      const cleanLine = trimmed.replace(/^[*0-9.]+\s*/, '').trim()
      if (cleanLine) causes.push(cleanLine)
    }
  }

  return causes
}

export default function FaultDiagnosticModal({
  isOpen,
  onClose,
  purchase,
  customerToken,
  onClaimSubmitted,
  initialMode = 'assistant', // 'assistant' | 'claim'
}) {
  const [activeTab, setActiveTab] = useState(initialMode === 'claim' ? 'claim' : 'wizard')

  // === WIZARD STATE (Simple question & multiple choices flow) ===
  const [history, setHistory] = useState(['ROOT'])
  const [criteriaState, setCriteriaState] = useState(DEFAULT_CRITERIA_STATE)
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null)

  // === CLAIM FORM STATE ===
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0].id)
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedClaimId, setSubmittedClaimId] = useState(null)

  if (!isOpen || !purchase) return null

  const productContext = analyzeProductContext(purchase)
  const currentNodeKey = history[history.length - 1]
  const isSolutionView = currentNodeKey === 'SOLUTION' && currentDiagnosis !== null
  const currentNode = DIAGNOSTIC_TREE[currentNodeKey] || DIAGNOSTIC_TREE.ROOT

  // Determine current step index (1 to 5)
  let currentStepNum = 1
  if (isSolutionView) {
    currentStepNum = 5
  } else if (currentNodeKey === 'ROOT') {
    currentStepNum = 1
  } else if (currentNodeKey.startsWith('SYMPTOM_')) {
    currentStepNum = 2
  } else if (currentNodeKey.includes('_PHYSICAL') || currentNodeKey.includes('_ELECTRICAL')) {
    currentStepNum = 3
  } else if (currentNodeKey.includes('_ENV') || currentNodeKey.includes('_CONTROL')) {
    currentStepNum = 4
  } else {
    currentStepNum = Math.min(5, Math.max(1, history.length))
  }

  // Handle selecting a multiple-choice option
  const handleSelectOption = (opt) => {
    if (opt.action === 'CLOSE') {
      handleClose()
      return
    }

    if (opt.next === 'TRANSFER_TO_CLAIM') {
      transferToClaim(opt.category)
      return
    }

    if (opt.next === 'ROOT') {
      handleReset()
      return
    }

    // Merge criteria patch if present
    const nextCriteria = opt.criteriaPatch ? { ...criteriaState, ...opt.criteriaPatch } : { ...criteriaState }
    if (opt.criteriaPatch) {
      setCriteriaState(nextCriteria)
    }

    // Trigger criteria rule evaluation
    if (opt.next === 'EVALUATE_CRITERIA') {
      const verdict = evaluateDiagnosticCriteria(nextCriteria, purchase)
      setCurrentDiagnosis(verdict)
      setHistory((prev) => [...prev, 'SOLUTION'])
      return
    }

    const nextNode = DIAGNOSTIC_TREE[opt.next]

    // If next node is a leaf verdict node (has fault code)
    if (nextNode && nextNode.faultCode) {
      const enriched = enrichDiagnosisNode(opt.next, nextNode, purchase, nextCriteria)
      setCurrentDiagnosis(enriched)
      setHistory((prev) => [...prev, 'SOLUTION'])
      return
    }

    // Advance to next question
    if (nextNode) {
      setHistory((prev) => [...prev, opt.next])
    }
  }

  // Step back to previous question
  const handleBack = () => {
    if (history.length <= 1) return
    if (isSolutionView) {
      setCurrentDiagnosis(null)
    }
    setHistory((prev) => prev.slice(0, -1))
  }

  // Reset wizard back to question 1
  const handleReset = () => {
    setHistory(['ROOT'])
    setCriteriaState(DEFAULT_CRITERIA_STATE)
    setCurrentDiagnosis(null)
  }

  // Transfer diagnostic summary into the warranty claim form
  const transferToClaim = (suggestedCategory) => {
    if (suggestedCategory) {
      setCategory(suggestedCategory)
    } else if (currentDiagnosis?.category) {
      setCategory(currentDiagnosis.category)
    }

    let prefill
    if (currentDiagnosis) {
      const scorecardLines = (currentDiagnosis.criteriaScorecard || [])
        .map((c) => `- ${cleanMarkdown(c.criterion)} (${c.weightLabel}): [${c.status}] ${cleanMarkdown(c.observation)}`)
        .join('\n')

      const compoundLines =
        currentDiagnosis.compoundFactors && currentDiagnosis.compoundFactors.length > 0
          ? `\nCompound / Contributing Factors:\n` +
            currentDiagnosis.compoundFactors.map((f) => `- ${f.code} (${f.title}): ${cleanMarkdown(f.detail)}`).join('\n') +
            '\n'
          : ''

      const warrantyLine = currentDiagnosis.warrantyEvaluation
        ? `${cleanMarkdown(currentDiagnosis.warrantyEvaluation.verdictLabel)} — ${cleanMarkdown(currentDiagnosis.warrantyEvaluation.policyReason)}`
        : 'Pending Technician Inspection'

      prefill = `[MULTI-CRITERIA DIAGNOSTIC TRIAGE REPORT]
Fault Code: ${currentDiagnosis.faultCode || 'N/A'} (${currentDiagnosis.ruleId || 'RULE-MATCH'})
Diagnosis: ${cleanMarkdown(currentDiagnosis.title) || 'Reported Hardware Fault'}
Severity: ${currentDiagnosis.severityLabel || 'Standard Inspection'}
Rule Confidence: ${currentDiagnosis.confidence || 'Multi-Criteria Verified'}
Equipment Form Factor: ${productContext.formFactorLabel}

Evaluated 4-Pillar Scorecard:
${scorecardLines || '- Standard physical triage completed'}
${compoundLines}
Telemetry State:
- PV Circuit: ${currentDiagnosis.telemetry?.pvEfficiency || 'Nominal'} (${currentDiagnosis.telemetry?.panelVoltage || 'Nominal'})
- Battery State: ${currentDiagnosis.telemetry?.batteryVoltage || 'Nominal'}
- Controller / BMS: ${currentDiagnosis.telemetry?.bmsState || 'Nominal'}
- Enclosure IP Seal: ${currentDiagnosis.telemetry?.ipIntegrity || 'Nominal'}

Warranty Criteria Assessment:
${warrantyLine}`
    } else {
      prefill = `[MULTI-CRITERIA CLAIM REPORT]
Product: ${purchase.product_name} (${productContext.formFactorLabel})
Serial #: ${purchase.serial_number || 'N/A'}
Customer requested technician bench evaluation.`
    }

    setDescription(prefill)
    setActiveTab('claim')
  }

  // File upload handlers for claim form
  const handleFileChange = (e) => {
    setUploadError('')
    const selected = Array.from(e.target.files || [])
    const oversized = selected.find((f) => f.size > 15 * 1024 * 1024)
    if (oversized) {
      setUploadError(`File "${oversized.name}" exceeds the 15MB limit.`)
      return
    }
    if (files.length + selected.length > 4) {
      setUploadError('Maximum 4 media files allowed.')
      return
    }
    setFiles((prev) => [...prev, ...selected])
  }

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmitClaim = async (e) => {
    e.preventDefault()
    setUploadError('')

    if (!description.trim()) {
      setUploadError('Please provide a brief description of the fault.')
      return
    }

    try {
      setIsUploading(true)
      const uploadedUrls = []
      for (const file of files) {
        const url = await uploadEvidenceFile(file)
        uploadedUrls.push(url)
      }

      const res = await submitWarrantyClaim({
        token: customerToken,
        purchaseId: purchase.id,
        issueCategory: category,
        description: sanitizeText(description, { maxLength: 2000, allowMultiline: true }),
        mediaUrls: uploadedUrls,
      })

      setIsSuccess(true)
      setSubmittedClaimId(res.claimId)
      if (onClaimSubmitted) onClaimSubmitted()
    } catch (err) {
      console.error('Submission failed:', err)
      setUploadError(err.message || 'Failed to submit warranty diagnostic claim.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setIsSuccess(false)
    setSubmittedClaimId(null)
    setDescription('')
    setFiles([])
    setUploadError('')
    handleReset()
    onClose()
  }

  // Filter out meta navigation options (like 'Back' or 'Restart' which we handle in the wizard bar)
  const currentOptions = (currentNode.options || []).filter(
    (opt) => opt.next !== 'ROOT' && opt.action !== 'CLOSE'
  )

  const rootCauses = isSolutionView ? getDiagnosisRootCauses(currentDiagnosis, purchase) : []

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-3 sm:my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-jds-outline-variant/30 flex items-center justify-between bg-jds-surface-container-low shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-jds-primary/10 flex items-center justify-center text-jds-primary shadow-sm shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-jds-on-surface truncate">
                  Solar Troubleshooting Guide
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-jds-primary/10 text-jds-primary border border-jds-primary/20">
                  Deterministic Rule-Based
                </span>
              </div>
              <p className="text-xs text-jds-on-surface-variant truncate">
                Unit: <strong className="text-jds-on-surface font-semibold">{purchase.product_name}</strong> • {productContext.formFactorLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {activeTab === 'wizard' && (
              <button
                type="button"
                onClick={handleReset}
                title="Restart Troubleshooter"
                className="p-2 text-jds-on-surface-variant hover:text-jds-primary rounded-xl hover:bg-jds-surface-container transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-jds-on-surface-variant hover:text-jds-on-surface rounded-xl hover:bg-jds-surface-container transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-jds-outline-variant/30 bg-jds-surface-container/30 px-4 py-2 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('wizard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'wizard'
                  ? 'bg-jds-primary text-jds-on-primary shadow-sm'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Troubleshooting Wizard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('claim')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'claim'
                  ? 'bg-jds-primary text-jds-on-primary shadow-sm'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>File Warranty Claim</span>
              {currentDiagnosis && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>

          <div className="text-[11px] text-jds-on-surface-variant hidden sm:block">
            {purchase.is_warranty_active ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Warranty Active</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Post-Warranty Servicing</span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PRODUCT MATCHER-STYLE MULTIPLE CHOICE WIZARD */}
        {/* ========================================================= */}
        {activeTab === 'wizard' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-jds-surface flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Stepper (Minimal Linear Progress Bar like Product Matcher) */}
              <div className="max-w-md mx-auto px-2 select-none" aria-label={`Step ${currentStepNum} of ${STEPS.length}`}>
                <div className="relative">
                  {/* Base Track Line */}
                  <div className="absolute top-2.5 left-[10%] right-[10%] h-[2px] -translate-y-1/2 bg-neutral-200 dark:bg-neutral-800 z-0">
                    <div
                      className="h-full bg-jds-primary transition-all duration-300 ease-out"
                      style={{
                        width: `${((currentStepNum - 1) / (STEPS.length - 1)) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Step Markers */}
                  <div className="grid grid-cols-5 relative z-10">
                    {STEPS.map((s) => {
                      const isCompleted = currentStepNum > s.num
                      const isCurrent = currentStepNum === s.num

                      return (
                        <div key={s.num} className="flex flex-col items-center">
                          <div className="h-5 flex items-center justify-center">
                            {isCurrent ? (
                              <div className="size-[18px] rounded-full border-2 border-jds-primary bg-jds-surface flex items-center justify-center shadow-xs">
                                <div className="size-2 rounded-full bg-jds-primary" />
                              </div>
                            ) : isCompleted ? (
                              <div className="size-2.5 rounded-full bg-jds-primary" />
                            ) : (
                              <div className="size-2.5 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                            )}
                          </div>
                          <span
                            className={`mt-1.5 text-[11px] text-center transition-colors truncate max-w-full px-0.5 ${
                              isCurrent
                                ? 'text-jds-on-surface font-semibold'
                                : 'text-jds-on-surface-variant/70'
                            }`}
                          >
                            <span className="hidden sm:inline">{s.label}</span>
                            <span className="sm:hidden">{s.short}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* FINAL SOLUTION VIEW */}
              {/* ========================================================= */}
              {isSolutionView ? (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Top Verdict Card */}
                  <div className="p-5 rounded-2xl bg-jds-surface-container-low border border-jds-outline-variant/40 space-y-3.5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-jds-primary/10 text-jds-primary border border-jds-primary/20">
                          {currentDiagnosis.faultCode || 'FAULT-RESOLVED'}
                        </span>
                        {currentDiagnosis.confidence && (
                          <span className="text-[11px] font-semibold text-jds-on-surface-variant">
                            {currentDiagnosis.confidence} Rule Confidence
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          currentDiagnosis.severity === 'critical'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            : currentDiagnosis.severity === 'moderate'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        }`}
                      >
                        {currentDiagnosis.severityLabel}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-jds-on-surface">
                        {renderFormattedText(currentDiagnosis.title)}
                      </h3>
                      <p className="text-xs sm:text-sm text-jds-on-surface-variant mt-1.5 leading-relaxed">
                        {renderFormattedText(getDiagnosisSummary(currentDiagnosis, purchase))}
                      </p>
                    </div>

                    {/* Probable Root Causes */}
                    {rootCauses.length > 0 && (
                      <div className="pt-3 border-t border-jds-outline-variant/25 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-jds-on-surface-variant">
                          Probable Contributing Factors
                        </div>
                        <ul className="space-y-1.5 text-xs text-jds-on-surface-variant">
                          {rootCauses.map((cause, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-jds-primary shrink-0 mt-1.5" />
                              <span className="leading-relaxed">{renderFormattedText(cause)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Step-by-Step DIY Remedy Card */}
                  {currentDiagnosis.remedySteps && currentDiagnosis.remedySteps.length > 0 && (
                    <div className="p-5 rounded-2xl bg-jds-surface border border-jds-outline-variant/40 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-jds-on-surface uppercase tracking-wider">
                        <Wrench className="w-4 h-4 text-jds-primary" />
                        <span>Recommended Solution & Action Steps</span>
                      </div>
                      <div className="space-y-2">
                        {currentDiagnosis.remedySteps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-jds-surface-container/40 border border-jds-outline-variant/30 flex items-start gap-3"
                          >
                            <span className="w-6 h-6 rounded-full bg-jds-primary/10 text-jds-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-xs sm:text-sm text-jds-on-surface leading-relaxed font-medium">
                              {renderFormattedText(step)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Telemetry Benchmarks */}
                  {currentDiagnosis.telemetry && (
                    <div className="p-4 rounded-xl bg-jds-surface-container-low/50 border border-jds-outline-variant/30 space-y-2">
                      <div className="text-[11px] font-bold text-jds-on-surface uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-jds-primary" />
                        <span>Inferred Hardware Telemetry Benchmarks</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-lg bg-jds-surface border border-jds-outline-variant/30">
                          <span className="text-jds-on-surface-variant block text-[10px]">PV Circuit:</span>
                          <strong className="text-jds-on-surface font-semibold truncate block">
                            {renderFormattedText(currentDiagnosis.telemetry.pvEfficiency)}
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-jds-surface border border-jds-outline-variant/30">
                          <span className="text-jds-on-surface-variant block text-[10px]">Battery Voltage:</span>
                          <strong className="text-jds-on-surface font-semibold truncate block">
                            {renderFormattedText(currentDiagnosis.telemetry.batteryVoltage)}
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-jds-surface border border-jds-outline-variant/30">
                          <span className="text-jds-on-surface-variant block text-[10px]">Controller / BMS:</span>
                          <strong className="text-jds-on-surface font-semibold truncate block">
                            {renderFormattedText(currentDiagnosis.telemetry.bmsState)}
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-lg bg-jds-surface border border-jds-outline-variant/30">
                          <span className="text-jds-on-surface-variant block text-[10px]">IP Weather Seal:</span>
                          <strong className="text-jds-on-surface font-semibold truncate block">
                            {renderFormattedText(currentDiagnosis.telemetry.ipIntegrity)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warranty Evaluation Banner */}
                  {currentDiagnosis.warrantyEvaluation && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                        currentDiagnosis.warrantyEvaluation.eligible
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-jds-on-surface'
                          : currentDiagnosis.warrantyEvaluation.status === 'DISQUALIFIED_IMPACT'
                          ? 'bg-rose-500/10 border-rose-500/25 text-jds-on-surface'
                          : 'bg-jds-surface-container/60 border-jds-outline-variant/30 text-jds-on-surface'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-jds-primary shrink-0" />
                        <span>Warranty Evaluation: {renderFormattedText(currentDiagnosis.warrantyEvaluation.verdictLabel)}</span>
                      </div>
                      <p className="text-xs text-jds-on-surface-variant leading-relaxed pl-5">
                        {renderFormattedText(currentDiagnosis.warrantyEvaluation.policyReason)}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-jds-outline-variant/60 hover:bg-jds-surface-container text-xs font-semibold text-jds-on-surface flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Troubleshoot Another Issue</span>
                    </button>

                    <div className="w-full sm:w-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => transferToClaim()}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-semibold hover:bg-jds-primary/90 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>File Warranty Claim</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2.5 rounded-xl bg-jds-surface-container hover:bg-jds-surface-container-high text-xs font-semibold text-jds-on-surface transition-all cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ========================================================= */
                /* QUESTION & MULTIPLE CHOICES VIEW */
                /* ========================================================= */
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Question Header */}
                  <div className="text-center max-w-xl mx-auto space-y-2">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-jds-primary/10 text-jds-primary text-[11px] font-semibold tracking-wide uppercase">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Diagnostic Stage {currentStepNum} of 4</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-jds-on-surface">
                      {renderFormattedText(getQuestionTitle(currentNodeKey, currentNode))}
                    </h3>
                    <p className="text-xs sm:text-sm text-jds-on-surface-variant leading-relaxed">
                      {renderFormattedText(getQuestionPrompt(currentNodeKey, currentNode, purchase))}
                    </p>
                  </div>

                  {/* Multiple Choices */}
                  {currentNodeKey === 'ROOT' ? (
                    /* Step 1: 6 Primary Symptom Cards with Rich Icons */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentOptions.map((opt) => {
                        const meta = SYMPTOM_META[opt.next] || {
                          icon: AlertTriangle,
                          label: opt.label,
                          desc: 'Reported hardware symptom',
                        }
                        const Icon = meta.icon

                        return (
                          <button
                            key={opt.next}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className="p-4 rounded-2xl border border-jds-outline-variant/50 bg-jds-surface hover:border-jds-primary hover:bg-jds-primary/5 transition-all text-left group flex items-start gap-3.5 shadow-2xs hover:shadow-sm active:scale-[0.99] cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-xl bg-jds-surface-container group-hover:bg-jds-primary/10 group-hover:text-jds-primary text-jds-on-surface-variant flex items-center justify-center shrink-0 transition-colors">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-bold text-jds-on-surface group-hover:text-jds-primary transition-colors leading-snug">
                                {renderFormattedText(meta.label)}
                              </div>
                              <p className="text-[11px] text-jds-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                                {renderFormattedText(meta.desc)}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-jds-on-surface-variant group-hover:text-jds-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    /* Subsequent Steps: Clean Multiple Choice Tiles */
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className="w-full p-4 rounded-xl border border-jds-outline-variant/40 bg-jds-surface hover:border-jds-primary hover:bg-jds-primary/5 transition-all text-left group flex items-center justify-between gap-3.5 shadow-2xs hover:shadow-xs active:scale-[0.99] cursor-pointer"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-jds-surface-container group-hover:bg-jds-primary/10 group-hover:text-jds-primary text-jds-on-surface-variant font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-semibold text-jds-on-surface group-hover:text-jds-primary transition-colors leading-relaxed">
                                {renderFormattedText(opt.label)}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-jds-on-surface-variant group-hover:text-jds-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Wizard Bottom Controls */}
                  <div className="pt-4 border-t border-jds-outline-variant/30 flex items-center justify-between">
                    {history.length > 1 ? (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-jds-on-surface hover:bg-jds-surface-container transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous Question</span>
                      </button>
                    ) : (
                      <div className="text-[11px] text-jds-on-surface-variant">
                        Select a symptom to begin hardware triage
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1 text-xs text-jds-on-surface-variant hover:text-jds-on-surface transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Start Over</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: OFFICIAL WARRANTY CLAIM SUBMISSION */}
        {/* ========================================================= */}
        {activeTab === 'claim' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-jds-surface">
            
            {/* Success State */}
            {isSuccess ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-jds-on-surface">
                  Warranty Claim Submitted Successfully
                </h3>
                <p className="text-xs text-jds-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  Your diagnostic report has been filed with our service center. Our technicians at Quiapo and Cavite will evaluate your unit under our 24-month warranty guidelines.
                </p>
                {submittedClaimId && (
                  <div className="p-3 rounded-xl bg-jds-surface-container/60 border border-jds-outline-variant/30 font-mono text-xs text-jds-primary font-bold">
                    TICKET #CLAIM-{submittedClaimId.slice(0, 8).toUpperCase()}
                  </div>
                )}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-2.5 rounded-xl bg-jds-primary text-jds-on-primary font-semibold text-xs hover:bg-jds-primary/90 transition-all shadow-sm cursor-pointer"
                  >
                    Return to Customer Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="space-y-4">
                
                {/* Handoff Banner from Diagnostic Wizard */}
                {currentDiagnosis && (
                  <div className="p-3.5 rounded-xl bg-jds-primary/10 border border-jds-primary/30 text-xs flex items-start gap-2.5">
                    <Wrench className="w-4 h-4 text-jds-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="text-jds-on-surface block font-semibold">
                        Diagnostic Wizard Report Pre-Populated ({currentDiagnosis.faultCode})
                      </strong>
                      <span className="text-[11px] text-jds-on-surface-variant block">
                        Diagnosed as: <strong>{renderFormattedText(currentDiagnosis.title)}</strong>. Your evaluated criteria and telemetry benchmarks have been attached below.
                      </span>
                    </div>
                  </div>
                )}

                {/* Target Product Summary Banner */}
                <div className="p-3.5 rounded-xl bg-jds-surface-container/30 border border-jds-outline-variant/30 text-xs space-y-1">
                  <div className="text-[11px] font-semibold text-jds-on-surface-variant uppercase tracking-wider">
                    Filing Claim For:
                  </div>
                  <div className="font-bold text-sm text-jds-on-surface">
                    {purchase.product_name}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-jds-on-surface-variant">
                    {purchase.serial_number && (
                      <span>
                        S/N: <strong className="font-mono">{purchase.serial_number}</strong>
                      </span>
                    )}
                    <span
                      className={
                        purchase.is_warranty_active
                          ? 'text-emerald-500 font-semibold'
                          : 'text-amber-500 font-semibold'
                      }
                    >
                      {purchase.is_warranty_active
                        ? `Active Warranty (${purchase.days_remaining} days left)`
                        : 'Expired Warranty (Inspection Request)'}
                    </span>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Case Evaluation & 1-Time Replacement Notice */}
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 text-[11px] text-jds-on-surface-variant space-y-1">
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Warranty Case Evaluation Policy</span>
                  </div>
                  <p className="leading-relaxed">
                    JD Solar evaluates claims case-by-case upon bench intake at Quiapo or Cavite. Internal hardware defects are eligible for our <strong>1-time unit replacement entitlement</strong>. Physical drops, shattered glass, or unsealed ports disqualify units from free replacement.
                  </p>
                </div>

                {/* Step 1: Issue Category */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-jds-on-surface">
                    1. Primary Hardware Category *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ISSUE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon
                      const isSelected = category === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-jds-primary/10 border-jds-primary text-jds-primary shadow-sm'
                              : 'bg-jds-surface border-jds-outline-variant/40 text-jds-on-surface-variant hover:border-jds-outline-variant hover:text-jds-on-surface'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-jds-primary' : 'text-jds-on-surface-variant'
                            }`}
                          />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Step 2: Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-jds-on-surface">
                      2. Diagnostic Report & Fault Description *
                    </label>
                    <span className="text-[10px] text-jds-on-surface-variant">Editable</span>
                  </div>
                  <textarea
                    required
                    rows={5}
                    placeholder="Describe the observed hardware failure symptoms..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-jds-surface-container/30 border border-jds-outline-variant/50 rounded-xl p-3 text-xs text-jds-on-surface placeholder:text-jds-on-surface-variant/40 focus:outline-none focus:border-jds-primary transition-colors resize-none font-sans"
                  />
                </div>

                {/* Step 3: Photos / Video Proof */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-jds-on-surface flex items-center justify-between">
                    <span>3. Attach Photos / Video Evidence (Optional)</span>
                    <span className="text-[10px] text-jds-on-surface-variant">
                      Max 4 files, 15MB each
                    </span>
                  </label>

                  <div className="border border-dashed border-jds-outline-variant/60 rounded-xl p-4 text-center hover:bg-jds-surface-container/20 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/mp4,video/quicktime"
                      onChange={handleFileChange}
                      disabled={files.length >= 4}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <UploadCloud className="w-6 h-6 text-jds-primary mx-auto mb-1" />
                    <div className="text-xs font-medium text-jds-on-surface">
                      Click to upload photos of indicator LED, panel surface, or lens
                    </div>
                    <div className="text-[10px] text-jds-on-surface-variant mt-0.5">
                      Visual evidence accelerates bench inspection at Quiapo & Cavite.
                    </div>
                  </div>

                  {files.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {files.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-jds-surface-container/40 border border-jds-outline-variant/30 text-xs"
                        >
                          <span className="truncate max-w-[280px] text-jds-on-surface font-mono">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Actions */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-jds-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setActiveTab('wizard')}
                    className="px-4 py-2 text-xs font-medium text-jds-on-surface-variant hover:text-jds-on-surface rounded-xl transition-colors cursor-pointer"
                  >
                    Back to Troubleshooter
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting Claim Ticket...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Submit Warranty Claim Ticket
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
