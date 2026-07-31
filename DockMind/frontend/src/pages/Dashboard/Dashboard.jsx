import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import useContainers from '../../hooks/useContainers'
import { executeDockerAction, getContainerStats } from '../../services/docker'
import { useAuth } from '../../context/AuthContext'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Play,
  Square,
  RotateCw,
  Bot,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Cpu,
  Activity,
  Award,
} from 'lucide-react'

// Constants for PieChart
const COLORS = ['#16a34a', '#dc2626', '#d97706'] // Green, Red, Amber

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { containers, loading, refetch } = useContainers(5000)

  const [statsMap, setStatsMap] = useState({})
  const [avgCpu, setAvgCpu] = useState(0)
  const [avgMem, setAvgMem] = useState(0)

  // Real-time metric history for chart
  const [metricHistory, setMetricHistory] = useState([
    { name: '12 AM', cpu: 32, memory: 58 },
    { name: '4 AM', cpu: 45, memory: 61 },
    { name: '8 AM', cpu: 41, memory: 63 },
    { name: '12 PM', cpu: 38, memory: 66 },
    { name: '4 PM', cpu: 48, memory: 64 },
    { name: '8 PM', cpu: 40, memory: 65 },
  ])

  // Count container states
  const runningCount = containers.filter((c) => c.status === 'running').length
  const stoppedCount = containers.filter((c) => c.status === 'exited' || c.status === 'stopped').length
  const pausedCount = containers.filter((c) => c.status === 'paused').length
  const totalCount = containers.length

  // Calculate dynamic health score
  const healthScore = totalCount === 0 ? 100 : Math.max(50, 100 - stoppedCount * 15 - pausedCount * 5)

  let healthStatus = 'Excellent'
  if (healthScore < 60) {
    healthStatus = 'Critical'
  } else if (healthScore < 75) {
    healthStatus = 'Warning'
  } else if (healthScore < 90) {
    healthStatus = 'Good'
  }

  // Pie chart data
  const hasData = runningCount > 0 || stoppedCount > 0 || pausedCount > 0
  const pieData = hasData
    ? [
        { name: 'Running', value: runningCount },
        { name: 'Stopped', value: stoppedCount },
        { name: 'Paused', value: pausedCount },
      ]
    : [{ name: 'No Containers', value: 1 }]

  // Fetch CPU and Memory stats periodically
  useEffect(() => {
    if (!containers || containers.length === 0) {
      setAvgCpu(0)
      setAvgMem(0)
      return
    }

    const fetchStats = async () => {
      const newStats = {}
      let totalCpu = 0
      let totalMem = 0
      let activeCount = 0

      for (const c of containers) {
        if (c.status === 'running') {
          try {
            const stats = await getContainerStats(c.id)
            const memMB = (stats.memory_usage / (1024 * 1024)).toFixed(1)
            newStats[c.name] = {
              cpu: `${stats.cpu_percent}%`,
              memory: `${memMB} MB`,
            }
            totalCpu += stats.cpu_percent
            totalMem += stats.memory_percent
            activeCount++
          } catch {
            newStats[c.name] = { cpu: '—', memory: '—' }
          }
        } else {
          newStats[c.name] = { cpu: '0%', memory: '0 MB' }
        }
      }
      setStatsMap(newStats)

      if (activeCount > 0) {
        const calculatedCpu = Math.round(totalCpu / activeCount)
        const calculatedMem = Math.round(totalMem / activeCount)
        setAvgCpu(calculatedCpu)
        setAvgMem(calculatedMem)

        // Add to line chart history
        setMetricHistory((prev) => {
          const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return [...prev.slice(1), { name: nextTime, cpu: calculatedCpu, memory: calculatedMem }]
        })
      } else {
        setAvgCpu(0)
        setAvgMem(0)
      }
    }

    fetchStats()
    const id = setInterval(fetchStats, 6000)
    return () => clearInterval(id)
  }, [containers])

  const handleContainerAction = async (action, containerId) => {
    try {
      await executeDockerAction(action, containerId)
      refetch()
    } catch (e) {
      alert(`Action failed: ${e.message}`)
    }
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-text tracking-tight">Dashboard</h2>
            <p className="text-muted text-sm mt-1">
              Welcome back{user?.name ? `, ${user.name}` : ''}! Here's what's happening with your Docker environment.
            </p>
          </div>
        </div>

        {/* 5-Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Running Containers */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-xs font-semibold text-muted uppercase tracking-wider">Running Containers</span>
                <span className="block text-3xl font-extrabold text-text mt-2">{runningCount}</span>
              </div>
              <div className="p-2.5 bg-success/10 border border-success/20 text-success rounded-xl">
                <Play className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-success mt-4">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{runningCount > 0 ? `+ ${runningCount} active` : 'No active containers'}</span>
            </div>
          </div>

          {/* Card 2: Stopped Containers */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-xs font-semibold text-muted uppercase tracking-wider">Stopped Containers</span>
                <span className="block text-3xl font-extrabold text-text mt-2">{stoppedCount}</span>
              </div>
              <div className="p-2.5 bg-danger/10 border border-danger/20 text-danger rounded-xl">
                <Square className="w-5 h-5 fill-current" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-danger mt-4">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stoppedCount > 0 ? `${stoppedCount} stopped` : 'No stopped containers'}</span>
            </div>
          </div>

          {/* Card 3: CPU Usage */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-xs font-semibold text-muted uppercase tracking-wider">CPU Usage</span>
                <span className="block text-3xl font-extrabold text-text mt-2">{avgCpu}%</span>
              </div>
              <div className="p-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl">
                <Cpu className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[11px] font-semibold text-success mt-4">{avgCpu < 70 ? 'Good' : 'High'}</div>
          </div>

          {/* Card 4: Memory Usage */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-xs font-semibold text-muted uppercase tracking-wider">Memory Usage</span>
                <span className="block text-3xl font-extrabold text-text mt-2">{avgMem}%</span>
              </div>
              <div className="p-2.5 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[11px] font-semibold text-success mt-4">{avgMem < 80 ? 'Good' : 'High'}</div>
          </div>

          {/* Card 5: AI Health Score */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-xs font-semibold text-muted uppercase tracking-wider">AI Health Score</span>
                <span className="block text-3xl font-extrabold text-text mt-2">{healthScore} / 100</span>
              </div>
              <div className="p-2.5 bg-warning/10 border border-warning/20 text-warning rounded-xl">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div
              className={`text-[11px] font-semibold mt-4 ${
                healthScore >= 90 ? 'text-success' : healthScore >= 70 ? 'text-warning' : 'text-danger'
              }`}
            >
              {healthStatus}
            </div>
          </div>
        </div>

        {/* Containers Overview + Ask DockMind Column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Containers Overview */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm lg:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-text text-base uppercase tracking-wider">Container Overview</h3>
              <button onClick={() => navigate('/containers')} className="text-xs font-semibold text-primary hover:underline">
                View All
              </button>
            </div>

            {loading ? (
              <div className="text-center text-muted p-8 text-sm">Loading containers...</div>
            ) : containers.length === 0 ? (
              <div className="text-center text-muted p-8 text-sm">No containers found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted font-semibold bg-bg/25">
                      <th className="p-3">Container Name</th>
                      <th className="p-3">Image</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">CPU</th>
                      <th className="p-3">Memory</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {containers.slice(0, 5).map((c) => {
                      const liveStats = statsMap[c.name] || { cpu: '0%', memory: '0 MB' }
                      return (
                        <tr key={c.id} className="hover:bg-bg/10">
                          <td className="p-3 font-semibold text-text">{c.name}</td>
                          <td className="p-3 font-mono text-xs text-muted truncate max-w-[120px]">{c.image}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                c.status === 'running'
                                  ? 'bg-success/10 text-success border border-success/20'
                                  : 'bg-danger/10 text-danger border border-danger/20'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-text">{liveStats.cpu}</td>
                          <td className="p-3 font-medium text-text">{liveStats.memory}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              {c.status !== 'running' ? (
                                <button
                                  onClick={() => handleContainerAction('start', c.id)}
                                  className="p-1.5 text-success hover:bg-success/10 rounded"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleContainerAction('stop', c.id)}
                                  className="p-1.5 text-danger hover:bg-danger/10 rounded"
                                >
                                  <Square className="w-3.5 h-3.5 fill-current" />
                                </button>
                              )}
                              <button
                                onClick={() => handleContainerAction('restart', c.id)}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Ask DockMind — links out to the one canonical chat page */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-[380px]">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-4">
              <Bot className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-text text-base mb-2">Ask DockMind</h3>
            <p className="text-muted text-xs leading-relaxed mb-6 max-w-[220px]">
              Manage containers, check logs, and get answers about your Docker environment in plain English.
            </p>
            <button
              onClick={() => navigate('/ai-assistant')}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-95 transition-opacity"
            >
              Open AI Assistant
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Charts & checklist row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chart 1: Resource Usage */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col h-[320px]">
            <h3 className="font-bold text-text text-sm uppercase tracking-wider mb-4">Resource Usage</h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted)" fontSize={9} />
                  <YAxis stroke="var(--color-muted)" fontSize={9} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      borderRadius: '12px',
                    }}
                  />
                  <Line type="monotone" dataKey="cpu" stroke="var(--color-primary)" strokeWidth={2.5} name="CPU (%)" dot={false} />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="var(--color-secondary)"
                    strokeWidth={2.5}
                    name="Memory (%)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Containers Status */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col h-[320px]">
            <h3 className="font-bold text-text text-sm uppercase tracking-wider mb-4">Containers Status</h3>
            <div className="flex-1 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-text">{totalCount}</span>
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Total</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 text-xs font-semibold text-muted mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]"></span>
                <span>Running ({runningCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]"></span>
                <span>Stopped ({stoppedCount})</span>
              </div>
            </div>
          </div>

          {/* Card 3: AI Health Summary */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col h-[320px] justify-between">
            <div>
              <h3 className="font-bold text-text text-sm uppercase tracking-wider mb-5">AI Health Summary</h3>
              <div className="space-y-4">
                {[
                  {
                    text:
                      totalCount > 0
                        ? 'Your Docker environment is healthy and performing well.'
                        : 'No active containers found to evaluate.',
                  },
                  {
                    text:
                      totalCount > 0
                        ? `Resource usage is normal (${totalCount} active containers)`
                        : 'Resources are idle',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 text-xs leading-relaxed">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <span className="text-text font-medium">{item.text}</span>
                  </div>
                ))}
                {stoppedCount > 0 && (
                  <div className="flex gap-3 text-xs leading-relaxed">
                    <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                    <span className="text-text font-medium">
                      {stoppedCount} container{stoppedCount === 1 ? '' : 's'} stopped — review the Containers page.
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div
              className={`p-3 border text-xs font-semibold rounded-xl flex items-center justify-center ${
                healthScore >= 90
                  ? 'bg-success/10 border-success/20 text-success'
                  : healthScore >= 70
                  ? 'bg-warning/10 border-warning/20 text-warning'
                  : 'bg-danger/10 border-danger/20 text-danger'
              }`}
            >
              System Health Score: {healthStatus.toUpperCase()} ({healthScore}%)
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
