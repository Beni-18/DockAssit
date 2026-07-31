import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const ChatContext = createContext(null)

const STORAGE_KEY = 'dockmind_chat_messages'

const timestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const greeting = () => ({
  id: Date.now(),
  sender: 'bot',
  content: 'Hello! I am your AI assistant. How can I help you with your Docker environment today?',
  timestamp: timestamp(),
})

const loadStoredMessages = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length ? parsed : [greeting()]
  } catch {
    return [greeting()]
  }
}

/**
 * ChatProvider — keeps AI Assistant conversation state at the app level (not
 * inside the page component), so navigating to another feature and back
 * doesn't wipe the chat. Also mirrors to localStorage so a page refresh
 * doesn't lose it either.
 */
export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState(loadStoredMessages)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // Storage full or unavailable — chat still works for this session, it just won't persist.
    }
  }, [messages])

  const sendMessage = useCallback(async (textToSend, options = {}) => {
    const { skipUserBubble = false, confirmed = false } = options
    const prompt = textToSend?.trim()
    if (!prompt) return

    if (!skipUserBubble) {
      setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', content: prompt, timestamp: timestamp() }])
    }
    setLoading(true)

    try {
      const res = await api.post('/ai/execute', { prompt, confirmed })
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          content: res.data.response || 'Action completed successfully.',
          timestamp: timestamp(),
          action: res.data.action,
          target: res.data.target,
          success: res.data.success,
          needsConfirmation: res.data.needs_confirmation,
          confirmPrompt: res.data.needs_confirmation ? prompt : undefined,
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          content: err.response?.data?.detail || 'Sorry, I encountered an error executing that command.',
          timestamp: timestamp(),
          isError: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  const resolveConfirmation = useCallback((msgId) => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, needsConfirmation: false } : m)))
  }, [])

  const confirmAction = useCallback(
    (msg) => {
      resolveConfirmation(msg.id)
      sendMessage(msg.confirmPrompt, { skipUserBubble: true, confirmed: true })
    },
    [resolveConfirmation, sendMessage]
  )

  const cancelAction = useCallback(
    (msg) => {
      resolveConfirmation(msg.id)
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'bot', content: 'Cancelled — nothing was changed.', timestamp: timestamp() },
      ])
    },
    [resolveConfirmation]
  )

  const clearChat = useCallback(() => {
    setMessages([greeting()])
  }, [])

  return (
    <ChatContext.Provider value={{ messages, loading, sendMessage, confirmAction, cancelAction, clearChat }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChat must be used within ChatProvider')
  return context
}
