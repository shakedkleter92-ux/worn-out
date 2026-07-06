import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ROUTES, HOME, mediaUrl, routeLabel } from '../data/routes.js'
import Typewriter from './Typewriter.jsx'
import ScrambleTo from './ScrambleTo.jsx'
import RouteToggle from './RouteToggle.jsx'
import StripColumn from './StripLayers.jsx'
import { useButtonHover } from './HintContext.jsx'
import { randomPulse } from '../lib/blink.js'

/* ==================================================================
   SINGLE ROUTE PAGE — Revision 02
   The page slides up from below, then CONSTRUCTS itself top-to-bottom:
     1 route square  2 title + coords  3 connecting line
     4 layer buttons 5 video           6 strip (then progressive scroll)
   Nothing appears — everything is drawn / written / built.
================================================================== */

const CELL = 150 // px — video + every strip cell
const LINE_H = 110 // px — connecting line; the layer buttons sit on its middle
const LAYER_KEYS = [
  ['texture', 'TEXTURE'],
  ['grid', 'GRID'],
  ['mapping', 'MAPPING']
]
const FORCE_REVEAL = new URLSearchParams(window.location.search).get('all') === '1'

// build-sequence timing (slow, sequential, top-to-bottom)
const SLIDE = 1.1 // s slide-up transition
const STEP_GAP = 1100 // ms between build steps
const stepAt = (n) => SLIDE * 1000 + n * STEP_GAP

const randomizeDigits = (s) => s.replace(/[0-9]/g, () => Math.floor(Math.random() * 10))

