import { useEffect, useState } from 'react'

/* Custom cursor: a small black square that follows the mouse and gently
   pulses its size all the time. */
export default function CursorSquare() {
  const [pos, setPos] = useState({ x: -100, y: -100 })

  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10000,
        width: 8,
        height: 8,
        background: 'var(--ink)',
        animation: 'wo-cursor 2s ease-in-out infinite'
      }}
    />
  )
}
