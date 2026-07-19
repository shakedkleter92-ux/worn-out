import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ROUTES, HOME, routeLabel, mediaUrl } from '../data/routes.js'
import ScrambleTo from './ScrambleTo.jsx'
import RouteToggle from './RouteToggle.jsx'
import HeaderButton from './HeaderButton.jsx'
import StripColumn from './StripLayers.jsx'
import Typewriter from './Typewriter.jsx'
import { loadFragments } from '../lib/fragments.js'
import { randomPulse } from '../lib/blink.js'
import { setPanning } from '../lib/panning.js'

/* ==================================================================
   GLOBAL ALL-ROUTES SCREEN  (press H1)
   Every route's strip sits directly next to the next, all revealed at
   once, inside a fixed 1080x1080 WINDOW in the centre of the screen.
   The user pans by dragging and zooms with the wheel to explore every
   texture / grid / mapping. Pan + zoom are clamped so the strips always
   fill the window edge-to-edge — you can't zoom out past their extent
   or pan into empty space. There is no page scroll; the only way back
   to the roads is the top button. The layer toggles start centred and
   glide to the left edge once the user starts exploring.
================================================================== */

const LAYER_KEYS = [
  ['texture', 'TEXTURE'],
  ['grid', 'GRID'],
  ['mapping', 'MAPPING']
]

const FRAME_MAX = 1080 // window is at most 1080x1080
const ZOOM_MAX = 6
// the window sits just below the top buttons and grows down to the bottom
// edge of the screen (TOP_RESERVE keeps the gap between buttons and window)
const BOTTOM_RESERVE = 52 // leaves room below the window for the ⌄ pan arrow
const SIDE_RESERVE = 40

// the connecting line runs from just under the back square down to the
// toggle buttons, which sit on its middle
const LINE_TOP = 64
const LINE_H = 90

// the window sits 14px under the end of the line (same as the route pages)
const TOP_RESERVE = LINE_TOP + LINE_H + 14

// ---- hover-to-reveal fragment ----
const FRAGMENT_DELAY = 300 // ms to settle on a square before its sentence writes

const frameSizeFor = () =>
  Math.min(FRAME_MAX, window.innerWidth - SIDE_RESERVE * 2, window.innerHeight - TOP_RESERVE - BOTTOM_RESERVE)

