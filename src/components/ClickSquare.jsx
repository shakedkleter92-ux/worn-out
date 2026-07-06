import { useRef, useState } from 'react'
import { randomBlink } from '../lib/blink.js'

/* A clickable square that behaves like the map squares everywhere:
   - blinks on/off with randomised timing
   - inverts to red ONLY while hovered by the mouse (blink pauses)      */
export default function ClickSquare({ size = 13, onClick, title, style }) {
  const [hover, setHover] = useState(false)
  const blink = useRef(randomBlink())
  return (
    <div
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: size,
        height: size,
        background: hover ? 'var(--accent)' : 'var(--ink)',
        cursor: 'pointer',
        animation: hover ? 'none' : blink.current,
        ...style
      }}
    />
  )
}
