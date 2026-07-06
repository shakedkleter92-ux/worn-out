import { useState } from 'react'

/* The route-name title at the top of each page. It's accent red, and
   inverts to black while hovered (the opposite invert to the squares). */
export default function RouteTitle({ children, size = 13 }) {
  const [hover, setHover] = useState(false)
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: size,
        letterSpacing: '0.12em',
        color: hover ? 'var(--ink)' : 'var(--accent)',
        cursor: 'pointer'
      }}
    >
      {children}
    </span>
  )
}
