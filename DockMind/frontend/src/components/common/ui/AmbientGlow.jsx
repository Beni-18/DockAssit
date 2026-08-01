import React from 'react'
import { useTheme } from '../../../context/ThemeContext'

/**
 * AmbientGlow — layered, slowly-drifting gradient blobs creating atmospheric
 * depth. Tuned per theme: the blue/cyan glow blobs and dark vignette read as
 * a premium glow against the near-black dark canvas, but the exact same
 * values over a light canvas just look like a dirty gray smudge — so light
 * mode gets much softer tints and drops the darkening vignette entirely.
 */
const AmbientGlow = () => {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const blobs = isLight
    ? [
        { pos: '-top-[20%] -left-[12%] w-[55%] h-[55%]', color: 'rgba(36,150,237,0.07)', blur: 90, anim: 'animate-drift', delay: '0s' },
        { pos: '-bottom-[18%] -right-[8%] w-[50%] h-[50%]', color: 'rgba(0,180,255,0.06)', blur: 90, anim: 'animate-drift-alt', delay: '-8s' },
        { pos: 'top-[30%] right-[5%] w-[35%] h-[40%]', color: 'rgba(56,189,248,0.05)', blur: 80, anim: 'animate-drift', delay: '-14s' },
        { pos: 'top-[5%] left-[35%] w-[30%] h-[30%]', color: 'rgba(36,150,237,0.03)', blur: 70, anim: 'animate-drift-alt', delay: '-4s' },
      ]
    : [
        { pos: '-top-[20%] -left-[12%] w-[55%] h-[55%]', color: 'rgba(0,212,255,0.09)', blur: 80, anim: 'animate-drift', delay: '0s' },
        { pos: '-bottom-[18%] -right-[8%] w-[50%] h-[50%]', color: 'rgba(36,150,237,0.10)', blur: 80, anim: 'animate-drift-alt', delay: '-8s' },
        { pos: 'top-[30%] right-[5%] w-[35%] h-[40%]', color: 'rgba(10,79,122,0.12)', blur: 70, anim: 'animate-drift', delay: '-14s' },
        { pos: 'top-[5%] left-[35%] w-[30%] h-[30%]', color: 'rgba(0,212,255,0.04)', blur: 60, anim: 'animate-drift-alt', delay: '-4s' },
      ]

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          className={`absolute ${b.pos} rounded-full ${b.anim}`}
          style={{
            background: `radial-gradient(ellipse at center, ${b.color} 0%, transparent 70%)`,
            filter: `blur(${b.blur}px)`,
            animationDelay: b.delay,
          }}
        />
      ))}
      {/* Vignette — only darkens edges in dark mode, where it deepens the
          near-black canvas; in light mode a dark vignette just reads as a
          gray smudge, so it's replaced with a barely-there cool shadow. */}
      <div
        className="absolute inset-0"
        style={{
          background: isLight
            ? 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(11,37,69,0.05) 100%)'
            : 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(4,6,10,0.4) 100%)',
        }}
      />
    </div>
  )
}

export default AmbientGlow
