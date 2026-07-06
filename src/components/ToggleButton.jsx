import { useRef, useState } from 'react'
import { randomBlink } from '../lib/blink.js'

/* Layer toggle button (route + global pages). The SQUARE is centred on
   the page axis with the label always shown to the right, so it reads
   clearly as a button. The square blinks on/off (randomised) and the
   whole button inverts to red only while hovered. */
export default function ToggleButton({ on, label, onClick }) {
  const [hover, setHover] = useState(false)
  const blink = useRef(randomBlink())
  const enter = () => setHover(true)
  const leave = () => setHover(false)
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <div
        onClick={onClick}
        onMouseEnter={enter}
        onMouseLeave={leave}
        style={{
          width: on ? 12 : 6,
          height: on ? 12 : 6,
          background: hover ? 'var(--accent)' : 'var(--ink)',
          transition: 'width 0.35s ease, height 0.35s ease',
          cursor: 'pointer',
          animation: hover ? 'none' : blink.current
        }}
      />
      <span
        onClick={onClick}
        onMouseEnter={enter}
        onMouseLeave={leave}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: 16,
          whiteSpace: 'nowrap',
          fontSize: 10,
          letterSpacing: '0.1em',
          opacity: on ? 1 : 0.45,
          color: hover ? 'var(--accent)' : 'inherit',
          cursor: 'pointer'
        }}
      >
        {label}
      </span>
    </div>
  )
}
