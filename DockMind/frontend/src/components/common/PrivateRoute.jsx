import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * PrivateRoute — redirects unauthenticated users to /login
 */
const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return token ? children : <Navigate to="/login" replace />
}

export default PrivateRoute
