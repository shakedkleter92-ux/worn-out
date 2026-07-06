import { useEffect, useRef, useState } from 'react'

/* ------------------------------------------------------------------
   CoordScramble — coordinate readout.
   1. ENTER : types in character-by-character.
   2. LIVE  : digits scramble and resolve back to the real number,
              almost continuously, randomly out of sync.
   3. FROZEN: snaps to the real value and stops (square hovered).
   4. LEAVE : when `leaving` is true, erases back to empty (the exact
              reverse of the entrance).
------------------------------------------------------------------ */
const DIGITS = '0123456789'
const isDigit = (c) => c >= '0' && c <= '9'

export default function CoordScramble({
  text,
  start = true,
  delay = 0,
  frozen = false,
  leaving = false,
  speed = 52
}) {
  const [display, setDisplay] = useState('')
  const [locked, setLocked] = useState(999) // chars >= locked are "changing" (red)
  const [phase, setPhase] = useState('idle') // idle | enter | live | leave
  const [begun, setBegun] = useState(delay === 0)
  const timers = useRef([])

  const clearTimers = () => {
    timers.current.forEach((t) => {
      clearTimeout(t)
      clearInterval(t)
    })
    timers.current = []
  }

  // delay gate
  useEffect(() => {
    if (!start) return
    if (delay === 0) return setBegun(true)
    const t = setTimeout(() => setBegun(true), delay)
    return () => clearTimeout(t)
  }, [start, delay])

  // kick off entrance
  useEffect(() => {
    if (start && begun && phase === 'idle') setPhase('enter')
  }, [start, begun, phase])

  // switch to leave when requested
  useEffect(() => {
    if (leaving && (phase === 'enter' || phase === 'live')) {
      clearTimers()
      setPhase('leave')
    }
  }, [leaving, phase])

  // ENTER — typewriter reveal
  useEffect(() => {
    if (phase !== 'enter') return
    let i = 0
    setDisplay('')
    const id = setInterval(() => {
      i += 1
      setDisplay(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(id)
        setPhase('live')
      }
    }, speed)
    return () => clearInterval(id)
  }, [phase, text, speed])

  // LIVE — scramble / resolve loop (or freeze)
  useEffect(() => {
    if (phase !== 'live') return
    if (frozen) {
      clearTimers()
      setDisplay(text)
      setLocked(999)
      return
    }
    const runScramble = () => {
      let step = 0
      const steps = text.length + 5
      const iv = setInterval(() => {
        step += 1
        let out = ''
        for (let k = 0; k < text.length; k++) {
          const ch = text[k]
          if (!isDigit(ch)) out += ch
          else if (k < step) out += ch
          else out += DIGITS[(Math.random() * 10) | 0]
        }
        setDisplay(out)
        setLocked(step)
        if (step >= steps) {
          clearInterval(iv)
          setDisplay(text)
          setLocked(999)
          const next = setTimeout(runScramble, 500 + Math.random() * 1400)
          timers.current.push(next)
        }
      }, 60)
      timers.current.push(iv)
    }
    const first = setTimeout(runScramble, Math.random() * 2200)
    timers.current.push(first)
    return clearTimers
  }, [phase, frozen, text])

  // LEAVE — erase back to empty (reverse of entrance)
  useEffect(() => {
    if (phase !== 'leave') return
    const id = setInterval(() => {
      setDisplay((d) => (d.length ? d.slice(0, -1) : d))
    }, Math.max(8, speed * 0.6))
    return () => clearInterval(id)
  }, [phase, speed])

  return (
    <span>
      {Array.from(display).map((ch, k) => (
        <span
          key={k}
          style={{
            color: k >= locked && isDigit(ch) ? 'var(--accent)' : 'var(--ink)'
          }}
        >
          {ch}
        </span>
      ))}
    </span>
  )
}
