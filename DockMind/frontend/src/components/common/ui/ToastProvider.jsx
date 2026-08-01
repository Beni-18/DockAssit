import React, { createContext, useCallback, useContext, useState } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const VARIANT = {
  success: {
    Icon: CheckCircle2,
    tone: 'text-success',
    accent: 'var(--color-success)',
    bg: 'rgba(16,185,129,0.06)',
  },
  error: {
    Icon: XCircle,
    tone: 'text-danger',
    accent: 'var(--color-danger)',
    bg: 'rgba(239,68,68,0.06)',
  },
  info: {
    Icon: Info,
    tone: 'text-primary',
    accent: 'var(--color-primary)',
    bg: 'rgba(36,150,237,0.06)',
  },
}

let idCounter = 0

/**
 * ToastProvider — premium glass toast with left-edge accent bar,
 * icon tones, and smooth slide-in from the right.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const push = useCallback((variant, message) => {
    idCounter += 1
    setToasts((prev) => [...prev, { id: idCounter, variant, message }])
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const api = {
    success: (msg) => push('success', msg),
    error:   (msg) => push('error', msg),
    info:    (msg) => push('info', msg),
  }

  return (
    <ToastContext.Provider value={{ toast: api }}>
      <Toast.Provider swipeDirection="right" duration={4500}>
        {children}
        <AnimatePresence>
          {toasts.map(({ id, variant, message }) => {
            const v = VARIANT[variant] || VARIANT.info
            return (
              <Toast.Root key={id} asChild forceMount onOpenChange={(open) => !open && dismiss(id)}>
                <motion.div
                  layout
                  initial={{ opacity: 0, x: 60, scale: 0.94 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 60, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="relative overflow-hidden flex items-start gap-3.5 w-80 pr-4 pl-0 py-3.5 rounded-2xl shadow-toast"
                  style={{
                    background: 'var(--color-surface-solid)',
                    border: `1px solid var(--color-glass-border)`,
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  {/* Left accent bar */}
                  <div
                    className="shrink-0 w-1 self-stretch rounded-l-2xl"
                    style={{ background: v.accent, marginLeft: 0 }}
                  />
                  {/* Background tint */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: v.bg }}
                  />
                  <v.Icon className={`relative w-5 h-5 shrink-0 mt-0.5 ${v.tone}`} />
                  <Toast.Description className="relative text-sm text-text leading-snug flex-1">
                    {message}
                  </Toast.Description>
                  <Toast.Action altText="Dismiss" asChild>
                    <button
                      onClick={() => dismiss(id)}
                      className="relative shrink-0 text-muted hover:text-text transition-colors mt-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Toast.Action>
                </motion.div>
              </Toast.Root>
            )
          })}
        </AnimatePresence>
        <Toast.Viewport className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
