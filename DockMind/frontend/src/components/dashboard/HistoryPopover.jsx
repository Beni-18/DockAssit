import React, { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { getHistory } from '../../services/history'
import { formatRelativeTime } from '../../utils/formatters'

const RECENT_LIMIT = 10

/**
 * HistoryPopover — a small window of recent command history, opened from a
 * clock icon in the chat panel header. Reuses the same getHistory() call as
 * the full History page; only fetches when opened.
 */
const HistoryPopover = () => {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const handleOpenChange = (open) => {
    if (!open) return
    setLoading(true)
    getHistory()
      .then((data) => setEntries(data.slice(0, RECENT_LIMIT)))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }

  return (
    <DropdownMenu.Root onOpenChange={handleOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Recent history"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-primary hover:bg-bg transition-colors"
        >
          <Clock size={16} strokeWidth={2} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-surface shadow-xl p-2 z-50"
        >
          <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wide">
            Recent Activity
          </div>

          {loading ? (
            <p className="px-2 py-4 text-sm text-muted text-center">Loading...</p>
          ) : entries.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted text-center">No history yet.</p>
          ) : (
            <div className="space-y-1">
              {entries.map((h) => (
                <div key={h.id} className="px-2 py-2 rounded-lg hover:bg-bg transition-colors">
                  <div className="flex items-start gap-2">
                    {h.success ? (
                      <CheckCircle2 size={14} strokeWidth={2} className="text-success mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={14} strokeWidth={2} className="text-danger mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text truncate">{h.prompt}</p>
                      <p className="text-xs text-muted mt-0.5">
                        <span className="font-mono text-primary">{h.action}</span>
                        {' · '}
                        {formatRelativeTime(h.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DropdownMenu.Separator className="my-2 h-px bg-border" />

          <Link
            to="/history"
            className="block text-center text-xs text-primary hover:opacity-80 py-1.5 transition-opacity"
          >
            View all history
          </Link>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default HistoryPopover
