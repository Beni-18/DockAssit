import React from 'react'

/**
 * HealthBadge — Reusable colored badge for Docker container health status
 * Props:
 * - status: 'healthy' | 'warning' | 'unhealthy'
 */
const healthStyles = {
  healthy: {
    classes: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
    dot: 'bg-green-500',
    label: 'Healthy'
  },
  warning: {
    classes: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    label: 'Warning'
  },
  unhealthy: {
    classes: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    label: 'Unhealthy'
  }
}

const HealthBadge = ({ status }) => {
  const key = status?.toLowerCase()
  const current = healthStyles[key] || healthStyles.healthy

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${current.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot} animate-pulse`} />
      {current.label}
    </span>
  )
}

export default HealthBadge
