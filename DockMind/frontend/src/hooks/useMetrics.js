import { useState, useEffect, useCallback } from 'react'
import { getContainerStats } from '../services/docker'

/**
 * useMetrics — polls container CPU/memory/network stats
 * @param {string} containerId
 * @param {number} interval - polling interval in ms (default: 5s)
 */
const useMetrics = (containerId, interval = 5000) => {
  const [metrics, setMetrics] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    if (!containerId) return
    try {
      const data = await getContainerStats(containerId)
      setMetrics(data)
      setHistory((prev) => [...prev.slice(-29), { ...data, time: new Date().toLocaleTimeString() }])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }, [containerId])

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, interval)
    return () => clearInterval(id)
  }, [fetchStats, interval])

  return { metrics, history, loading, error }
}

export default useMetrics
