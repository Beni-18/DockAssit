import React, { useState } from 'react'
import { Send } from 'lucide-react'

/**
 * PromptBox — the fixed composer row at the bottom of the chat panel
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
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask DockMind anything... e.g. 'Restart the nginx container'"
          disabled={loading}
          className="flex-1 bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          aria-label="Send"
          className="flex items-center justify-center w-10 h-10 shrink-0 bg-primary text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          <Send size={16} strokeWidth={2} />
        </button>
      </form>

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
