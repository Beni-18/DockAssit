import React from 'react'
import StatusBadge from '../common/StatusBadge'
import { formatRelativeTime } from '../../utils/formatters'

/**
 * ContainerTable — lists all Docker containers with status, actions
 */
const ContainerTable = ({ containers, onAction }) => {
  const actions = ['start', 'stop', 'restart', 'remove']

  if (!containers?.length) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="text-4xl mb-3">🐳</p>
        <p>No containers found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Image</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Created</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {containers.map((c) => (
            <tr key={c.id} className="hover:bg-surface/50 transition-colors">
              <td className="py-3 pr-4 font-mono font-medium">{c.name}</td>
              <td className="py-3 pr-4 text-muted">{c.image}</td>
              <td className="py-3 pr-4">
                <StatusBadge status={c.status} />
              </td>
              <td className="py-3 pr-4 text-muted">{formatRelativeTime(c.created)}</td>
              <td className="py-3">
                <div className="flex gap-2">
                  {actions.map((action) => (
                    <button
                      key={action}
                      onClick={() => onAction?.(action, c.id)}
                      className="px-2 py-1 text-xs rounded-md bg-surface border border-border hover:border-primary hover:text-primary transition-colors capitalize"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ContainerTable
