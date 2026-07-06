import { useRef } from 'react'
import { randomPulse } from '../lib/blink.js'
import { useButtonHover } from './HintContext.jsx'

/* The first (back) button at the top of the route + global pages.
   Square is centred on the page axis, blinks, and holds red on hover
   (cursor cue "ROADS"). The road name is shown centred above the square,
   or centred BELOW it when `below` is set (accent red, inverts on hover). */
export default function HeaderButton({ name, onClick, hint = 'ROADS', below = false }) {
  const { hovered: sqHover, hoverProps } = useButtonHover(hint)
  const { hovered: nameHover, hoverProps: nameProps } = useButtonHover(hint)
  const blink = useRef(randomPulse())
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
        {...hoverProps}
        style={{
          width: 13,
          height: 13,
          background: sqHover ? 'var(--accent)' : undefined,
          cursor: 'pointer',
          animation: sqHover ? 'none' : blink.current
        }}
      />
      <span
        {...nameProps}
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          ...(below ? { top: '100%', marginTop: 9 } : { bottom: '100%', marginBottom: 9 }),
          whiteSpace: 'nowrap',
          fontSize: 13,
          letterSpacing: '0.12em',
          color: nameHover ? 'var(--ink)' : 'var(--accent)',
          cursor: 'pointer'
        }}
      >
        {name}
      </span>
    </div>
  )
}
