import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

/* ==================================================================
   MAPPING LAYER — always visible; its square modules shimmer.
   The mapping is shown at all times (a light background image). While a
   cell is on screen, its individual squares twinkle on and off — driven
   entirely by a CSS animation (wo-mapshimmer) with a random per-square
   duration/delay, so there are NO JavaScript timers running per cell (the
   old timer-per-square approach overloaded the page on the all-routes
   window). Hovering a cell eases its squares back to full and holds them
   there; the shimmer resumes when the cursor leaves.

   Kept light: the SVG is only inlined for cells actually on screen, capped
   at MAX_ACTIVE at once; off-screen cells are just a background image.
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

const FADE = 0.4 // s — squares ease back to full when settling
const SHIMMER_MIN = 1.5 // s — random per-square animation duration
const SHIMMER_MAX = 4.0
const MAX_ACTIVE = 24 // cap simultaneously inlined (shimmering) mappings
const RETRY_MS = 400 // blocked-by-cap cells retry this often

let activeCount = 0

const LAYER = { position: 'absolute', inset: 0, width: '100%', height: '100%' }

export default function MappingLayer({ src, on, z = 3, autoShimmer = false }) {
  const hostRef = useRef(null)
  const rects = useRef([])
  const counted = useRef(false)
  const activeRef = useRef(false)
  const wantRef = useRef(false)
  const retryT = useRef(null)
  const [bg, setBg] = useState(true) // show the plain background image

  const seen = useInView(hostRef, { amount: 0.01 })
  const [hovering, setHovering] = useState(false)

  const release = () => {
    if (counted.current) {
      activeCount = Math.max(0, activeCount - 1)
      counted.current = false
    }
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
      if (wantRef.current) inlineShimmer()
    }, RETRY_MS)
  }

  // start the CSS twinkle on every square (random duration + negative delay
  // so they're all out of phase from the first frame)
  const shimmerOn = () => {
    for (const el of rects.current) {
      const dur = SHIMMER_MIN + Math.random() * (SHIMMER_MAX - SHIMMER_MIN)
      el.style.animation = `wo-mapshimmer ${dur.toFixed(2)}s ease-in-out ${(-Math.random() * dur).toFixed(2)}s infinite`
    }
  }
  // stop the twinkle and ease every square back to full (the opacity
  // transition makes dimmed squares fade back in rather than snap)
  const shimmerOff = () => {
    for (const el of rects.current) {
      el.style.animation = 'none'
      el.style.opacity = '1'
    }
  }

  const inlineShimmer = async () => {
    if (activeRef.current) return
    if (activeCount >= MAX_ACTIVE) return scheduleRetry()
    activeRef.current = true
    const text = await loadSvg(src)
    const host = hostRef.current
    if (!text || !host || !on || !wantRef.current) {
      activeRef.current = false
      return
    }
    if (activeCount >= MAX_ACTIVE) {
      activeRef.current = false
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
    for (const el of rects.current) {
      el.style.transition = `opacity ${FADE}s ease-in-out`
      el.style.opacity = '1'
    }
    activeCount++
    counted.current = true
    setBg(false)
    if (hovering) shimmerOff()
    else shimmerOn()
  }

  // off-screen / layer off: drop the svg immediately (back to the image)
  const hardStop = () => {
    clearRetry()
    release()
    activeRef.current = false
    const host = hostRef.current
    if (host) host.innerHTML = ''
    rects.current = []
    setBg(true)
  }

  // reconcile: shimmer while on screen; ease to a stop while hovered
  useEffect(() => {
    const visible = autoShimmer && seen && on
    wantRef.current = visible
    if (visible) {
      if (!activeRef.current) inlineShimmer()
      else if (hovering) shimmerOff()
      else shimmerOn()
    } else {
      clearRetry()
      if (activeRef.current) hardStop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShimmer, seen, on, hovering])

  const onEnter = (e) => {
    if (e.buttons !== 0) return // panning, not hovering
    if (autoShimmer) setHovering(true)
  }
  const onLeave = () => {
    if (autoShimmer) setHovering(false)
  }

  useEffect(() => {
    if (!on) {
      wantRef.current = false
      hardStop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on])
  useEffect(
    () => () => {
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
