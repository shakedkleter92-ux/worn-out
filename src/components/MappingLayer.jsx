import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

/* ==================================================================
   MAPPING LAYER — always visible; its square modules shimmer.
   The mapping is shown at all times (a light background image). The
   individual squares flicker on and off at random — squares briefly
   disappear (revealing the texture / grid beneath) and reappear.

   Two modes:
   • hover (route pages, default): still while idle, shimmers on hover,
     then eases back to full a short delay after the cursor leaves.
   • autoShimmer (the all-routes window): shimmers on its own whenever the
     cell is visible; hovering a cell EASES it to a stop (never sudden),
     and it resumes when the cursor leaves.

   Kept light: the SVG is only inlined while a cell is shimmering/settling;
   only cells actually on screen shimmer, capped at MAX_ACTIVE at once.
================================================================== */

const textCache = new Map()
function loadSvg(url) {
  if (!textCache.has(url)) {
    textCache.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.text() : null))
        .catch(() => null)
    )
  }
  return textCache.get(url)
}

const TICK_MS = 85 // pacing of the shimmer
const FLIP_PER_TICK = 6 // squares re-rolled each tick
const OFF_PROB = 0.22 // chance a re-rolled square is (briefly) hidden
const FADE = 0.22 // s — each square eases as it flips (smooth, snappy)
const STOP_DELAY = 900 // ms after the cursor leaves before it settles (hover mode)
const WINDDOWN_TICK = 110 // ms between wind-down steps (gradual settle)
const RESTORE_PER_TICK = 3 // hidden squares eased back on per wind-down step
const MAX_ACTIVE = 32 // cap simultaneous shimmering mappings (covers a full window of cells)
const RETRY_MS = 350 // blocked-by-cap cells retry this often until a slot frees

let activeCount = 0

const LAYER = { position: 'absolute', inset: 0, width: '100%', height: '100%' }

export default function MappingLayer({ src, on, z = 3, autoShimmer = false }) {
  const hostRef = useRef(null)
  const rects = useRef([])
  const flick = useRef(null) // flicker OR wind-down interval
  const leaveT = useRef(null) // hover-mode stop delay
  const counted = useRef(false) // occupies a concurrency slot
  const activeRef = useRef(false) // svg inlined (shimmering or settling)
  const inside = useRef(false) // cursor over this cell
  const wantRef = useRef(false) // this cell currently wants to shimmer
  const retryT = useRef(null) // retry timer while blocked by the cap
  const [bg, setBg] = useState(true) // show the plain background image (idle/settled)

  const seen = useInView(hostRef, { amount: 0.01 }) // visible in the window (autoShimmer)
  const [hovering, setHovering] = useState(false)

  const clearFlick = () => {
    if (flick.current) {
      clearInterval(flick.current)
      flick.current = null
    }
  }
  const clearLeaveT = () => {
    if (leaveT.current) {
      clearTimeout(leaveT.current)
      leaveT.current = null
    }
  }
  const release = () => {
    if (counted.current) {
      activeCount = Math.max(0, activeCount - 1)
      counted.current = false
    }
  }

  const runFlicker = () => {
    clearFlick()
    flick.current = setInterval(() => {
      const list = rects.current
      if (!list.length) return
      for (let k = 0; k < FLIP_PER_TICK; k++) {
        const el = list[(Math.random() * list.length) | 0]
        el.style.opacity = Math.random() < OFF_PROB ? '0' : '1'
      }
    }, TICK_MS)
  }

  const clearRetry = () => {
    if (retryT.current) {
      clearTimeout(retryT.current)
      retryT.current = null
    }
  }
  const scheduleRetry = () => {
    clearRetry()
    retryT.current = setTimeout(() => {
      retryT.current = null
      if (wantRef.current) startShimmer()
    }, RETRY_MS)
  }

  const startShimmer = async () => {
    if (activeRef.current) return
    if (activeCount >= MAX_ACTIVE) return scheduleRetry() // no slot — try again soon
    activeRef.current = true // claim synchronously so we never double-inline
    const text = await loadSvg(src)
    const host = hostRef.current
    if (!text || !host || !on || !wantRef.current) {
      activeRef.current = false
      return
    }
    if (activeCount >= MAX_ACTIVE) {
      activeRef.current = false // a slot was taken during the await — retry
      return scheduleRetry()
    }
    host.innerHTML = text
    const svg = host.querySelector('svg')
    if (svg) {
      svg.style.width = '100%'
      svg.style.height = '100%'
      svg.style.display = 'block'
    }
    rects.current = Array.from(host.querySelectorAll('rect'))
    rects.current.forEach((el) => {
      el.style.transition = `opacity ${FADE}s ease-in-out`
      el.style.opacity = '1'
    })
    activeCount++
    counted.current = true
    setBg(false)
    runFlicker()
  }

  // gradual settle: ease the still-hidden squares back on a few at a time
  const windDown = () => {
    if (!activeRef.current) return
    clearFlick()
    release() // free the slot as soon as we start settling
    flick.current = setInterval(() => {
      const off = rects.current.filter((el) => el.style.opacity === '0')
      if (!off.length) {
        clearFlick()
        finalize()
        return
      }
      for (let k = 0; k < RESTORE_PER_TICK && off.length; k++) {
        const i = (Math.random() * off.length) | 0
        off[i].style.opacity = '1'
        off.splice(i, 1)
      }
    }, WINDDOWN_TICK)
  }

  const finalize = () => {
    activeRef.current = false
    const host = hostRef.current
    if (host) host.innerHTML = ''
    rects.current = []
    setBg(true)
  }

  // off-screen / layer off: drop immediately (no animation)
  const hardStop = () => {
    clearFlick()
    clearLeaveT()
    release()
    activeRef.current = false
    const host = hostRef.current
    if (host) host.innerHTML = ''
    rects.current = []
    setBg(true)
  }

  // ---- autoShimmer reconcile: shimmer whenever visible + not hovered ----
  useEffect(() => {
    if (!autoShimmer) return
    const want = seen && !hovering && on
    wantRef.current = want
    if (want) {
      clearLeaveT()
      if (!activeRef.current) startShimmer()
      else runFlicker() // resume if it was settling
    } else {
      clearRetry()
      if (activeRef.current) {
        if (!seen || !on) hardStop() // off-screen: drop
        else windDown() // hovered: ease to a stop
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShimmer, seen, hovering, on])

  // ---- hover mode (route pages) ----
  const onEnter = (e) => {
    if (e.buttons !== 0) return // panning, not hovering
    inside.current = true
    if (autoShimmer) {
      setHovering(true)
      return
    }
    wantRef.current = true
    clearLeaveT()
    if (!activeRef.current) {
      startShimmer()
    } else {
      clearFlick()
      if (!counted.current) {
        activeCount++
        counted.current = true
      }
      runFlicker()
    }
  }
  const onLeave = () => {
    inside.current = false
    if (autoShimmer) {
      setHovering(false)
      return
    }
    wantRef.current = false
    clearRetry()
    clearLeaveT()
    leaveT.current = setTimeout(windDown, STOP_DELAY)
  }

  useEffect(() => {
    if (!on) {
      wantRef.current = false
      clearRetry()
      hardStop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on])
  useEffect(
    () => () => {
      clearFlick()
      clearLeaveT()
      clearRetry()
      release()
    },
    []
  )

  return (
    <div
      ref={hostRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        ...LAYER,
        zIndex: z,
        display: on ? 'block' : 'none',
        backgroundImage: bg ? `url("${src}")` : 'none',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat'
      }}
    />
  )
}
