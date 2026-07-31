import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../../services/auth'
import { useAuth } from '../../context/AuthContext'
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import BrandMark from '../../components/common/BrandMark'

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
      if (typeof detail === 'string') {
        msg = detail
      } else if (Array.isArray(detail)) {
        msg = detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
      } else if (detail) {
        msg = JSON.stringify(detail)
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg relative flex items-center justify-center px-4 overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <BrandMark size="lg" />
          <p className="text-muted text-sm mt-3 font-medium tracking-wide">
            AI-POWERED DOCKER HEALTH DASHBOARD
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-surface/60 backdrop-blur-xl border border-border/80 rounded-3xl p-8 shadow-2xl relative group overflow-hidden">
          {/* Subtle hover border effect */}
          <div className="absolute inset-0 border border-primary/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <h2 className="text-2xl font-bold text-text mb-2">Sign In</h2>
          <p className="text-muted text-xs mb-6">Enter your details to manage your Docker containers.</p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username/Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Email
              </label>
              <div className="relative group/input">
                <input
                  type="email"
                  id="username"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-bg/50 border border-border rounded-xl px-4 py-3.5 text-sm text-text placeholder-muted/60 focus:outline-none focus:border-primary focus:bg-bg/90 transition-all duration-200 shadow-inner"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative group/input">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted group-focus-within/input:text-primary transition-colors duration-200">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-bg/50 border border-border rounded-xl pl-11 pr-11 py-3.5 text-sm text-text placeholder-muted/60 focus:outline-none focus:border-primary focus:bg-bg/90 transition-all duration-200 shadow-inner"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full relative group/btn overflow-hidden py-3.5 bg-primary hover:opacity-95 text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 mt-4 active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" />}
              </span>
            </button>

            {/* Link to Register */}
            <p className="text-center text-xs text-muted mt-4">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
