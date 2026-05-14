import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../context/ChatContext'
import { Link } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL

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
          history: messages.slice(-6) // Send last 6 messages for context
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
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 pt-24 pb-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-4xl flex-grow flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-orange-500/5 border border-slate-200 dark:border-slate-800 overflow-hidden relative backdrop-blur-sm">
        
        {/* Chat Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bot className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">SolarAI</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Online & Ready to Help</p>
              </div>
            </div>
          </div>
          <Sparkles className="text-orange-500 w-6 h-6 animate-pulse" />
        </div>

        {/* Messages Container */}
        <div 
          ref={scrollRef}
          className="flex-grow overflow-y-auto p-6 space-y-8 scroll-smooth"
        >
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20"
            >
              <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Bot className="text-orange-500 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How can I help you today?</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                Ask me about solar panels, pricing, installation, or finding the right system for your home in the Philippines.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                {["Best panel for small house?", "Average cost of solar?", "How does solar work?", "Recommend a budget panel"].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium transition-all text-slate-700 dark:text-slate-300 hover:border-orange-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' 
                      : 'bg-orange-500 text-white'
                  }`}>
                    {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className={`p-4 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  }`}>
                    <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-a:text-orange-200 dark:prose-a:text-orange-400 font-medium">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <Link 
                              to={props.href} 
                              className="underline decoration-2 underline-offset-4 hover:opacity-80 transition-opacity font-bold"
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
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-orange-500 transition-all shadow-inner"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask SolarAI about solar solutions..."
              className="flex-grow bg-transparent px-4 py-3 outline-none text-slate-900 dark:text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white p-3 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
            </button>
          </form>
          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-4 uppercase tracking-widest font-bold">
            SolarAI powered by OpenRouter & Supabase
          </p>
        </div>
      </div>
    </div>
  )
}
