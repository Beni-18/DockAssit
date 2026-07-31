import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../services/auth'
import { useAuth } from '../../context/AuthContext'
import BrandMark from '../../components/common/BrandMark'

const Login = () => {
  const navigate = useNavigate()
  const { login: setAuth } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await login(form.email, form.password)
      setAuth(data.access_token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <BrandMark size="lg" />
          <p className="text-muted mt-3">AI Powered Docker Health Dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Email</label>
              <input
                type="email"
                id="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Password</label>
              <input
                type="password"
                id="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              id="login-submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
