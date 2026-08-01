import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../../components/common/ui/AppShell'
import Button from '../../components/common/ui/Button'
import MessageContent from '../../components/common/MessageContent'
import { useChat } from '../../context/ChatContext'
import { Bot, User, Send, Sparkles, RefreshCw, Terminal, Boxes, Activity, HardDrive, Zap } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { getAiHealth } from '../../services/ai'

const SUGGESTED_PROMPTS = [
  { text: 'Show running containers', icon: Boxes,    color: 'var(--color-primary)' },
  { text: 'Restart all containers', icon: RefreshCw, color: 'var(--color-warning)' },
  { text: 'Check resource usage',   icon: Activity,  color: 'var(--color-glow)' },
  { text: 'Show container logs',    icon: Terminal,  color: 'var(--color-primary)' },
  { text: 'Show disk usage',        icon: HardDrive, color: 'var(--color-glow)' },
  { text: 'System health summary',  icon: Sparkles,  color: 'var(--color-warning)' },
]

const TypingIndicator = () => (
  <div className="flex gap-1.5 items-center h-5">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--color-glow)' }}
        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
      />
    ))}
  </div>
)

const AIAssistant = () => {
  const [searchParams] = useSearchParams()
  const { messages, loading, sendMessage, confirmAction, cancelAction, clearChat } = useChat()
  const [input, setInput] = useState('')
  const [aiHealth, setAiHealth] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const command = searchParams.get('command')
    const container = searchParams.get('container')
    const prompt = searchParams.get('prompt')
    if (command === 'logs' && container) sendMessage(`Show logs for container ${container}`)
    if (prompt) sendMessage(prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Real connectivity status, not an assumed/hardcoded label — polled so it
  // reflects Ollama actually going down or coming back up while the page is open.
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const health = await getAiHealth()
        if (!cancelled) setAiHealth(health)
      } catch {
        if (!cancelled) setAiHealth({ connected: false })
      }
    }
    poll()
    const id = setInterval(poll, 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
    inputRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <AppShell contentClassName="p-0 flex flex-col">
      {/* ── Header ── */}
      <div
        className="shrink-0 px-6 py-4 flex items-center justify-between relative z-10"
        style={{
          background: 'var(--color-panel)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--color-glass-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(36,150,237,0.15))',
              border: '1px solid rgba(0,212,255,0.3)',
              boxShadow: '0 0 20px -6px rgba(0,212,255,0.5)',
            }}
          >
            <Bot className="w-4.5 h-4.5" style={{ width: '18px', height: '18px', color: 'var(--color-glow)' }} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text" style={{ letterSpacing: '-0.02em' }}>DockMind AI</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${aiHealth?.connected ? 'bg-success' : 'bg-danger'}`}
                style={{ boxShadow: `0 0 6px var(--color-${aiHealth?.connected ? 'success' : 'danger'})` }}
              />
              <span className="text-2xs text-muted font-medium">
                {aiHealth === null
                  ? 'Checking · Ollama'
                  : aiHealth.connected
                  ? `Connected · ${aiHealth.model}`
                  : 'Disconnected · Ollama'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-2.5 rounded-xl text-muted hover:text-text transition-all duration-200"
          style={{ border: '1px solid var(--color-glass-border)', background: 'var(--color-surface)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'}
          title="Clear Chat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Messages area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* Empty state */}
            {isEmpty && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center justify-center h-full py-20 text-center"
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 animate-float"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(36,150,237,0.1))',
                    border: '1px solid rgba(0,212,255,0.25)',
                    boxShadow: '0 0 40px -8px rgba(0,212,255,0.4)',
                  }}
                >
                  <Bot className="w-10 h-10" style={{ color: 'var(--color-glow)' }} />
                </div>
                <h3 className="text-xl font-bold text-text mb-2" style={{ letterSpacing: '-0.03em' }}>
                  How can I help?
                </h3>
                <p className="text-sm text-muted max-w-sm leading-relaxed">
                  Ask me anything about your Docker containers, images, volumes, or infrastructure.
                </p>
                {/* Quick chips */}
                <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-md">
                  {['Show all containers', 'System health check', 'View running stats'].map((t) => (
                    <button
                      key={t}
                      onClick={() => sendMessage(t)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                      style={{
                        background: 'rgba(0,212,255,0.08)',
                        border: '1px solid rgba(0,212,255,0.2)',
                        color: 'var(--color-glow)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'ml-auto flex-row-reverse max-w-xl' : 'max-w-2xl'}`}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white"
                    style={
                      msg.sender === 'user'
                        ? {
                            background: 'linear-gradient(135deg, #2496ed, #1a75c4)',
                            boxShadow: '0 0 16px -4px rgba(36,150,237,0.5)',
                          }
                        : {
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-glass-border)',
                            color: 'var(--color-glow)',
                          }
                    }
                  >
                    {msg.sender === 'user'
                      ? <User style={{ width: '14px', height: '14px' }} />
                      : <Bot style={{ width: '14px', height: '14px', color: 'var(--color-glow)' }} />}
                  </div>

                  {/* Bubble */}
                  <div className="space-y-1 max-w-full">
                    <div
                      className="px-4 py-3 text-sm leading-relaxed"
                      style={
                        msg.sender === 'user'
                          ? {
                              background: 'linear-gradient(135deg, #2496ed, #1a75c4)',
                              color: '#fff',
                              borderRadius: '18px 18px 4px 18px',
                              boxShadow: '0 4px 20px rgba(36,150,237,0.25)',
                            }
                          : msg.isError
                          ? {
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              color: 'var(--color-danger)',
                              borderRadius: '18px 18px 18px 4px',
                            }
                          : {
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-glass-border)',
                              color: 'var(--color-text)',
                              borderRadius: '18px 18px 18px 4px',
                              backdropFilter: 'blur(16px)',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                            }
                      }
                    >
                      {msg.sender === 'user' ? (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      ) : (
                        <MessageContent text={msg.content} />
                      )}

                      {msg.action && !msg.needsConfirmation && (
                        <div
                          className="mt-3 pt-3 flex items-center gap-2 text-xs font-mono rounded-xl px-3 py-2"
                          style={{ borderTop: '1px solid var(--color-glass-border)', background: 'var(--color-bg)' }}
                        >
                          <Terminal className="w-4 h-4" style={{ color: 'var(--color-glow)' }} />
                          <span className="text-muted">Action:</span>
                          <span style={{ color: 'var(--color-glow)' }} className="font-semibold">{msg.action}</span>
                          <span className="text-muted">→</span>
                          <span className="text-text font-semibold">{msg.target}</span>
                          <span
                            className="ml-auto text-2xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: msg.success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                              color: msg.success ? 'var(--color-success)' : 'var(--color-danger)',
                            }}
                          >
                            {msg.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </div>
                      )}

                      {msg.needsConfirmation && (
                        <div className="mt-3 pt-3 flex gap-2" style={{ borderTop: '1px solid var(--color-glass-border)' }}>
                          <Button variant="danger" size="sm" shape="rounded" onClick={() => confirmAction(msg)}>
                            Yes, proceed
                          </Button>
                          <Button variant="glass" size="sm" shape="rounded" onClick={() => cancelAction(msg)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                    <span className={`block text-2xs text-muted ${msg.sender === 'user' ? 'text-right' : ''}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 max-w-sm"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-glass-border)',
                  }}
                >
                  <Bot style={{ width: '14px', height: '14px', color: 'var(--color-glow)' }} />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-glass-border)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ── */}
          <div
            className="shrink-0 px-6 py-4"
            style={{
              background: 'var(--color-panel)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid var(--color-glass-border)',
            }}
          >
            <form onSubmit={handleSubmit} className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask anything about Docker…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  className="input-base pr-4"
                  style={{ borderRadius: '16px', paddingLeft: '18px', paddingTop: '14px', paddingBottom: '14px' }}
                />
              </div>
              <motion.button
                type="submit"
                disabled={loading || !input.trim()}
                whileHover={input.trim() ? { scale: 1.08 } : {}}
                whileTap={input.trim() ? { scale: 0.93 } : {}}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{
                  background: input.trim()
                    ? 'linear-gradient(135deg, #2496ed, #00d4ff)'
                    : 'var(--color-surface)',
                  border: input.trim() ? 'none' : '1px solid var(--color-glass-border)',
                  boxShadow: input.trim() ? '0 0 20px -4px rgba(0,212,255,0.5)' : 'none',
                  color: input.trim() ? '#fff' : 'var(--color-muted)',
                }}
              >
                <Send style={{ width: '16px', height: '16px' }} />
              </motion.button>
            </form>
          </div>
        </div>

        {/* ── Suggested Prompts Side Column ── */}
        <div
          className="w-64 shrink-0 hidden md:flex flex-col overflow-y-auto px-4 py-5 gap-2"
          style={{
            borderLeft: '1px solid var(--color-glass-border)',
            background: 'var(--color-panel)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--color-glow)' }} />
            <span className="text-2xs font-bold text-muted uppercase tracking-widest">Quick Actions</span>
          </div>
          {SUGGESTED_PROMPTS.map((p, i) => {
            const Icon = p.icon
            return (
              <motion.button
                key={i}
                whileHover={{ x: 3, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => { sendMessage(p.text); setInput('') }}
                disabled={loading}
                className="w-full text-left flex items-center gap-2.5 px-3 py-3 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid var(--color-glass-border)',
                  color: 'var(--color-text-dim)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${p.color}0f`
                  e.currentTarget.style.borderColor = `${p.color}35`
                  e.currentTarget.style.color = p.color
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                  e.currentTarget.style.borderColor = 'var(--color-glass-border)'
                  e.currentTarget.style.color = 'var(--color-text-dim)'
                }}
              >
                <Icon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                <span className="leading-tight">{p.text}</span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}

export default AIAssistant
