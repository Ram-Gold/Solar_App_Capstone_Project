import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '../context/ChatContext'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import {
  HiOutlineCpuChip,
  HiOutlineXMark,
  HiOutlineArrowPath,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
} from 'react-icons/hi2'

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, sendMessage, selectOption, resetChat, isLoading, initialMessage } = useChat()
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
      setIsOpen(true)
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
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-jds-primary to-jds-primary-container text-jds-on-primary rounded-full shadow-2xl flex items-center justify-center z-[100] hover:scale-105 active:scale-95 transition-transform group"
            aria-label="Open JD Solar Assistant"
          >
            <HiOutlineSparkles className="text-2xl animate-pulse" />
            <span className="absolute -top-10 right-0 bg-jds-surface-container-highest text-jds-on-surface text-[12px] font-semibold px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
              Need Solar Help? Chat with us!
            </span>
          </motion.button>
        )}
      </AnimatePresence>

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
                          {msg.options.map((opt, optIdx) => {
                            if (opt.url) {
                              return (
                                <Link
                                  key={optIdx}
                                  to={opt.url}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center text-label-sm font-semibold bg-jds-primary-container text-jds-on-primary-container px-3 py-1.5 rounded-lg border border-jds-primary/20 hover:opacity-90 transition-all active:scale-95"
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
                                className={`inline-flex items-center text-label-sm font-medium px-3 py-1.5 rounded-lg border transition-all text-left ${
                                  isLatestAssistant
                                    ? 'bg-white text-jds-on-surface border-jds-outline-variant hover:border-jds-primary hover:bg-jds-primary/5 active:scale-95 cursor-pointer shadow-sm'
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
                  Open Full Screen ↗
                </Link>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
