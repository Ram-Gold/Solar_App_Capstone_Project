import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '../context/ChatContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import {
  HiOutlineCpuChip,
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
  HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const {
    messages,
    sendMessage,
    selectOption,
    resetChat,
    isLoading,
    initialMessage,
  } = useChat()
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Automatically open widget if an initial message was triggered from product page
  useEffect(() => {
    if (initialMessage) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [initialMessage])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
  }

  return (
    <>
      {/* Chat Window */}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="fixed bottom-6 right-6 w-[410px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-5rem)] bg-jds-surface rounded-2xl shadow-2xl flex flex-col border border-jds-outline-variant/60 overflow-hidden z-[100]"
          >
            {/* Header */}
            <header className="bg-jds-surface-container-low px-5 py-3.5 flex items-center justify-between border-b border-jds-outline-variant/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-jds-primary-container flex items-center justify-center text-jds-on-primary-container shadow-sm">
                  <HiOutlineCpuChip className="text-xl text-jds-primary" />
                </div>
                <div>
                  <h2 className="text-label-md text-jds-on-surface font-bold leading-tight">
                    JD Solar Assistant
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] text-jds-on-surface-variant font-medium">
                      AI Solar Consultant
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={resetChat}
                  title="Restart Conversation"
                  className="text-jds-on-surface-variant hover:text-jds-primary hover:bg-jds-surface-container-high p-2 rounded-lg transition-colors"
                >
                  <HiOutlineArrowPath className="text-lg" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  className="text-jds-on-surface-variant hover:text-red-500 hover:bg-jds-surface-container-high p-2 rounded-lg transition-colors"
                >
                  <HiOutlineXMark className="text-xl" />
                </button>
              </div>
            </header>

            {/* Message Area */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll bg-jds-surface">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-8 px-4 text-jds-on-surface-variant">
                  <div className="w-10 h-10 rounded-2xl bg-jds-primary-container/30 text-jds-primary flex items-center justify-center mb-3">
                    <HiOutlineSparkles size={20} />
                  </div>
                  <h4 className="text-label-md font-bold text-jds-on-surface mb-1">How can we assist you?</h4>
                  <p className="text-[12px] text-jds-on-surface-variant/70 mb-4 max-w-xs">
                    Ask a question below about our solar lighting systems, pricing, or branch pickups.
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {['Pricing & packages', 'Warranty policy', 'Store branches'].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="text-[11px] bg-white hover:bg-jds-primary/5 text-jds-on-surface px-2.5 py-1 rounded-full border border-jds-outline-variant/50 hover:border-jds-primary cursor-pointer transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => {
                const isAssistant = msg.role === 'assistant'
                const isLatestAssistant = isAssistant && idx === messages.length - 1

                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-body-md ${
                        isAssistant
                          ? 'bg-jds-surface-container-low text-jds-on-surface border border-jds-outline-variant/40 rounded-tl-sm'
                          : 'bg-jds-primary text-white rounded-tr-sm shadow-sm'
                      }`}
                    >
                      {/* Markdown rendering */}
                      <div className="prose prose-sm max-w-none text-body-md leading-relaxed prose-headings:font-bold prose-headings:text-jds-on-surface prose-headings:my-1.5 prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ ...props }) => (
                              <Link
                                to={props.href}
                                onClick={() => setIsOpen(false)}
                                className={`font-bold underline decoration-2 underline-offset-2 ${
                                  isAssistant ? 'text-jds-primary hover:text-jds-primary/80' : 'text-white'
                                }`}
                              >
                                {props.children}
                              </Link>
                            ),
                            table: ({ ...props }) => (
                              <div className="overflow-x-auto my-2.5 rounded-xl border border-jds-outline-variant/40 bg-white/70 shadow-xs">
                                <table className="min-w-full divide-y divide-jds-outline-variant/30 text-[11px] text-left" {...props} />
                              </div>
                            ),
                            thead: ({ ...props }) => (
                              <thead className="bg-jds-surface-container font-bold text-jds-on-surface" {...props} />
                            ),
                            th: ({ ...props }) => (
                              <th className="px-2.5 py-1.5 font-bold uppercase tracking-wider text-[10px] text-jds-on-surface" {...props} />
                            ),
                            td: ({ ...props }) => (
                              <td className="px-2.5 py-1.5 whitespace-nowrap text-jds-on-surface-variant font-medium border-t border-jds-outline-variant/20" {...props} />
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Interactive Options Buttons - Fade in once finished streaming */}
                      {isAssistant && msg.options && msg.options.length > 0 && !msg.isStreaming && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-jds-outline-variant/30"
                        >
                          {msg.options
                            .filter((opt) => opt.action !== 'OPEN_SAVINGS_CALCULATOR' && opt.label !== 'Calculate Electricity Savings' && opt.label !== 'Calculate Savings')
                            .map((opt, optIdx) => {
                            const isSelected = msg.selectedOption === opt.label
                            const hasSelection = Boolean(msg.selectedOption)

                            if (opt.url) {
                              return (
                                <Link
                                  key={optIdx}
                                  to={opt.url}
                                  onClick={() => {
                                    selectOption(opt, msg.id)
                                    setIsOpen(false)
                                  }}
                                  className={`inline-flex items-center gap-1.5 text-label-sm px-3 py-1.5 rounded-lg border transition-all text-left ${
                                    isSelected
                                      ? 'bg-jds-primary text-white border-jds-primary shadow-sm font-semibold'
                                      : hasSelection
                                      ? 'opacity-40 bg-jds-surface-container/60 text-jds-on-surface-variant/70 border-transparent pointer-events-none'
                                      : isLatestAssistant
                                      ? 'bg-white text-jds-on-surface border-jds-outline-variant hover:border-jds-primary hover:bg-jds-primary/5 active:scale-95 shadow-xs font-medium'
                                      : 'bg-jds-surface-container text-jds-on-surface-variant/70 border-transparent cursor-default pointer-events-none font-medium'
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  <HiOutlineArrowTopRightOnSquare size={12} className={isSelected ? 'text-white' : 'opacity-60'} />
                                </Link>
                              )
                            }
                            return (
                              <button
                                key={optIdx}
                                onClick={() => selectOption(opt, msg.id)}
                                disabled={isLoading || hasSelection || !isLatestAssistant}
                                className={`inline-flex items-center text-label-sm px-3 py-1.5 rounded-lg border transition-all text-left ${
                                  isSelected
                                    ? 'bg-jds-primary text-white border-jds-primary shadow-sm font-semibold cursor-default'
                                    : hasSelection
                                    ? 'opacity-40 bg-jds-surface-container/60 text-jds-on-surface-variant/70 border-transparent cursor-not-allowed pointer-events-none'
                                    : isLatestAssistant
                                    ? 'bg-white text-jds-on-surface border-jds-outline-variant hover:border-jds-primary hover:bg-jds-primary/5 active:scale-95 cursor-pointer shadow-xs font-medium'
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

                    <span className="text-[10px] text-jds-on-surface-variant/60 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                )
              })}

              {/* Typing indicator - Only shown during initial thinking pause */}
              {isLoading && !messages.some((m) => m.isStreaming) && (
                <div className="flex items-center gap-1.5 px-3 py-2 bg-jds-surface-container-low rounded-xl w-fit border border-jds-outline-variant/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-jds-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-jds-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-jds-primary animate-bounce" />
                </div>
              )}
            </main>

            {/* Input Footer */}
            <footer className="bg-jds-surface-container-low p-3 border-t border-jds-outline-variant/40">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a question or select an option..."
                  disabled={isLoading}
                  className="flex-1 bg-jds-surface rounded-xl px-3.5 py-2.5 text-body-md text-jds-on-surface border border-jds-outline-variant/50 focus:border-jds-primary focus:outline-none placeholder:text-jds-on-surface-variant/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2.5 bg-jds-primary text-white rounded-xl disabled:opacity-40 hover:bg-jds-primary/90 transition-colors shadow-sm"
                  aria-label="Send message"
                >
                  <HiOutlinePaperAirplane className="text-lg rotate-[-20deg] translate-x-0.5" />
                </button>
              </form>
              <div className="flex justify-between items-center px-1 mt-2 text-[10px] text-jds-on-surface-variant/60">
                <span>AI Solar Consultant</span>
                <Link to="/chat" onClick={() => setIsOpen(false)} className="hover:underline text-jds-primary font-semibold">
                  Open Full Screen
                </Link>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
