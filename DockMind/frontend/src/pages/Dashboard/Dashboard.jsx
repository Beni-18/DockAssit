import React, { useState } from 'react'
import Sidebar from '../../components/common/Sidebar'
import MetricCard from '../../components/dashboard/MetricCard'
import ContainerTable from '../../components/docker/ContainerTable'
import PromptBox from '../../components/ai/PromptBox'
import AIResponse from '../../components/ai/AIResponse'
import useContainers from '../../hooks/useContainers'
import { executeDockerAction } from '../../services/docker'
import api from '../../services/api'

const Dashboard = () => {
  const { containers, loading } = useContainers()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState(null)
  const [aiError, setAiError] = useState(null)

  const runningCount = containers.filter((c) => c.status === 'running').length
  const stoppedCount = containers.filter((c) => c.status === 'exited').length

  const handlePrompt = async (prompt) => {
    setAiLoading(true)
    setAiError(null)
    setAiResponse(null)
    try {
      const res = await api.post('/ai/execute', { prompt })
      setAiResponse(res.data)
    } catch (err) {
      setAiError(err.response?.data?.detail || 'AI request failed.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleContainerAction = async (action, containerId) => {
    await executeDockerAction(action, containerId)
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
          <MetricCard title="Total Containers" value={containers.length} icon="📦" color="indigo" />
          <MetricCard title="Running" value={runningCount} icon="✅" color="green" />
          <MetricCard title="Stopped" value={stoppedCount} icon="🛑" color="indigo" />
          <MetricCard title="Docker Status" value="Healthy" icon="🐳" color="cyan" />
        </div>

        {/* AI Prompt Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Ask DockMind</h3>
          <PromptBox onSubmit={handlePrompt} loading={aiLoading} />
          <AIResponse response={aiResponse} loading={aiLoading} error={aiError} />
        </div>

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
