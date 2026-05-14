import { createContext, useContext, useState } from 'react'

const ChatContext = createContext()

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [initialMessage, setInitialMessage] = useState(null)

  const sendMessage = (content) => {
    // Just set it as the initial message so ChatboxPage can pick it up and handle the logic
    setInitialMessage(content)
  }

  return (
    <ChatContext.Provider value={{ messages, setMessages, sendMessage, initialMessage, setInitialMessage }}>
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
