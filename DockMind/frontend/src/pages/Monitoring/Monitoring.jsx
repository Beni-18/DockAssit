import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import { 
  AreaChart, 
  Area, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts'
import { RefreshCw, Activity, Cpu, HardDrive, Globe2 } from 'lucide-react'

// Generate initial mock timeseries metrics data
const generateInitialData = () => {
  const data = []
  const now = new Date()
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: Math.round(35 + Math.random() * 20),
      memory: Math.round(60 + Math.random() * 10),
      netUpload: parseFloat((0.8 + Math.random() * 0.8).toFixed(2)),
      netDownload: parseFloat((1.5 + Math.random() * 1.5).toFixed(2)),
      diskRead: Math.round(150 + Math.random() * 150),
      diskWrite: Math.round(80 + Math.random() * 120),
    })
  }
  return data
}

const Monitoring = () => {
  const [data, setData] = useState(() => generateInitialData())
  const [timeRange, setTimeRange] = useState('24h')

  // Simulate real-time metric updates every 4 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const newPoint = {
          time: nextTime,
          cpu: Math.round(35 + Math.random() * 20),
          memory: Math.round(60 + Math.random() * 10),
          netUpload: parseFloat((0.8 + Math.random() * 0.8).toFixed(2)),
          netDownload: parseFloat((1.5 + Math.random() * 1.5).toFixed(2)),
          diskRead: Math.round(150 + Math.random() * 150),
          diskWrite: Math.round(80 + Math.random() * 120),
        }
        return [...prev.slice(1), newPoint]
      })
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const currentStats = data[data.length - 1]

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-extrabold text-text tracking-tight">Monitoring</h2>
            <p className="text-muted text-sm mt-1">Real-time metrics and performance monitoring.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className="px-3.5 py-2 text-sm font-semibold bg-surface border border-border rounded-xl focus:outline-none focus:border-primary transition-all duration-200"
            >
              <option value="1h">Last 1 Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
            <button 
              onClick={() => setData(generateInitialData())}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-text bg-surface border border-border rounded-xl hover:border-primary transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Top metrics summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'CPU Usage', value: `${currentStats?.cpu}%`, icon: Cpu, color: 'text-primary' },
            { label: 'Memory Usage', value: `${currentStats?.memory}%`, icon: Activity, color: 'text-purple-500' },
            { label: 'Network I/O', value: `${(currentStats?.netDownload + currentStats?.netUpload).toFixed(1)} GB/s`, icon: Globe2, color: 'text-cyan-500' },
            { label: 'Disk I/O', value: `${currentStats?.diskRead} MB/s`, icon: HardDrive, color: 'text-amber-500' },
          ].map((card, i) => {
            const Icon = card.icon
            return (
              <div key={i} className="bg-surface border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-muted uppercase tracking-wider">{card.label}</span>
                  <span className="block text-2xl font-bold text-text mt-1">{card.value}</span>
                </div>
                <div className={`p-3 bg-bg border border-border rounded-xl ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Chart */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">CPU Usage (%)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="time" stroke="var(--color-muted)" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted)" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="cpu" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Chart */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Memory Usage (%)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="time" stroke="var(--color-muted)" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted)" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" name="Memory" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Network Chart */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Network I/O</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorNetRx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNetTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="time" stroke="var(--color-muted)" fontSize={10} />
                  <YAxis stroke="var(--color-muted)" fontSize={10} unit=" GB/s" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="netDownload" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorNetRx)" name="Download" />
                  <Area type="monotone" dataKey="netUpload" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorNetTx)" name="Upload" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Disk Chart */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Disk I/O</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorDiskRead" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDiskWrite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="time" stroke="var(--color-muted)" fontSize={10} />
                  <YAxis stroke="var(--color-muted)" fontSize={10} unit=" MB/s" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="diskRead" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorDiskRead)" name="Read" />
                  <Area type="monotone" dataKey="diskWrite" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#colorDiskWrite)" name="Write" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Monitoring
