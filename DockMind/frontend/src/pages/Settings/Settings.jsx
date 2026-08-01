import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, UserCircle2, Palette, Cpu } from 'lucide-react'
import AppShell from '../../components/common/ui/AppShell'
import PageHeader from '../../components/common/ui/PageHeader'
import Card from '../../components/common/ui/Card'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getAiHealth } from '../../services/ai'

const SECTIONS = [
  {
    id: 'profile',
    icon: UserCircle2,
    label: 'Profile',
    color: '#2496ed',
    delay: 0,
  },
  {
    id: 'appearance',
    icon: Palette,
    label: 'Appearance',
    color: '#00d4ff',
    delay: 0.06,
  },
  {
    id: 'ai',
    icon: Cpu,
    label: 'AI Configuration',
    color: '#818cf8',
    delay: 0.12,
  },
]

const RowItem = ({ label, value, mono = false }) => (
  <div className="flex justify-between items-center py-2.5 border-b border-glassBorder last:border-0">
    <span className="text-sm text-muted">{label}</span>
    <span className={`text-sm text-text font-medium ${mono ? 'font-mono text-glow' : ''}`}>{value || '—'}</span>
  </div>
)

const Settings = () => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [aiHealth, setAiHealth] = useState(null)

  useEffect(() => {
    getAiHealth()
      .then(setAiHealth)
      .catch(() => setAiHealth({ connected: false, host: null, model: null, model_available: false }))
  }, [])

  return (
    <AppShell contentClassName="p-8 max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage your account preferences and configuration." />

      <div className="space-y-4">
        {SECTIONS.map(({ id, icon: Icon, label, color, delay }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
          >
            <Card animate={false} glow className="overflow-hidden">
              {/* Section header */}
              <div
                className="flex items-center gap-3 px-5 py-4"
                style={{ borderBottom: '1px solid var(--color-glass-border)' }}
              >
                {/* Colored left stripe */}
                <div
                  className="w-1 h-8 rounded-full shrink-0"
                  style={{ background: `linear-gradient(180deg, ${color}, transparent)` }}
                />
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}14`, border: `1px solid ${color}25` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <h3 className="font-bold text-text text-sm">{label}</h3>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                {id === 'profile' && (
                  <div>
                    <RowItem label="Name"  value={user?.name} />
                    <RowItem label="Email" value={user?.email} />
                  </div>
                )}

                {id === 'appearance' && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-text">Theme</p>
                      <p className="text-xs text-muted mt-0.5">
                        Currently: {theme === 'dark' ? 'Dark' : 'Light'} mode
                      </p>
                    </div>
                    <button
                      id="theme-toggle"
                      onClick={toggleTheme}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-full transition-all duration-200"
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-glass-border)',
                        color: 'var(--color-text)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-glass-border)'}
                    >
                      {theme === 'dark' ? (
                        <><Sun className="w-3.5 h-3.5 text-warning" /> Switch to Light</>
                      ) : (
                        <><Moon className="w-3.5 h-3.5 text-primary" /> Switch to Dark</>
                      )}
                    </button>
                  </div>
                )}

                {id === 'ai' && (
                  <div>
                    <RowItem
                      label="Status"
                      value={
                        aiHealth === null
                          ? 'Checking…'
                          : aiHealth.connected
                          ? 'Connected'
                          : 'Disconnected'
                      }
                    />
                    <RowItem label="Ollama Model" value={aiHealth?.model} mono />
                    <RowItem label="Ollama Host" value={aiHealth?.host} mono />
                    {aiHealth?.connected && !aiHealth?.model_available && (
                      <p className="text-xs text-warning mt-2 leading-relaxed">
                        Ollama is reachable, but "{aiHealth.model}" isn't pulled yet — run{' '}
                        <span className="font-mono">ollama pull {aiHealth.model}</span>.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </AppShell>
  )
}

export default Settings
