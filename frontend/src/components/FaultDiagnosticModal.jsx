import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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
  RefreshCw,
  Send,
  Sparkles,
  Wrench,
  Check,
  ChevronRight,
  SlidersHorizontal,
  MessageSquare,
  ClipboardCheck,
  Layers,
  Activity,
} from 'lucide-react'
import { uploadEvidenceFile, submitWarrantyClaim } from '../lib/customerService'
import {
  DIAGNOSTIC_TREE,
  CRITERIA_PILLAR_META,
  DIAGNOSTIC_CRITERIA_OPTIONS,
  DEFAULT_CRITERIA_STATE,
  analyzeProductContext,
  evaluateDiagnosticCriteria,
  enrichDiagnosisNode,
  matchDiagnosticFreeText,
} from '../lib/solarDiagnosticEngine'
import { stripEmojis, splitIntoSentenceSegments } from '../lib/solarBotEngine'

const ISSUE_CATEGORIES = [
  { id: 'No Power / Won\'t Turn On', label: 'No Power / Won\'t Turn On', icon: Zap },
  { id: 'Battery / Rapid Discharge', label: 'Battery / Rapid Discharge', icon: Battery },
  { id: 'Dim Lighting / Low Lux', label: 'Dim Lighting / Low Output', icon: Sun },
  { id: 'Remote Control Failure', label: 'Remote Control Issue', icon: Radio },
  { id: 'Sensor / Dusk-Dawn Failure', label: 'Sensor Not Detecting', icon: Eye },
  { id: 'Physical / Water Ingress', label: 'Physical / Water Damage', icon: AlertTriangle },
]

let nextDiagnosticMsgSeq = 1
function createMsgId(prefix = 'msg') {
  nextDiagnosticMsgSeq += 1
  return `${prefix}-${nextDiagnosticMsgSeq}`
}

