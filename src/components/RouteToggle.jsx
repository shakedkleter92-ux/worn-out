import { useRef, useState } from 'react'
import Typewriter from './Typewriter.jsx'
import { randomPulse } from '../lib/blink.js'

/* Layer toggle for the route page (Revision 02).
   - always visible
   - the square + label switch red <-> black (no fade), out of sync
   - on hover both HOLD solid red (blink stops); the blink resumes on
     mouse-out
   - toggle state is shown by SCALE (active scales up) via CSS transform
     ONLY, so it never shifts the surrounding layout
   - `show` gates the initial construction (label writes itself in)      */
export default function RouteToggle({ on, label, onClick, show, align = 'center' }) {
  const bg = useRef(randomPulse('wo-redblack'))
  const fg = useRef(randomPulse('wo-redblack-fg'))
  const centred = align === 'center'
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-scroll-suppress
      style={{
        position: 'relative',
        // width == the square only, so centring the row centres the SQUARE;
        // the label floats out to the right (absolute) when centred
        width: 'auto',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        height: 14
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          flex: '0 0 auto',
          transform: on ? 'scale(1.4)' : 'scale(1)',
          transformOrigin: 'center',
          transition: 'transform 0.6s ease',
          background: hovered ? 'var(--accent)' : undefined,
          animation: hovered ? 'none' : bg.current
        }}
      />
      <span
        style={{
          position: centred ? 'absolute' : 'static',
          left: centred ? '50%' : undefined,
          marginLeft: centred ? 16 : 12,
          whiteSpace: 'nowrap',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: hovered ? 'var(--accent)' : undefined,
          animation: hovered ? 'none' : fg.current
        }}
      >
        {show ? <Typewriter text={label} speed={55} /> : ''}
      </span>
    </div>
  )
}
