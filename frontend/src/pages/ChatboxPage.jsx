import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlinePaperAirplane,
  HiOutlineUser,
  HiOutlineSparkles,
  HiOutlineArrowPath,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineInformationCircle,
  HiOutlineClock,
  HiOutlineChatBubbleLeftRight,
  HiOutlineTrash,
} from 'react-icons/hi2'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChat } from '../context/ChatContext'
import { Link } from 'react-router-dom'
import MultiCriteriaMatchModal from '../components/MultiCriteriaMatchModal'
import SolarSavingsCalculatorModal from '../components/SolarSavingsCalculatorModal'
import ChatHelpModal from '../components/ChatHelpModal'
import { formatSessionDate } from '../lib/chatStorage'

const quickFaqPills = [
  'What is your warranty policy?',
  'Where are your store branches in Quiapo and Cavite?',
  'How much can I save on electricity bills?',
  'What are your pricing packages?',
]

const SunPulse = ({ isLoading }) => {
  return (
    <div className="relative flex items-center justify-center w-52 h-52">
      {/* Outer Glows */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full bg-jds-primary-container/20 blur-3xl"
          animate={{
            scale: [1, 1.2 + i * 0.2, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Sun Core */}
      <motion.div
        className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-jds-primary-container via-jds-secondary-container to-jds-primary shadow-[0_0_40px_rgba(253,184,19,0.45)] flex items-center justify-center overflow-hidden"
        animate={{
          scale: isLoading ? [1, 1.08, 1] : [1, 1.04, 1],
        }}
        transition={{
          duration: isLoading ? 0.8 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <HiOutlineSparkles className="text-white size-10 drop-shadow-md" />

        {/* Flare effect */}
        <motion.div
          className="absolute inset-0 bg-white/20"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ clipPath: 'polygon(50% 50%, 0 0, 100% 0)' }}
        />
      </motion.div>
    </div>
  )
}

export default function ChatboxPage() {
  const {
    messages,
    sendMessage,
    selectOption,
    resetChat,
    isLoading,
    products,
    isSavingsModalOpen,
    closeSavingsModal,
    sendSavingsSummaryToChat,
    sessions,
    loadSession,
    deleteSession,
  } = useChat()
  const [input, setInput] = useState('')
  const [showMatcher, setShowMatcher] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const scrollRef = useRef(null)

  // When leaving the chat assistant, restart/reset the active conversation
  useEffect(() => {
    return () => {
      resetChat()
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = (text = input) => {
    if (!text.trim() || isLoading) return
    sendMessage(text)
    setInput('')
  }

  // Fresh chat state: no messages exchanged yet
  const isFreshChat = messages.length === 0

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col font-inter overflow-hidden sunlight-bg grain-texture relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-jds-primary-container/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-jds-secondary-container/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col items-center justify-start relative z-10 overflow-hidden">
        {/* Top Header Toolbar */}
        <div className="w-full max-w-4xl px-4 py-3 flex items-center justify-end gap-2 border-b border-jds-outline-variant/20">
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 text-label-sm font-semibold text-jds-on-surface-variant hover:text-jds-primary bg-white/70 hover:bg-white px-3 py-1.5 rounded-xl border border-jds-outline-variant/30 shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Assistant architecture and data privacy policy"
            aria-label="Help and Data Policy"
          >
            <HiOutlineInformationCircle className="text-base" />
            <span>Help</span>
          </button>
          <button
            onClick={resetChat}
            className="flex items-center gap-1.5 text-label-sm font-semibold text-jds-on-surface-variant hover:text-jds-primary bg-white/70 hover:bg-white px-3 py-1.5 rounded-xl border border-jds-outline-variant/30 shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <HiOutlineArrowPath className="text-base" />
            <span>Reset Chat</span>
          </button>
        </div>

        {/* Messages Container */}
        <div ref={scrollRef} className="w-full flex-grow overflow-y-auto px-4 md:px-0 py-6 scroll-smooth chat-scroll">
          <div className="max-w-4xl mx-auto w-full space-y-6 pb-36">
            {isFreshChat && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center text-center pt-2 pb-6"
              >
                {/* Chatbot at the top */}
                <SunPulse isLoading={isLoading} />
                <h1 className="text-headline-md sm:text-headline-lg text-jds-on-surface font-extrabold tracking-tight mt-6 mb-5">
                  Solar Assistant & <span className="text-jds-primary">FAQ Consultation</span>
                </h1>

                {/* Chatbox Input directly on Welcome Screen */}
                <div className="w-full max-w-2xl px-2 mb-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSend()
                    }}
                    className="flex items-center gap-3 bg-white/90 backdrop-blur-xl p-2 pl-5 pr-2 rounded-[2rem] border border-jds-outline-variant/40 shadow-sm focus-within:ring-4 focus-within:ring-jds-primary/20 focus-within:border-jds-primary transition-all group"
                  >
                    <HiOutlineSparkles className="text-jds-primary size-5 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about solar lights, pricing, branches, or warranty..."
                      className="flex-grow bg-transparent py-2.5 outline-none text-jds-on-surface text-body-md placeholder:text-jds-on-surface-variant/50"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="bg-jds-primary text-white p-3 rounded-full transition-all disabled:opacity-30 active:scale-95 shadow-md shadow-jds-primary/20 hover:bg-jds-primary/90 cursor-pointer"
                      aria-label="Send message"
                    >
                      <HiOutlinePaperAirplane size={17} className="rotate-[-20deg] translate-x-0.5 -translate-y-0.5" />
                    </button>
                  </form>
                </div>

                {/* Frequently Asked Questions */}
                <div className="w-full px-2 max-w-2xl mb-8">
                  <div className="text-label-xs uppercase font-extrabold text-jds-on-surface-variant/60 tracking-wider mb-2.5">
                    Frequently Asked Questions
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {quickFaqPills.map((pill) => (
                      <button
                        key={pill}
                        onClick={() => handleSend(pill)}
                        className="text-xs bg-white/85 hover:bg-white text-jds-on-surface font-semibold px-3 py-1.5 rounded-full border border-jds-outline-variant/40 hover:border-jds-primary hover:text-jds-primary shadow-2xs transition-all cursor-pointer"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation History at bottom - Only visible for users who already talked to the assistant */}
                {sessions && sessions.length > 0 && (
                  <div className="w-full max-w-2xl px-2 mb-6 text-left">
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <HiOutlineClock className="text-jds-primary size-4" />
                        <span className="text-label-sm font-bold text-jds-on-surface uppercase tracking-wider">
                          Conversation History
                        </span>
                      </div>
                      <span className="text-[11px] text-jds-on-surface-variant/60 font-medium">
                        {`${sessions.length} saved locally`}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => loadSession(session.id)}
                          className="group flex items-center justify-between p-3.5 bg-white/85 hover:bg-white border border-jds-outline-variant/30 hover:border-jds-primary/60 rounded-2xl shadow-2xs hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-8 h-8 rounded-xl bg-jds-primary-container/20 group-hover:bg-jds-primary-container/40 text-jds-primary flex items-center justify-center shrink-0 transition-colors">
                              <HiOutlineChatBubbleLeftRight size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-label-md font-semibold text-jds-on-surface truncate group-hover:text-jds-primary transition-colors">
                                {session.title}
                              </div>
                              <div className="text-[11px] text-jds-on-surface-variant/70">
                                {formatSessionDate(session.updatedAt)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-jds-on-surface-variant/60 bg-jds-surface-container-high px-2 py-0.5 rounded-full hidden sm:inline-block font-medium">
                              {session.messages?.filter((m) => m.role === 'user').length || 1} queries
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteSession(session.id)
                              }}
                              className="p-1.5 rounded-lg text-jds-on-surface-variant/50 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete conversation"
                              aria-label={`Delete conversation ${session.title}`}
                            >
                              <HiOutlineTrash size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Conversation Flow */}
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isAssistant = msg.role === 'assistant'
                const isLatestAssistant = isAssistant && idx === messages.length - 1

                return (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[92%] sm:max-w-[85%] ${
                        isAssistant ? 'w-full flex-row' : 'flex-row-reverse'
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                          isAssistant
                            ? 'bg-white text-jds-secondary border-jds-outline-variant/30'
                            : 'bg-jds-primary text-white border-transparent'
                        }`}
                      >
                        {isAssistant ? <HiOutlineSparkles size={20} /> : <HiOutlineUser size={20} />}
                      </div>

                      {/* Content Card */}
                      <div className={`flex flex-col gap-1.5 ${isAssistant ? 'w-full flex-1 min-w-0' : ''}`}>
                        <div
                          className={`p-5 sm:p-6 shadow-sm backdrop-blur-sm ${
                            isAssistant
                              ? 'w-full bg-white/90 text-jds-on-surface border border-jds-outline-variant/30 rounded-3xl rounded-tl-sm'
                              : 'bg-jds-primary text-white rounded-3xl rounded-tr-sm'
                          }`}
                        >
                          <div className="prose prose-slate max-w-none prose-p:leading-relaxed text-body-md font-normal prose-headings:font-bold prose-headings:text-jds-on-surface">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ ...props }) => (
                                  <Link
                                    to={props.href}
                                    className={`font-bold underline decoration-2 underline-offset-4 hover:opacity-80 transition-opacity ${
                                      isAssistant ? 'text-jds-primary' : 'text-white'
                                    }`}
                                  >
                                    {props.children}
                                  </Link>
                                ),
                                table: ({ ...props }) => (
                                  <div className="overflow-x-auto my-3 rounded-2xl border border-jds-outline-variant/40 bg-white/80 shadow-xs">
                                    <table className="min-w-full divide-y divide-jds-outline-variant/30 text-body-xs text-left" {...props} />
                                  </div>
                                ),
                                thead: ({ ...props }) => (
                                  <thead className="bg-jds-surface-container font-bold text-jds-on-surface" {...props} />
                                ),
                                th: ({ ...props }) => (
                                  <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-[11px] text-jds-on-surface" {...props} />
                                ),
                                td: ({ ...props }) => (
                                  <td className="px-4 py-2.5 whitespace-nowrap text-jds-on-surface-variant font-medium border-t border-jds-outline-variant/20" {...props} />
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>

                          {/* Decision Tree Options - Fade in once finished streaming */}
                          {isAssistant && msg.options && msg.options.length > 0 && !msg.isStreaming && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25 }}
                              className="mt-4 pt-3 border-t border-jds-outline-variant/30 flex flex-wrap gap-2"
                            >
                              {msg.options.map((opt, optIdx) => {
                                const isSelected = msg.selectedOption === opt.label
                                const hasSelection = Boolean(msg.selectedOption)

                                if (opt.url) {
                                  return (
                                    <Link
                                      key={optIdx}
                                      to={opt.url}
                                      onClick={() => selectOption(opt, msg.id)}
                                      className={`inline-flex items-center gap-1.5 text-label-sm px-3.5 py-2 rounded-xl border transition-all text-left ${
                                        isSelected
                                          ? 'bg-jds-primary text-white border-jds-primary shadow-sm font-semibold'
                                          : hasSelection
                                          ? 'opacity-40 bg-jds-surface-container/60 text-jds-on-surface-variant/70 border-transparent pointer-events-none'
                                          : isLatestAssistant
                                          ? 'bg-white text-jds-on-surface border-jds-outline-variant/60 hover:border-jds-primary hover:bg-jds-primary/5 active:scale-95 cursor-pointer shadow-xs font-medium'
                                          : 'bg-jds-surface-container text-jds-on-surface-variant/70 border-transparent cursor-default pointer-events-none font-medium'
                                      }`}
                                    >
                                      <span>{opt.label}</span>
                                      <HiOutlineArrowTopRightOnSquare size={13} className={isSelected ? 'text-white' : 'opacity-60'} />
                                    </Link>
                                  )
                                }
                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => selectOption(opt, msg.id)}
                                    disabled={isLoading || hasSelection || !isLatestAssistant}
                                    className={`inline-flex items-center text-label-sm px-3.5 py-2 rounded-xl border transition-all text-left ${
                                      isSelected
                                        ? 'bg-jds-primary text-white border-jds-primary shadow-sm font-semibold cursor-default'
                                        : hasSelection
                                        ? 'opacity-40 bg-jds-surface-container/60 text-jds-on-surface-variant/70 border-transparent cursor-not-allowed pointer-events-none'
                                        : isLatestAssistant
                                        ? 'bg-white text-jds-on-surface border-jds-outline-variant/60 hover:border-jds-primary hover:bg-jds-primary/5 active:scale-95 cursor-pointer shadow-xs font-medium'
                                        : 'bg-jds-surface-container text-jds-on-surface-variant/70 border-transparent cursor-default font-medium'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                )
                              })}
                            </motion.div>
                          )}
                        </div>

                        <span
                          className={`text-[10px] text-jds-on-surface-variant/60 font-semibold px-2 ${
                            isAssistant ? 'text-left' : 'text-right'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Typing Loader - Only shown during initial thinking pause */}
            {isLoading && !messages.some((m) => m.isStreaming) && (
              <div className="flex items-center gap-2 pl-14">
                <div className="bg-white/80 border border-jds-outline-variant/30 px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-jds-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-jds-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-jds-primary animate-bounce" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Floating at bottom (Only shown once in active conversation mode) */}
        {!isFreshChat && (
          <div className="absolute bottom-6 left-0 right-0 px-4 z-20">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex items-center gap-3 bg-white/80 backdrop-blur-xl p-2 pl-6 pr-2 rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-within:ring-4 focus-within:ring-jds-primary/20 transition-all group"
              >
                <HiOutlineSparkles className="text-jds-primary size-6 opacity-60 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about solar lights, pricing, branches, or warranty..."
                  className="flex-grow bg-transparent py-3.5 outline-none text-jds-on-surface text-body-md placeholder:text-jds-on-surface-variant/50"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-jds-primary text-white p-3.5 rounded-full transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-jds-primary/20 hover:bg-jds-primary/90"
                  aria-label="Send message"
                >
                  <HiOutlinePaperAirplane size={19} className="rotate-[-20deg] translate-x-0.5 -translate-y-0.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Criteria Matching Modal */}
      <MultiCriteriaMatchModal
        isOpen={showMatcher}
        onClose={() => setShowMatcher(false)}
        products={products}
      />

      {/* Solar Savings Calculator Modal */}
      <SolarSavingsCalculatorModal
        isOpen={isSavingsModalOpen}
        onClose={closeSavingsModal}
        onSendToChat={sendSavingsSummaryToChat}
      />

      {/* Assistant Help & Privacy Disclosure Modal */}
      <ChatHelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  )
}