function buildInitialRootMessage(purchase) {
  const startNode = DIAGNOSTIC_TREE.ROOT
  return {
    id: 'msg-init',
    role: 'bot',
    nodeKey: 'ROOT',
    content: stripEmojis(
      typeof startNode.message === 'function' ? startNode.message(purchase) : startNode.message
    ),
    options: (startNode.options || []).map((o) => ({ ...o, label: stripEmojis(o.label) })),
    diagnosis: null,
    isStreaming: false,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function FaultDiagnosticModal({
  isOpen,
  onClose,
  purchase,
  customerToken,
  onClaimSubmitted,
  initialMode = 'assistant', // 'assistant' | 'claim'
}) {
  const [activeTab, setActiveTab] = useState(initialMode === 'claim' ? 'claim' : 'assistant')
  const [diagSubMode, setDiagSubMode] = useState('guided') // 'guided' | 'matrix'

  // === MULTI-CRITERIA STATE ===
  const [criteriaState, setCriteriaState] = useState(DEFAULT_CRITERIA_STATE)
  const [evaluatedPillarKeys, setEvaluatedPillarKeys] = useState([])
  const [stepStage, setStepStage] = useState(0) // 0=root, 1=crit1, 2=crit2, 3=crit3, 4=verdict

  // === DIAGNOSTIC ASSISTANT CHAT STATE ===
  const [messages, setMessages] = useState(() =>
    purchase ? [buildInitialRootMessage(purchase)] : []
  )
  const [userInput, setUserInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null)
  const chatScrollRef = useRef(null)
  const streamTimersRef = useRef([])

  // === CLAIM FORM STATE ===
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0].id)
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedClaimId, setSubmittedClaimId] = useState(null)

  const clearStreamTimers = () => {
    streamTimersRef.current.forEach((t) => clearTimeout(t))
    streamTimersRef.current = []
  }

  useEffect(() => {
    return () => clearStreamTimers()
  }, [])

  // Stream a bot response sentence-by-sentence per AGENTS.md rule
  const appendStreamingBotMessage = ({
    nodeKey,
    rawContent,
    options = [],
    diagnosis = null,
    thinkingDelay = 280,
  }) => {
    clearStreamTimers()
    const cleanContent = stripEmojis(rawContent)
    const cleanOptions = (options || []).map((o) => ({
      ...o,
      label: stripEmojis(o.label),
    }))
    const segments = splitIntoSentenceSegments(cleanContent)
    const botId = createMsgId('bot')
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setIsStreaming(true)

    const startTimer = setTimeout(() => {
      if (!segments || segments.length <= 1) {
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'bot',
            nodeKey,
            content: cleanContent,
            options: cleanOptions,
            diagnosis,
            isStreaming: false,
            timestamp,
          },
        ])
        setIsStreaming(false)
        return
      }

      let currentContent = segments[0]
      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          role: 'bot',
          nodeKey,
          content: currentContent,
          options: [],
          diagnosis: null,
          isStreaming: true,
          timestamp,
        },
      ])

      segments.slice(1).forEach((seg, idx) => {
        const isLast = idx === segments.length - 2
        const segTimer = setTimeout(() => {
          currentContent += seg
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId
                ? {
                    ...m,
                    content: isLast ? cleanContent : currentContent,
                    options: isLast ? cleanOptions : [],
                    diagnosis: isLast ? diagnosis : null,
                    isStreaming: !isLast,
                  }
                : m
            )
          )
          if (isLast) {
            setIsStreaming(false)
          }
        }, (idx + 1) * 75)
        streamTimersRef.current.push(segTimer)
      })
    }, thinkingDelay)

    streamTimersRef.current.push(startTimer)
  }

  // Initialize or reset assistant when modal opens or purchase changes
  useEffect(() => {
    if (!isOpen || !purchase) return

    clearStreamTimers()
    const initTimer = setTimeout(() => {
      setActiveTab(initialMode === 'claim' ? 'claim' : 'assistant')
      setDiagSubMode('guided')
      setCriteriaState(DEFAULT_CRITERIA_STATE)
      setEvaluatedPillarKeys([])
      setStepStage(0)
      setCurrentDiagnosis(null)
      setIsStreaming(false)
      setMessages([buildInitialRootMessage(purchase)])
    }, 0)

    return () => clearTimeout(initTimer)
  }, [isOpen, purchase, initialMode])

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'assistant' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, activeTab, diagSubMode, isStreaming])

  if (!isOpen || !purchase) return null

  const productContext = analyzeProductContext(purchase)

  // Handle selecting an option button in Guided Multi-Criteria Audit
  const handleSelectOption = (opt) => {
    if (isStreaming) return

    if (opt.action === 'CLOSE') {
      handleClose()
      return
    }

    if (opt.next === 'TRANSFER_TO_CLAIM') {
      transferToClaim(opt.category)
      return
    }

    // Add user selection bubble
    const userMsg = {
      id: createMsgId('usr'),
      role: 'user',
      content: stripEmojis(opt.label),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userMsg])

    // If resetting to ROOT
    if (opt.next === 'ROOT') {
      const rootNode = DIAGNOSTIC_TREE.ROOT
      setCriteriaState(DEFAULT_CRITERIA_STATE)
      setEvaluatedPillarKeys([])
      setStepStage(0)
      setCurrentDiagnosis(null)
      appendStreamingBotMessage({
        nodeKey: 'ROOT',
        rawContent:
          typeof rootNode.message === 'function' ? rootNode.message(purchase) : rootNode.message,
        options: rootNode.options,
        diagnosis: null,
        thinkingDelay: 200,
      })
      return
    }

    // Merge criteriaPatch if present
    let nextCriteria = { ...criteriaState }
    let nextEvaluatedKeys = [...evaluatedPillarKeys]
    if (opt.criteriaPatch) {
      nextCriteria = { ...nextCriteria, ...opt.criteriaPatch }
      setCriteriaState(nextCriteria)
      Object.keys(opt.criteriaPatch).forEach((k) => {
        if (k !== 'symptom' && !nextEvaluatedKeys.includes(k)) {
          nextEvaluatedKeys.push(k)
        }
      })
      setEvaluatedPillarKeys(nextEvaluatedKeys)
    }

    // If multi-criteria evaluation trigger reached
    if (opt.next === 'EVALUATE_CRITERIA') {
      setEvaluatedPillarKeys(['electrical', 'physical', 'environmental', 'control'])
      setStepStage(4)
      const evaluatedVerdict = evaluateDiagnosticCriteria(nextCriteria, purchase)
      setCurrentDiagnosis(evaluatedVerdict)

      const rawText =
        typeof evaluatedVerdict.message === 'function'
          ? evaluatedVerdict.message(purchase)
          : evaluatedVerdict.message

      appendStreamingBotMessage({
        nodeKey: evaluatedVerdict.nodeKey,
        rawContent: rawText,
        options: evaluatedVerdict.options || [],
        diagnosis: evaluatedVerdict,
        thinkingDelay: 340,
      })
      return
    }

    const nextNode = DIAGNOSTIC_TREE[opt.next] || DIAGNOSTIC_TREE.ROOT
    if (typeof nextNode.stepStage === 'number') {
      setStepStage(nextNode.stepStage)
    }

    let enrichedDiag = null
    if (nextNode.faultCode) {
      enrichedDiag = enrichDiagnosisNode(opt.next, nextNode, purchase, nextCriteria)
      setCurrentDiagnosis(enrichedDiag)
      setEvaluatedPillarKeys(['electrical', 'physical', 'environmental', 'control'])
      setStepStage(4)
    }

    const rawText =
      typeof nextNode.message === 'function' ? nextNode.message(purchase) : nextNode.message

    appendStreamingBotMessage({
      nodeKey: opt.next,
      rawContent: rawText,
      options: nextNode.options || [],
      diagnosis: enrichedDiag,
      thinkingDelay: 260,
    })
  }

  // Handle evaluating directly from the Interactive Criteria Matrix
  const handleRunMatrixEvaluation = () => {
    setEvaluatedPillarKeys(['electrical', 'physical', 'environmental', 'control'])
    setStepStage(4)
    const evaluatedVerdict = evaluateDiagnosticCriteria(criteriaState, purchase)
    setCurrentDiagnosis(evaluatedVerdict)
    setDiagSubMode('guided')

    const symptomObj = DIAGNOSTIC_CRITERIA_OPTIONS.symptom.find(
      (s) => s.value === criteriaState.symptom
    )
    const userSummaryMsg = {
      id: createMsgId('usr'),
      role: 'user',
      content: `Multi-Criteria Matrix Audit: ${symptomObj?.label || criteriaState.symptom}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages((prev) => [...prev, userSummaryMsg])

    const rawText =
      typeof evaluatedVerdict.message === 'function'
        ? evaluatedVerdict.message(purchase)
        : evaluatedVerdict.message

    appendStreamingBotMessage({
      nodeKey: evaluatedVerdict.nodeKey,
      rawContent: rawText,
      options: evaluatedVerdict.options || [],
      diagnosis: evaluatedVerdict,
      thinkingDelay: 300,
    })
  }

  // Handle free-text submit in assistant
  const handleSendMessage = (e) => {
    e.preventDefault()
    if (isStreaming) return
    const text = stripEmojis(userInput.trim())
    if (!text) return

    const userMsg = {
      id: createMsgId('usr'),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setUserInput('')
    setMessages((prev) => [...prev, userMsg])

    const matchedNode = matchDiagnosticFreeText(text, purchase)

    if (matchedNode.criteriaPatch) {
      setCriteriaState((prev) => ({ ...prev, ...matchedNode.criteriaPatch }))
    }
    if (matchedNode.evaluatedCriteria) {
      setCriteriaState(matchedNode.evaluatedCriteria)
      setEvaluatedPillarKeys(['electrical', 'physical', 'environmental', 'control'])
      setStepStage(4)
    } else if (typeof matchedNode.stepStage === 'number') {
      setStepStage(matchedNode.stepStage)
    }

    let diagObj = null
    if (matchedNode.faultCode) {
      diagObj = matchedNode.criteriaScorecard
        ? matchedNode
        : enrichDiagnosisNode(matchedNode.nodeKey || 'CUSTOM', matchedNode, purchase, criteriaState)
      setCurrentDiagnosis(diagObj)
    }

    const rawText =
      typeof matchedNode.message === 'function'
        ? matchedNode.message(purchase)
        : matchedNode.message

    appendStreamingBotMessage({
      nodeKey: matchedNode.nodeKey || 'MATCHED',
      rawContent: rawText,
      options: matchedNode.options || [],
      diagnosis: diagObj,
      thinkingDelay: 320,
    })
  }

  // Transfer multi-criteria diagnostic summary into the warranty claim form
  const transferToClaim = (suggestedCategory) => {
    if (suggestedCategory) {
      setCategory(suggestedCategory)
    } else if (currentDiagnosis?.category) {
      setCategory(currentDiagnosis.category)
    }

    let prefill
    if (currentDiagnosis) {
      const scorecardLines = (currentDiagnosis.criteriaScorecard || [])
        .map(
          (c) =>
            `- ${c.criterion} (${c.weightLabel}): [${c.status}] ${c.observation}`
        )
        .join('\n')

      const compoundLines =
        currentDiagnosis.compoundFactors && currentDiagnosis.compoundFactors.length > 0
          ? `\nCompound / Secondary Factors Detected:\n` +
            currentDiagnosis.compoundFactors
              .map((f) => `- ${f.code} (${f.title}): ${f.detail}`)
              .join('\n') +
            '\n'
          : ''

      const warrantyLine = currentDiagnosis.warrantyEvaluation
        ? `${currentDiagnosis.warrantyEvaluation.verdictLabel} — ${currentDiagnosis.warrantyEvaluation.policyReason}`
        : 'Pending Bench Verification'

      prefill = `[MULTI-CRITERIA DIAGNOSTIC TRIAGE REPORT]
Fault Code: ${currentDiagnosis.faultCode || 'N/A'} (${currentDiagnosis.ruleId || 'RULE-MATCH'})
Diagnosis: ${currentDiagnosis.title || 'Reported Hardware Fault'}
Severity: ${currentDiagnosis.severityLabel || 'Standard Inspection'}
Rule Match Confidence: ${currentDiagnosis.confidence || 'Multi-Criteria Verified'}
Equipment Form Factor: ${productContext.formFactorLabel}

Evaluated 4-Pillar Diagnostic Criteria Scorecard:
${scorecardLines || '- Standard symptom triage completed'}
${compoundLines}
Estimated Telemetry State:
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

  // Reset chat and criteria back to initial state
  const handleResetChat = () => {
    clearStreamTimers()
    setCriteriaState(DEFAULT_CRITERIA_STATE)
    setEvaluatedPillarKeys([])
    setStepStage(0)
    setCurrentDiagnosis(null)
    setIsStreaming(false)
    setDiagSubMode('guided')
    setMessages([
      {
        ...buildInitialRootMessage(purchase),
        id: createMsgId('msg'),
      },
    ])
  }

  // === CLAIM SUBMISSION HANDLERS ===
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
        description,
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
    clearStreamTimers()
    setIsSuccess(false)
    setSubmittedClaimId(null)
    setDescription('')
    setFiles([])
    setUploadError('')
    onClose()
  }

  // Compute live preview evaluation for the Criteria Matrix mode
  const matrixPreviewVerdict = evaluateDiagnosticCriteria(criteriaState, purchase)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-2 sm:my-6 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-3.5 md:p-4 border-b border-jds-outline-variant/30 flex items-center justify-between bg-jds-surface-container-low shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-jds-primary/10 flex items-center justify-center text-jds-primary shadow-sm shrink-0">
              <Wrench className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-jds-on-surface truncate">
                  Multi-Criteria Hardware Diagnostic
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-jds-primary/10 text-jds-primary border border-jds-primary/20">
                  Rule-Based Engine
                </span>
              </div>
              <p className="text-[11px] text-jds-on-surface-variant truncate">
                Unit: <strong className="text-jds-on-surface font-semibold">{purchase.product_name}</strong> • {productContext.formFactorLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {activeTab === 'assistant' && (
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Multi-Criteria Audit"
                className="p-1.5 text-jds-on-surface-variant hover:text-jds-primary rounded-lg hover:bg-jds-surface-container transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-jds-on-surface-variant hover:text-jds-on-surface rounded-lg hover:bg-jds-surface-container transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex flex-wrap items-center justify-between border-b border-jds-outline-variant/30 bg-jds-surface-container/30 px-3.5 py-2 shrink-0 gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'assistant'
                  ? 'bg-jds-primary text-jds-on-primary shadow-sm'
                  : 'text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Diagnostic Engine</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('claim')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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

          {/* Sub-mode switch between Guided Audit and Direct Criteria Matrix */}
          {activeTab === 'assistant' && (
            <div className="inline-flex items-center rounded-xl bg-jds-surface-container p-0.5 border border-jds-outline-variant/40 text-[11px]">
              <button
                type="button"
                onClick={() => setDiagSubMode('guided')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  diagSubMode === 'guided'
                    ? 'bg-jds-surface text-jds-primary shadow-2xs'
                    : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Guided Audit</span>
              </button>
              <button
                type="button"
                onClick={() => setDiagSubMode('matrix')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  diagSubMode === 'matrix'
                    ? 'bg-jds-surface text-jds-primary shadow-2xs'
                    : 'text-jds-on-surface-variant hover:text-jds-on-surface'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Criteria Matrix</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: MULTI-CRITERIA DIAGNOSTIC ENGINE */}
        {/* ========================================================= */}
        {activeTab === 'assistant' && (
          <div className="flex flex-col flex-1 min-h-0 bg-jds-surface">
            
            {/* Live 4-Pillar Criteria Status Bar */}
            <div className="px-3.5 py-2.5 bg-jds-surface-container-low/70 border-b border-jds-outline-variant/30 shrink-0 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-jds-on-surface">
                  <Layers className="w-3.5 h-3.5 text-jds-primary" />
                  <span>4-Pillar Hardware Evaluation Criteria</span>
                </div>
                <span className="text-[10px] font-medium text-jds-on-surface-variant">
                  {stepStage === 4
                    ? '4/4 Criteria Evaluated • Verdict Ready'
                    : stepStage > 0
                    ? `Audit Stage ${stepStage} of 3`
                    : 'Select symptom or open Criteria Matrix'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {CRITERIA_PILLAR_META.map((pillar) => {
                  const isEvaluated = evaluatedPillarKeys.includes(pillar.key) || stepStage === 4
                  const selectedOpt = (DIAGNOSTIC_CRITERIA_OPTIONS[pillar.key] || []).find(
                    (o) => o.value === criteriaState[pillar.key]
                  )
                  const status = selectedOpt?.status || 'PASS'

                  return (
                    <button
                      key={pillar.key}
                      type="button"
                      onClick={() => setDiagSubMode(diagSubMode === 'matrix' ? 'guided' : 'matrix')}
                      title={`${pillar.label}: ${selectedOpt?.label || ''}`}
                      className={`p-1.5 rounded-lg border text-left transition-all ${
                        isEvaluated
                          ? status === 'FAIL'
                            ? 'bg-rose-500/10 border-rose-500/30 text-jds-on-surface'
                            : status === 'WARNING'
                            ? 'bg-amber-500/10 border-amber-500/30 text-jds-on-surface'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-jds-on-surface'
                          : 'bg-jds-surface/80 border-jds-outline-variant/30 text-jds-on-surface-variant hover:border-jds-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                        <span className="truncate">{pillar.label}</span>
                        <span className="text-[9px] font-mono opacity-75 shrink-0">{pillar.weightLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="text-[9px] truncate opacity-85">
                          {isEvaluated ? selectedOpt?.label : 'Pending check'}
                        </span>
                        {isEvaluated && (
                          <span
                            className={`text-[8px] font-bold px-1 rounded uppercase shrink-0 ${
                              status === 'FAIL'
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                : status === 'WARNING'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {status}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SUB-MODE A: INTERACTIVE MULTI-CRITERIA MATRIX EVALUATOR */}
            {diagSubMode === 'matrix' ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-jds-primary/10 border border-jds-primary/25 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-bold text-jds-on-surface flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-jds-primary" />
                      <span>Direct Multi-Criteria Rule Matrix</span>
                    </div>
                    <p className="text-[11px] text-jds-on-surface-variant leading-relaxed">
                      Configure the observed symptom and all four weighted physical/electrical criteria below. The inference engine evaluates compound rules and elimination criteria in real time.
                    </p>
                  </div>
                </div>

                {/* 0. Primary Symptom Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-jds-on-surface uppercase tracking-wider flex items-center justify-between">
                    <span>Primary Observed Symptom</span>
                    <span className="text-[10px] font-mono text-jds-primary">Prerequisite Vector</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {DIAGNOSTIC_CRITERIA_OPTIONS.symptom.map((opt) => {
                      const active = criteriaState.symptom === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setCriteriaState((prev) => ({ ...prev, symptom: opt.value }))
                          }
                          className={`p-2 rounded-xl border text-left text-[11px] font-medium transition-all flex items-center justify-between gap-2 ${
                            active
                              ? 'bg-jds-primary text-jds-on-primary border-jds-primary shadow-xs font-semibold'
                              : 'bg-jds-surface-container-low border-jds-outline-variant/40 text-jds-on-surface hover:border-jds-primary/50'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 1 to 4: Weighted Criteria Pillars */}
                {CRITERIA_PILLAR_META.map((pillar) => {
                  const options = DIAGNOSTIC_CRITERIA_OPTIONS[pillar.key] || []
                  return (
                    <div
                      key={pillar.key}
                      className="p-3 rounded-xl bg-jds-surface-container-low border border-jds-outline-variant/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-jds-on-surface">
                            {pillar.shortLabel} — {pillar.label}
                          </div>
                          <div className="text-[10px] text-jds-on-surface-variant">
                            {pillar.description}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-jds-surface border border-jds-outline-variant/40 text-jds-primary">
                          Weight: {pillar.weightLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 pt-1">
                        {options.map((opt) => {
                          const isSelected = criteriaState[pillar.key] === opt.value
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                setCriteriaState((prev) => ({
                                  ...prev,
                                  [pillar.key]: opt.value,
                                }))
                              }
                              className={`px-3 py-2 rounded-lg border text-left text-[11px] transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-jds-primary/12 border-jds-primary text-jds-on-surface font-semibold shadow-2xs'
                                  : 'bg-jds-surface border-jds-outline-variant/30 text-jds-on-surface-variant hover:text-jds-on-surface hover:border-jds-outline-variant'
                              }`}
                            >
                              <span>{opt.label}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                                  opt.status === 'FAIL'
                                    ? 'bg-rose-500/15 text-rose-500'
                                    : opt.status === 'WARNING'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {opt.status}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Live Rule Inference Preview Bar */}
                <div className="p-3.5 rounded-xl bg-jds-surface-container border border-jds-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-mono uppercase text-jds-primary font-bold">
                      Live Rule Inference Match: {matrixPreviewVerdict.faultCode} ({matrixPreviewVerdict.confidence})
                    </div>
                    <div className="text-xs font-bold text-jds-on-surface">
                      {matrixPreviewVerdict.title}
                    </div>
                    <div className="text-[11px] text-jds-on-surface-variant">
                      {matrixPreviewVerdict.warrantyEvaluation?.verdictLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunMatrixEvaluation}
                    className="px-4 py-2.5 rounded-xl bg-jds-primary text-jds-on-primary text-xs font-bold hover:bg-jds-primary/90 transition-all shadow-sm shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Generate Full Diagnostic Verdict</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SUB-MODE B: GUIDED CONVERSATIONAL MULTI-CRITERIA AUDIT */
              <>
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4 text-xs"
                >
                  {/* Product Context Banner */}
                  <div className="p-3 rounded-xl bg-jds-surface-container/40 border border-jds-outline-variant/30 flex flex-wrap items-center justify-between gap-2 text-[11px] text-jds-on-surface-variant">
                    <div className="space-y-0.5">
                      <div className="font-bold text-jds-on-surface">{purchase.product_name}</div>
                      <div className="flex flex-wrap items-center gap-3">
                        {purchase.serial_number && (
                          <span>
                            S/N: <strong className="font-mono text-jds-on-surface">{purchase.serial_number}</strong>
                          </span>
                        )}
                        <span>
                          Branch: <strong className="text-jds-on-surface">{purchase.branch_location || 'Cavite'}</strong>
                        </span>
                      </div>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-full font-semibold border text-[10px] ${
                        purchase.is_warranty_active
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}
                    >
                      {purchase.is_warranty_active
                        ? `${purchase.warranty_months || 24}-Month Warranty Active`
                        : 'Warranty Expired'}
                    </div>
                  </div>

                  {messages.map((msg, idx) => {
                    const isBot = msg.role === 'bot'
                    const isLatestBot = isBot && idx === messages.length - 1

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} space-y-1`}
                      >
                        <div
                          className={`max-w-[95%] sm:max-w-[88%] rounded-2xl p-3.5 sm:p-4 text-xs ${
                            isBot
                              ? 'bg-jds-surface-container-low text-jds-on-surface border border-jds-outline-variant/40 rounded-tl-sm shadow-sm'
                              : 'bg-jds-primary text-jds-on-primary rounded-tr-sm shadow-sm'
                          }`}
                        >
                          {/* Markdown Text */}
                          <div className="prose prose-sm max-w-none text-xs leading-relaxed prose-headings:font-bold prose-headings:text-jds-on-surface prose-headings:text-xs prose-headings:my-1.5 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>

                          {/* Multi-Criteria Diagnostic Scorecard & Verdict Box */}
                          {isBot && msg.diagnosis && msg.diagnosis.telemetry && (
                            <div className="mt-3.5 p-3.5 rounded-xl bg-jds-surface border border-jds-outline-variant/40 space-y-3.5">
                              {/* Verdict Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-jds-outline-variant/25">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-jds-primary text-[11px]">
                                    CODE: {msg.diagnosis.faultCode}
                                  </span>
                                  {msg.diagnosis.confidence && (
                                    <span className="px-2 py-0.5 rounded-md bg-jds-primary/10 text-jds-primary font-mono text-[10px] font-bold">
                                      {msg.diagnosis.confidence} Rule Confidence
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    msg.diagnosis.severity === 'critical'
                                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                      : msg.diagnosis.severity === 'moderate'
                                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                  }`}
                                >
                                  {msg.diagnosis.severityLabel}
                                </span>
                              </div>

                              {/* 4-Pillar Evaluated Criteria Scorecard */}
                              {msg.diagnosis.criteriaScorecard && (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <ClipboardCheck className="w-3.5 h-3.5 text-jds-primary" />
                                      Evaluated Multi-Criteria Scorecard
                                    </span>
                                    <span>Weighted Matrix</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {msg.diagnosis.criteriaScorecard.map((item) => (
                                      <div
                                        key={item.key}
                                        className="p-2 rounded-lg bg-jds-surface-container/40 border border-jds-outline-variant/25 flex flex-col justify-between gap-1"
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[10px] font-bold text-jds-on-surface">
                                            {item.criterion}{' '}
                                            <span className="font-mono text-[9px] text-jds-on-surface-variant">
                                              ({item.weightLabel})
                                            </span>
                                          </span>
                                          <span
                                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                              item.status === 'FAIL'
                                                ? 'bg-rose-500/15 text-rose-500'
                                                : item.status === 'WARNING'
                                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                            }`}
                                          >
                                            {item.status}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-jds-on-surface-variant leading-snug">
                                          {item.observation}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Compound / Secondary Factors Alert */}
                              {msg.diagnosis.compoundFactors &&
                                msg.diagnosis.compoundFactors.length > 0 && (
                                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 space-y-1">
                                    <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                      Compound Contributing Criteria Detected
                                    </div>
                                    {msg.diagnosis.compoundFactors.map((cf, cfIdx) => (
                                      <div
                                        key={cfIdx}
                                        className="text-[10px] text-jds-on-surface leading-relaxed"
                                      >
                                        <strong>
                                          {cf.code} ({cf.title}):
                                        </strong>{' '}
                                        {cf.detail}
                                      </div>
                                    ))}
                                  </div>
                                )}

                              {/* Technical Telemetry Benchmarks Grid */}
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant flex items-center gap-1">
                                  <Activity className="w-3.5 h-3.5 text-jds-primary" />
                                  <span>Inferred Hardware Telemetry State</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                  <div className="p-2 rounded-lg bg-jds-surface-container/50 border border-jds-outline-variant/20">
                                    <span className="text-jds-on-surface-variant block">
                                      PV Circuit / Irradiance:
                                    </span>
                                    <strong className="text-jds-on-surface font-semibold">
                                      {msg.diagnosis.telemetry.pvEfficiency}
                                    </strong>
                                  </div>
                                  <div className="p-2 rounded-lg bg-jds-surface-container/50 border border-jds-outline-variant/20">
                                    <span className="text-jds-on-surface-variant block">
                                      Battery Terminal:
                                    </span>
                                    <strong className="text-jds-on-surface font-semibold">
                                      {msg.diagnosis.telemetry.batteryVoltage}
                                    </strong>
                                  </div>
                                  <div className="p-2 rounded-lg bg-jds-surface-container/50 border border-jds-outline-variant/20">
                                    <span className="text-jds-on-surface-variant block">
                                      Controller / BMS:
                                    </span>
                                    <strong className="text-jds-on-surface font-semibold">
                                      {msg.diagnosis.telemetry.bmsState}
                                    </strong>
                                  </div>
                                  <div className="p-2 rounded-lg bg-jds-surface-container/50 border border-jds-outline-variant/20">
                                    <span className="text-jds-on-surface-variant block">
                                      Enclosure Seal:
                                    </span>
                                    <strong className="text-jds-on-surface font-semibold">
                                      {msg.diagnosis.telemetry.ipIntegrity}
                                    </strong>
                                  </div>
                                </div>
                              </div>

                              {/* Warranty Qualification Criteria Verdict */}
                              {msg.diagnosis.warrantyEvaluation && (
                                <div
                                  className={`p-2.5 rounded-lg border text-[10px] space-y-0.5 ${
                                    msg.diagnosis.warrantyEvaluation.eligible
                                      ? 'bg-emerald-500/10 border-emerald-500/25 text-jds-on-surface'
                                      : msg.diagnosis.warrantyEvaluation.status ===
                                        'DISQUALIFIED_IMPACT'
                                      ? 'bg-rose-500/10 border-rose-500/25 text-jds-on-surface'
                                      : 'bg-jds-surface-container/60 border-jds-outline-variant/30 text-jds-on-surface'
                                  }`}
                                >
                                  <div className="font-bold flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-jds-primary shrink-0" />
                                    <span>
                                      Warranty Criteria Verdict:{' '}
                                      {msg.diagnosis.warrantyEvaluation.verdictLabel}
                                    </span>
                                  </div>
                                  <p className="text-jds-on-surface-variant leading-relaxed pl-5">
                                    {msg.diagnosis.warrantyEvaluation.policyReason}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Interactive Option Buttons */}
                          {isBot && !msg.isStreaming && msg.options && msg.options.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-jds-outline-variant/30">
                              {msg.options.map((opt, optIdx) => {
                                const isClaimBtn = opt.next === 'TRANSFER_TO_CLAIM'
                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() => handleSelectOption(opt)}
                                    disabled={!isLatestBot || isStreaming}
                                    className={`text-left inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                      !isLatestBot
                                        ? 'bg-jds-surface-container/50 text-jds-on-surface-variant/60 border border-transparent cursor-default'
                                        : isClaimBtn
                                        ? 'bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 shadow-sm active:scale-95 cursor-pointer'
                                        : 'bg-jds-surface hover:bg-jds-primary/10 text-jds-on-surface border border-jds-outline-variant/60 hover:border-jds-primary shadow-xs active:scale-95 cursor-pointer'
                                    }`}
                                  >
                                    <span>{opt.label}</span>
                                    {isLatestBot && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] text-jds-on-surface-variant/60 px-1">
                          {msg.timestamp}
                        </span>
                      </div>
                    )
                  })}

                  {isStreaming && (
                    <div className="flex items-center gap-2 text-[11px] text-jds-on-surface-variant px-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-jds-primary" />
                      <span>Evaluating diagnostic criteria rules...</span>
                    </div>
                  )}
                </div>

                {/* Bottom Input & Quick Actions */}
                <div className="p-3 border-t border-jds-outline-variant/30 bg-jds-surface-container-low/50 shrink-0">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Describe compound symptoms (e.g. 'water inside lens and flickering', 'dies after 2 hours in rain')..."
                      className="flex-1 bg-jds-surface rounded-xl px-3.5 py-2 text-xs text-jds-on-surface border border-jds-outline-variant/50 focus:border-jds-primary focus:outline-none placeholder:text-jds-on-surface-variant/50 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!userInput.trim() || isStreaming}
                      className="p-2.5 bg-jds-primary text-jds-on-primary rounded-xl disabled:opacity-40 hover:bg-jds-primary/90 transition-colors shadow-sm"
                      aria-label="Send"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-jds-on-surface-variant">
                    <button
                      type="button"
                      onClick={() => setDiagSubMode('matrix')}
                      className="hover:underline text-jds-on-surface font-semibold flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-jds-primary" />
                      <span>Open Direct Criteria Matrix</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => transferToClaim()}
                      className="hover:underline text-jds-primary font-semibold flex items-center gap-1"
                    >
                      <span>Transfer Criteria to Warranty Claim</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </>
            )}

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
                  Warranty Diagnostic Claim Logged
                </h3>
                <p className="text-xs text-jds-on-surface-variant max-w-sm mx-auto">
                  Your multi-criteria diagnostic report has been filed with our Quiapo and Cavite service teams. Our technicians will inspect your unit against our 24-month warranty and case-by-case assessment guidelines.
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
                    className="w-full py-2.5 rounded-xl bg-jds-primary text-jds-on-primary font-semibold text-xs hover:bg-jds-primary/90 transition-all shadow-sm"
                  >
                    Return to Customer Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="space-y-4">
                
                {/* Multi-Criteria Handoff Banner */}
                {currentDiagnosis && (
                  <div className="p-3.5 rounded-xl bg-jds-primary/10 border border-jds-primary/30 text-xs flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-jds-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="text-jds-on-surface block font-semibold">
                        Multi-Criteria Scorecard Pre-Populated ({currentDiagnosis.faultCode})
                      </strong>
                      <span className="text-[11px] text-jds-on-surface-variant block">
                        Diagnosed as: <strong>{currentDiagnosis.title}</strong> ({currentDiagnosis.confidence} Rule Match). All 4 evaluated criteria pillars and telemetry estimates have been attached below.
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
                    JD Solar evaluates claims case-by-case upon bench intake at Quiapo or Cavite. Internal defects are eligible for our <strong>1-time unit replacement entitlement</strong>. Physical drops, shattered glass, tampering, or damage from customer carelessness disqualify units from free replacement.
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
                          className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition-all ${
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
                      2. Diagnostic Criteria Report & Fault Description *
                    </label>
                    <span className="text-[10px] text-jds-on-surface-variant">Editable</span>
                  </div>
                  <textarea
                    required
                    rows={5}
                    placeholder="Describe the observed hardware criteria and failure symptoms..."
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
                      Visual evidence accelerates bench verification at Quiapo & Cavite.
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
                            className="text-rose-500 hover:text-rose-600 p-1"
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
                    onClick={() => setActiveTab('assistant')}
                    className="px-4 py-2 text-xs font-medium text-jds-on-surface-variant hover:text-jds-on-surface rounded-xl transition-colors"
                  >
                    Back to Diagnostic Engine
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
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
