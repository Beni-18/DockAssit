import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/common/Sidebar'
import { formatDateTime } from '../../utils/formatters'
import { getHistory, deleteHistoryEntry } from '../../services/history'

const History = () => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

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
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Command History</h2>
          <p className="text-muted text-sm mt-1">All past Docker commands and AI executions</p>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-6 text-muted text-sm">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="p-6 text-muted text-sm">No command history yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-left">
                  <th className="p-4 font-medium">Prompt</th>
                  <th className="p-4 font-medium">Action</th>
                  <th className="p-4 font-medium">Target</th>
                  <th className="p-4 font-medium">Result</th>
                  <th className="p-4 font-medium">Time</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-bg transition-colors">
                    <td className="p-4 text-muted">{h.prompt}</td>
                    <td className="p-4 font-mono text-primary">{h.action}</td>
                    <td className="p-4 font-mono text-accent">{h.target}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${h.success ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                        {h.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="p-4 text-muted">{formatDateTime(h.created_at)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-xs text-danger hover:opacity-80 transition-opacity"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

export default History
