import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import AppShell from '../../components/common/ui/AppShell'
import PageHeader from '../../components/common/ui/PageHeader'
import Card from '../../components/common/ui/Card'
import Button from '../../components/common/ui/Button'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Trash2, Activity, Cpu, HardDrive, Globe2, TrendingUp } from 'lucide-react'
import useContainers from '../../hooks/useContainers'
import { getContainerStats } from '../../services/docker'

const POLL_MS = 5000
const MAX_POINTS = 40
const BYTES_PER_MB = 1024 * 1024

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-surface-solid)',
  borderColor: 'var(--color-glass-border)',
  borderRadius: '14px',
  border: '1px solid var(--color-glass-border)',
  fontSize: '12px',
}

/* All four accents stay in the brand's blue/cyan/indigo family — success
   green, warning amber, and danger red are reserved for real status
   (StatusBadge, toasts, health score) so a metric card never accidentally
   reads as "this is broken"/"this needs attention". */
const METRIC_CARDS = [
  { label: 'CPU Usage',   key: 'cpu',         unit: '%',    icon: Cpu,      color: '#2496ed' },
  { label: 'Memory',      key: 'memory',      unit: '%',    icon: Activity, color: '#00d4ff' },
  { label: 'Network I/O', key: 'netTotal',    unit: 'MB/s', icon: Globe2,   color: '#818cf8' },
  { label: 'Disk Read',   key: 'diskRead',    unit: 'MB/s', icon: HardDrive,color: '#38bdf8' },
]

const itemVariant = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

const CHARTS = [
  { title: 'CPU Usage (%)', gradId: 'gradCpu', color: '#2496ed', dataKeys: [{ key: 'cpu', name: 'CPU' }], domain: [0, 100], unit: '' },
  { title: 'Memory Usage (%)', gradId: 'gradMem', color: '#00d4ff', dataKeys: [{ key: 'memory', name: 'Memory' }], domain: [0, 100], unit: '' },
  {
    title: 'Network I/O', gradId: 'gradNet', color: '#818cf8', color2: '#2496ed', gradId2: 'gradNet2',
    dataKeys: [{ key: 'netDownload', name: 'Download' }, { key: 'netUpload', name: 'Upload', alt: true }],
    domain: [0, 'auto'], unit: ' MB/s', legend: true,
  },
  {
    title: 'Disk I/O', gradId: 'gradDisk', color: '#38bdf8', color2: '#1a75c4', gradId2: 'gradDisk2',
    dataKeys: [{ key: 'diskRead', name: 'Read' }, { key: 'diskWrite', name: 'Write', alt: true }],
    domain: [0, 'auto'], unit: ' MB/s', legend: true,
  },
]

/** Fetches real stats for every running container and sums/averages them. */
const fetchAggregateStats = async (containers) => {
  const running = containers.filter((c) => c.status === 'running')
  if (running.length === 0) return null

  const results = await Promise.all(running.map((c) => getContainerStats(c.id).catch(() => null)))
  const valid = results.filter(Boolean)
  if (valid.length === 0) return null

  return {
    avgCpu: valid.reduce((sum, s) => sum + s.cpu_percent, 0) / valid.length,
    avgMemory: valid.reduce((sum, s) => sum + s.memory_percent, 0) / valid.length,
    totalRx: valid.reduce((sum, s) => sum + s.network_rx, 0),
    totalTx: valid.reduce((sum, s) => sum + s.network_tx, 0),
    totalDiskRead: valid.reduce((sum, s) => sum + (s.disk_read || 0), 0),
    totalDiskWrite: valid.reduce((sum, s) => sum + (s.disk_write || 0), 0),
    sampleCount: valid.length,
  }
}

