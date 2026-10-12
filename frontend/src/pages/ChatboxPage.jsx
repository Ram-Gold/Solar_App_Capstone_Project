import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HiOutlinePaperAirplane,
  HiOutlineUser,
  HiOutlineSparkles,
  HiOutlineArrowPath,
  HiOutlineCurrencyDollar,
  HiOutlineCube,
  HiOutlineMapPin,
  HiOutlineBolt,
  HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../context/ChatContext'
import { Link, useNavigate } from 'react-router-dom'
import MultiCriteriaMatchModal from '../components/MultiCriteriaMatchModal'

const suggestionCards = [
  {
    title: 'Product Matcher Wizard',
    desc: 'Step-by-step sizing algorithm considering budget, location, and wattage needs.',
    icon: HiOutlineCube,
    to: '/match',
  },
  {
    title: 'Pricing & Wattage Guide',
    desc: 'Compare price tiers from 50W residential to 800W highway lighting.',
    icon: HiOutlineCurrencyDollar,
    action: { label: 'Pricing & Packages', next: 'PRICING_INFO' },
  },
  {
    title: 'Calculate Savings',
    desc: 'See how much you eliminate from Meralco electricity bills with zero-grid solar.',
    icon: HiOutlineBolt,
    action: { label: 'Calculate Electricity Savings', next: 'SAVINGS_INFO' },
  },
  {
    title: 'Quiapo & Cavite Branches',
    desc: 'Store locations, pickup hours, and direct wholesale inquiries.',
    icon: HiOutlineMapPin,
    action: { label: 'Quiapo & Cavite Branches', next: 'BRANCHES_INFO' },
  },
]

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
  const navigate = useNavigate()
  const { messages, sendMessage, selectOption, resetChat, isLoading, products } = useChat()
  const [input, setInput] = useState('')
  const [showMatcher, setShowMatcher] = useState(false)
  const scrollRef = useRef(null)

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

  // Count if only welcome message exists
  const isFreshChat = messages.length <= 1

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col font-inter overflow-hidden sunlight-bg grain-texture relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-jds-primary-container/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-jds-secondary-container/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col items-center justify-start relative z-10 overflow-hidden">
        {/* Top Header Toolbar */}
        <div className="w-full max-w-4xl px-4 py-3 flex items-center justify-between border-b border-jds-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-label-md font-bold text-jds-on-surface">JD Solar Smart Assistant</span>
            <span className="hidden sm:inline-block text-[11px] bg-jds-primary-container text-jds-on-primary-container font-semibold px-2 py-0.5 rounded-full">
              FAQ & Consultation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/match"
              className="flex items-center gap-1.5 text-label-sm font-semibold text-jds-primary hover:text-jds-on-primary-container bg-jds-primary-container/40 hover:bg-jds-primary-container px-3 py-1.5 rounded-xl border border-jds-primary/20 shadow-xs transition-all active:scale-95"
            >
              <HiOutlineSparkles className="text-base" />
              <span>Product Matcher</span>
              <HiOutlineArrowTopRightOnSquare size={13} className="opacity-70" />
            </Link>
            <button
              onClick={resetChat}
              className="flex items-center gap-1.5 text-label-sm font-semibold text-jds-on-surface-variant hover:text-jds-primary bg-white/70 hover:bg-white px-3 py-1.5 rounded-xl border border-jds-outline-variant/30 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <HiOutlineArrowPath className="text-base" />
              <span>Reset Chat</span>
            </button>
          </div>
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
                <SunPulse isLoading={isLoading} />
                <h1 className="text-headline-md sm:text-headline-lg text-jds-on-surface font-extrabold tracking-tight mt-6 mb-2">
                  Solar Assistant & <span className="text-jds-primary">FAQ Consultation</span>
                </h1>
                <p className="text-body-md text-jds-on-surface-variant/80 max-w-lg mb-8">
                  Get instant answers regarding product specifications, branch pickup, warranty, or jump into our step-by-step matcher.
                </p>

                {/* Quick Starting Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full px-2 mb-6">
                  {suggestionCards.map((card, idx) => {
                    if (card.to) {
                      return (
                        <Link
                          key={card.title}
                          to={card.to}
                          className="p-4 bg-white/80 backdrop-blur-md border border-jds-outline-variant/30 rounded-2xl text-left hover:border-jds-primary hover:shadow-md transition-all group block"
                        >
                          <div className="w-9 h-9 rounded-xl bg-jds-primary-container/30 flex items-center justify-center text-jds-primary mb-3 group-hover:scale-105 transition-transform">
                            <card.icon size={18} />
                          </div>
                          <div className="text-label-md font-bold text-jds-on-surface mb-1 group-hover:text-jds-primary transition-colors flex items-center justify-between">
                            <span>{card.title}</span>
                            <HiOutlineArrowTopRightOnSquare size={13} className="text-jds-primary opacity-60" />
                          </div>
                          <div className="text-[12px] text-jds-on-surface-variant/70 leading-snug">
                            {card.desc}
                          </div>
                        </Link>
                      )
                    }

                    return (
                      <motion.button
                        key={card.title}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 * idx }}
                        onClick={() => selectOption(card.action)}
                        className="p-4 bg-white/80 backdrop-blur-md border border-jds-outline-variant/30 rounded-2xl text-left hover:border-jds-primary hover:shadow-md transition-all group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-jds-primary-container/30 flex items-center justify-center text-jds-primary mb-3 group-hover:scale-105 transition-transform">
                          <card.icon size={18} />
                        </div>
                        <div className="text-label-md font-bold text-jds-on-surface mb-1 group-hover:text-jds-primary transition-colors">
                          {card.title}
                        </div>
                        <div className="text-[12px] text-jds-on-surface-variant/70 leading-snug">
                          {card.desc}
                        </div>
                      </motion.button>
                    )
                  })}
                </div>

                {/* FAQ Quick Chips */}
                <div className="w-full px-2 max-w-2xl">
                  <div className="text-label-xs uppercase font-extrabold text-jds-on-surface-variant/60 tracking-wider mb-2.5">
                    Common Questions
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
                                if (opt.url) {
                                  return (
                                    <Link
                                      key={optIdx}
                                      to={opt.url}
                                      className="inline-flex items-center text-label-sm font-semibold bg-jds-primary-container text-jds-on-primary-container px-3.5 py-2 rounded-xl border border-jds-primary/20 hover:shadow-sm hover:opacity-95 transition-all active:scale-95"
                                    >
                                      {opt.label}
                                    </Link>
                                  )
                                }
                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => selectOption(opt)}
                                    disabled={isLoading || !isLatestAssistant}
                                    className={`inline-flex items-center text-label-sm font-medium px-3.5 py-2 rounded-xl border transition-all text-left ${
                                      isLatestAssistant
                                        ? 'bg-white text-jds-on-surface border-jds-outline-variant/60 hover:border-jds-primary hover:bg-jds-primary/5 active:scale-95 cursor-pointer shadow-sm'
                                        : 'bg-jds-surface-container text-jds-on-surface-variant/70 border-transparent cursor-default'
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

        {/* Input Area - Floating at bottom */}
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
      </div>

      {/* Multi-Criteria Matching Modal */}
      <MultiCriteriaMatchModal
        isOpen={showMatcher}
        onClose={() => setShowMatcher(false)}
        products={products}
      />
    </div>
  )
}
