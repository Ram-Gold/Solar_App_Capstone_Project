import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
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
  Cpu,
  Activity,
  Check,
  ChevronRight,
  Info,
  ExternalLink,
  PhoneCall,
  Clock
} from 'lucide-react'
import { uploadEvidenceFile, submitWarrantyClaim } from '../lib/customerService'
import { DIAGNOSTIC_TREE, matchDiagnosticFreeText } from '../lib/solarDiagnosticEngine'

const ISSUE_CATEGORIES = [
  { id: 'No Power / Won\'t Turn On', label: 'No Power / Won\'t Turn On', icon: Zap },
  { id: 'Battery / Rapid Discharge', label: 'Battery / Rapid Discharge', icon: Battery },
  { id: 'Dim Lighting / Low Lux', label: 'Dim Lighting / Low Output', icon: Sun },
  { id: 'Remote Control Failure', label: 'Remote Control Issue', icon: Radio },
  { id: 'Sensor / Dusk-Dawn Failure', label: 'Sensor Not Detecting', icon: Eye },
  { id: 'Physical / Water Ingress', label: 'Physical / Water Damage', icon: AlertTriangle }
]

export default function FaultDiagnosticModal({
  isOpen,
  onClose,
  purchase,
  customerToken,
  onClaimSubmitted,
  initialMode = 'assistant', // 'assistant' | 'claim' | 'scan'
}) {
  const [activeTab, setActiveTab] = useState(initialMode === 'claim' ? 'claim' : 'assistant')
  
  // === DIAGNOSTIC ASSISTANT STATE ===
  const [currentNodeKey, setCurrentNodeKey] = useState('ROOT')
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null)
  const chatScrollRef = useRef(null)

  // === CLAIM FORM STATE ===
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0].id)
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedClaimId, setSubmittedClaimId] = useState(null)

  // Initialize or reset assistant when modal opens or purchase changes
  useEffect(() => {
    if (!isOpen || !purchase) return

    const startNodeKey = initialMode === 'scan' ? 'AUTO_TELEMETRY_SCAN' : 'ROOT'
    const startNode = DIAGNOSTIC_TREE[startNodeKey] || DIAGNOSTIC_TREE.ROOT

    setCurrentNodeKey(startNodeKey)
    setCurrentDiagnosis(null)
    setIsScanning(initialMode === 'scan')

    const initialBotMessage = {
      id: 'msg-init',
      role: 'bot',
      nodeKey: startNodeKey,
      content: typeof startNode.message === 'function' ? startNode.message(purchase) : startNode.message,
      options: startNode.options || [],
      diagnosis: startNode.faultCode ? startNode : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages([initialBotMessage])

    // If initial mode is scan, simulate automatic progress
    if (initialMode === 'scan') {
      simulateScan('AUTO_TELEMETRY_SCAN')
    }
  }, [isOpen, purchase, initialMode])

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'assistant' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, isScanning, activeTab])

  if (!isOpen || !purchase) return null

  // Execute scan simulation
  const simulateScan = (targetNodeKey) => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
      const nextNode = DIAGNOSTIC_TREE.TELEMETRY_RESULT
      setCurrentNodeKey('TELEMETRY_RESULT')
      setCurrentDiagnosis(nextNode)

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'bot',
          nodeKey: 'TELEMETRY_RESULT',
          content: typeof nextNode.message === 'function' ? nextNode.message(purchase) : nextNode.message,
          options: nextNode.options || [],
          diagnosis: nextNode,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    }, 1400)
  }

  // Handle selecting an option button
  const handleSelectOption = (opt) => {
    if (opt.action === 'CLOSE') {
      handleClose()
      return
    }

    // Add user selection bubble
    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: opt.label,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Check if transferring to claim
    if (opt.next === 'TRANSFER_TO_CLAIM') {
      transferToClaim(opt.category)
      return
    }

    // Check if triggering automated telemetry scan
    if (opt.next === 'AUTO_TELEMETRY_SCAN') {
      setMessages(prev => [...prev, userMsg])
      simulateScan('AUTO_TELEMETRY_SCAN')
      return
    }

    const nextNode = DIAGNOSTIC_TREE[opt.next] || DIAGNOSTIC_TREE.ROOT
    setCurrentNodeKey(opt.next)

    if (nextNode.faultCode) {
      setCurrentDiagnosis(nextNode)
    }

    const botMsg = {
      id: `bot-${Date.now()}`,
      role: 'bot',
      nodeKey: opt.next,
      content: typeof nextNode.message === 'function' ? nextNode.message(purchase) : nextNode.message,
      options: nextNode.options || [],
      diagnosis: nextNode.faultCode ? nextNode : null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg, botMsg])
  }

  // Handle free-text submit in assistant
  const handleSendMessage = (e) => {
    e.preventDefault()
    const text = userInput.trim()
    if (!text || isScanning) return

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setUserInput('')

    // Match free-text to diagnostic node
    const matchedNode = matchDiagnosticFreeText(text, purchase)
    
    setTimeout(() => {
      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: typeof matchedNode.message === 'function' ? matchedNode.message(purchase) : matchedNode.message,
        options: matchedNode.options || [],
        diagnosis: matchedNode.faultCode ? matchedNode : null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, userMsg, botMsg])
      if (matchedNode.faultCode) {
        setCurrentDiagnosis(matchedNode)
      }
    }, 300)
  }

  // Transfer diagnostic summary into the warranty claim form
  const transferToClaim = (suggestedCategory) => {
    if (suggestedCategory) {
      setCategory(suggestedCategory)
    } else if (currentDiagnosis?.category) {
      setCategory(currentDiagnosis.category)
    }

    let prefill = ''
    if (currentDiagnosis) {
      prefill = `[AUTO-DIAGNOSTIC TRIAGE REPORT]
Fault Code: ${currentDiagnosis.faultCode || 'N/A'}
Diagnosis: ${currentDiagnosis.title || 'Reported Fault'}
Severity: ${currentDiagnosis.severityLabel || 'Standard Inspection'}
Confidence: ${currentDiagnosis.confidence || 'Automated Analysis'}

Telemetry Readings:
- PV Yield: ${currentDiagnosis.telemetry?.pvEfficiency || 'Nominal'}
- Panel Voc: ${currentDiagnosis.telemetry?.panelVoltage || 'Nominal'}
- Battery State: ${currentDiagnosis.telemetry?.batteryVoltage || 'Nominal'}
- Enclosure Seal: ${currentDiagnosis.telemetry?.ipIntegrity || 'Nominal'}

Observed Notes:
Unit was triaged using JD Solar Auto-Diagnostic Engine. Hardware inspection or module exchange requested under registered warranty.`
    } else {
      prefill = `[AUTO-DIAGNOSTIC REPORT]
Product: ${purchase.product_name}
Serial #: ${purchase.serial_number || 'N/A'}
Customer completed auto-diagnostic triage and requested technician review.`
    }

    setDescription(prefill)
    setActiveTab('claim')
  }

  // Reset chat back to main menu
  const handleResetChat = () => {
    const root = DIAGNOSTIC_TREE.ROOT
    setCurrentNodeKey('ROOT')
    setCurrentDiagnosis(null)
    setIsScanning(false)
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'bot',
        nodeKey: 'ROOT',
        content: typeof root.message === 'function' ? root.message(purchase) : root.message,
        options: root.options || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])
  }

  // === CLAIM SUBMISSION HANDLERS ===
  const handleFileChange = (e) => {
    setUploadError('')
    const selected = Array.from(e.target.files || [])
    const oversized = selected.find(f => f.size > 15 * 1024 * 1024)
    if (oversized) {
      setUploadError(`File "${oversized.name}" exceeds the 15MB limit.`)
      return
    }
    if (files.length + selected.length > 4) {
      setUploadError('Maximum 4 media files allowed.')
      return
    }
    setFiles(prev => [...prev, ...selected])
  }

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
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
        mediaUrls: uploadedUrls
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
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-4 md:my-8 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-jds-outline-variant/30 flex items-center justify-between bg-jds-surface-container-low shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-jds-primary/10 flex items-center justify-center text-jds-primary shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-jds-on-surface">
                  Solar Auto-Diagnostic System
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Decision-Tree AI
                </span>
              </div>
              <p className="text-[11px] md:text-xs text-jds-on-surface-variant truncate max-w-xs md:max-w-md">
                Triage for: <strong className="text-jds-on-surface font-semibold">{purchase.product_name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'assistant' && (
              <button
                onClick={handleResetChat}
                title="Restart Diagnostics"
                className="p-1.5 text-jds-on-surface-variant hover:text-jds-primary rounded-lg hover:bg-jds-surface-container transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 text-jds-on-surface-variant hover:text-jds-on-surface rounded-lg hover:bg-jds-surface-container transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex border-b border-jds-outline-variant/30 bg-jds-surface-container/30 px-4 py-2 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'assistant'
                ? 'bg-jds-primary text-jds-on-primary shadow-sm'
                : 'text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto-Diagnostic Guide</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('claim')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'claim'
                ? 'bg-jds-primary text-jds-on-primary shadow-sm'
                : 'text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Warranty Claim</span>
            {currentDiagnosis && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: AUTO DIAGNOSTIC ASSISTANT */}
        {/* ========================================================= */}
        {activeTab === 'assistant' && (
          <div className="flex flex-col flex-1 min-h-0 bg-jds-surface">
            
            {/* Messages Area */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 text-xs"
            >
              {/* Product Context Banner */}
              <div className="p-3 rounded-xl bg-jds-surface-container/40 border border-jds-outline-variant/30 flex items-center justify-between gap-3 text-[11px] text-jds-on-surface-variant">
                <div className="space-y-0.5">
                  <div className="font-bold text-jds-on-surface">{purchase.product_name}</div>
                  <div className="flex items-center gap-3">
                    {purchase.serial_number && <span>S/N: <strong className="font-mono text-jds-on-surface">{purchase.serial_number}</strong></span>}
                    <span>Branch: <strong className="text-jds-on-surface">{purchase.branch_location || 'Cavite'}</strong></span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full font-semibold border ${
                  purchase.is_warranty_active
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  {purchase.is_warranty_active ? '1-Year Warranty Active' : 'Warranty Expired'}
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
                      className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs ${
                        isBot
                          ? 'bg-jds-surface-container-low text-jds-on-surface border border-jds-outline-variant/40 rounded-tl-sm shadow-sm'
                          : 'bg-jds-primary text-jds-on-primary rounded-tr-sm shadow-sm'
                      }`}
                    >
                      {/* Markdown Text */}
                      <div className="prose prose-sm max-w-none text-xs leading-relaxed prose-headings:font-bold prose-headings:text-jds-on-surface prose-headings:text-xs prose-headings:my-1.5 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {/* Diagnostic Verdict & Telemetry Box */}
                      {isBot && msg.diagnosis && msg.diagnosis.telemetry && (
                        <div className="mt-3.5 p-3.5 rounded-xl bg-jds-surface border border-jds-outline-variant/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-jds-primary text-[11px]">
                              DIAGNOSTIC CODE: {msg.diagnosis.faultCode}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              msg.diagnosis.severity === 'critical'
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                : msg.diagnosis.severity === 'moderate'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}>
                              {msg.diagnosis.severityLabel}
                            </span>
                          </div>

                          {/* Telemetry Metrics Grid */}
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="p-2 rounded-lg bg-jds-surface-container/50 border border-jds-outline-variant/20">
                              <span className="text-jds-on-surface-variant block">PV Voltage / Yield:</span>
                              <strong className="text-jds-on-surface font-semibold">{msg.diagnosis.telemetry.pvEfficiency}</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-jds-surface-container/50 border border-jds-outline-variant/20">
                              <span className="text-jds-on-surface-variant block">Battery Terminal:</span>
                              <strong className="text-jds-on-surface font-semibold">{msg.diagnosis.telemetry.batteryVoltage}</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-jds-surface-container/50 border border-jds-outline-variant/20">
                              <span className="text-jds-on-surface-variant block">BMS Circuit State:</span>
                              <strong className="text-jds-on-surface font-semibold">{msg.diagnosis.telemetry.bmsState}</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-jds-surface-container/50 border border-jds-outline-variant/20">
                              <span className="text-jds-on-surface-variant block">Weatherproof Seal:</span>
                              <strong className="text-jds-on-surface font-semibold">{msg.diagnosis.telemetry.ipIntegrity}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Interactive Option Buttons */}
                      {isBot && msg.options && msg.options.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-jds-outline-variant/30">
                          {msg.options.map((opt, optIdx) => {
                            const isClaimBtn = opt.next === 'TRANSFER_TO_CLAIM'
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectOption(opt)}
                                disabled={isScanning || !isLatestBot}
                                className={`text-left inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                  !isLatestBot
                                    ? 'bg-jds-surface-container/50 text-jds-on-surface-variant/60 border border-transparent cursor-default'
                                    : isClaimBtn
                                    ? 'bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 shadow-sm active:scale-95'
                                    : 'bg-jds-surface hover:bg-jds-primary/10 text-jds-on-surface border border-jds-outline-variant/60 hover:border-jds-primary shadow-xs active:scale-95'
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

              {/* Scanning Telemetry Pulse Animation */}
              {isScanning && (
                <div className="p-4 rounded-2xl bg-jds-surface-container-low border border-jds-primary/30 space-y-3 animate-in fade-in max-w-[85%]">
                  <div className="flex items-center gap-2 text-jds-primary font-bold text-xs">
                    <Activity className="w-4 h-4 animate-spin text-jds-primary" />
                    <span>Analyzing Photovoltaic & Battery Telemetry...</span>
                  </div>
                  <div className="w-full bg-jds-surface-container rounded-full h-2 overflow-hidden">
                    <div className="bg-jds-primary h-2 rounded-full animate-pulse w-3/4" />
                  </div>
                  <div className="text-[11px] text-jds-on-surface-variant flex justify-between">
                    <span>Reading Voc & LiFePO4 Cutoff Thresholds...</span>
                    <span className="font-mono text-jds-primary font-bold">Scanning</span>
                  </div>
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
                  placeholder="Ask a question or describe what's happening (e.g. 'won't charge', 'dies after 2 hours')..."
                  disabled={isScanning}
                  className="flex-1 bg-jds-surface rounded-xl px-3.5 py-2 text-xs text-jds-on-surface border border-jds-outline-variant/50 focus:border-jds-primary focus:outline-none placeholder:text-jds-on-surface-variant/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isScanning || !userInput.trim()}
                  className="p-2.5 bg-jds-primary text-jds-on-primary rounded-xl disabled:opacity-40 hover:bg-jds-primary/90 transition-colors shadow-sm"
                  aria-label="Send"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-jds-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-jds-primary" />
                  Automated Solar Diagnostic Engine
                </span>
                <button
                  type="button"
                  onClick={() => transferToClaim()}
                  className="hover:underline text-jds-primary font-semibold flex items-center gap-1"
                >
                  <span>Skip to Manual Claim</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
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
                  Warranty Diagnostic Claim Logged!
                </h3>
                <p className="text-xs text-jds-on-surface-variant max-w-sm mx-auto">
                  Your diagnostic report has been filed with our Quiapo and Cavite service teams. Our technicians will inspect your claim against our 1-year product warranty.
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
                
                {/* Auto-Triage Handoff Banner */}
                {currentDiagnosis && (
                  <div className="p-3.5 rounded-xl bg-jds-primary/10 border border-jds-primary/30 text-xs flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-jds-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-jds-on-surface block font-semibold">
                        Auto-Diagnostic Findings Pre-Populated
                      </strong>
                      <span className="text-[11px] text-jds-on-surface-variant">
                        Diagnosed as: <strong>{currentDiagnosis.title}</strong> ({currentDiagnosis.severityLabel}). All telemetry readings and technical descriptions have been mapped below.
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
                  <div className="flex items-center gap-3 text-jds-on-surface-variant">
                    {purchase.serial_number && <span>S/N: <strong className="font-mono">{purchase.serial_number}</strong></span>}
                    <span className={purchase.is_warranty_active ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                      {purchase.is_warranty_active ? `Active Warranty (${purchase.days_remaining} days left)` : 'Expired Warranty (Inspection Request)'}
                    </span>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

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
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-jds-primary' : 'text-jds-on-surface-variant'}`} />
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
                      2. Diagnostic Details & Fault Description *
                    </label>
                    <span className="text-[10px] text-jds-on-surface-variant">Editable</span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe what is failing..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-jds-surface-container/30 border border-jds-outline-variant/50 rounded-xl p-3 text-xs text-jds-on-surface placeholder:text-jds-on-surface-variant/40 focus:outline-none focus:border-jds-primary transition-colors resize-none font-sans"
                  />
                </div>

                {/* Step 3: Photos / Video Proof */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-jds-on-surface flex items-center justify-between">
                    <span>3. Attach Photos / Video Evidence (Optional)</span>
                    <span className="text-[10px] text-jds-on-surface-variant">Max 4 files, 15MB each</span>
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
                      Click to upload photos of indicator, panel, or damage
                    </div>
                    <div className="text-[10px] text-jds-on-surface-variant mt-0.5">
                      Photos speed up replacement approvals at Quiapo & Cavite.
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
                    Back to Assistant
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting Diagnostic Ticket...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Submit Official Claim Ticket
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
