import api from './api'

/**
 * Authentication service — handles login, logout, and token storage
 */

// Login with email + password → receives JWT access token
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password })
  const { access_token } = response.data
  localStorage.setItem('access_token', access_token)
  return response.data
}

// Register with name, email, and password → receives JWT access token
export const register = async (name, email, password) => {
  const response = await api.post('/auth/register', { name, email, password })
  const { access_token } = response.data
  localStorage.setItem('access_token', access_token)
  return response.data
}

// Google OAuth login
export const googleLogin = async (googleToken) => {
  const response = await api.post('/auth/google', { token: googleToken })
  const { access_token } = response.data
  localStorage.setItem('access_token', access_token)
  return response.data
}

// Logout — clear token and any locally-persisted per-user data (e.g. chat
// history) so the next person to log in on this browser starts clean
export const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('dockmind_chat_messages')
}

// Get current logged-in user profile
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token')
}
