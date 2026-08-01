import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AppShell from '../../components/common/ui/AppShell'
import PageHeader from '../../components/common/ui/PageHeader'
import Card from '../../components/common/ui/Card'
import Button from '../../components/common/ui/Button'
import ConfirmDialog from '../../components/common/ui/ConfirmDialog'
import { SkeletonRows } from '../../components/common/ui/Skeleton'
import { useToast } from '../../components/common/ui/ToastProvider'
import useContainers from '../../hooks/useContainers'
import { executeDockerAction, getContainerStats } from '../../services/docker'
import { formatUptime } from '../../utils/formatters'
import {
  Play, Square, RotateCw, Trash2, Pause as PauseIcon,
  RefreshCw, Search, Eye, Circle,
} from 'lucide-react'

const STATUS_CONFIG = {
  running: { dot: '#10b981', text: 'text-success', label: 'Running' },
  exited:  { dot: '#ef4444', text: 'text-danger',  label: 'Stopped' },
  stopped: { dot: '#ef4444', text: 'text-danger',  label: 'Stopped' },
  paused:  { dot: '#f59e0b', text: 'text-warning', label: 'Paused'  },
}

const FILTERS = ['all', 'running', 'exited', 'paused']

const Containers = () => {
  const { containers, loading, refetch } = useContainers(5000)
  const { toast } = useToast()
  const [filter, setFilter]           = useState('all')
  const [search, setSearch]           = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [statsMap, setStatsMap]       = useState({})
  const [removeTarget, setRemoveTarget] = useState(null)

  useEffect(() => {
    if (!containers || containers.length === 0) return
    const fetchAllStats = async () => {
      const newStats = {}
      for (const c of containers) {
        if (c.status === 'running') {
          try {
            const stats = await getContainerStats(c.id)
            const memMB = (stats.memory_usage / (1024 * 1024)).toFixed(1)
            newStats[c.name] = { cpu: `${stats.cpu_percent}%`, memory: `${memMB} MB` }
          } catch { newStats[c.name] = { cpu: '—', memory: '—' } }
        } else { newStats[c.name] = { cpu: '0%', memory: '0 MB' } }
      }
      setStatsMap(newStats)
    }
    fetchAllStats()
    const id = setInterval(fetchAllStats, 5000)
    return () => clearInterval(id)
  }, [containers])

  const handleAction = async (action, containerId) => {
    setActionLoading(containerId)
    try {
      await executeDockerAction(action, containerId)
      refetch()
    } catch (e) {
      toast.error(`Action failed: ${e.message || 'Unknown error'}`)
    } finally { setActionLoading(null) }
  }

  const filteredContainers = containers.filter((c) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'running' && c.status === 'running') ||
      (filter === 'exited'  && (c.status === 'exited' || c.status === 'stopped')) ||
      (filter === 'paused'  && c.status === 'paused')
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.image.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const countFor = (f) => {
    if (f === 'all') return containers.length
    if (f === 'running') return containers.filter((c) => c.status === 'running').length
    if (f === 'exited') return containers.filter((c) => c.status === 'exited' || c.status === 'stopped').length
    if (f === 'paused') return containers.filter((c) => c.status === 'paused').length
    return 0
  }

  const removeTargetContainer = containers.find((c) => c.id === removeTarget)

  return (
    <AppShell>
      <PageHeader
        title="Containers"
        subtitle="Manage and control your Docker containers."
        actions={
          <Button variant="glass" size="sm" shape="rounded" onClick={refetch}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
      />

      {/* Filter + Search bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Filter tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)' }}
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="relative px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all duration-200"
              style={
                filter === f
                  ? {
                      background: 'linear-gradient(135deg, #2496ed, #1a75c4)',
                      color: '#fff',
                      boxShadow: '0 0 16px -4px rgba(36,150,237,0.5)',
                    }
                  : { color: 'var(--color-muted)' }
              }
            >
              {f === 'all' ? `All (${countFor('all')})` : f === 'exited' ? `Stopped (${countFor('exited')})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${countFor(f)})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            placeholder="Search containers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10 py-2.5 text-xs"
            style={{ borderRadius: '12px' }}
          />
        </div>
      </div>

      {/* Containers table */}
      <Card animate={false} className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={5} cols={7} />
        ) : filteredContainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-glass-border)' }}
            >
              <Circle className="w-5 h-5 text-muted" />
            </div>
            <p className="text-sm text-muted">No containers match your filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
                  {['Name', 'Image', 'Status', 'CPU', 'Memory', 'Uptime', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-4 text-2xs font-bold text-muted uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredContainers.map((c, idx) => {
                  const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.exited
                  const liveStats = statsMap[c.name] || { cpu: '0%', memory: '0 MB' }
                  const uptime = c.status === 'running' ? formatUptime(c.started_at) : '—'
                  const isBusy = actionLoading === c.id

                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                      className="group/row data-row"
                      style={{ borderBottom: '1px solid var(--color-glass-border)' }}
                    >
                      <td className="px-5 py-4">
                        <div>
                          <div className="font-semibold text-text text-xs">{c.name}</div>
                          <div className="text-2xs text-muted font-mono mt-0.5 opacity-60">{c.id.slice(0, 12)}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-2xs text-muted max-w-[120px] truncate">{c.image}</td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-2">
                          <span
                            className="relative w-2 h-2 rounded-full shrink-0"
                            style={{ background: st.dot }}
                          >
                            {c.status === 'running' && (
                              <span
                                className="absolute inset-0 rounded-full"
                                style={{
                                  background: st.dot,
                                  animation: 'status-ping 1.8s cubic-bezier(0,0,0.2,1) infinite',
                                }}
                              />
                            )}
                          </span>
                          <span className={`text-2xs font-bold ${st.text}`}>{st.label}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-text tabular-nums">{liveStats.cpu}</td>
                      <td className="px-5 py-4 text-xs font-medium text-text tabular-nums">{liveStats.memory}</td>
                      <td className="px-5 py-4 text-2xs text-muted tabular-nums">{uptime}</td>
                      <td className="px-5 py-4">
                        <div className="row-actions flex items-center gap-0.5">
                          {c.status !== 'running' ? (
                            <ActionBtn
                              onClick={() => handleAction('start', c.id)}
                              disabled={isBusy}
                              color="success"
                              title="Start"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </ActionBtn>
                          ) : (
                            <>
                              <ActionBtn onClick={() => handleAction('stop', c.id)} disabled={isBusy} color="danger" title="Stop">
                                <Square className="w-3.5 h-3.5 fill-current" />
                              </ActionBtn>
                              <ActionBtn disabled title="Pause (unsupported)" color="muted">
                                <PauseIcon className="w-3.5 h-3.5" />
                              </ActionBtn>
                            </>
                          )}
                          <ActionBtn onClick={() => handleAction('restart', c.id)} disabled={isBusy} color="primary" title="Restart">
                            <RotateCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => { window.location.href = `/ai-assistant?command=logs&container=${c.name}` }}
                            color="glow" title="Logs & Analysis"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => setRemoveTarget(c.id)}
                            disabled={isBusy}
                            color="danger"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </ActionBtn>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove container?"
        description={
          removeTargetContainer
            ? `This permanently removes "${removeTargetContainer.name}". This can't be undone.`
            : undefined
        }
        confirmLabel="Remove"
        onConfirm={() => removeTarget && handleAction('remove', removeTarget)}
      />
    </AppShell>
  )
}

// Small action icon button
const COLOR_MAP = {
  success: { hover: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: 'var(--color-success)' },
  danger:  { hover: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  text: 'var(--color-danger)'  },
  primary: { hover: 'rgba(36,150,237,0.12)', border: 'rgba(36,150,237,0.25)', text: 'var(--color-primary)' },
  glow:    { hover: 'rgba(0,212,255,0.12)',  border: 'rgba(0,212,255,0.25)',  text: 'var(--color-glow)'    },
  muted:   { hover: 'rgba(255,255,255,0.05)',border: 'transparent',           text: 'var(--color-muted)'   },
}

const ActionBtn = ({ children, color, disabled, title, onClick }) => {
  const c = COLOR_MAP[color] || COLOR_MAP.muted
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-2 rounded-lg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ color: c.text }}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.background = c.hover
          e.currentTarget.style.border = `1px solid ${c.border}`
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.border = '1px solid transparent'
      }}
    >
      {children}
    </button>
  )
}

export default Containers
