import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HiOutlinePaperAirplane, 
  HiOutlineUser, 
  HiOutlineSparkles,
  HiOutlineCalculator,
  HiOutlineSun,
  HiOutlineMapPin,
  HiOutlineUserGroup,
  HiOutlineArrowPath,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCurrencyDollar,
  HiOutlineQuestionMarkCircle,
  HiOutlineCube
} from 'react-icons/hi2'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../context/ChatContext'
import { Link } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL

const suggestionCards = [
  { 
    title: 'Pricing Plans', 
    desc: 'Explore solar installation packages and financing options.',
    icon: HiOutlineCurrencyDollar,
    prompt: 'Show me pricing plans' 
  },
  { 
    title: 'How it Works', 
    desc: 'Learn how JD Solar can help you save on electricity.',
    icon: HiOutlineQuestionMarkCircle,
    prompt: 'How JD Solar can help me?' 
  },
  { 
    title: 'Components', 
    desc: 'Discover the high-quality solar components we use.',
    icon: HiOutlineCube,
    prompt: 'Tell me more about solar components?' 
  }
]

const SunPulse = ({ isLoading }) => {
  return (
    <div className="relative flex items-center justify-center w-64 h-64">
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
            ease: "easeInOut",
          }}
        />
      ))}
      
      {/* Sun Core */}
      <motion.div
        className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-jds-primary-container via-jds-secondary-container to-jds-primary shadow-[0_0_50px_rgba(253,184,19,0.5)] flex items-center justify-center overflow-hidden"
        animate={{
          scale: isLoading ? [1, 1.1, 1] : [1, 1.05, 1],
        }}
        transition={{
          duration: isLoading ? 0.8 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <HiOutlineSparkles className="text-white size-12 drop-shadow-md" />
        
        {/* Flare effect */}
        <motion.div
          className="absolute inset-0 bg-white/20"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ clipPath: 'polygon(50% 50%, 0 0, 100% 0)' }}
        />
      </motion.div>
    </div>
  )
}

export default function ChatboxPage() {
  const { messages, setMessages, initialMessage, setInitialMessage } = useChat()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Handle initial message from Browse/Product pages
  useEffect(() => {
    if (initialMessage) {
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

    // Add empty bot message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6)
        })
      })

      if (!response.ok) throw new Error('Failed to connect to SolarAI')

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
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1].content = "Sorry, I'm having trouble connecting right now. Please try again later!"
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col font-inter overflow-hidden sunlight-bg grain-texture relative">
      
      {/* Background Glows for Immersive feel */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-jds-primary-container/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-jds-secondary-container/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col items-center justify-start relative z-10 overflow-hidden">
        
        {/* Messages Container */}
        <div 
          ref={scrollRef}
          className="w-full flex-grow overflow-y-auto px-4 md:px-0 py-8 scroll-smooth chat-scroll"
        >
          <div className="max-w-4xl mx-auto w-full space-y-8 pb-32">
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh] text-center"
              >
                <SunPulse isLoading={isLoading} />
                
                <h2 className="text-headline-lg text-jds-on-surface font-bold tracking-tight mt-8 mb-4">
                  Experience the power of <br /> <span className="text-jds-primary">Solar AI Assist</span>
                </h2>
                <p className="text-body-md text-jds-on-surface-variant/70 max-w-lg mb-12">
                  Ask me anything about solar installation, maintenance, or specific JD Solar products.
                </p>

                {/* Bento Grid Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-4">
                  {suggestionCards.map((card, idx) => (
                    <motion.button
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * idx }}
                      onClick={() => handleSend(card.prompt)}
                      className="p-6 bg-white/40 backdrop-blur-md border border-jds-outline-variant/30 rounded-3xl text-left hover:bg-white/60 transition-all group shadow-sm hover:shadow-md"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-jds-primary-container/20 flex items-center justify-center text-jds-primary mb-4 group-hover:scale-110 transition-transform">
                        <card.icon size={20} />
                      </div>
                      <div className="text-label-md font-bold text-jds-on-surface mb-1">{card.title}</div>
                      <div className="text-[12px] text-jds-on-surface-variant/60 leading-relaxed">{card.desc}</div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-jds-outline-variant/20 ${
                      msg.role === 'user' 
                        ? 'bg-jds-primary text-white' 
                        : 'bg-white text-jds-secondary'
                    }`}>
                      {msg.role === 'user' ? <HiOutlineUser size={20} /> : <HiOutlineSparkles size={20} />}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`p-6 shadow-sm backdrop-blur-sm ${
                        msg.role === 'user'
                          ? 'bg-jds-primary/90 text-white rounded-3xl rounded-tr-none'
                          : 'bg-white/80 text-jds-on-surface border border-jds-outline-variant/30 rounded-3xl rounded-tl-none'
                      }`}>
                        <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-a:text-jds-secondary font-medium text-body-md">
                          <ReactMarkdown
                            components={{
                              a: ({ node, ...props }) => (
                                <Link 
                                  to={props.href} 
                                  className="underline decoration-2 underline-offset-4 hover:opacity-80 transition-opacity font-bold text-jds-secondary"
                                >
                                  {props.children}
                                </Link>
                              )
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          {msg.role === 'assistant' && msg.content === '' && (
                            <div className="flex gap-1.5 py-2">
                              <span className="w-2 h-2 bg-jds-secondary/40 rounded-full animate-pulse" />
                              <span className="w-2 h-2 bg-jds-secondary/40 rounded-full animate-pulse [animation-delay:0.2s]" />
                              <span className="w-2 h-2 bg-jds-secondary/40 rounded-full animate-pulse [animation-delay:0.4s]" />
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] text-jds-on-surface-variant/50 font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Area - Floating at bottom */}
        <div className="absolute bottom-8 left-0 right-0 px-4 z-20">
          <div className="max-w-3xl mx-auto">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-3 bg-white/60 backdrop-blur-xl p-2 pl-6 pr-2 rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:ring-4 focus-within:ring-jds-primary/10 transition-all group"
            >
              <HiOutlineSparkles className="text-jds-primary size-6 opacity-50 group-focus-within:opacity-100 transition-opacity" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-grow bg-transparent py-4 outline-none text-jds-on-surface text-body-md placeholder:text-jds-on-surface-variant/40"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-jds-primary text-white p-4 rounded-full transition-all disabled:opacity-30 active:scale-95 shadow-lg shadow-jds-primary/20 hover:bg-jds-primary/90"
              >
                {isLoading ? (
                  <HiOutlineArrowPath size={20} className="animate-spin" />
                ) : (
                  <HiOutlinePaperAirplane size={20} className="rotate-[-20deg] translate-x-0.5 -translate-y-0.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
