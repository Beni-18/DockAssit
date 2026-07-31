import { useState, useEffect, useCallback } from 'react'
import { getContainers } from '../services/docker'

/**
 * useContainers — fetches and auto-refreshes Docker container list
 * @param {number} refreshInterval - polling interval in ms (default: 10s)
 */
const useContainers = (refreshInterval = 10000) => {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchContainers = useCallback(async () => {
    try {
      const data = await getContainers()
      setContainers(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch containers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContainers()
    const interval = setInterval(fetchContainers, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchContainers, refreshInterval])

  return { containers, loading, error, refetch: fetchContainers }
}

export default useContainers
