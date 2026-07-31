import React from 'react'

/**
 * AIResponse — displays the AI's interpreted intent and result
 */
const AIResponse = ({ response, loading, error }) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 animate-pulse">
        <div className="flex items-center gap-2 text-muted">
          <span className="text-indigo-400">🤖</span>
          <span className="text-sm">DockMind is thinking...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">⚠️ {error}</p>
      </div>
    )
  }

  if (!response) return null

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
      {/* Intent */}
      <div className="flex items-center gap-2">
        <span className="text-indigo-400">🤖</span>
        <span className="text-sm font-medium text-indigo-300">AI Intent</span>
        <span className="text-xs text-muted ml-auto">{response.model || 'llama3'}</span>
      </div>

      {/* Interpreted command */}
      {response.intent && (
        <div className="text-sm text-muted">
          <span className="text-text">Action:</span>{' '}
          <code className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
            {response.intent.action}
          </code>{' '}
          on{' '}
          <code className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
            {response.intent.target}
          </code>
        </div>
      )}

      {/* AI explanation */}
      {response.explanation && (
        <p className="text-sm text-muted leading-relaxed">{response.explanation}</p>
      )}

      {/* Execution result */}
      {response.result && (
        <div className="rounded-lg bg-bg border border-border p-3">
          <p className="text-xs text-muted mb-1">Result</p>
          <pre className="text-xs text-green-400 whitespace-pre-wrap">{response.result}</pre>
        </div>
      )}
    </div>
  )
}

export default AIResponse
