import React from 'react'
import { motion } from 'framer-motion'

/**
 * Card — premium glass surface with top-edge highlight shimmer,
 * layered glow on hover, and staggered entrance animation.
 */
const Card = ({ children, className = '', glow = false, animate = true, delay = 0, noPad = false, ...rest }) => {
  const Comp = animate ? motion.div : 'div'
  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay },
      }
    : {}

  return (
    <Comp
      className={`
        relative overflow-hidden rounded-3xl
        bg-surface backdrop-blur-xl
        border border-glassBorder
        shadow-card
        transition-all duration-300
        ${glow ? 'hover:shadow-card-hover hover:border-borderHi' : ''}
        ${className}
      `}
      {...motionProps}
      {...rest}
    >
      {/* Top-edge highlight — premium glass layer */}
      <div
        className="absolute top-0 left-4 right-4 h-px pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)',
        }}
      />
      {/* Subtle inner glow when hovered (glow prop) */}
      {glow && (
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 60%)',
          }}
        />
      )}
      {children}
    </Comp>
  )
}

export default Card
