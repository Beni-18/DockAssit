import api from './api'

/**
 * Docker service — all container-related API calls
 */

// Get all containers (running + stopped)
export const getContainers = async () => {
  const response = await api.get('/docker/containers')
  return response.data
}

// Get a single container's details
export const getContainerById = async (containerId) => {
  const response = await api.get(`/docker/containers/${containerId}`)
  return response.data
}

// Get container resource stats (CPU, memory, network)
export const getContainerStats = async (containerId) => {
  const response = await api.get(`/docker/containers/${containerId}/stats`)
  return response.data
}

// Get container logs
export const getContainerLogs = async (containerId, tail = 100) => {
  const response = await api.get(`/docker/containers/${containerId}/logs`, {
    params: { tail },
  })
  return response.data
}

// Execute a Docker action (start, stop, restart, remove)
export const executeDockerAction = async (action, target) => {
  const response = await api.post('/docker/execute', { action, target })
  return response.data
}

// Get Docker system info (version, images count, etc.)
export const getDockerInfo = async () => {
  const response = await api.get('/docker/info')
  return response.data
}
