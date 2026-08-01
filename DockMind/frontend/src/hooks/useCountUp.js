import { useEffect, useRef, useState } from 'react'

/**
 * useCountUp — animates a displayed number from its previous value to the
 * next one whenever `value` changes, instead of popping instantly. Used on
 * dashboard metric cards.
 */
const useCountUp = (value, duration = 600) => {
  const [display, setDisplay] = useState(value)
  const frame = useRef(null)
  const from = useRef(value)

  useEffect(() => {
    const start = performance.now()
    const startValue = from.current
    const endValue = Number(value) || 0

    if (startValue === endValue) {
      setDisplay(endValue)
      return
    }

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + (endValue - startValue) * eased
      setDisplay(current)
      if (progress < 1) {
        frame.current = requestAnimationFrame(step)
      } else {
        from.current = endValue
      }
    }

    frame.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return display
}

export default useCountUp
