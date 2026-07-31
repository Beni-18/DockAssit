import api from './api'

/**
 * Command history service
 */

export const getHistory = async () => {
  // Trailing slash avoids a 307 redirect that would otherwise bypass the
  // dev proxy and hit the backend's host:port directly.
  const response = await api.get('/history/')
  return response.data
}

export const deleteHistoryEntry = async (id) => {
  await api.delete(`/history/${id}`)
}

// Most frequently executed (action, resource, target) combinations,
// aggregated from command history — ranked by run count.
export const getFrequentCommands = async (limit = 10) => {
  const response = await api.get('/history/frequent', { params: { limit } })
  return response.data
}
