import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChat } from '../context/ChatContext'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import {
  HiOutlineCpuChip,
  HiOutlineXMark,
  HiOutlineCalculator,
  HiOutlineSun,
  HiOutlineMapPin,
  HiOutlineUserGroup,
} from 'react-icons/hi2'
import { HiOutlinePaperAirplane } from 'react-icons/hi2'

const API_URL = import.meta.env.VITE_API_URL

const quickActions = [
  { icon: HiOutlineCalculator, label: 'Estimate Savings' },
  { icon: HiOutlineSun, label: 'Panel Types' },
  { icon: HiOutlineMapPin, label: 'Quiapo Office' },
  { icon: HiOutlineUserGroup, label: 'Speak to Expert' },
]

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, setMessages, initialMessage, setInitialMessage } = useChat()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (initialMessage) {
      setIsOpen(true)
      handleSend(initialMessage)
      setInitialMessage(null)
    }
  }, [initialMessage])

  const handleSend = async (text = input) => {
    if (!text.trim() || isLoading) return

    const userMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6),
        }),
      })

      if (!response.ok) throw new Error('Failed to connect')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let fullContent = ''

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk

        setMessages((prev) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1].content = fullContent
          return newMessages
        })
      }
    } catch {
      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1].content =
          "Sorry, I'm having trouble connecting. Please try again!"
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (label) => {
    handleSend(label)
  }

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-8 right-8 w-16 h-16 bg-jds-primary-container text-jds-on-primary-container rounded-full shadow-2xl flex items-center justify-center z-[100] hover:scale-110 transition-transform active:scale-95 group"
            aria-label="Open AI Assistant"
          >
            <HiOutlineCpuChip className="text-[32px]" />
            <span className="absolute -top-12 right-0 bg-jds-surface-container-highest text-jds-on-surface text-label-sm px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
              Chat with JD Assistant
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-jds-surface-container-lowest rounded-xl shadow-2xl flex flex-col border border-jds-outline-variant overflow-hidden z-[100]"
          >
            {/* Header */}
            <header className="bg-jds-surface-container-low px-6 py-4 flex items-center justify-between border-b border-jds-outline-variant">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-jds-primary-container flex items-center justify-center shadow-sm">
                  <HiOutlineCpuChip className="text-jds-on-primary-container text-xl" />
                </div>
                <div>
                  <h2 className="text-label-md text-jds-on-surface font-semibold">SolarAI Assistant</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-jds-secondary" />
                    <span className="text-label-sm text-jds-on-surface-variant">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-jds-on-surface-variant hover:bg-jds-surface-container-high p-1.5 rounded-lg transition-colors"
              >
                <HiOutlineXMark className="text-xl" />
              </button>
            </header>

            {/* Chat Messages */}
            <main ref={scrollRef} className="flex-1 overflow-y-auto p-6 chat-scroll bg-jds-surface">
              <div className="space-y-6">
                {/* Default welcome message */}
                {messages.length === 0 && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-jds-primary-container flex-shrink-0 flex items-center justify-center">
                        <HiOutlineCpuChip className="text-sm text-jds-on-primary-container" />
                      </div>
                      <div className="flex flex-col gap-1 max-w-[85%]">
                        <div className="bg-jds-surface-container-high px-4 py-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-jds-outline-variant">
                          <p className="text-body-md text-jds-on-surface">
                            Hi! I'm your JD Solar assistant. How can I help you find the perfect solar solution today?
                          </p>
                        </div>
                        <span className="text-[10px] text-jds-on-surface-variant ml-1">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {quickActions.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => handleQuickAction(action.label)}
                          className="bg-jds-surface-container-low border border-jds-outline-variant hover:border-jds-primary px-3 py-2 rounded-lg text-left transition-all group"
                        >
                          <action.icon className="text-jds-primary block mb-1 text-xl" />
                          <span className="text-label-sm text-jds-on-surface group-hover:text-jds-primary">
                            {action.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Message history */}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''} gap-3`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-jds-primary-container flex-shrink-0 flex items-center justify-center">
                        <HiOutlineCpuChip className="text-sm text-jds-on-primary-container" />
                      </div>
                    )}
                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : ''} gap-1 max-w-[85%]`}>
                      <div
                        className={
                          msg.role === 'user'
                            ? 'bg-jds-primary-container px-4 py-3 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-sm'
                            : 'bg-jds-surface-container-high px-4 py-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-jds-outline-variant'
                        }
                      >
                        {msg.content ? (
                          <div className="text-body-md prose prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                a: ({ node, ...props }) => (
                                  <Link
                                    to={props.href}
                                    className="underline text-jds-secondary font-bold"
                                  >
                                    {props.children}
                                  </Link>
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <div className="flex gap-1 items-center h-5">
                            <div className="w-1.5 h-1.5 bg-jds-outline rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-jds-outline rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-jds-outline rounded-full animate-bounce" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </main>

            {/* Input */}
            <footer className="bg-jds-surface-container-lowest p-4 border-t border-jds-outline-variant">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="relative flex items-center"
              >
                <input
                  className="w-full bg-jds-surface-variant border-none rounded-lg pl-4 pr-12 py-3 text-body-md text-jds-on-surface focus:ring-2 focus:ring-jds-secondary-container transition-all placeholder:text-jds-on-surface-variant/50 outline-none"
                  placeholder="Type your message..."
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 p-2 bg-jds-primary-container hover:bg-jds-primary-fixed-dim text-jds-on-primary-container rounded-lg transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
                >
                  <HiOutlinePaperAirplane className="text-xl" />
                </button>
              </form>
              <div className="flex justify-center mt-3">
                <p className="text-[10px] text-jds-on-surface-variant/70 flex items-center gap-1">
                  ⚡ Powered by JD Solar Intelligence
                </p>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
