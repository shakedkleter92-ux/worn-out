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
  className,
  style,
  onDone,
  onLeft
}) {
  const [count, setCount] = useState(0)
  const [begun, setBegun] = useState(delay === 0)
  const eSpeed = eraseSpeed ?? Math.max(8, speed * 0.6)

  useEffect(() => {
    if (!start) return
    if (delay === 0) return setBegun(true)
    const t = setTimeout(() => setBegun(true), delay)
    return () => clearTimeout(t)
  }, [start, delay])

  useEffect(() => {
    if (!start || !begun) return
    let t
    if (!leaving) {
      if (count < text.length) t = setTimeout(() => setCount((c) => c + 1), speed)
      else onDone?.()
    } else {
      if (count > 0) t = setTimeout(() => setCount((c) => c - 1), eSpeed)
      else onLeft?.()
    }
    return () => clearTimeout(t)
  }, [start, begun, leaving, count, text.length, speed, eSpeed, onDone, onLeft])

  return (
    <span className={className} style={style}>
      {text.slice(0, count)}
    </span>
  )
}
