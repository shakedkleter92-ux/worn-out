import { createContext, useContext, useState } from 'react'

/* ==================================================================
   HOVER HINT + HOVER-HOLD  (shared across every page)

   • While a button is hovered, the cursor cue shows that button's hint
     (e.g. "ROADS", "NEXT ROUTE") typed in red to the right of the cursor.
   • Blinking buttons hold SOLID RED while hovered (no blink); the blink
     resumes on mouse-out.

   Both are driven by one hook, useButtonHover(hint). Pass a hint string to
   get the cursor cue too, or omit it for buttons that only hold red.
================================================================== */

const HintContext = createContext(null)

export function HintProvider({ children }) {
  const [hint, setHint] = useState(null)
  return <HintContext.Provider value={{ hint, setHint }}>{children}</HintContext.Provider>
}

// the current hint text (or null) — read by ScrollHint
export function useHintText() {
  return useContext(HintContext)?.hint ?? null
}

// imperative setter for components that already track their own hover state
export function useSetHint() {
  return useContext(HintContext)?.setHint ?? (() => {})
}

/* Wire a button up to both behaviours. Returns `hovered` (freeze to red
   while true) and `hoverProps` to spread onto the element. */
export function useButtonHover(hint) {
  const ctx = useContext(HintContext)
  const [hovered, setHovered] = useState(false)
  return {
    hovered,
    hoverProps: {
      onMouseEnter: () => {
        setHovered(true)
        if (hint != null) ctx?.setHint(hint)
      },
      onMouseLeave: () => {
        setHovered(false)
        if (hint != null) ctx?.setHint(null)
      }
    }
  }
}
