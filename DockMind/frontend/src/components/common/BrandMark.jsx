import React from 'react'
import { Box } from 'lucide-react'

const SIZES = {
  sm: { badge: 'w-7 h-7',  icon: 14, title: 'text-base',  gap: 'gap-2' },
  md: { badge: 'w-9 h-9',  icon: 18, title: 'text-lg',    gap: 'gap-2.5' },
  lg: { badge: 'w-14 h-14',icon: 28, title: 'text-3xl',   gap: 'gap-4' },
}

/**
 * BrandMark — DockMind logo badge + tracked wordmark. Pass `iconOnly` when
 * a caller (e.g. the collapsed Sidebar) renders its own wordmark separately,
 * so the label doesn't get doubled up.
 */
const BrandMark = ({ size = 'md', iconOnly = false }) => {
  const s = SIZES[size]
  return (
    <div className={`flex items-center ${s.gap}`}>
      <span
        className={`flex items-center justify-center rounded-2xl shrink-0 ${s.badge}`}
        style={{
          background: 'linear-gradient(135deg, #2496ed 0%, #00d4ff 100%)',
          boxShadow: '0 0 20px -4px rgba(0,212,255,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <Box size={s.icon} strokeWidth={2.5} className="text-white" />
      </span>
      {!iconOnly && (
        <span
          className={`font-bold tracking-tight text-text ${s.title}`}
          style={{ letterSpacing: '-0.02em' }}
        >
          Dock<span style={{ color: 'var(--color-glow)' }}>Mind</span>
        </span>
      )}
    </div>
  )
}

export default BrandMark
