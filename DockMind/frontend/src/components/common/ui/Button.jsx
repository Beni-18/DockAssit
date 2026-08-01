import React from 'react'
import { motion } from 'framer-motion'

const VARIANTS = {
  primary: {
    base: 'text-white border border-transparent shadow-glow-primary',
    style: { background: 'linear-gradient(135deg, #2496ed 0%, #1a75c4 100%)' },
  },
  glass: {
    base: 'bg-surface backdrop-blur-xl text-text border border-glassBorder hover:border-borderHi shadow-sm',
    style: {},
  },
  ghost: {
    base: 'bg-transparent text-muted hover:text-text hover:bg-surface border border-transparent',
    style: {},
  },
  danger: {
    base: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger hover:text-white',
    style: {},
  },
  glow: {
    base: 'text-white border border-glow/30',
    style: {
      background: 'linear-gradient(135deg, rgba(0,212,255,0.2) 0%, rgba(36,150,237,0.3) 100%)',
      boxShadow: '0 0 24px -4px rgba(0,212,255,0.4)',
    },
  },
}

const SIZES = {
  xs: 'px-2.5 py-1.5 text-2xs gap-1',
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-sm gap-2',
  xl: 'px-8 py-4 text-base gap-2.5',
}

const SHAPES = {
  pill:    'rounded-full',
  rounded: 'rounded-xl',
  square:  'rounded-lg',
}

/**
 * Button — the one interactive-button with shimmer on primary,
 * scale + glow on hover, and spring tap feedback.
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  shape = 'pill',
  className = '',
  disabled = false,
  style: propStyle = {},
  ...rest
}) => {
  const v = VARIANTS[variant] || VARIANTS.primary

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.025, y: -1 }}
      whileTap={disabled   ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled}
      className={`
        relative inline-flex items-center justify-center font-semibold
        overflow-hidden
        transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:-translate-y-0
        ${SHAPES[shape]} ${v.base} ${SIZES[size]} ${className}
      `}
      style={{ ...v.style, ...propStyle }}
      {...rest}
    >
      {/* Shimmer overlay for primary */}
      {variant === 'primary' && !disabled && (
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none animate-shimmer rounded-full"
          style={{
            backgroundImage:
              'linear-gradient(100deg, transparent 25%, rgba(255,255,255,0.12) 50%, transparent 75%)',
            backgroundSize: '400% 100%',
          }}
        />
      )}
      <span className="relative flex items-center justify-center gap-inherit"
        style={{ gap: 'inherit' }}>
        {children}
      </span>
    </motion.button>
  )
}

export default Button
