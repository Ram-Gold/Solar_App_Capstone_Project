/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  DECISION_TREE,
  FALLBACK_PRODUCTS,
  generateRecommendations,
  matchUserQuery,
  splitIntoSentenceSegments,
} from '../lib/solarBotEngine'

const ChatContext = createContext()

export function ChatProvider({ children }) {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS)
  const [criteria, setCriteria] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [initialMessage, setInitialMessage] = useState(null)
  const timersRef = useRef([])

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current = []
  }

  useEffect(() => {
    return () => clearAllTimers()
  }, [])

  // Initialize with welcoming ROOT bot message
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: DECISION_TREE.ROOT.message,
      options: DECISION_TREE.ROOT.options,
      isStreaming: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

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

  // Reset chat back to starting state
  const resetChat = () => {
    clearAllTimers()
    setCriteria({})
    setIsLoading(false)
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: DECISION_TREE.ROOT.message,
        options: DECISION_TREE.ROOT.options,
        isStreaming: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }

  // Stream bot response sentence-by-sentence with dynamic AI thinking delay
  const streamBotResponse = (targetContent, targetOptions) => {
    // Dynamic thinking delay: 1200ms - 1900ms simulating LLM processing
    const thinkingDelay = Math.floor(Math.random() * 700) + 1200

    const thinkTimer = setTimeout(() => {
      const segments = splitIntoSentenceSegments(targetContent)
      const botId = `bot-${Date.now()}`
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      if (!segments || segments.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: 'assistant',
            content: targetContent,
            options: targetOptions,
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
                    content: targetContent,
                    options: targetOptions,
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
                    content: targetContent,
                    options: targetOptions,
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
  const selectOption = (option) => {
    if (!option || isLoading) return

    // If it's a link, routing is handled by Link component
    if (option.url) return

    const userText = option.label
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

    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    let targetContent = ''
    let targetOptions = []

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

    const trimmed = text.trim()
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

  // Handle incoming initialMessage from other pages (e.g., ProductInfoPage)
  useEffect(() => {
    if (initialMessage) {
      const timer = setTimeout(() => {
        sendMessage(initialMessage)
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
