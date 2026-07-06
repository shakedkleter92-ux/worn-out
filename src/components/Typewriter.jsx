import { useEffect, useState } from 'react'

/* ------------------------------------------------------------------
   Typewriter / code-writing effect.
   - start:    begin typing when true
   - speed:    ms per character (typing)
   - delay:    ms before typing starts
   - leaving:  when true, ERASE back to empty (exact reverse of entry)
   - onDone:   fires when the forward pass finishes
   - onLeft:   fires when the erase finishes (fully empty)
------------------------------------------------------------------ */
export default function Typewriter({
  text = '',
  start = true,
  speed = 28,
  delay = 0,
  leaving = false,
  eraseSpeed,
  step = 1, // characters revealed per tick (>1 = faster, keeps the animation)
  leaveDelay = 0, // ms to wait before erasing when `leaving` turns true
  className,
  style,
  onDone,
  onLeft
}) {
  const [count, setCount] = useState(0)
  const [begun, setBegun] = useState(delay === 0)
  const [leaveReady, setLeaveReady] = useState(false)
  const eSpeed = eraseSpeed ?? Math.max(8, speed * 0.6)

  useEffect(() => {
    if (!start) return
    if (delay === 0) return setBegun(true)
    const t = setTimeout(() => setBegun(true), delay)
    return () => clearTimeout(t)
  }, [start, delay])

  // hold at full for `leaveDelay` ms before starting to erase
  useEffect(() => {
    if (!leaving) return setLeaveReady(false)
    if (leaveDelay === 0) return setLeaveReady(true)
    const t = setTimeout(() => setLeaveReady(true), leaveDelay)
    return () => clearTimeout(t)
  }, [leaving, leaveDelay])

  useEffect(() => {
    if (!start || !begun) return
    let t
    if (!leaving) {
      if (count < text.length)
        t = setTimeout(() => setCount((c) => Math.min(c + step, text.length)), speed)
      else onDone?.()
    } else {
      if (!leaveReady) return // waiting before erase
      if (count > 0) t = setTimeout(() => setCount((c) => Math.max(c - step, 0)), eSpeed)
      else onLeft?.()
    }
    return () => clearTimeout(t)
  }, [start, begun, leaving, leaveReady, count, text.length, speed, eSpeed, step, onDone, onLeft])

  // while it's actively typing/erasing the text is "changing" -> red;
  // once it settles it turns black
  const animating = leaving ? count > 0 : count < text.length
  return (
    <span
      className={className}
      style={{ color: animating ? 'var(--accent)' : 'var(--ink)', ...style }}
    >
      {text.slice(0, count)}
    </span>
  )
}