const Monitoring = () => {
  const { containers } = useContainers(POLL_MS)
  const [data, setData] = useState([])
  const [current, setCurrent] = useState(null)
  const prevTotalsRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      const agg = await fetchAggregateStats(containers)
      if (cancelled) return

      if (!agg) {
        setCurrent(null)
        prevTotalsRef.current = null
        return
      }

      const now = Date.now()
      let netDownRate = 0, netUpRate = 0, diskReadRate = 0, diskWriteRate = 0
      const prev = prevTotalsRef.current
      if (prev) {
        const dtSec = (now - prev.time) / 1000
        if (dtSec > 0) {
          // Docker's stats API reports cumulative bytes since container
          // start, not a rate — so a real rate only exists from the second
          // sample onward (delta / elapsed time). max(0, ...) guards against
          // a container restarting mid-session and its counters resetting.
          netDownRate = Math.max(0, (agg.totalRx - prev.rx) / dtSec)
          netUpRate = Math.max(0, (agg.totalTx - prev.tx) / dtSec)
          diskReadRate = Math.max(0, (agg.totalDiskRead - prev.diskRead) / dtSec)
          diskWriteRate = Math.max(0, (agg.totalDiskWrite - prev.diskWrite) / dtSec)
        }
      }
      prevTotalsRef.current = { rx: agg.totalRx, tx: agg.totalTx, diskRead: agg.totalDiskRead, diskWrite: agg.totalDiskWrite, time: now }

      const point = {
        time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        cpu: Math.round(agg.avgCpu * 10) / 10,
        memory: Math.round(agg.avgMemory * 10) / 10,
        netDownload: Math.round((netDownRate / BYTES_PER_MB) * 100) / 100,
        netUpload: Math.round((netUpRate / BYTES_PER_MB) * 100) / 100,
        diskRead: Math.round((diskReadRate / BYTES_PER_MB) * 100) / 100,
        diskWrite: Math.round((diskWriteRate / BYTES_PER_MB) * 100) / 100,
      }
      setCurrent({ ...point, sampleCount: agg.sampleCount })
      setData((prevData) => [...prevData.slice(-(MAX_POINTS - 1)), point])
    }

    // useContainers already re-fetches (and hands us a new `containers`
    // reference) every POLL_MS — that's the only clock this needs; a second
    // independent interval here would just double up the same work.
    poll()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containers])

  const netTotal = current ? Math.round((current.netDownload + current.netUpload) * 100) / 100 : null

  return (
    <AppShell>
      <PageHeader
        title="Monitoring"
        subtitle={
          current
            ? `Live metrics aggregated across ${current.sampleCount} running container${current.sampleCount === 1 ? '' : 's'}.`
            : 'Live metrics — no running containers to measure right now.'
        }
        actions={
          <Button variant="glass" size="sm" shape="rounded" onClick={() => setData([])}>
            <Trash2 className="w-3.5 h-3.5" /> Clear chart
          </Button>
        }
      />

      {/* Metric summary cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.08 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {METRIC_CARDS.map(({ label, key, unit, icon: Icon, color }) => {
          const val = key === 'netTotal' ? netTotal : current?.[key]
          return (
            <motion.div key={label} variants={itemVariant}>
              <Card glow animate={false} className="p-4 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xs font-semibold text-muted uppercase tracking-widest">{label}</p>
                    <p className="text-2xl font-extrabold mt-1.5 tabular-nums" style={{ color, letterSpacing: '-0.03em' }}>
                      {val ?? '—'}
                      {val != null && <span className="text-sm font-normal text-muted ml-1">{unit}</span>}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl" style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
                    <Icon className="w-4.5 h-4.5" style={{ width: '18px', height: '18px', color }} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-2xs font-semibold" style={{ color: current ? color : 'var(--color-muted)' }}>
                  <TrendingUp className="w-3 h-3" />
                  <span>{current ? 'Live' : 'Idle'}</span>
                </div>
                <div
                  className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full pointer-events-none opacity-25"
                  style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, filter: 'blur(12px)' }}
                />
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {CHARTS.map((chart, i) => (
          <motion.div
            key={chart.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.08 }}
          >
            <Card glow className="p-5">
              <h3 className="text-2xs font-bold text-muted uppercase tracking-widest mb-5">{chart.title}</h3>
              {data.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-muted">
                  Waiting for data — this fills in as real samples come in.
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                      <defs>
                        <linearGradient id={chart.gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chart.color} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={chart.color} stopOpacity={0} />
                        </linearGradient>
                        {chart.gradId2 && (
                          <linearGradient id={chart.gradId2} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chart.color2} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={chart.color2} stopOpacity={0} />
                          </linearGradient>
                        )}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                      <XAxis dataKey="time" stroke="var(--color-muted)" fontSize={10} tickLine={false} interval="preserveStartEnd" />
                      <YAxis stroke="var(--color-muted)" fontSize={10} domain={chart.domain} tickLine={false} axisLine={false} unit={chart.unit} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      {chart.legend && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingBottom: '4px' }} />}
                      {chart.dataKeys.map((dk) => (
                        <Area
                          key={dk.key}
                          type="monotone"
                          dataKey={dk.key}
                          stroke={dk.alt ? chart.color2 : chart.color}
                          strokeWidth={2}
                          fill={`url(#${dk.alt ? chart.gradId2 : chart.gradId})`}
                          name={dk.name}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </AppShell>
  )
}

export default Monitoring
