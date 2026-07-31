import React, { useEffect, useRef, useState } from 'react'
import HistoryPopover from '../dashboard/HistoryPopover'
import PromptBox from './PromptBox'
import ChatMessage from './ChatMessage'
import { executeDockerAction } from '../../services/docker'
import { interpretPrompt, chatWithAI } from '../../services/ai'

// Docker actions the quick prompt box can execute directly. Anything else
// (e.g. "list", "logs", non-container resources) falls back to a chat reply.
//
// NOTE for whoever picks up the AI/Docker execution work: this whole
// interpret -> narrow-action-check -> execute-or-chat flow is the thing to
// replace with a single backend-orchestrated endpoint (see the project's
// task split doc). Everything in this file is self-contained on purpose —
// it owns its own state and only imports from services/ai.js,
// services/docker.js, and the two sibling components in this folder.
const EXECUTABLE_ACTIONS = ['start', 'stop', 'restart', 'remove']

let messageSeq = 0
const nextId = (prefix) => `${prefix}-${++messageSeq}`

/**
 * ChatPanel — the self-contained "Ask DockMind" chat panel: header (title +
 * history popover), scrolling message thread, and composer. Fully
 * independent of the Dashboard page around it — no props in, no callbacks
 * out. Container-table refresh after a chat-driven action happens via
 * useContainers' own polling, not via a callback into this component.
 */
const ChatPanel = () => {
  const [messages, setMessages] = useState([])
  const threadRef = useRef(null)

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const isAiBusy = messages.some((m) => m.loading)

  const handlePrompt = async (prompt) => {
    const userMessage = { id: nextId('u'), role: 'user', prompt }
    const pendingId = nextId('a')
    setMessages((prev) => [...prev, userMessage, { id: pendingId, role: 'assistant', loading: true }])

    const updatePending = (patch) =>
      setMessages((prev) => prev.map((m) => (m.id === pendingId ? { ...m, loading: false, ...patch } : m)))

    // Not every valid prompt maps cleanly onto {action, resource, target}
    // (e.g. "list all containers" has no single target) — interpret is
    // best-effort, and any failure here just falls through to a chat reply.
    let intent = null
    try {
      intent = await interpretPrompt(prompt)
    } catch {
      intent = null
    }

    try {
      if (intent && intent.resource === 'container' && EXECUTABLE_ACTIONS.includes(intent.action)) {
        const result = await executeDockerAction(intent.action, intent.target)
        updatePending({ intent, result })
      } else {
        const chat = await chatWithAI(prompt)
        updatePending({ intent, reply: chat.response })
      }
    } catch (err) {
      updatePending({ error: err.response?.data?.detail || 'AI request failed.' })
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface flex flex-col h-[26rem]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Ask DockMind</h3>
        <HistoryPopover />
      </div>

      <div ref={threadRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted text-center mt-10">
            Ask DockMind to manage a container, or anything else about Docker.
          </p>
        ) : (
          messages.map((m) => <ChatMessage key={m.id} message={m} />)
        )}
      </div>

      <div className="p-3 border-t border-border">
        <PromptBox onSubmit={handlePrompt} loading={isAiBusy} />
      </div>
    </div>
  )
}

export default ChatPanel
