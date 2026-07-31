import React from 'react'
import Sidebar from '../../components/common/Sidebar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const Settings = () => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted text-sm mt-1">Manage your preferences</p>
        </div>

        <div className="space-y-4">
          {/* Profile */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Profile</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Name</span>
                <span>{user?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Email</span>
                <span>{user?.email || '—'}</span>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Appearance</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Theme</span>
              <button
                id="theme-toggle"
                onClick={toggleTheme}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:border-primary transition-colors"
              >
                {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
              </button>
            </div>
          </section>

          {/* Ollama Config */}
          <section className="bg-surface border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">AI Configuration</h3>
            <div className="space-y-3 text-sm text-muted">
              <div className="flex justify-between">
                <span>Ollama Model</span>
                <span className="text-indigo-400 font-mono">llama3</span>
              </div>
              <div className="flex justify-between">
                <span>Ollama Host</span>
                <span className="font-mono">http://localhost:11434</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Settings
