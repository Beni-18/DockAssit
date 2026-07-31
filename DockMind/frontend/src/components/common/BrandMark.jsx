import React from 'react'
import { Box } from 'lucide-react'

const SIZES = {
  md: { badge: 'w-9 h-9', icon: 18, title: 'text-xl' },
  lg: { badge: 'w-14 h-14', icon: 28, title: 'text-3xl' },
}

/**
 * BrandMark — the DockMind logo (icon badge + wordmark), used in the
 * Sidebar and on the Login page.
 */
const BrandMark = ({ size = 'md' }) => {
  const s = SIZES[size]
  return (
    <div className="flex items-center gap-3">
      <span className={`flex items-center justify-center rounded-lg bg-primary text-white shrink-0 ${s.badge}`}>
        <Box size={s.icon} strokeWidth={2} />
      </span>
      <span className={`font-bold text-text ${s.title}`}>DockMind</span>
    </div>
  )
}

export default BrandMark