export default function RoutePage({ id, onBack, onNavigate }) {
  const route = ROUTES.find((r) => r.id === id)
  // default: Texture ON, Mapping ON, Grid OFF
  const [layers, setLayers] = useState({ texture: true, grid: false, mapping: true })
  const toggle = (k) => setLayers((s) => ({ ...s, [k]: !s[k] }))
  const cells = useMemo(() => Array.from({ length: route.cells }, (_, i) => i + 1), [route.cells])

  // back-to-map square: blinks red/black, holds solid red on hover, cue "ROADS"
  const backPulse = useRef(randomPulse())
  const { hovered: backHover, hoverProps: backProps } = useButtonHover('ROADS')

  // ---- top-to-bottom build sequence ----
  const [step, setStep] = useState(FORCE_REVEAL ? 6 : 0)
  useEffect(() => {
    if (FORCE_REVEAL) return
    const timers = [1, 2, 3, 4, 5, 6].map((n) =>
      setTimeout(() => setStep((s) => Math.max(s, n)), stepAt(n))
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  // ---- fixed top zone (square/title/line/buttons/video stay put); the strip
  // scrolls up underneath it. Measure its height so the strip starts below it.
  const zoneRef = useRef(null)
  const [zoneH, setZoneH] = useState(470)
  useLayoutEffect(() => {
    if (zoneRef.current) setZoneH(zoneRef.current.offsetHeight)
  }, [step])

  // ---- per-cell random coordinate readout on hover ----
  const [hoverCell, setHoverCell] = useState(null)
  const randomCoords = useMemo(
    () => cells.map(() => ({ home: randomizeDigits(HOME.coordinates), route: randomizeDigits(route.coordinates) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const homeCoord = hoverCell != null ? randomCoords[hoverCell - 1].home : HOME.coordinates
  const routeCoord = hoverCell != null ? randomCoords[hoverCell - 1].route : route.coordinates

  // ---- prev / next route ----
  const idx = ROUTES.findIndex((r) => r.id === id)
  const prevId = ROUTES[(idx - 1 + ROUTES.length) % ROUTES.length].id
  const nextId = ROUTES[(idx + 1) % ROUTES.length].id

  return (
    <motion.div
      data-scroll
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ duration: SLIDE, ease: [0.7, 0, 0.2, 1] }}
      style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', zIndex: 30 }}
    >
      {/* corner coordinates — written in with step 2 */}
      {step >= 2 && (
        <>
          <div style={cornerStyle('left')}>
            <ScrambleTo text={homeCoord} />
          </div>
          <div style={cornerStyle('right')}>
            <ScrambleTo text={routeCoord} />
          </div>
        </>
      )}

      {/* ---- FIXED TOP ZONE: name, square, line, buttons, video ----
           stays put on screen; the strip scrolls up behind it */}
      <div
        ref={zoneRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 24,
          paddingBottom: 22
        }}
      >
        {/* 1 — route name at the top of the page */}
        <div style={{ height: 22, fontSize: 14, letterSpacing: '0.14em' }}>
          {step >= 2 && <Typewriter text={routeLabel(id)} speed={95} />}
        </div>

        {/* 2 — route square (back), under the name */}
        <motion.div
          onClick={onBack}
          {...backProps}
          initial={{ scale: 0 }}
          animate={{ scale: step >= 1 ? 1 : 0 }}
          transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}
          style={{
            width: 14,
            height: 14,
            marginTop: 10,
            cursor: 'pointer',
            background: backHover ? 'var(--accent)' : undefined,
            animation: backHover ? 'none' : backPulse.current
          }}
        />

        {/* 3 + 4 — connecting line drawn, with the layer buttons on top of
             its middle (buttons sit ON the line, not underneath it) */}
        <div style={{ position: 'relative', marginTop: 8, height: LINE_H, display: 'flex', justifyContent: 'center' }}>
          <svg
            width="2"
            height={LINE_H}
            style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', overflow: 'visible', zIndex: 1 }}
          >
            {step >= 3 && (
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
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
            )}
          </svg>
          {step >= 4 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                zIndex: 2
              }}
            >
              {LAYER_KEYS.map(([k, label]) => (
                <RouteToggle key={k} on={layers[k]} label={label} onClick={() => toggle(k)} show align="center" />
              ))}
            </div>
          )}
        </div>

        {/* 5 — video (45px under the line) */}
        <VideoBlock route={route} id={id} show={step >= 5} />
      </div>

      {/* ---- SCROLLING CONTENT: the strip + nav, offset below the fixed zone
           so it scrolls up underneath the video / buttons ---- */}
      <div style={{ paddingTop: zoneH }}>
        {step >= 6 && (
          <StripColumn
            folder={route.folder}
            count={route.cells}
            layers={layers}
            auto
            shimmer
            onHover={setHoverCell}
            onMouseLeave={() => setHoverCell(null)}
            cellStyle={{ width: CELL, height: CELL }}
            wrapperStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          />
        )}

        {/* route navigation: < > centred under the strip; scroll ends here */}
        {step >= 6 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 64,
              padding: '90px 0 26px',
              fontSize: 24,
              lineHeight: 1
            }}
          >
            <NavLink label="<" hint="PREV ROUTE" onClick={() => onNavigate?.(prevId)} />
            <NavLink label=">" hint="NEXT ROUTE" onClick={() => onNavigate?.(nextId)} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

const cornerStyle = (side) => ({
  position: 'fixed',
  bottom: 30,
  [side]: 44,
  fontSize: 11,
  letterSpacing: '0.04em',
  opacity: 0.85,
  zIndex: 5
})

function NavLink({ label, hint, onClick }) {
  const fg = useRef(randomPulse('wo-redblack-fg'))
  const { hovered, hoverProps } = useButtonHover(hint)
  return (
    <span
      onClick={onClick}
      {...hoverProps}
      style={{
        cursor: 'pointer',
        color: hovered ? 'var(--accent)' : undefined,
        animation: hovered ? 'none' : fg.current
      }}
    >
      {label}
    </span>
  )
}

/* video: the frame is drawn (stroke); once the frame finishes, the video
   simply APPEARS inside it — no wipe, no fade — exactly like the textures */
function VideoBlock({ route, id, show }) {
  const [framed, setFramed] = useState(FORCE_REVEAL)
  return (
    <div style={{ width: CELL, height: CELL, position: 'relative', marginTop: 14 }}>
      <svg width={CELL} height={CELL} style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        {show && (
          <motion.rect
            x="0.5"
            y="0.5"
            width={CELL - 1}
            height={CELL - 1}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            onAnimationComplete={() => setFramed(true)}
          />
        )}
      </svg>
      {show && framed && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {route.hasVideo ? (
            <video
              src={mediaUrl(route.folder, `${id}_web.mp4`)}
              autoPlay
              muted
              loop
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                letterSpacing: '0.16em'
              }}
            >
              VIDEO COMING SOON
            </div>
          )}
        </div>
      )}
    </div>
  )
}