export default function GlobalRoutes({ onBack }) {
  // by default only MAPPING is shown (texture + grid off)
  const [layers, setLayers] = useState({ texture: false, grid: false, mapping: true })
  const toggle = (k) => setLayers((s) => ({ ...s, [k]: !s[k] }))
  const [hovered, setHovered] = useState(ROUTES[0].id)
  const route = ROUTES.find((r) => r.id === hovered)

  const [frameSize, setFrameSize] = useState(frameSizeFor)
  const [content, setContent] = useState({ w: 0, h: 0 })
  const [t, setT] = useState({ zoom: 1, x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [animating, setAnimating] = useState(false) // smooth glide for arrow pans
  const animRef = useRef(null)

  // top-to-bottom build (like every other page): back button → line →
  // toggles (on the line) → strips revealing their layers top-to-bottom
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 350), // back button
      setTimeout(() => setStep(2), 650), // line draws
      setTimeout(() => setStep(3), 900), // toggles
      setTimeout(() => setStep(4), 1100) // strips begin (was 3100 — far too late)
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  // warm the browser cache with every mapping up front, so as you pan/zoom the
  // textures paint instantly instead of loading (and flashing blank) each time.
  // Only MAPPING svgs (~50KB each) — the heavy TEXTURE photos stay lazy.
  useEffect(() => {
    const imgs = []
    for (const r of ROUTES) {
      for (let i = 1; i <= r.cells; i++) {
        const img = new Image()
        img.src = mediaUrl(r.folder, 'MAPPING', `M${i}.svg`)
        imgs.push(img)
      }
    }
    return () => imgs.forEach((im) => (im.src = ''))
  }, [])

  const frameRef = useRef(null)
  const contentRef = useRef(null)
  const drag = useRef(null)
  // blinking pan-hint arrows around the window (left / right / bottom)
  const arrowPulse = useRef([randomPulse('wo-redblack-fg'), randomPulse('wo-redblack-fg'), randomPulse('wo-redblack-fg')])
  const geo = useRef({ frame: 0, cw: 0, ch: 0, minZoom: 0.1 })
  const inited = useRef(false)

  // clamp a proposed transform so the content always covers the window and
  // never pans into empty space (reads live geometry from the geo ref)
  const clamp = useCallback((nt) => {
    const { frame, cw, ch, minZoom } = geo.current
    const z = Math.min(ZOOM_MAX, Math.max(minZoom, nt.zoom))
    const w = cw * z
    const h = ch * z
    const axis = (v, len) => (len <= frame ? (frame - len) / 2 : Math.min(0, Math.max(frame - len, v)))
    return { zoom: z, x: axis(nt.x, w), y: axis(nt.y, h) }
  }, [])

  // measure the window + the strips' natural size (kept current on resize)
  useLayoutEffect(() => {
    const measure = () => {
      const el = contentRef.current
      if (el) setContent({ w: el.offsetWidth, h: el.offsetHeight })
      setFrameSize(frameSizeFor())
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // recompute geometry (incl. the zoom-out limit = strips filling the window)
  useEffect(() => {
    const cw = content.w
    const ch = content.h
    const frame = frameSize
    const minZoom = cw && ch ? Math.max(frame / cw, frame / ch) : 0.1
    geo.current = { frame, cw, ch, minZoom }
    if (!inited.current && cw && ch) {
      inited.current = true
      // start a little zoomed in, centred on the MIDDLE of all the strips
      const z = Math.min(ZOOM_MAX, Math.max(minZoom, 1.4))
      setT(clamp({ zoom: z, x: (frame - cw * z) / 2, y: (frame - ch * z) / 2 }))
    } else {
      setT((s) => clamp(s))
    }
  }, [content, frameSize, clamp])

  // ---- wheel = zoom toward the cursor ----
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    let settleTimer = null
    const onWheel = (e) => {
      e.preventDefault()
      setPanning(true) // freeze the shimmer while zooming
      clearTimeout(settleTimer)
      settleTimer = setTimeout(() => setPanning(false), 260)
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setT((s) => {
        const nz = Math.min(ZOOM_MAX, Math.max(geo.current.minZoom, s.zoom * factor))
        const scale = nz / s.zoom
        return clamp({ zoom: nz, x: cx - (cx - s.x) * scale, y: cy - (cy - s.y) * scale })
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      clearTimeout(settleTimer)
    }
  }, [clamp])

  // ---- drag = pan ----
  const onMouseDown = (e) => {
    drag.current = { mx: e.clientX, my: e.clientY, x: t.x, y: t.y }
    setDragging(true)
    setAnimating(false) // dragging is instant, never eased
    setPanning(true) // freeze the shimmer while dragging
  }

  // ---- arrow buttons = glide the view one step (left / right / down) ----
  const panBy = (dx, dy) => {
    setAnimating(true)
    setPanning(true) // freeze the shimmer during the glide
    setT((s) => clamp({ ...s, x: s.x + dx, y: s.y + dy }))
    if (animRef.current) clearTimeout(animRef.current)
    animRef.current = setTimeout(() => {
      setAnimating(false)
      setPanning(false)
    }, 460)
  }
  useEffect(() => {
    const move = (e) => {
      if (!drag.current) return
      const dx = e.clientX - drag.current.mx
      const dy = e.clientY - drag.current.my
      setT((s) => clamp({ ...s, x: drag.current.x + dx, y: drag.current.y + dy }))
    }
    const up = () => {
      if (drag.current) setPanning(false) // drag ended → let the shimmer resettle
      drag.current = null
      setDragging(false)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [clamp])

  // ---------- hover-to-reveal fragment ----------
  const [hoverCell, setHoverCell] = useState(null) // { ri, ci, folder } | null
  const [frag, setFrag] = useState(null) // { ri, ci, text, id }
  const [fragLeaving, setFragLeaving] = useState(false)
  const fragTimer = useRef(null)

  // a fragment shows for the hovered square while Texture OR Mapping is visible
  const target = hoverCell && (layers.texture || layers.mapping) ? hoverCell : null
  const targetKey = target ? `${target.ri}:${target.ci}` : ''
  const fragKey = frag ? `${frag.ri}:${frag.ci}` : ''

  // hover a square → after a short beat, write one of that route's random
  // sentences; move off (or to another square) → erase (reverse typewriter),
  // then the next hovered square's sentence writes in
  useEffect(() => {
    if (!target || (frag && targetKey !== fragKey)) {
      if (fragTimer.current) {
        clearTimeout(fragTimer.current)
        fragTimer.current = null
      }
      if (frag) setFragLeaving(true)
      return
    }
    if (frag) {
      setFragLeaving(false) // same square — keep it written
      return
    }
    if (!fragTimer.current) {
      const pick = target
      fragTimer.current = setTimeout(async () => {
        fragTimer.current = null
        const list = await loadFragments(pick.folder)
        if (!list.length) return
        setFrag({ ri: pick.ri, ci: pick.ci, text: list[Math.floor(Math.random() * list.length)], id: Date.now() })
      }, FRAGMENT_DELAY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, fragKey])
  useEffect(
    () => () => {
      if (fragTimer.current) clearTimeout(fragTimer.current)
    },
    []
  )

  // memoise the strip grid so panning/zooming (which changes `t`) and hovering
  // (which changes `hovered`) never re-render the hundreds of cells — only the
  // canvas transform updates. Rebuilt only when the layers or build step change.
  const strips = useMemo(
    () => (
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
        {ROUTES.map((r, ri) => (
          <StripColumn
            key={r.id}
            folder={r.folder}
            count={r.cells}
            layers={layers}
            start={step >= 4}
            auto
            shimmer
            cellDelay={40}
            layerStagger={70}
            onHover={(i) => {
              setHovered(r.id)
              setHoverCell({ ri, ci: i - 1, folder: r.folder })
            }}
            onMouseLeave={() => setHoverCell(null)}
            cellStyle={{ width: '100%', aspectRatio: '1 / 1' }}
            wrapperStyle={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          />
        ))}
      </div>
    ),
    [layers, step]
  )

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 1.3, ease: [0.7, 0, 0.2, 1] }}
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'var(--bg)', zIndex: 20 }}
    >
      {/* HOME — top-left corner: coordinate, then name to its right */}
      <div
        style={{
          position: 'fixed',
          top: 24,
          left: 30,
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          fontSize: 11,
          letterSpacing: '0.04em',
          zIndex: 11
        }}
      >
        <span style={{ opacity: 0.85 }}>{HOME.coordinates}</span>
        <span style={{ letterSpacing: '0.12em' }}>HOME</span>
      </div>

      {/* hovered route — top-right corner: name, then coordinate to its right */}
      <div
        style={{
          position: 'fixed',
          top: 24,
          right: 30,
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          fontSize: 11,
          letterSpacing: '0.04em',
          zIndex: 11
        }}
      >
        <span style={{ letterSpacing: '0.12em' }}>
          <ScrambleTo text={route.title} />
        </span>
        <span>
          <ScrambleTo text={route.coordinates} />
        </span>
      </div>

      {/* back-to-roads button — square centred, the route name ABOVE it on
          the same line as the corner coordinates; the line runs down to the
          toggle buttons */}
      <div style={{ position: 'fixed', top: 48, left: 0, right: 0, zIndex: 11 }}>
        {step >= 1 && <HeaderButton name={routeLabel(route.id)} onClick={onBack} />}
      </div>

      {/* connecting line under the name — drawn, toggles sit on its middle */}
      {step >= 2 && (
        <svg
          width="2"
          height={LINE_H}
          style={{ position: 'fixed', left: '50%', top: LINE_TOP, transform: 'translateX(-50%)', overflow: 'visible', zIndex: 10 }}
        >
          <motion.line
            x1="1"
            y1="0"
            x2="1"
            y2={LINE_H}
            stroke="var(--ink)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          />
        </svg>
      )}

      {/* layer toggles — centred on the middle of the line (they don't glide aside) */}
      {step >= 3 && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            top: LINE_TOP + LINE_H / 2 - 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 9,
            zIndex: 12
          }}
        >
          {LAYER_KEYS.map(([k, label]) => (
            <RouteToggle key={k} on={layers[k]} label={label} onClick={() => toggle(k)} show align="center" />
          ))}
        </div>
      )}

      {/* ---------------- the 1080x1080 explore window ----------------
           no border; a pannable / zoomable canvas holding every route's
           strip at its natural size, clamped to always fill the window */}
      <div
        ref={frameRef}
        onMouseDown={onMouseDown}
        onDragStart={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          top: TOP_RESERVE,
          left: '50%',
          width: frameSize,
          height: frameSize,
          transform: 'translateX(-50%)',
          overflow: 'hidden',
          background: 'var(--bg)',
          cursor: dragging ? 'grabbing' : 'grab',
          zIndex: 5
        }}
      >
        <div
          ref={contentRef}
          style={{
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.zoom})`,
            transformOrigin: '0 0',
            transition: animating ? 'transform 0.4s ease' : 'none',
            width: '100vw',
            userSelect: 'none'
          }}
        >
          {strips}

          {/* hidden fragment — a small white note attached to its square,
              counter-scaled so it stays a fixed, readable size at any zoom */}
          {frag && content.w > 0 && (
            <div
              style={{
                position: 'absolute',
                left: (frag.ri + 0.5) * (content.w / ROUTES.length),
                top: (frag.ci + 0.5) * (content.w / ROUTES.length),
                transform: `scale(${1 / t.zoom})`,
                transformOrigin: '0 0',
                zIndex: 20,
                pointerEvents: 'none'
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  letterSpacing: '0.01em',
                  padding: '11px 14px',
                  maxWidth: 240,
                  margin: '8px 0 0 8px',
                  direction: 'rtl',
                  textAlign: 'right'
                }}
              >
                <Typewriter
                  key={frag.id}
                  text={frag.text}
                  speed={55}
                  leaving={fragLeaving}
                  onLeft={() => {
                    setFrag(null)
                    setFragLeaving(false)
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* pan arrows around the window — click to glide the view (left/right/down) */}
      {step >= 4 && (
        <>
          <div
            onClick={() => panBy(frameSize * 0.5, 0)}
            style={{
              position: 'fixed',
              top: TOP_RESERVE + frameSize / 2,
              left: `calc(50% - ${frameSize / 2}px - 30px)`,
              transform: 'translateY(-50%)',
              fontSize: 26,
              lineHeight: 1,
              zIndex: 11,
              cursor: 'pointer',
              animation: arrowPulse.current[0]
            }}
          >
            ‹
          </div>
          <div
            onClick={() => panBy(-frameSize * 0.5, 0)}
            style={{
              position: 'fixed',
              top: TOP_RESERVE + frameSize / 2,
              left: `calc(50% + ${frameSize / 2}px + 16px)`,
              transform: 'translateY(-50%)',
              fontSize: 26,
              lineHeight: 1,
              zIndex: 11,
              cursor: 'pointer',
              animation: arrowPulse.current[1]
            }}
          >
            ›
          </div>
          <div
            onClick={() => panBy(0, -frameSize * 0.5)}
            style={{
              position: 'fixed',
              top: TOP_RESERVE + frameSize + 14,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 26,
              lineHeight: 1,
              zIndex: 11,
              cursor: 'pointer',
              animation: arrowPulse.current[2]
            }}
          >
            ⌄
          </div>
        </>
      )}
    </motion.div>
  )
}
