import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Terminal, Circle } from 'lucide-react'
import AppShell from '../../components/common/ui/AppShell'
import PageHeader from '../../components/common/ui/PageHeader'
import Card from '../../components/common/ui/Card'
import ConfirmDialog from '../../components/common/ui/ConfirmDialog'
import { SkeletonRows } from '../../components/common/ui/Skeleton'
import { formatDateTime } from '../../utils/formatters'
import { getHistory, deleteHistoryEntry } from '../../services/history'

const History = () => {
  const [history, setHistory]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [removeTarget, setRemoveTarget] = useState(null)

  useEffect(() => {
    getHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id) => {
    await deleteHistoryEntry(id)
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }

  return (
    <AppShell>
      <PageHeader title="Command History" subtitle="All past Docker commands and AI executions." />

      <Card className="overflow-hidden" animate={false}>
        {loading ? (
          <SkeletonRows rows={6} cols={6} />
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)' }}
            >
              <Terminal className="w-5 h-5 text-muted" />
            </div>
            <p className="text-sm text-muted">No command history yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                  {['Prompt', 'Action', 'Target', 'Result', 'Time', ''].map((h, i) => (
                    <th
                      key={i}
                      className="px-5 py-4 text-left text-2xs font-bold text-muted uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <motion.tr
                    key={h.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    className="group/row data-row"
                    style={{ borderBottom: '1px solid var(--color-glass-border)' }}
                  >
                    <td className="px-5 py-3.5 text-xs text-muted max-w-[220px] truncate">{h.prompt}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-2xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {h.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-2xs font-semibold" style={{ color: 'var(--color-glow)' }}>
                        {h.target}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-2xs font-bold px-2.5 py-1 rounded-full"
                        style={
                          h.success
                            ? { background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.25)' }
                            : { background: 'rgba(239,68,68,0.1)',  color: 'var(--color-danger)',  border: '1px solid rgba(239,68,68,0.25)' }
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: h.success ? 'var(--color-success)' : 'var(--color-danger)' }}
                        />
                        {h.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-2xs text-muted font-mono">{formatDateTime(h.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setRemoveTarget(h.id)}
                        className="row-actions p-1.5 rounded-lg transition-all duration-150"
                        style={{ color: 'rgba(239,68,68,0.6)' }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
                          e.currentTarget.style.color = 'var(--color-danger)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'rgba(239,68,68,0.6)'
                        }}
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Delete history entry?"
        description="This removes the entry from your command history. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => removeTarget && handleDelete(removeTarget)}
      />
    </AppShell>
  )
}

export default History
