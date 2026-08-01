/**
 * Date & Time Formatting Utilities
 */

export const formatDate = (isoString) => {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const formatDateTime = (isoString) => {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatRelativeTime = (isoString) => {
  if (!isoString) return '—'
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return formatDate(isoString)
}

/**
 * Real elapsed duration since a container was last started (Docker's
 * `State.StartedAt`), e.g. "1d 3h", "2h 15m", "20m". Docker sets this to
 * the zero time for a container that's never been started.
 */
export const formatUptime = (isoString) => {
  if (!isoString) return '—'
  const started = new Date(isoString).getTime()
  if (Number.isNaN(started) || started <= 0) return '—'
  const diffSec = Math.floor((Date.now() - started) / 1000)
  if (diffSec < 0) return '—'
  const days = Math.floor(diffSec / 86400)
  const hours = Math.floor((diffSec % 86400) / 3600)
  const minutes = Math.floor((diffSec % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${diffSec % 60}s`
}

/**
 * Container Status Formatting
 */

export const getStatusColor = (status) => {
  const statusMap = {
    running: 'success',
    exited: 'danger',
    paused: 'warning',
    restarting: 'warning',
    created: 'muted',
    dead: 'danger',
  }
  return statusMap[status?.toLowerCase()] || 'muted'
}

export const getStatusLabel = (status) => {
  return status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : 'Unknown'
}

/**
 * Byte Formatting
 */

export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * CPU Percentage Formatting
 */

export const formatCpu = (value) => {
  if (value === null || value === undefined) return '—'
  return `${parseFloat(value).toFixed(2)}%`
}
