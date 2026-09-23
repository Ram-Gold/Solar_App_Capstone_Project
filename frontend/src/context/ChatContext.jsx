/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  DECISION_TREE,
  FALLBACK_PRODUCTS,
  generateRecommendations,
  matchUserQuery,
} from '../lib/solarBotEngine'

const ChatContext = createContext()

export function ChatProvider({ children }) {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS)
  const [criteria, setCriteria] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [initialMessage, setInitialMessage] = useState(null)

  // Initialize with welcoming ROOT bot message
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: DECISION_TREE.ROOT.message,
      options: DECISION_TREE.ROOT.options,
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
    setCriteria({})
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: DECISION_TREE.ROOT.message,
        options: DECISION_TREE.ROOT.options,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
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

    setTimeout(() => {
      let botResponse = null

      if (option.next === 'GENERATE_RESULTS') {
        const result = generateRecommendations(products, newCriteria)
        botResponse = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: result.message,
          options: result.options,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      } else if (option.next && DECISION_TREE[option.next]) {
        const node = DECISION_TREE[option.next]
        if (option.next === 'ROOT') {
          setCriteria({})
        }
        botResponse = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: node.message,
          options: node.options,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      } else {
        // Fallback to ROOT
        botResponse = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: DECISION_TREE.ROOT.message,
          options: DECISION_TREE.ROOT.options,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      }

      setMessages((prev) => [...prev, botResponse])
      setIsLoading(false)
    }, 280)
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

    setTimeout(() => {
      const match = matchUserQuery(trimmed, products)
      const botResponse = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: match.message,
        options: match.options,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, botResponse])
      setIsLoading(false)
    }, 280)
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
