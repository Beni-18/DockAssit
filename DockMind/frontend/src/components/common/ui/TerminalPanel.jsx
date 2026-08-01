import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * TerminalPanel — a looping, typed-out terminal session showing real Docker
 * commands and their output. Built as the Login/Register hero instead of a
 * generic glowing-orb illustration: it's specific to what this product
 * actually does, and the typewriter/stagger reveal gives it a genuinely
 * "made for this" feel rather than a templated hero graphic.
 */
const SCRIPT = [
  { type: 'cmd', text: 'docker ps' },
  { type: 'out', text: 'CONTAINER ID   IMAGE                  STATUS        NAMES' },
  { type: 'out', text: '7a3f9c1d2e4b   dockmind-api:latest    Up 2 hours    dockmind-api', tone: 'success' },
  { type: 'out', text: '9b2e8f0a3c1d   postgres:16-alpine     Up 2 hours    dockmind-db', tone: 'success' },
  { type: 'out', text: 'c4d7a2b8e9f1   ollama/ollama:latest   Up 2 hours    dockmind-ollama', tone: 'success' },
  { type: 'gap' },
  { type: 'cmd', text: 'docker compose up -d --build' },
  { type: 'out', text: 'Network dockmind_default    Created', tone: 'success', check: true },
  { type: 'out', text: 'Container dockmind-db       Started', tone: 'success', check: true },
  { type: 'out', text: 'Container dockmind-ollama   Started', tone: 'success', check: true },
  { type: 'out', text: 'Container dockmind-api      Started', tone: 'success', check: true },
  { type: 'gap' },
  { type: 'cmd', text: 'ask "how is my stack doing?"' },
  { type: 'out', text: 'All 3 containers healthy. CPU 12%, memory 34%. No issues detected.', tone: 'glow' },
]

const TYPE_SPEED_MS = 26
const LINE_PAUSE_MS = 220
const GAP_PAUSE_MS = 500
const LOOP_PAUSE_MS = 2600

const TONE_COLOR = {
  success: 'var(--color-success)',
  glow: 'var(--color-glow)',
  default: 'var(--color-text-dim, #a8b4c8)',
}

const TerminalPanel = () => {
  const [history, setHistory] = useState([])
  const [typed, setTyped] = useState('')
  const [typing, setTyping] = useState(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    const timeouts = []
    const wait = (ms) => new Promise((resolve) => timeouts.push(setTimeout(resolve, ms)))

    const run = async () => {
      while (!cancelledRef.current) {
        setHistory([])
        setTyped('')

        for (const line of SCRIPT) {
          if (cancelledRef.current) return

          if (line.type === 'gap') {
            await wait(GAP_PAUSE_MS)
            continue
          }

          if (line.type === 'cmd') {
            setTyping(true)
            let acc = ''
            for (const ch of line.text) {
              if (cancelledRef.current) return
              acc += ch
              setTyped(acc)
              await wait(TYPE_SPEED_MS)
            }
            await wait(LINE_PAUSE_MS)
            setHistory((prev) => [...prev, { ...line, text: acc, id: prev.length }])
            setTyped('')
            setTyping(false)
            await wait(LINE_PAUSE_MS)
          } else {
            setHistory((prev) => [...prev, { ...line, id: prev.length }])
            await wait(LINE_PAUSE_MS)
          }
        }

        await wait(LOOP_PAUSE_MS)
      }
    }

    run()
    return () => {
      cancelledRef.current = true
      timeouts.forEach(clearTimeout)
    }
  }, [])

  return (
    <div
      className="w-full max-w-lg rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(8, 12, 20, 0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 30px 90px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02)',
      }}
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
        <span className="ml-2 text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
          zsh — dockmind
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-5 font-mono text-[13px] leading-[1.9] min-h-[280px]">
        <AnimatePresence initial={false}>
          {history.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              {line.type === 'cmd' ? (
                <span>
                  <span style={{ color: 'var(--color-glow)' }}>❯</span>{' '}
                  <span style={{ color: '#f0f4fa' }}>{line.text}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 pl-4" style={{ color: TONE_COLOR[line.tone] || TONE_COLOR.default }}>
                  {line.check && <span>✓</span>}
                  <span className="whitespace-pre">{line.text}</span>
                </span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {typing && (
          <span>
            <span style={{ color: 'var(--color-glow)' }}>❯</span>{' '}
            <span style={{ color: '#f0f4fa' }}>{typed}</span>
            <motion.span
              className="inline-block w-[7px] h-[14px] ml-0.5 align-middle"
              style={{ background: 'var(--color-glow)' }}
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
            />
          </span>
        )}
      </div>
    </div>
  )
}

export default TerminalPanel
