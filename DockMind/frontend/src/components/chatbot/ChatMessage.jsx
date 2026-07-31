import React from 'react'
import { Terminal, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

/**
 * ChatMessage — renders one bubble in the DockMind chat thread.
 * User messages are right-aligned; assistant replies (intent/result/reply/
 * error) are left-aligned.
 */
const ChatMessage = ({ message }) => {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-white px-4 py-2.5 text-sm">
          {message.prompt}
        </div>
      </div>
    )
  }

  if (message.loading) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-2.5 text-sm text-muted animate-pulse">
          DockMind is thinking...
        </div>
      </div>
    )
  }

  if (message.error) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger flex items-start gap-2">
          <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{message.error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border bg-surface px-4 py-3 text-sm space-y-2">
        {message.intent && (
          <div className="flex items-center gap-2 text-muted">
            <Terminal size={14} strokeWidth={2} className="text-primary shrink-0" />
            <span>
              <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded">{message.intent.action}</code>
              {' '}on{' '}
              <code className="text-accent bg-accent/10 px-1.5 py-0.5 rounded">{message.intent.target}</code>
            </span>
          </div>
        )}

        {message.reply && <p className="text-muted leading-relaxed">{message.reply}</p>}

        {message.result && (
          <div className="rounded-lg bg-bg border border-border p-2.5 flex items-start gap-2">
            {message.result.success ? (
              <CheckCircle2 size={16} strokeWidth={2} className="text-success mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} strokeWidth={2} className="text-danger mt-0.5 shrink-0" />
            )}
            <span className="text-xs text-text leading-relaxed">{message.result.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage
