import React from 'react'

/**
 * StatusBadge — colored badge for container status
 */
const statusStyles = {
  running: 'bg-success/20 text-success border border-success/30',
  exited: 'bg-danger/20 text-danger border border-danger/30',
  paused: 'bg-warning/20 text-warning border border-warning/30',
  restarting: 'bg-accent/20 text-accent border border-accent/30',
  created: 'bg-muted/20 text-muted border border-muted/30',
  dead: 'bg-danger/30 text-danger border border-danger/40',
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
