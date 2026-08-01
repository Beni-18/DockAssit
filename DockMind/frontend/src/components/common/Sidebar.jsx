import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { ROUTES } from '../../utils/constants'
import BrandMark from './BrandMark'
import {
  LayoutDashboard,
  Boxes,
  BarChart3,
  Bot,
  ClipboardList,
  Zap,
  Disc,
  HardDrive,
  Network,
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Dashboard',         path: ROUTES.DASHBOARD,         icon: LayoutDashboard },
  { label: 'Containers',        path: ROUTES.CONTAINERS,        icon: Boxes },
  { label: 'Monitoring',        path: ROUTES.MONITORING,        icon: BarChart3 },
  { label: 'AI Assistant',      path: ROUTES.AI_ASSISTANT,      icon: Bot },
  { label: 'Command History',   path: ROUTES.HISTORY,           icon: ClipboardList },
  { label: 'Frequent Commands', path: ROUTES.FREQUENT_COMMANDS, icon: Zap },
  { label: 'Images',            path: ROUTES.IMAGES,            icon: Disc },
  { label: 'Volumes',           path: ROUTES.VOLUMES,           icon: HardDrive },
  { label: 'Networks',          path: ROUTES.NETWORKS,          icon: Network },
  { label: 'Settings',          path: ROUTES.SETTINGS,          icon: SettingsIcon },
]

const sidebarVariants = {
  collapsed: { width: 'var(--sidebar-collapsed)' },
  expanded:  { width: 'var(--sidebar-expanded)' },
}

const Sidebar = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [expanded, setExpanded] = useState(false)

  const initial = user?.name?.charAt(0)?.toUpperCase() || 'U'

  return (
    <motion.aside
      variants={sidebarVariants}
      initial="collapsed"
      animate={expanded ? 'expanded' : 'collapsed'}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed left-0 top-0 z-30 flex flex-col h-screen overflow-hidden"
      style={{
        background: 'var(--color-panel)',
        backdropFilter: 'blur(28px)',
        borderRight: '1px solid var(--color-glass-border)',
      }}
    >
      {/* Top-edge highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)',
        }}
      />

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-glassBorder shrink-0 overflow-hidden">
        <div className="shrink-0">
          <BrandMark size="sm" iconOnly />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col overflow-hidden whitespace-nowrap"
            >
              <span
                className="text-base font-bold tracking-tight text-text"
                style={{ letterSpacing: '-0.02em' }}
              >
                Dock<span style={{ color: 'var(--color-glow)' }}>Mind</span>
              </span>
              <span className="text-2xs text-muted uppercase tracking-widest font-medium mt-0.5">
                AI Docker
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className="relative group block">
              {({ isActive }) => (
                <>
                <motion.div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer overflow-hidden transition-colors duration-150 ${
                    isActive
                      ? 'text-white'
                      : 'text-muted hover:text-textDim hover:bg-white/[0.04]'
                  }`}
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  {/* Active bg */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bg"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(0,212,255,0.12) 0%, rgba(36,150,237,0.08) 100%)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  {/* Active left border */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-bar"
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full"
                      style={{
                        background: 'linear-gradient(180deg, var(--color-glow), var(--color-primary))',
                        boxShadow: '0 0 8px var(--color-glow)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}

                  <Icon
                    className={`shrink-0 w-4.5 h-4.5 relative ${isActive ? 'text-glow' : ''}`}
                    style={{ width: '18px', height: '18px' }}
                  />

                  <AnimatePresence>
                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        transition={{ duration: 0.16 }}
                        className="text-sm font-medium whitespace-nowrap relative"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                </motion.div>
                {/* Tooltip when collapsed — sibling of the clipped nav box so it isn't cut off,
                    still inside the `group` NavLink so group-hover reaches it */}
                {!expanded && (
                  <div className="sidebar-tooltip opacity-0 group-hover:opacity-100">
                    {item.label}
                  </div>
                )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-glassBorder px-2.5 py-3 space-y-0.5 shrink-0">
        {/* Theme Toggle */}
        <motion.button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted hover:text-textDim hover:bg-white/[0.04] transition-colors overflow-hidden"
          whileHover={{ x: 2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          {theme === 'dark'
            ? <Sun className="w-4.5 h-4.5 text-warning shrink-0" style={{ width: '18px', height: '18px' }} />
            : <Moon className="w-4.5 h-4.5 text-primary shrink-0" style={{ width: '18px', height: '18px' }} />}
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.16 }}
                className="text-sm font-medium whitespace-nowrap"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Logout */}
        <motion.button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors overflow-hidden"
          whileHover={{ x: 2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.16 }}
                className="text-sm font-medium whitespace-nowrap"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* User avatar */}
        <div className="flex items-center gap-3 px-3 pt-2 mt-1 border-t border-glassBorder overflow-hidden">
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-glow))',
              boxShadow: '0 0 12px -2px rgba(0,212,255,0.4)',
            }}
          >
            {initial}
          </div>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.16 }}
                className="flex-1 min-w-0 whitespace-nowrap"
              >
                <p className="text-xs font-semibold text-text truncate">{user?.name || 'User'}</p>
                <p className="text-2xs text-muted truncate">{user?.email || ''}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}

export default Sidebar
