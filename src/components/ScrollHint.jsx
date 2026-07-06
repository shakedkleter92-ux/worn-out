import { useEffect, useRef, useState } from 'react'
import Typewriter from './Typewriter.jsx'
import { useHintText } from './HintContext.jsx'

/* The cursor cue, just to the right of the pointer. What it shows:
   • while a button is hovered → that button's hint ("ROADS", "NEXT ROUTE"),
     typed in red letter by letter and erased on the way out.
   • otherwise → a faint "SCROLL", but ONLY when the page can still scroll
     down, and never while mid-scroll or while over a layer toggle.

   Scroll-possibility is measured from the tagged containers ([data-scroll]);
   if none exist (the wheel-driven home) it falls back to the `active` gate.
   Layer toggles are marked with [data-scroll-suppress]. */
export default function ScrollHint({ active = true }) {
  const [pos, setPos] = useState({ x: -200, y: -200 })
  const [moved, setMoved] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const [canScroll, setCanScroll] = useState(false)
  const [overToggle, setOverToggle] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const computeCanScroll = () => {
      const els = document.querySelectorAll('[data-scroll]')
      if (els.length === 0) return true // wheel-driven pages have no container
      for (const el of els) {
        if (el.scrollHeight - el.clientHeight - el.scrollTop > 4) return true
      }
      return false
    }
    const refresh = () => setCanScroll(computeCanScroll())

    const onMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY })
      setMoved(true)
      setOverToggle(!!e.target?.closest?.('[data-scroll-suppress]'))
      refresh()
    }
    const onWheel = () => {
      setScrolling(true)
      refresh()
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setScrolling(false)
        refresh()
      }, 700)
    }
    refresh()
    window.addEventListener('mousemove', onMove)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('scroll', refresh, true) // capture: catches container scroll
    window.addEventListener('resize', refresh)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', refresh, true)
      window.removeEventListener('resize', refresh)
      clearTimeout(timer.current)
    }
  }, [])

  // the button hint, kept mounted through its erase pass when it clears
  const hint = useHintText()
  const [display, setDisplay] = useState(null)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (hint) {
      setDisplay(hint)
      setLeaving(false)
    } else {
      setLeaving(true)
    }
  }, [hint])

  const showScroll = !display && active && canScroll && moved && !scrolling && !overToggle

  const anchor = {
    position: 'fixed',
    left: pos.x + 16,
    top: pos.y - 4,
    pointerEvents: 'none',
    zIndex: 9999,
    fontSize: 9,
    letterSpacing: '0.18em',
    whiteSpace: 'nowrap',
    // a white backing so the cue stays readable over dark textures / video
    background: 'var(--bg)',
    padding: '2px 5px'
  }

  return (
    <>
      {/* button hint — typed in red to the right of the cursor */}
      {display && (
        <div aria-hidden style={anchor}>
          <Typewriter
            key={display}
            text={display}
            leaving={leaving}
            speed={34}
            style={{ color: 'var(--accent)' }}
            onLeft={() => {
              setDisplay(null)
              setLeaving(false)
            }}
          />
        </div>
      )}

      {/* idle SCROLL cue — faint, only when there's somewhere to scroll */}
      <div
        aria-hidden
        style={{
          ...anchor,
          color: 'var(--ink)',
          opacity: showScroll ? 0.4 : 0,
          transition: 'opacity 0.4s ease'
        }}
      >
        SCROLL
      </div>
    </>
  )
}
