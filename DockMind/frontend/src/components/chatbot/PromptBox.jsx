import React, { useState } from 'react'

/**
 * PromptBox — natural language input for AI Docker commands
 */
const PromptBox = ({ onSubmit, loading }) => {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!prompt.trim()) return
    onSubmit?.(prompt.trim())
    setPrompt('')
  }

  const suggestions = [
    'Show all running containers',
    'Restart the redis container',
    'Stop all stopped containers',
    'Check memory usage of nginx',
  ]

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask DockMind anything... e.g. 'Restart the nginx container'"
          disabled={loading}
          className="flex-1 bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '...' : 'Ask AI'}
        </button>
      </form>

      {/* Quick suggestion chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPrompt(s)}
            className="px-3 py-1.5 text-xs rounded-full border border-border text-muted hover:border-primary hover:text-primary transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default PromptBox
