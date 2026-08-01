import React from 'react'

/**
 * Skeleton — shimmering placeholder block, replacing bare "Loading..." text.
 */
export const Skeleton = ({ className = '' }) => (
  <div className={`relative overflow-hidden rounded-lg bg-white/[0.04] ${className}`}>
    <div className="absolute inset-0 animate-shimmer" />
  </div>
)

/**
 * SkeletonRows — a stack of table-row-shaped skeletons, for table loading
 * states (Containers/Images/Volumes/Networks/History/FrequentCommands).
 */
export const SkeletonRows = ({ rows = 5, cols = 5 }) => (
  <div className="divide-y divide-glassBorder">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-6 p-4">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-1/4' : 'flex-1'}`} />
        ))}
      </div>
    ))}
  </div>
)

export default Skeleton
