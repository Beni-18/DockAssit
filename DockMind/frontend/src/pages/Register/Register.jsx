import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { register } from '../../services/auth'
import { useAuth } from '../../context/AuthContext'
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Boxes, Bot, Activity, Zap, Check } from 'lucide-react'
import BrandMark from '../../components/common/BrandMark'
import AmbientGlow from '../../components/common/ui/AmbientGlow'
import TerminalPanel from '../../components/common/ui/TerminalPanel'
import Button from '../../components/common/ui/Button'

const FEATURES = [
  { Icon: Boxes, label: 'Manage containers at scale' },
  { Icon: Bot, label: 'AI-powered Docker insights' },
  { Icon: Activity, label: 'Real-time resource monitoring' },
  { Icon: Zap, label: 'One-click command execution' },
]

const MIN_PASSWORD_LENGTH = 10

const Register = () => {
  const navigate = useNavigate()
  const { login: setAuth } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const passwordLongEnough = form.password.length >= MIN_PASSWORD_LENGTH
  const passwordIsTrivial =
    form.password.length > 0 &&
    (form.password.toLowerCase() === form.name.trim().toLowerCase() ||
      form.password.toLowerCase() === form.email.trim().toLowerCase() ||
      form.password.toLowerCase() === form.email.split('@')[0].trim().toLowerCase())

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await register(form.name, form.email, form.password)
      setAuth(data.access_token, data.user)
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      let msg = 'Registration failed. Please try again.'
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

      {/* ─── LEFT PANEL — live terminal + feature list ─── */}
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
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-glow) 1px, transparent 1px), linear-gradient(90deg, var(--color-glow) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10">
          <BrandMark size="md" />
          <h2
            className="mt-8 text-3xl font-extrabold leading-tight"
            style={{ color: '#f0f4fa', letterSpacing: '-0.035em' }}
          >
            Bring your containers
            <br />
            into <span style={{ color: 'var(--color-glow)' }}>one conversation.</span>
          </h2>
          <p className="text-sm mt-4 leading-relaxed max-w-xs" style={{ color: 'rgba(232,238,248,0.5)' }}>
            Create an account and start managing your Docker environment in plain English.
          </p>

          <div className="mt-8 mb-8 grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <f.Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-glow)' }} />
                <span className="text-xs font-medium leading-snug" style={{ color: 'rgba(232,238,248,0.75)' }}>
                  {f.label}
                </span>
              </motion.div>
            ))}
          </div>

          <TerminalPanel />
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
          <div className="lg:hidden flex justify-center mb-8">
            <BrandMark size="lg" />
          </div>

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
                Create account
              </span>
              <h2
                className="text-2xl font-extrabold tracking-tight mb-1.5"
                style={{ letterSpacing: '-0.03em', color: 'var(--color-text)' }}
              >
                Start managing with intelligence
              </h2>
              <p className="text-muted text-sm mb-6">Takes less than a minute.</p>

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
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Full Name</label>
                  <div className="relative group/inp">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within/inp:text-glow transition-colors duration-200" />
                    <input
                      type="text" id="name" required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input-base pl-11" placeholder="Demo User"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Email</label>
                  <div className="relative group/inp">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within/inp:text-glow transition-colors duration-200" />
                    <input
                      type="email" id="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input-base pl-11" placeholder="demo@dockmind.dev"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Password</label>
                  <div className="relative group/inp">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within/inp:text-glow transition-colors duration-200" />
                    <input
                      type={showPassword ? 'text' : 'password'} id="password" required
                      minLength={MIN_PASSWORD_LENGTH}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      onBlur={() => setPasswordTouched(true)}
                      className="input-base pl-11 pr-12" placeholder="At least 10 characters"
                    />
                    <button
                      type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {(passwordTouched || form.password.length > 0) && (
                    <p
                      className="text-xs flex items-center gap-1.5 mt-1"
                      style={{ color: passwordLongEnough && !passwordIsTrivial ? 'var(--color-success)' : 'var(--color-muted)' }}
                    >
                      {passwordLongEnough && !passwordIsTrivial && <Check className="w-3 h-3" />}
                      {passwordIsTrivial
                        ? "Can't be the same as your name or email"
                        : `At least ${MIN_PASSWORD_LENGTH} characters${passwordLongEnough ? ' ✓' : ` (${form.password.length}/${MIN_PASSWORD_LENGTH})`}`}
                    </p>
                  )}
                </div>

                <Button type="submit" id="register-submit" disabled={loading} shape="rounded" size="lg" className="w-full mt-2">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Account <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-muted mt-4">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold hover:text-glow transition-colors"
                    style={{ color: 'var(--color-glow)' }}>
                    Sign In
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

export default Register
