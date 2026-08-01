import React from 'react'
import { motion } from 'framer-motion'

/**
 * PageHeader — consistent title + subtitle + actions row.
 * Title has gradient text treatment; animated underline accent line.
 */
const PageHeader = ({ title, subtitle, actions }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8"
  >
    <div>
      <div className="relative inline-block">
        <h2
          className="text-3xl font-extrabold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--color-text) 0%, var(--color-text-dim) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.03em',
          }}
        >
          {title}
        </h2>
        {/* Animated underline accent */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="mt-1 h-0.5 rounded-full origin-left"
          style={{
            background: 'linear-gradient(90deg, var(--color-glow), var(--color-primary), transparent)',
          }}
        />
      </div>
      {subtitle && (
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-xl">{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex items-center gap-2.5 shrink-0">{actions}</div>
    )}
  </motion.div>
)

export default PageHeader
