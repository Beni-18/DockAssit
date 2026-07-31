import React from 'react'

/**
 * StatusBadge — colored badge for container status
 */
const statusStyles = {
  running: 'bg-green-500/20 text-green-400 border border-green-500/30',
  exited: 'bg-red-500/20 text-red-400 border border-red-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  restarting: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  created: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  dead: 'bg-red-900/20 text-red-600 border border-red-900/30',
}

const StatusBadge = ({ status }) => {
  const style = statusStyles[status?.toLowerCase()] || statusStyles.created
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
    </span>
  )
}

export default StatusBadge
