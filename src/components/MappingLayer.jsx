import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { isPanning, onPanEnd } from '../lib/panning.js'

/* ==================================================================
   MAPPING LAYER — the mapping's square modules shimmer continuously.
   For every cell ON SCREEN the squares twinkle via a CSS animation
   (wo-mapshimmer) with random per-square timing — it runs all the time
   and never stops on hover. Off-screen cells load/paint nothing.

   Reconciliation (which cells are inlined + shimmering) only happens when
   the view is STILL. While the all-routes window is panned/zoomed, cells
   racing across the edge would otherwise inline/tear-down a 246-rect SVG
   many times a second and crash the tab, so it's frozen during the gesture
   and runs once when it settles (see ../lib/panning.js). Capped at
   MAX_ACTIVE inlined cells at a time.
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

const SHIMMER_MIN = 1.6 // s — random per-square animation duration
const SHIMMER_MAX = 4.2
const SHIMMER_FRACTION = 0.5 // only animate this share of squares (lighter paint)
const MAX_ACTIVE = 16 // cap simultaneously inlined (shimmering) mappings
const RETRY_MS = 450

let activeCount = 0

const LAYER = { position: 'absolute', inset: 0, width: '100%', height: '100%' }

export default function MappingLayer({ src, on, z = 3, autoShimmer = false }) {
  const hostRef = useRef(null)
  const rects = useRef([])
  const counted = useRef(false)
  const activeRef = useRef(false)
  const retryT = useRef(null)
  const [bg, setBg] = useState(false) // off-screen cells paint NOTHING by default

  const seen = useInView(hostRef, { amount: 0.01 })
  const seenRef = useRef(seen)
  seenRef.current = seen
  const onRef = useRef(on)
  onRef.current = on

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

  // start the CSS twinkle on a share of the squares (random duration + delay)
  const shimmerOn = () => {
    for (const el of rects.current) {
      if (Math.random() < SHIMMER_FRACTION) {
        const dur = SHIMMER_MIN + Math.random() * (SHIMMER_MAX - SHIMMER_MIN)
        el.style.animation = `wo-mapshimmer ${dur.toFixed(2)}s ease-in-out ${(-Math.random() * dur).toFixed(2)}s infinite`
      }
    }
  }

  const inlineShimmer = async () => {
    if (activeRef.current) return
    if (activeCount >= MAX_ACTIVE) {
      setBg(true) // show the static mapping while waiting for a shimmer slot
      clearRetry()
      retryT.current = setTimeout(() => {
        retryT.current = null
        reconcile()
      }, RETRY_MS)
      return
    }
    activeRef.current = true
    const text = await loadSvg(src)
    const host = hostRef.current
    if (!text || !host || !onRef.current || !seenRef.current || isPanning()) {
      activeRef.current = false
      return
    }
    if (activeCount >= MAX_ACTIVE) {
      activeRef.current = false
      return
    }
    host.innerHTML = text
    const svg = host.querySelector('svg')
    if (svg) {
      svg.style.width = '100%'
      svg.style.height = '100%'
      svg.style.display = 'block'
    }
    rects.current = Array.from(host.querySelectorAll('rect'))
    activeCount++
    counted.current = true
    setBg(false)
    shimmerOn()
  }

  const hardStop = () => {
    clearRetry()
    release()
    activeRef.current = false
    const host = hostRef.current
    if (host) host.innerHTML = ''
    rects.current = []
    setBg(false)
  }

  // decide the cell's state — but never touch the DOM mid-gesture
  const reconcile = () => {
    if (isPanning()) return
    const visible = autoShimmer && seenRef.current && onRef.current
    if (visible) {
      if (!activeRef.current) inlineShimmer()
    } else if (activeRef.current) {
      hardStop()
    } else {
      setBg(false)
    }
  }

  useEffect(() => {
    reconcile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShimmer, seen, on])
  useEffect(() => onPanEnd(reconcile), []) // re-evaluate once panning settles

  useEffect(() => {
    if (!on) hardStop()
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
