import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../utils/constants'

const navItems = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: '🏠' },
  { label: 'History', path: ROUTES.HISTORY, icon: '📋' },
  { label: 'Saved Prompts', path: ROUTES.SAVED_PROMPTS, icon: '💾' },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: '⚙️' },
]

const Sidebar = () => {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 min-h-screen bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">🐳 DockMind</h1>
        <p className="text-xs text-muted mt-1">AI Docker Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted hover:bg-surface hover:text-text'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-sm text-danger hover:text-red-400 transition-colors text-left px-2"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
