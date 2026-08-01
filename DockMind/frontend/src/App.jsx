import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ChatProvider } from './context/ChatContext'
import { ToastProvider } from './components/common/ui/ToastProvider'
import PrivateRoute from './components/common/PrivateRoute'

import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import Dashboard from './pages/Dashboard/Dashboard'
import Containers from './pages/Containers/Containers'
import Monitoring from './pages/Monitoring/Monitoring'
import AIAssistant from './pages/AIAssistant/AIAssistant'
import History from './pages/History/History'
import FrequentCommands from './pages/FrequentCommands/FrequentCommands'
import Images from './pages/Images/Images'
import Volumes from './pages/Volumes/Volumes'
import Networks from './pages/Networks/Networks'
import Settings from './pages/Settings/Settings'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/containers"
          element={
            <PrivateRoute>
              <Containers />
            </PrivateRoute>
          }
        />
        <Route
          path="/monitoring"
          element={
            <PrivateRoute>
              <Monitoring />
            </PrivateRoute>
          }
        />
        <Route
          path="/ai-assistant"
          element={
            <PrivateRoute>
              <AIAssistant />
            </PrivateRoute>
          }
        />
        <Route
          path="/history"
          element={
            <PrivateRoute>
              <History />
            </PrivateRoute>
          }
        />
        <Route
          path="/frequent-commands"
          element={
            <PrivateRoute>
              <FrequentCommands />
            </PrivateRoute>
          }
        />
        <Route
          path="/images"
          element={
            <PrivateRoute>
              <Images />
            </PrivateRoute>
          }
        />
        <Route
          path="/volumes"
          element={
            <PrivateRoute>
              <Volumes />
            </PrivateRoute>
          }
        />
        <Route
          path="/networks"
          element={
            <PrivateRoute>
              <Networks />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <ToastProvider>
            <Router>
              <AnimatedRoutes />
            </Router>
          </ToastProvider>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
