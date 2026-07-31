import React, { useEffect, useState } from 'react'
import { Zap, Play } from 'lucide-react'
import Sidebar from '../../components/common/Sidebar'
import { getFrequentCommands } from '../../services/history'
import { executeDockerAction } from '../../services/docker'
import { formatRelativeTime } from '../../utils/formatters'

const keyFor = (c) => `${c.action}:${c.resource}:${c.target}`

const FrequentCommands = () => {
  const [commands, setCommands] = useState([])
  const [loading, setLoading] = useState(true)
  const [runningKey, setRunningKey] = useState(null)
  const [results, setResults] = useState({})

  useEffect(() => {
    getFrequentCommands()
      .then(setCommands)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleRun = async (cmd) => {
    const key = keyFor(cmd)
    setRunningKey(key)
    setResults((prev) => ({ ...prev, [key]: null }))
    try {
      const data = await executeDockerAction(cmd.action, cmd.target)
      setResults((prev) => ({ ...prev, [key]: { success: true, message: data.message } }))
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [key]: { success: false, message: err.response?.data?.detail || 'Execution failed.' },
      }))
    } finally {
      setRunningKey(null)
    }
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Frequent Commands</h2>
          <p className="text-muted text-sm mt-1">Your most-used Docker commands, from command history</p>
        </div>

        {loading ? (
          <p className="text-muted text-sm">Loading...</p>
        ) : commands.length === 0 ? (
          <p className="text-muted text-sm">
            Nothing here yet — commands you run from the Dashboard will show up here once you've used them.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commands.map((cmd) => {
              const key = keyFor(cmd)
              const result = results[key]
              return (
                <div key={key} className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} strokeWidth={2} className="text-primary shrink-0" />
                    <h4 className="font-medium capitalize">
                      {cmd.action} <span className="font-mono text-accent">{cmd.target}</span>
                    </h4>
                  </div>
                  <p className="text-xs text-muted mb-4">
                    Run {cmd.count} time{cmd.count === 1 ? '' : 's'} · last {formatRelativeTime(cmd.last_executed_at)}
                  </p>

                  {result && (
                    <div
                      className={`text-xs rounded-lg p-2 mb-3 ${
                        result.success ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {result.message}
                    </div>
                  )}

                  <button
                    onClick={() => handleRun(cmd)}
                    disabled={runningKey === key}
                    className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    <Play size={12} strokeWidth={2} />
                    {runningKey === key ? 'Running...' : 'Run again'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default FrequentCommands
