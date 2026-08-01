import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { login } from '../../services/auth'
import { useAuth } from '../../context/AuthContext'
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, Mail } from 'lucide-react'
import BrandMark from '../../components/common/BrandMark'
import AmbientGlow from '../../components/common/ui/AmbientGlow'
import TerminalPanel from '../../components/common/ui/TerminalPanel'
import Button from '../../components/common/ui/Button'

const Login = () => {
  const navigate = useNavigate()
  const { login: setAuth } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await login(form.username, form.password)
      setAuth(data.access_token, data.user)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      let msg = 'Login failed. Please check your credentials.'
      if (typeof detail === 'string') msg = detail
      else if (Array.isArray(detail)) msg = detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
      else if (detail) msg = JSON.stringify(detail)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex overflow-hidden relative">
      <AmbientGlow />

      {/* ─── LEFT PANEL — live terminal session, not a stock illustration ─── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col justify-center w-[52%] relative overflow-hidden px-16"
        style={{
          background: 'linear-gradient(160deg, rgba(10,20,40,0.95) 0%, rgba(4,6,10,0.98) 100%)',
          borderRight: '1px solid var(--color-glass-border)',
        }}
      >
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-glow) 1px, transparent 1px), linear-gradient(90deg, var(--color-glow) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <BrandMark size="md" />
          </div>

          <h1
            className="text-[2.3rem] font-extrabold leading-[1.05] mb-4"
            style={{ color: '#f0f4fa', letterSpacing: '-0.035em' }}
          >
            Your Docker fleet,
            <br />
            <span style={{ color: 'var(--color-glow)' }}>one conversation away.</span>
          </h1>
          <p className="text-sm mb-9 max-w-sm" style={{ color: 'rgba(232,238,248,0.5)' }}>
            Ask it anything. Watch it work. No dashboards to memorize, no CLI to look up.
          </p>

          <TerminalPanel />

          {/* Live status strip — reinforces "real tool", not a marketing mock */}
          <div className="flex items-center gap-5 mt-6 text-xs font-mono" style={{ color: 'rgba(232,238,248,0.4)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" style={{ boxShadow: '0 0 6px var(--color-success)' }} />
              3 containers healthy
            </span>
            <span>·</span>
            <span>12% CPU</span>
            <span>·</span>
            <span>34% memory</span>
          </div>
        </div>
      </motion.div>

      {/* ─── RIGHT PANEL — Form ─── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile branding */}
          <div className="lg:hidden flex justify-center mb-8">
            <BrandMark size="lg" />
          </div>

          {/* Form card — a terminal-tab accent bar ties it back to the left
              panel instead of a generic glass-glow-blob card */}
          <div
            className="rounded-2xl overflow-hidden flex"
            style={{
              background: 'var(--color-surface)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--color-glass-border)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            }}
          >
            <div className="w-1 shrink-0" style={{ background: 'linear-gradient(180deg, var(--color-glow), var(--color-primary))' }} />
            <div className="flex-1 p-8">
              <span
                className="block text-xs font-mono font-bold uppercase tracking-[0.2em] mb-3"
                style={{ color: 'var(--color-glow)' }}
              >
                Sign in
              </span>
              <h2
                className="text-2xl font-extrabold tracking-tight mb-1.5"
                style={{ letterSpacing: '-0.03em', color: 'var(--color-text)' }}
              >
                Welcome back
              </h2>
              <p className="text-muted text-sm mb-6">Pick up right where you left off.</p>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5 overflow-hidden"
                  >
                    <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest">
                    Email
                  </label>
                  <div className="relative group/inp">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within/inp:text-glow transition-colors duration-200" />
                    <input
                      type="email"
                      id="username"
                      required
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="input-base pl-11"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest">
                    Password
                  </label>
                  <div className="relative group/inp">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within/inp:text-glow transition-colors duration-200" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="input-base pl-11 pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  id="login-submit"
                  disabled={loading}
                  shape="rounded"
                  size="lg"
                  className="w-full mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-muted mt-4">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-semibold hover:text-glow transition-colors"
                    style={{ color: 'var(--color-glow)' }}>
                    Sign Up
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
