import React, { useEffect, useState } from 'react'
import { Zap, Play, CheckCircle2, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AppShell from '../../components/common/ui/AppShell'
import PageHeader from '../../components/common/ui/PageHeader'
import Card from '../../components/common/ui/Card'
import { SkeletonRows } from '../../components/common/ui/Skeleton'
import { getFrequentCommands } from '../../services/history'
import { executeDockerAction } from '../../services/docker'
import { formatRelativeTime } from '../../utils/formatters'

const keyFor = (c) => `${c.action}:${c.resource}:${c.target}`

const FrequentCommands = () => {
  const [commands, setCommands]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [runningKey, setRunningKey] = useState(null)
  const [results, setResults]       = useState({})

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
    } finally { setRunningKey(null) }
  }

  return (
    <AppShell>
      <PageHeader
        title="Frequent Commands"
        subtitle="Your most-used Docker commands, surfaced from command history."
      />

      {loading ? (
        <Card animate={false}><SkeletonRows rows={4} cols={3} /></Card>
      ) : commands.length === 0 ? (
        <Card className="p-12 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            <Zap className="w-6 h-6" style={{ color: 'var(--color-glow)' }} />
          </div>
          <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
            Nothing here yet — commands you run from the AI Assistant will appear here once you've used them.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commands.map((cmd, i) => {
            const key = keyFor(cmd)
            const result = results[key]
            const isRunning = runningKey === key

            return (
              <Card key={key} glow delay={i * 0.05} className="p-5 flex flex-col justify-between relative overflow-hidden">
                {/* Background accent */}
                <div
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none opacity-20"
                  style={{
                    background: 'radial-gradient(circle, var(--color-glow) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                  }}
                />

                <div className="relative">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: 'rgba(0,212,255,0.1)',
                        border: '1px solid rgba(0,212,255,0.2)',
                      }}
                    >
                      <Zap className="w-4 h-4" style={{ color: 'var(--color-glow)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-text text-sm capitalize" style={{ letterSpacing: '-0.01em' }}>
                        {cmd.action}{' '}
                        <span className="font-mono" style={{ color: 'var(--color-primary)' }}>
                          {cmd.target}
                        </span>
                      </h4>
                      <p className="text-2xs text-muted mt-1">
                        Used {cmd.count} time{cmd.count !== 1 ? 's' : ''} · {formatRelativeTime(cmd.last_executed_at)}
                      </p>
                    </div>
                  </div>

                  {/* Count badge */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <div
                      className="h-1.5 rounded-full flex-1 overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, (cmd.count / 20) * 100)}%`,
                          background: 'linear-gradient(90deg, var(--color-glow), var(--color-primary))',
                        }}
                      />
                    </div>
                    <span className="text-2xs text-muted font-semibold tabular-nums">{cmd.count}×</span>
                  </div>

                  <AnimatePresence>
                    {result && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-3"
                      >
                        <div
                          className="flex items-start gap-2 text-xs p-3 rounded-xl"
                          style={
                            result.success
                              ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: 'var(--color-success)' }
                              : { background: 'rgba(239,68,68,0.1)',  border: '1px solid rgba(239,68,68,0.25)',  color: 'var(--color-danger)'  }
                          }
                        >
                          {result.success
                            ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            : <XCircle     className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                          <span>{result.message}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  whileHover={!isRunning ? { scale: 1.02 } : {}}
                  whileTap={!isRunning ? { scale: 0.97 } : {}}
                  onClick={() => handleRun(cmd)}
                  disabled={isRunning}
                  className="relative flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  style={{
                    background: isRunning
                      ? 'rgba(36,150,237,0.1)'
                      : 'linear-gradient(135deg, rgba(36,150,237,0.15), rgba(0,212,255,0.1))',
                    border: '1px solid rgba(36,150,237,0.25)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {isRunning ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Running…
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Run Again
                    </>
                  )}
                </motion.button>
              </Card>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}

export default FrequentCommands
