import React from 'react'
import { Inbox, Play, Square, RotateCw, Trash2 } from 'lucide-react'
import StatusBadge from '../common/StatusBadge'
import { formatRelativeTime } from '../../utils/formatters'

/**
 * ContainerTable — lists all Docker containers with status, actions
 */
const ACTIONS = [
  { key: 'start', label: 'Start', Icon: Play },
  { key: 'stop', label: 'Stop', Icon: Square },
  { key: 'restart', label: 'Restart', Icon: RotateCw },
  { key: 'remove', label: 'Remove', Icon: Trash2 },
]

const ContainerTable = ({ containers, onAction }) => {
  if (!containers?.length) {
    return (
      <div className="flex flex-col items-center py-12 text-muted">
        <Inbox size={36} strokeWidth={1.5} className="mb-3" />
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
            <tr key={c.id} className="hover:bg-bg/50 transition-colors">
              <td className="py-3 pr-4 font-mono font-medium">{c.name}</td>
              <td className="py-3 pr-4 text-muted">{c.image}</td>
              <td className="py-3 pr-4">
                <StatusBadge status={c.status} />
              </td>
              <td className="py-3 pr-4 text-muted">{formatRelativeTime(c.created)}</td>
              <td className="py-3">
                <div className="flex gap-2">
                  {ACTIONS.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => onAction?.(key, c.id)}
                      title={label}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-surface border border-border hover:border-primary hover:text-primary transition-colors"
                    >
                      <Icon size={13} strokeWidth={2} />
                      {label}
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
