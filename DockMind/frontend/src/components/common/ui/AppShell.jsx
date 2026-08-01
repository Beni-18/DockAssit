import React from 'react'
import { motion } from 'framer-motion'
import Sidebar from '../Sidebar'
import AmbientGlow from './AmbientGlow'

/**
 * AppShell — viewport-locked app frame. Sidebar is fixed/overlaid so its
 * hover-expand never reflows this layout; the spacer keeps main content
 * clear of it at the permanent collapsed width. `main` is the only scroll
 * container so pages scroll internally instead of growing the whole document.
 */
const AppShell = ({ children, contentClassName = '' }) => (
  <div className="flex h-screen bg-bg relative overflow-hidden">
    <AmbientGlow />
    <Sidebar />
    <div className="shrink-0 h-full" style={{ width: 'var(--sidebar-collapsed)' }} aria-hidden="true" />
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative z-10 flex-1 min-w-0 h-full overflow-y-auto ${contentClassName || 'p-8'}`}
    >
      {children}
    </motion.main>
  </div>
)

export default AppShell
