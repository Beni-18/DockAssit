import React from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

/**
 * MetricCard — displays a single Docker metric (CPU, Memory, Network)
 */
const COLOR_STYLES = {
  primary: 'from-primary/20 to-primary/5 border-primary/30 text-primary',
  success: 'from-success/20 to-success/5 border-success/30 text-success',
  muted: 'from-muted/20 to-muted/5 border-muted/30 text-muted',
  accent: 'from-accent/20 to-accent/5 border-accent/30 text-accent',
}

const MetricCard = ({ title, value, unit, icon: Icon, trend, color = 'primary' }) => {
  const TrendIcon = trend >= 0 ? ArrowUp : ArrowDown

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 ${COLOR_STYLES[color]}`}>
      <div className="flex items-center justify-between mb-3">
        {Icon && <Icon size={22} strokeWidth={2} />}
        {trend !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend >= 0 ? 'text-success' : 'text-danger'
            }`}
          >
            <TrendIcon size={12} strokeWidth={2.5} />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-sm text-muted mb-1">{title}</p>
      <p className="text-2xl font-bold text-text">
        {value ?? '—'}
        {unit && <span className="text-sm font-normal text-muted ml-1">{unit}</span>}
      </p>
    </div>
  )
}

export default MetricCard
