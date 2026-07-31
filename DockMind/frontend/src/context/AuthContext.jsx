import React, { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, logout as authLogout } from '../services/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const userData = await getCurrentUser()
          setUser(userData)
        } catch {
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }
    fetchUser()
  }, [token])

  const login = (newToken, userData) => {
    localStorage.setItem('access_token', newToken)
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    authLogout()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
