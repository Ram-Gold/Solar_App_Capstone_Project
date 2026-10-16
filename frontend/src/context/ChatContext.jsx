/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  DECISION_TREE,
  FALLBACK_PRODUCTS,
  generateRecommendations,
  matchUserQuery,
  splitIntoSentenceSegments,
  stripEmojis,
} from '../lib/solarBotEngine'
import {
  loadChatSessions,
  saveChatSession,
  deleteChatSession,
} from '../lib/chatStorage'

const sanitizeOption = (opt) => (opt ? { ...opt, label: stripEmojis(opt.label) } : opt)
const sanitizeOptions = (opts) => (Array.isArray(opts) ? opts.map(sanitizeOption) : [])

const ChatContext = createContext()

export function ChatProvider({ children }) {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS)
  const [criteria, setCriteria] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [initialMessage, setInitialMessage] = useState(null)
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false)
  const [sessionId, setSessionId] = useState(() => `sess-${Date.now()}`)
  const [sessions, setSessions] = useState(() => loadChatSessions())
  const timersRef = useRef([])

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []
  }

  useEffect(() => {
    return () => clearAllTimers()
  }, [])

  // Auto-prune sessions older than 30 days periodically in background
  useEffect(() => {
    setSessions(loadChatSessions())
    const interval = setInterval(() => {
      setSessions(loadChatSessions())
    }, 3600000) // check hourly
    return () => clearInterval(interval)
  }, [])

  // Initialize with empty messages list until user enters or selects a query
  const [messages, setMessages] = useState(() => [])

  // Auto-save completed turns to local storage history
  useEffect(() => {
    if (
      !isLoading &&
      messages.some((m) => m.role === 'user') &&
      !messages.some((m) => m.isStreaming)
    ) {
      const updated = saveChatSession({
        id: sessionId,
        messages,
        criteria,
      })
      setSessions(updated)
    }
  }, [messages, isLoading, sessionId, criteria])

  // Fetch real-time products from Supabase on mount
  useEffect(() => {
    let isMounted = true
    async function fetchProducts() {
      try {
        const { data, error } = await supabase.from('products').select('*')
        if (!error && data && data.length > 0 && isMounted) {
          setProducts(data)
        }
      } catch (err) {
        console.warn('Using fallback products catalog:', err)
      }
    }
    fetchProducts()
    return () => {
      isMounted = false
    }
  }, [])

  // Load a past session from local history into the chat view
  const loadSession = (id) => {
    const target = sessions.find((s) => s.id === id)
    if (!target) return
    clearAllTimers()
    setIsLoading(false)
    setSessionId(target.id)
    setMessages(target.messages || [])
    setCriteria(target.criteria || {})
  }

  // Delete a session from local history
  const deleteSession = (id) => {
    const updated = deleteChatSession(id)
    setSessions(updated)
    if (sessionId === id) {
      resetChat()
    }
  }

  // Reset chat back to starting state and persist current if active
  const resetChat = () => {
    clearAllTimers()
    if (messages.some((m) => m.role === 'user')) {
      saveChatSession({
        id: sessionId,
        messages,
        criteria,
      })
      setSessions(loadChatSessions())
    }
    setCriteria({})
    setIsLoading(false)
    const newId = `sess-${Date.now()}`
    setSessionId(newId)
    setMessages([])
  }

  // Stream bot response sentence-by-sentence with dynamic AI thinking delay
  const streamBotResponse = (targetContent, targetOptions) => {
    const cleanContent = stripEmojis(targetContent)
    const cleanOptions = sanitizeOptions(targetOptions)

    // Dynamic thinking delay: 1200ms - 1900ms simulating LLM processing
    const thinkingDelay = Math.floor(Math.random() * 700) + 1200

    const thinkTimer = setTimeout(() => {
      const segments = splitIntoSentenceSegments(cleanContent)
      const botId = `bot-${Date.now()}`
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      if (!segments || segments.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'assistant',
            content: cleanContent,
            options: cleanOptions,
            isStreaming: false,
            timestamp,
          },
        ])
        setIsLoading(false)
        return
      }

      let currentIdx = 0
      let currentContent = segments[0]

      // Mount bot message with the first sentence segment
      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          role: 'assistant',
          content: currentContent,
          options: [],
          isStreaming: true,
          timestamp,
        },
      ])

      // If only 1 segment exists, complete after a short delay
      if (segments.length === 1) {
        const finishTimer = setTimeout(() => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botId
                ? {
                    ...msg,
                    content: cleanContent,
                    options: cleanOptions,
                    isStreaming: false,
                  }
                : msg
            )
          )
          setIsLoading(false)
        }, 320)
        timersRef.current.push(finishTimer)
        return
      }

      // Stream subsequent segments sentence by sentence
      const streamNext = () => {
        currentIdx++
        if (currentIdx < segments.length) {
          currentContent += segments[currentIdx]
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botId
                ? { ...msg, content: currentContent }
                : msg
            )
          )

          // Pacing per sentence: 320ms - 460ms
          const sentenceDelay = Math.floor(Math.random() * 140) + 320
          const nextTimer = setTimeout(streamNext, sentenceDelay)
          timersRef.current.push(nextTimer)
        } else {
          // Finished all segments! Reveal options and re-enable input
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botId
                ? {
                    ...msg,
                    content: cleanContent,
                    options: cleanOptions,
                    isStreaming: false,
                  }
                : msg
            )
          )
          setIsLoading(false)
        }
      }

      const firstNextTimer = setTimeout(streamNext, 340)
      timersRef.current.push(firstNextTimer)
    }, thinkingDelay)

    timersRef.current.push(thinkTimer)
  }

  // Handle clicking an interactive decision-tree option
  const selectOption = (option, messageId = null) => {
    if (!option || isLoading) return

    // If it's an action to open the savings calculator modal
    if (option.action === 'OPEN_SAVINGS_CALCULATOR') {
      setIsSavingsModalOpen(true)
      if (messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, selectedOption: option.label } : m
          )
        )
      }
      return
    }

    // When clicking Calculate Electricity Savings, open the interactive modal
    if (option.next === 'SAVINGS_INFO') {
      setIsSavingsModalOpen(true)
    }

    // If it's a link, record the selection on the message but do not generate a bot response
    if (option.url) {
      if (messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, selectedOption: option.label } : m
          )
        )
      }
      return
    }

    const userText = stripEmojis(option.label)
    const newCriteria = option.filter ? { ...criteria, ...option.filter } : criteria
    if (option.filter) {
      setCriteria(newCriteria)
    }

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => {
      let updated = prev
      if (messageId) {
        updated = prev.map((m) =>
          m.id === messageId ? { ...m, selectedOption: option.label } : m
        )
      } else {
        // Fallback: If messageId wasn't explicitly passed, mark the last assistant message that has options
        const lastAssistantIdx = [...prev]
          .reverse()
          .findIndex((m) => m.role === 'assistant' && m.options?.length)
        if (lastAssistantIdx !== -1) {
          const actualIdx = prev.length - 1 - lastAssistantIdx
          updated = prev.map((m, idx) =>
            idx === actualIdx ? { ...m, selectedOption: option.label } : m
          )
        }
      }
      return [...updated, userMsg]
    })
    setIsLoading(true)

    let targetContent
    let targetOptions

    if (option.next === 'GENERATE_RESULTS') {
      const result = generateRecommendations(products, newCriteria)
      targetContent = result.message
      targetOptions = result.options
    } else if (option.next && DECISION_TREE[option.next]) {
      const node = DECISION_TREE[option.next]
      if (option.next === 'ROOT') {
        setCriteria({})
      }
      targetContent = node.message
      targetOptions = node.options
    } else {
      // Fallback to ROOT
      targetContent = DECISION_TREE.ROOT.message
      targetOptions = DECISION_TREE.ROOT.options
    }

    streamBotResponse(targetContent, targetOptions)
  }

  // Handle user-typed free-text query
  const sendMessage = (text) => {
    if (!text || !text.trim() || isLoading) return

    const trimmed = stripEmojis(text.trim())
    if (!trimmed) return

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    const match = matchUserQuery(trimmed, products)
    streamBotResponse(match.message, match.options)
  }

  // Handle sending calculation summary from SolarSavingsCalculatorModal into chat
  const sendSavingsSummaryToChat = (summary) => {
    if (!summary || isLoading) return

    const userText = `Calculated Solar Savings: Monthly electric bill ₱${Number(summary.totalBill).toLocaleString()}, with ~${summary.outdoorPercent}% spent on outdoor lighting (₱${Number(summary.monthlyOutdoorSpend).toLocaleString()}/mo). What JD Solar lights do you recommend to eliminate this cost?`

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    const botMessage = `### Personalized Solar Savings & Equipment Recommendation

Thank you for providing your electrical bill profile. Switching your outdoor lighting to JD Solar completely eliminates this power consumption from your utility bill:

| Metric | Current Grid Power | JD Solar Off-Grid | Projected Net Savings |
|---|---|---|---|
| **Monthly Outdoor Lighting** | ~₱${Number(summary.monthlyOutdoorSpend).toLocaleString()} | **₱0.00** | **₱${Number(summary.monthlyOutdoorSpend).toLocaleString()} / mo** |
| **1-Year Energy Cost** | ~₱${Number(summary.annualSavings).toLocaleString()} | **₱0.00** | **₱${Number(summary.annualSavings).toLocaleString()} / yr** |
| **3-Year Energy Cost** | ~₱${Number(summary.threeYearSavings).toLocaleString()} | **₱0.00** | **₱${Number(summary.threeYearSavings).toLocaleString()} total** |

* **Recommended Equipment Tier:** **${summary.recommendedTier}**
* **Capital Payback Period:** Full equipment recovery estimated in less than **${summary.paybackMonths} months**.
* **Engineered Features:** Aviation-grade aluminum chassis, LiFePO4 battery pack, automatic radar dusk-to-dawn sensor, and IP65/IP67 waterproof rating.`

    const botOptions = [
      { label: 'Open Savings Calculator', action: 'OPEN_SAVINGS_CALCULATOR' },
      { label: 'Browse Full Catalog', url: '/browse' },
      { label: 'Quiapo & Cavite Branches', next: 'BRANCHES_INFO' },
      { label: 'Main Menu', next: 'ROOT' },
    ]

    streamBotResponse(botMessage, botOptions)
  }

  const sendMessageRef = useRef(sendMessage)
  useEffect(() => {
    sendMessageRef.current = sendMessage
  })

  // Handle incoming initialMessage from other pages (e.g., ProductInfoPage)
  useEffect(() => {
    if (initialMessage) {
      const timer = setTimeout(() => {
        sendMessageRef.current(initialMessage)
        setInitialMessage(null)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [initialMessage])

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        sendMessage,
        selectOption,
        resetChat,
        isLoading,
        initialMessage,
        setInitialMessage,
        products,
        isSavingsModalOpen,
        setIsSavingsModalOpen,
        openSavingsModal: () => setIsSavingsModalOpen(true),
        closeSavingsModal: () => setIsSavingsModalOpen(false),
        sendSavingsSummaryToChat,
        sessions,
        loadSession,
        deleteSession,
        sessionId,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
