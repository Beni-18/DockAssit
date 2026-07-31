import React, { useEffect, useState } from 'react'
import { Box, CheckCircle2, StopCircle, Activity } from 'lucide-react'
import Sidebar from '../../components/common/Sidebar'
import MetricCard from '../../components/dashboard/MetricCard'
import ContainerTable from '../../components/docker/ContainerTable'
import ChatPanel from '../../components/chatbot/ChatPanel'
import useContainers from '../../hooks/useContainers'
import { executeDockerAction, getDockerInfo } from '../../services/docker'

const Dashboard = () => {
  const { containers, loading, refetch } = useContainers()
  const [dockerStatus, setDockerStatus] = useState('Checking...')

  useEffect(() => {
    getDockerInfo()
      .then(() => setDockerStatus('Healthy'))
      .catch(() => setDockerStatus('Unreachable'))
  }, [])

  const runningCount = containers.filter((c) => c.status === 'running').length
  const stoppedCount = containers.filter((c) => c.status === 'exited').length

  const handleContainerAction = async (action, containerId) => {
    await executeDockerAction(action, containerId)
    refetch()
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted text-sm mt-1">Real-time Docker health overview</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Containers" value={containers.length} icon={Box} color="primary" />
          <MetricCard title="Running" value={runningCount} icon={CheckCircle2} color="success" />
          <MetricCard title="Stopped" value={stoppedCount} icon={StopCircle} color="muted" />
          <MetricCard title="Docker Status" value={dockerStatus} icon={Activity} color="accent" />
        </div>

        {/* AI Chat Panel — self-contained, see components/chatbot/ChatPanel.jsx */}
        <ChatPanel />

        {/* Container Table */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Containers</h3>
          {loading ? (
            <p className="text-muted text-sm">Loading containers...</p>
          ) : (
            <ContainerTable containers={containers} onAction={handleContainerAction} />
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
