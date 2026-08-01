import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AppShell from '../../components/common/ui/AppShell'
import PageHeader from '../../components/common/ui/PageHeader'
import Card from '../../components/common/ui/Card'
import useContainers from '../../hooks/useContainers'
import useCountUp from '../../hooks/useCountUp'
import { executeDockerAction, getContainerStats } from '../../services/docker'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/common/ui/ToastProvider'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Play, Square, RotateCw, Bot, CheckCircle2, AlertCircle,
  Cpu, Activity, Award, Sparkles, Send, TrendingUp, TrendingDown,
  Circle,
} from 'lucide-react'

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b']

// Radial ring metric card
const MetricRing = ({ value, max = 100, color, size = 72 }) => {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / max) * circ

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  )
}

const AnimatedStat = ({ value }) => {
  const display = useCountUp(value)
  return <span>{Math.round(display)}</span>
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariant = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { containers, loading, refetch } = useContainers(5000)

  const [statsMap, setStatsMap] = useState({})
  const [avgCpu, setAvgCpu] = useState(0)
  const [avgMem, setAvgMem] = useState(0)
  // Starts empty and fills in only with real polled measurements below —
  // no fabricated history. MAX_HISTORY_POINTS caps how many recent real
  // samples stay on the chart once it's full.
  const [metricHistory, setMetricHistory] = useState([])

  const runningCount = containers.filter((c) => c.status === 'running').length
  const stoppedCount = containers.filter((c) => c.status === 'exited' || c.status === 'stopped').length
  const pausedCount  = containers.filter((c) => c.status === 'paused').length
  const totalCount   = containers.length

  const healthScore  = totalCount === 0 ? 100 : Math.max(50, 100 - stoppedCount * 15 - pausedCount * 5)
  const healthStatus = healthScore >= 90 ? 'Excellent' : healthScore >= 75 ? 'Good' : healthScore >= 60 ? 'Warning' : 'Critical'
  const healthColor  = healthScore >= 90 ? '#10b981' : healthScore >= 75 ? '#f59e0b' : '#ef4444'

  const hasData = runningCount > 0 || stoppedCount > 0 || pausedCount > 0
  const pieData = hasData
    ? [
        { name: 'Running', value: runningCount },
        { name: 'Stopped', value: stoppedCount },
        { name: 'Paused',  value: pausedCount  },
      ]
    : [{ name: 'No Containers', value: 1 }]

  useEffect(() => {
    if (!containers || containers.length === 0) { setAvgCpu(0); setAvgMem(0); return }
    const fetchStats = async () => {
      const newStats = {}
      let totalCpu = 0, totalMem = 0, activeCount = 0
      for (const c of containers) {
        if (c.status === 'running') {
          try {
            const stats = await getContainerStats(c.id)
            const memMB = (stats.memory_usage / (1024 * 1024)).toFixed(1)
            newStats[c.name] = { cpu: `${stats.cpu_percent}%`, memory: `${memMB} MB` }
            totalCpu += stats.cpu_percent; totalMem += stats.memory_percent; activeCount++
          } catch { newStats[c.name] = { cpu: '—', memory: '—' } }
        } else { newStats[c.name] = { cpu: '0%', memory: '0 MB' } }
      }
      setStatsMap(newStats)
      if (activeCount > 0) {
        const cpu = Math.round(totalCpu / activeCount)
        const mem = Math.round(totalMem / activeCount)
        setAvgCpu(cpu); setAvgMem(mem)
        setMetricHistory((prev) => {
          const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          // Keep at most the last 5 real points plus this new one — with
          // an empty starting array this grows to a window of 6 and then
          // slides, instead of prev.slice(1) which only slides correctly
          // when the array is already pre-filled.
          return [...prev.slice(-5), { name: t, cpu, memory: mem }]
        })
      } else { setAvgCpu(0); setAvgMem(0) }
    }
    fetchStats()
    const id = setInterval(fetchStats, 6000)
    return () => clearInterval(id)
  }, [containers])

  const handleContainerAction = async (action, containerId) => {
    try { await executeDockerAction(action, containerId); refetch() }
    catch (e) { toast.error(`Action failed: ${e.message}`) }
  }

  const TOOLTIP_STYLE = {
    backgroundColor: 'var(--color-surface-solid)',
    borderColor: 'var(--color-glass-border)',
    borderRadius: '14px',
    border: '1px solid var(--color-glass-border)',
    fontSize: '12px',
  }

  return (
    <AppShell contentClassName="p-8">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back${user?.name ? `, ${user.name}` : ''}! Your Docker environment at a glance.`}
      />

      {/* ── METRIC CARDS ROW ── */}
      <motion.div
        variants={containerVariants} initial="hidden" animate="visible"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
      >
        {[
          {
            title: 'Running',        value: runningCount, unit: '',      ring: true,
            color: '#10b981', icon: Play,     note: 'Active containers',
          },
          {
            title: 'Stopped',        value: stoppedCount, unit: '',      ring: true,
            color: '#ef4444', icon: Square,   note: 'Exited containers',
          },
          {
            title: 'CPU',            value: avgCpu,       unit: '%',     ring: true,
            color: '#2496ed', icon: Cpu,      note: avgCpu < 70 ? 'Normal' : 'High load',
          },
          {
            title: 'Memory',         value: avgMem,       unit: '%',     ring: true,
            color: '#00d4ff', icon: Activity, note: avgMem < 80 ? 'Healthy' : 'High usage',
          },
          {
            title: 'Health Score',   value: healthScore,  unit: '/100',  ring: true,
            color: healthColor, icon: Award, note: healthStatus,
          },
        ].map((m, i) => (
          <motion.div key={m.title} variants={itemVariant}>
            <Card
              glow
              animate={false}
              className="p-4 relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-2xs font-semibold text-muted uppercase tracking-widest">{m.title}</p>
                  <p className="text-2xl font-extrabold text-text mt-1 tabular-nums" style={{ letterSpacing: '-0.03em' }}>
                    <AnimatedStat value={m.value} />
                    {m.unit && <span className="text-xs font-normal text-muted ml-0.5">{m.unit}</span>}
                  </p>
                </div>
                <MetricRing value={m.value} max={m.title === 'Health Score' ? 100 : m.unit === '%' ? 100 : Math.max(m.value, 5)} color={m.color} size={52} />
              </div>
              <div className="flex items-center gap-1 text-2xs font-semibold" style={{ color: m.color }}>
                <TrendingUp className="w-3 h-3" />
                <span>{m.note}</span>
              </div>
              {/* Subtle corner glow */}
              <div
                className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full pointer-events-none opacity-30"
                style={{ background: `radial-gradient(circle, ${m.color} 0%, transparent 70%)`, filter: 'blur(12px)' }}
              />
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── ROW 2: Container Table + Ask DockMind ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Container overview */}
        <motion.div
          variants={itemVariant} initial="hidden" animate="visible"
          transition={{ delay: 0.35 }}
          className="lg:col-span-2"
        >
          <Card glow className="p-5 h-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider">Container Overview</h3>
              <button
                onClick={() => navigate('/containers')}
                className="text-xs font-semibold transition-colors"
                style={{ color: 'var(--color-glow)' }}
              >
                View All →
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 rounded-xl animate-shimmer bg-surface" />
                ))}
              </div>
            ) : containers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center mb-3 border border-glassBorder">
                  <Circle className="w-5 h-5 text-muted" />
                </div>
                <p className="text-sm text-muted">No containers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-glassBorder">
                      {['Name', 'Image', 'Status', 'CPU', 'Memory', 'Actions'].map((h) => (
                        <th key={h} className="pb-3 px-2 text-2xs font-semibold text-muted uppercase tracking-widest">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {containers.slice(0, 5).map((c, idx) => {
                      const liveStats = statsMap[c.name] || { cpu: '0%', memory: '0 MB' }
                      const isRunning = c.status === 'running'
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="data-row border-b border-glassBorder last:border-0"
                        >
                          <td className="px-2 py-3 font-semibold text-text text-xs">{c.name}</td>
                          <td className="px-2 py-3 font-mono text-2xs text-muted max-w-[100px] truncate">{c.image}</td>
                          <td className="px-2 py-3">
                            <span className="flex items-center gap-1.5">
                              <span className={`status-dot ${isRunning ? 'running' : 'stopped'}`} />
                              <span className={`text-2xs font-semibold capitalize ${isRunning ? 'text-success' : 'text-danger'}`}>
                                {c.status}
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-3 text-xs font-medium text-text tabular-nums">{liveStats.cpu}</td>
                          <td className="px-2 py-3 text-xs font-medium text-text tabular-nums">{liveStats.memory}</td>
                          <td className="px-2 py-3">
                            <div className="row-actions flex items-center gap-0.5">
                              {c.status !== 'running' ? (
                                <button onClick={() => handleContainerAction('start', c.id)}
                                  className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-all" title="Start">
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              ) : (
                                <button onClick={() => handleContainerAction('stop', c.id)}
                                  className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-all" title="Stop">
                                  <Square className="w-3.5 h-3.5 fill-current" />
                                </button>
                              )}
                              <button onClick={() => handleContainerAction('restart', c.id)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all" title="Restart">
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
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
        </motion.div>

        {/* Ask DockMind */}
        <motion.div variants={itemVariant} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
          <Card glow className="p-5 flex flex-col h-full relative overflow-hidden">
            {/* Background glow */}
            <div
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 60%)',
                filter: 'blur(30px)',
              }}
            />
            <div className="relative flex-1 flex flex-col items-center justify-center text-center py-4">
              {/* AI icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 animate-float"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(36,150,237,0.1) 100%)',
                  border: '1px solid rgba(0,212,255,0.25)',
                  boxShadow: '0 0 32px -8px rgba(0,212,255,0.4)',
                }}
              >
                <Bot className="w-8 h-8" style={{ color: 'var(--color-glow)' }} />
              </div>
              <h3 className="font-bold text-text text-lg mb-2" style={{ letterSpacing: '-0.02em' }}>Ask DockMind</h3>
              <p className="text-muted text-xs leading-relaxed mb-6 max-w-[200px]">
                Query your Docker environment in plain English. AI handles the rest.
              </p>

              {/* Suggested pills */}
              <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                {['Show containers', 'Check health', 'View logs'].map((t) => (
                  <span key={t}
                    className="px-2.5 py-1 rounded-full text-2xs font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: 'rgba(0,212,255,0.08)',
                      border: '1px solid rgba(0,212,255,0.2)',
                      color: 'var(--color-glow)',
                    }}
                    onClick={() => navigate(`/ai-assistant?prompt=${encodeURIComponent(t)}`)}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Input CTA */}
            <button
              onClick={() => navigate('/ai-assistant')}
              className="relative w-full flex items-center gap-3 pl-4 pr-1.5 py-2 rounded-full transition-all duration-200 group"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-glass-border)',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-glow)' }} />
              <span className="flex-1 text-left text-xs text-muted truncate">Ask me anything…</span>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #2496ed, #00d4ff)',
                  boxShadow: '0 0 16px -4px rgba(0,212,255,0.5)',
                }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </span>
            </button>
          </Card>
        </motion.div>
      </div>

      {/* ── ROW 3: Charts + Health ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Area chart */}
        <motion.div variants={itemVariant} initial="hidden" animate="visible" transition={{ delay: 0.48 }} className="md:col-span-1">
          <Card glow className="p-5 h-72">
            <h3 className="text-2xs font-bold text-muted uppercase tracking-widest mb-4">Resource Usage</h3>
            <div className="h-52">
              {metricHistory.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted text-center px-4">
                  Waiting for the first real sample…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metricHistory}>
                    <defs>
                      <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-glow)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-glow)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-muted)" fontSize={9} tickLine={false} />
                    <YAxis stroke="var(--color-muted)" fontSize={9} domain={[0, 100]} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="cpu" stroke="var(--color-primary)" strokeWidth={2} fill="url(#cpuG)" name="CPU %" />
                    <Area type="monotone" dataKey="memory" stroke="var(--color-glow)" strokeWidth={2} fill="url(#memG)" name="Memory %" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Donut chart */}
        <motion.div variants={itemVariant} initial="hidden" animate="visible" transition={{ delay: 0.52 }}>
          <Card glow className="p-5 h-72">
            <h3 className="text-2xs font-bold text-muted uppercase tracking-widest mb-3">Container Status</h3>
            <div className="h-44 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-text tabular-nums">{totalCount}</span>
                <span className="text-2xs font-semibold text-muted uppercase tracking-wider">Total</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 text-2xs font-semibold text-muted mt-1">
              {[{ c: '#10b981', l: `Running (${runningCount})` }, { c: '#ef4444', l: `Stopped (${stoppedCount})` }].map(item => (
                <div key={item.l} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.c, boxShadow: `0 0 6px ${item.c}` }} />
                  <span>{item.l}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* AI Health Summary */}
        <motion.div variants={itemVariant} initial="hidden" animate="visible" transition={{ delay: 0.56 }}>
          <Card glow className="p-5 flex flex-col h-72 justify-between">
            <div>
              <h3 className="text-2xs font-bold text-muted uppercase tracking-widest mb-4">AI Health Summary</h3>
              <div className="space-y-3">
                {[
                  totalCount > 0
                    ? 'Docker environment is healthy and performing well.'
                    : 'No active containers found to evaluate.',
                  totalCount > 0
                    ? `Resource usage is normal (${totalCount} containers)`
                    : 'Resources are idle',
                ].map((text, i) => (
                  <div key={i} className="flex gap-2.5 text-xs leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="text-textDim font-medium">{text}</span>
                  </div>
                ))}
                {stoppedCount > 0 && (
                  <div className="flex gap-2.5 text-xs leading-relaxed">
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span className="text-textDim font-medium">
                      {stoppedCount} container{stoppedCount > 1 ? 's' : ''} stopped — review Containers.
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Health badge */}
            <div
              className="p-3 rounded-2xl text-xs font-bold text-center"
              style={{
                background: `${healthColor}12`,
                border: `1px solid ${healthColor}30`,
                color: healthColor,
              }}
            >
              System Health: {healthStatus.toUpperCase()} — {healthScore}%
            </div>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  )
}

export default Dashboard
