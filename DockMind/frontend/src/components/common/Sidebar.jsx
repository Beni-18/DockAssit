import React from 'react'
import { NavLink } from 'react-router-dom'
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
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Containers', path: ROUTES.CONTAINERS, icon: Boxes },
  { label: 'Monitoring', path: ROUTES.MONITORING, icon: BarChart3 },
  { label: 'AI Assistant', path: ROUTES.AI_ASSISTANT, icon: Bot },
  { label: 'Command History', path: ROUTES.HISTORY, icon: ClipboardList },
  { label: 'Frequent Commands', path: ROUTES.FREQUENT_COMMANDS, icon: Zap },
  { label: 'Images', path: ROUTES.IMAGES, icon: Disc },
  { label: 'Volumes', path: ROUTES.VOLUMES, icon: HardDrive },
  { label: 'Networks', path: ROUTES.NETWORKS, icon: Network },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: SettingsIcon },
]

const Sidebar = () => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <aside className="w-64 min-h-screen bg-surface text-muted border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <BrandMark size="md" />
        <p className="text-xs text-muted mt-2">AI Docker Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white font-medium shadow-md shadow-primary/20'
                    : 'text-muted hover:bg-bg hover:text-text'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-border bg-bg/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold border border-border shadow-inner">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted truncate">{user?.email || ''}</p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 text-sm text-muted hover:text-text hover:bg-bg/85 transition-all duration-200 px-3 py-2 rounded-lg mb-2"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4 text-primary" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 text-sm text-danger hover:opacity-80 hover:bg-danger/10 transition-all duration-200 px-3 py-2 rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
