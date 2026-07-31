import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, History as HistoryIcon, Zap, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../utils/constants'
import BrandMark from './BrandMark'

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, Icon: Home },
  { label: 'History', path: ROUTES.HISTORY, Icon: HistoryIcon },
  { label: 'Frequent Commands', path: ROUTES.FREQUENT_COMMANDS, Icon: Zap },
  { label: 'Settings', path: ROUTES.SETTINGS, Icon: SettingsIcon },
]

const Sidebar = () => {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 min-h-screen bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <BrandMark size="md" />
        <p className="text-xs text-muted mt-2">AI Docker Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ label, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted hover:bg-bg hover:text-text'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 text-sm text-danger hover:opacity-80 transition-opacity text-left px-2"
        >
          <LogOut size={16} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
