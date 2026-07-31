import React, { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/common/Sidebar'
import api from '../../services/api'
import { Bot, User, Send, Sparkles, RefreshCw, Terminal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

const SUGGESTED_PROMPTS = [
  'Show running containers',
  'Restart all containers',
  'Check system resource usage',
  'Show container logs',
  'Show disk usage',
  'System health summary',
]

const AIAssistant = () => {
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      content: 'Hello! I am your AI assistant. How can I help you with your Docker environment today?',
      timestamp: '10:30 AM',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // If we have URL params (like logs check from Containers page)
    const command = searchParams.get('command')
    const container = searchParams.get('container')
    if (command === 'logs' && container) {
      handleSend(`Show logs for container ${container}`)
    }
  }, [searchParams])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (textToSend) => {
    const prompt = textToSend || input
    if (!prompt.trim()) return

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const res = await api.post('/ai/execute', { prompt })
      
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        content: res.data.response || 'Action completed successfully.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: res.data.action,
        target: res.data.target,
        success: res.data.success
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        content: err.response?.data?.detail || 'Sorry, I encountered an error executing that command.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border bg-surface flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-text">
              <Bot className="w-5 h-5 text-primary" />
              AI Assistant
            </h2>
            <p className="text-xs text-muted">Ask anything about your Docker containers and infrastructure.</p>
          </div>
          <button 
            onClick={() => setMessages([{
              id: 1,
              sender: 'bot',
              content: 'Hello! I am your AI assistant. How can I help you with your Docker environment today?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }])}
            className="p-2 text-muted hover:text-text border border-border hover:border-primary rounded-xl transition-all"
            title="Clear Chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Layout Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages Panel */}
          <div className="flex-1 flex flex-col h-full bg-bg">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-3xl ${
                    msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm border ${
                    msg.sender === 'user' 
                      ? 'bg-primary border-primary/20' 
                      : 'bg-surface border-border text-primary'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5" />}
                  </div>

                  {/* Bubble */}
                  <div className="space-y-1.5">
                    <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-white rounded-tr-none' 
                        : msg.isError 
                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-none'
                        : 'bg-surface border border-border text-text rounded-tl-none'
                    }`}>
                      {msg.content}

                      {/* Display action status if relevant */}
                      {msg.action && (
                        <div className="mt-3.5 pt-3 border-t border-border flex items-center gap-2 text-xs font-mono bg-bg/50 px-3 py-2 rounded-lg">
                          <Terminal className="w-4.5 h-4.5 text-primary" />
                          <span className="text-muted">Action:</span>
                          <span className="font-semibold text-primary">{msg.action}</span>
                          <span className="text-muted">Target:</span>
                          <span className="font-semibold text-text">{msg.target}</span>
                          <span className={`ml-auto font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                            msg.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {msg.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`block text-[10px] text-muted ${msg.sender === 'user' ? 'text-right' : ''}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 max-w-lg">
                  <div className="w-8 h-8 rounded-xl bg-surface border border-border text-primary flex items-center justify-center shrink-0">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div className="bg-surface border border-border text-muted p-4 rounded-2xl rounded-tl-none text-sm flex items-center gap-2 shadow-sm">
                    <Sparkles className="w-4 h-4 text-primary animate-spin" />
                    DockMind is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <div className="p-4 border-t border-border bg-surface">
              <form 
                onSubmit={e => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex gap-3"
              >
                <input
                  type="text"
                  placeholder="Ask anything about Docker..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-text transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-4 bg-primary hover:bg-primary/95 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Suggested Prompts Side Column */}
          <div className="w-64 border-l border-border bg-surface/50 p-5 hidden md:block overflow-y-auto">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Suggested Prompts
            </h3>
            <div className="space-y-2.5">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="w-full text-left p-3 text-xs bg-surface border border-border rounded-xl text-text hover:border-primary transition-all duration-200 font-medium leading-relaxed block"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AIAssistant
