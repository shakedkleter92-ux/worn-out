import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Typewriter from './Typewriter.jsx'
import CoordScramble from './CoordScramble.jsx'
import { similarityPath, toPolyPoints } from '../lib/geometry.js'
import { ROUTE_PATHS } from '../data/routePaths.js'
import { HOME, ROUTES } from '../data/routes.js'
import { H1_POS, MAP_NODES, SQUARE_SIZE } from '../data/mapLayout.js'

/* ==================================================================
   ONE CONTINUOUS SPACE.
   A single 2000-wide design stage, scaled to viewport width, that we
   move a CAMERA through (translateY). Nothing is ever unmounted, so:
     - the home square stays where it is
     - the central vertical line is always on screen (it just builds)
     - H1 is its own square further down the same line
   Opening the roads and closing them are exact mirrors of each other:
   everything disappears the same way it appeared, reversed.
================================================================== */

const DESIGN_W = 2000
const FRAME_H = 1125
const H_TOTAL = FRAME_H * 2 // home frame + map frame
const MAP_Y0 = FRAME_H // map frame starts here

// ---- home (screen 1) ----
const HOME_SQ = { cx: 1000, cy: 562, size: 20 }
const HLINE = { xFrom: HOME_SQ.cx - HOME_SQ.size / 2, xTo: 772, y: HOME_SQ.cy }
const LABEL = { leftX: 772, size: 18 }

// ---- map (screen 2) in global space ----
const H1G = { x: H1_POS.x, y: H1_POS.y + MAP_Y0 }
const CENTRAL = { x: 1000, y1: HOME_SQ.cy + HOME_SQ.size / 2, y2: H1G.y }

const DRAW_H = 0.55 // horizontal intro line
const DRAW_V = 1.7 // central vertical line build
const DRAW = 1.6 // roads draw out (all the same, per spec)
const UI_EXIT = 850 // ms for labels/squares to erase before lines retract
const NAME_SIZE = 17
const COORD_SIZE = 11
const CAM = 1.15 // s camera travel

const routeById = Object.fromEntries(ROUTES.map((r) => [r.id, r]))

// dev shortcut: ?dev=map opens straight into the revealed map
const DEV = new URLSearchParams(window.location.search).get('dev')

export default function Experience({ onSelectRoute, onOpenAll, paused = false }) {
  // viewport-width scale (vertical scroll space)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => setScale(window.innerWidth / DESIGN_W)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // intro build: idle -> h -> v -> ready
  const [phase, setPhase] = useState(DEV === 'map' ? 'ready' : 'idle')
  const [homeHover, setHomeHover] = useState(false)
  // camera
  const [view, setView] = useState(DEV === 'map' ? 'map' : 'home') // home | map
  // roads
  const [roads, setRoads] = useState(DEV === 'map' ? 'open' : 'closed') // closed | opening | open | closing
  const [routesUI, setRoutesUI] = useState(DEV === 'map')
  const [uiLeaving, setUiLeaving] = useState(false)
  const [linesRetracting, setLinesRetracting] = useState(false)
  const [h1Hover, setH1Hover] = useState(false)
  const [hovered, setHovered] = useState(null)
  const lock = useRef(false)

  const nodes = useMemo(
    () =>
      MAP_NODES.map((n) => {
        const gx = n.x
        const gy = n.y + MAP_Y0
        const pts = similarityPath(ROUTE_PATHS[n.id].points, H1G, { x: gx, y: gy }, n.homeIsFirst)
        return {
          ...n,
          gx,
          gy,
          route: routeById[n.id],
          poly: toPolyPoints(pts),
          blinkDur: 0.9 + Math.random() * 0.8,
          blinkDelay: -(Math.random() * 1.6),
          closeDur: 0.7 + Math.random() * 0.9 // random retract speed
        }
      }),
    []
  )
  const maxClose = useMemo(() => Math.max(...nodes.map((n) => n.closeDur)), [nodes])

  // -------- intro build --------
  const onHomeClick = () => {
    if (phase === 'idle') setPhase('h')
  }

  // -------- open / close roads --------
  const openRoads = () => {
    if (roads !== 'closed') return
    setRoads('opening')
    setTimeout(() => {
      setRoads('open')
      setRoutesUI(true)
    }, DRAW * 1000)
  }

  const closeRoads = (then) => {
    setRoads('closing')
    setHovered(null)
    setUiLeaving(true) // labels erase, squares un-appear
    setTimeout(() => setLinesRetracting(true), UI_EXIT) // then lines retract
    setTimeout(() => {
      setRoads('closed')
      setRoutesUI(false)
      setUiLeaving(false)
      setLinesRetracting(false)
      then?.()
    }, UI_EXIT + maxClose * 1000 + 60)
  }

  // -------- wheel navigation: scroll controls open/close --------
  useEffect(() => {
    const onWheel = (e) => {
      if (lock.current || phase !== 'ready' || paused) return
      const down = e.deltaY > 0
      const up = e.deltaY < 0
      if (down && view === 'home') {
        // travel down to H1, then the roads open with the scroll
        lock.current = true
        setView('map')
        setTimeout(() => {
          openRoads()
          lock.current = false
        }, CAM * 1000)
      } else if (up && view === 'map') {
        if (roads === 'open' || roads === 'opening') {
          // roads close first, THEN travel up
          lock.current = true
          closeRoads(() => {
            setView('home')
            setTimeout(() => (lock.current = false), CAM * 1000)
          })
        } else {
          lock.current = true
          setView('home')
          setTimeout(() => (lock.current = false), CAM * 1000)
        }
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [phase, view, roads, maxClose, paused])

  const cameraY = view === 'map' ? FRAME_H : 0
  const showRoads = roads === 'opening' || roads === 'open' || roads === 'closing'
  const showHLine = phase !== 'idle'
  const showVLine = phase === 'v' || phase === 'ready'
  const showLabel = phase === 'v' || phase === 'ready'
  const showH1 = phase === 'ready'
  const roadsOpenUI = roads === 'open' || roads === 'closing'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: 'var(--bg)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: DESIGN_W,
          height: H_TOTAL,
          transformOrigin: '0 0',
          transform: `scale(${scale}) translateY(${-cameraY}px)`,
          transition: `transform ${CAM}s cubic-bezier(.7,0,.2,1)`
        }}
      >
        {/* ---------------- all lines ---------------- */}
        <svg
          width={DESIGN_W}
          height={H_TOTAL}
          viewBox={`0 0 ${DESIGN_W} ${H_TOTAL}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {/* horizontal intro line */}
          {showHLine && (
            <motion.line
              x1={HLINE.xFrom}
              y1={HLINE.y}
              x2={HLINE.xTo}
              y2={HLINE.y}
              stroke="var(--ink)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: DRAW_H, ease: 'easeInOut' }}
              onAnimationComplete={() => setPhase((p) => (p === 'h' ? 'v' : p))}
            />
          )}
          {/* central vertical line — builds down to H1, then stays forever */}
          {showVLine && (
            <motion.line
              x1={CENTRAL.x}
              y1={CENTRAL.y1}
              x2={CENTRAL.x}
              y2={CENTRAL.y2}
              stroke="var(--ink)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: DRAW_V, ease: 'easeInOut' }}
              onAnimationComplete={() => setPhase((p) => (p === 'v' ? 'ready' : p))}
            />
          )}
          {/* roads — draw out on open, un-stroke on close (staggered) */}
          {showRoads &&
            nodes.map((n) => (
              <motion.polyline
                key={n.id}
                points={n.poly}
                fill="none"
                stroke="var(--ink)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: linesRetracting ? 0 : 1 }}
                transition={{
                  duration: linesRetracting ? n.closeDur : DRAW,
                  ease: 'easeInOut'
                }}
              />
            ))}
        </svg>

        {/* ---------------- WORN OUT label ---------------- */}
        {showLabel && (
          <div
            style={{
              position: 'absolute',
              left: LABEL.leftX,
              top: HLINE.y - LABEL.size - 4,
              whiteSpace: 'nowrap',
              fontSize: LABEL.size,
              lineHeight: 1,
              letterSpacing: '0.02em'
            }}
          >
            <Typewriter text="WORN OUT" speed={55} />
          </div>
        )}

        {/* ---------------- home square (stays put) ---------------- */}
        <div
          onClick={onHomeClick}
          onMouseEnter={() => setHomeHover(true)}
          onMouseLeave={() => setHomeHover(false)}
          style={{
            position: 'absolute',
            left: HOME_SQ.cx - HOME_SQ.size / 2,
            top: HOME_SQ.cy - HOME_SQ.size / 2,
            width: HOME_SQ.size,
            height: HOME_SQ.size,
            background: 'var(--ink)',
            cursor: phase === 'idle' ? 'pointer' : 'default',
            animation:
              phase === 'idle' && !homeHover
                ? 'wo-blink 1.1s steps(1) infinite'
                : 'none'
          }}
        />

        {/* ---------------- H1 info ---------------- */}
        {roadsOpenUI && (
          <div
            style={{
              position: 'absolute',
              right: DESIGN_W - (H1G.x - SQUARE_SIZE / 2 - 12),
              top: H1G.y,
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              display: 'flex',
              gap: '0.8em',
              alignItems: 'baseline',
              background: 'var(--bg)',
              padding: '3px 5px'
            }}
          >
            <span style={{ fontSize: COORD_SIZE }}>
              <CoordScramble text={HOME.coordinates} frozen={h1Hover} leaving={uiLeaving} />
            </span>
            <span style={{ fontSize: NAME_SIZE }}>
              <Typewriter text="H1" speed={60} delay={300} leaving={uiLeaving} />
            </span>
          </div>
        )}

        {/* ---------------- H1 square (its own square, stays) ---------------- */}
        {showH1 && (
          <motion.div
            onMouseEnter={() => setH1Hover(true)}
            onMouseLeave={() => setH1Hover(false)}
            onClick={() => roads === 'open' && onOpenAll?.()}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: H1G.x - SQUARE_SIZE / 2,
              top: H1G.y - SQUARE_SIZE / 2,
              width: SQUARE_SIZE,
              height: SQUARE_SIZE,
              // same hover behaviour as the route squares (future: opens
              // the all-routes screen). Hover -> accent colour + no blink.
              background: h1Hover ? 'var(--accent)' : 'var(--ink)',
              cursor: 'pointer',
              animation:
                roads === 'closed' && !h1Hover
                  ? 'wo-blink 1.1s steps(1) infinite'
                  : 'none'
            }}
          />
        )}

        {/* ---------------- route squares + labels ---------------- */}
        {routesUI &&
          nodes.map((n) => {
            const isHover = hovered === n.id
            const left = n.side === 'left'
            const labelStyle = {
              position: 'absolute',
              top: n.gy,
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              display: 'flex',
              gap: '0.7em',
              alignItems: 'baseline',
              background: 'var(--bg)',
              padding: '3px 5px',
              ...(left
                ? { right: DESIGN_W - (n.gx - SQUARE_SIZE / 2 - 8) }
                : { left: n.gx + SQUARE_SIZE / 2 + 8 })
            }
            const name = (
              <span style={{ fontSize: NAME_SIZE }}>
                <Typewriter text={n.id} speed={45} leaving={uiLeaving} />
              </span>
            )
            const coords = (
              <span style={{ fontSize: COORD_SIZE }}>
                <CoordScramble text={n.route.coordinates} frozen={isHover} leaving={uiLeaving} />
              </span>
            )
            return (
              <div key={n.id}>
                <div style={labelStyle}>
                  {left ? (
                    <>
                      {coords}
                      {name}
                    </>
                  ) : (
                    <>
                      {name}
                      {coords}
                    </>
                  )}
                </div>
                {/* square: outer = appear/disappear, inner = blink + colour */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{
                    opacity: uiLeaving ? 0 : 1,
                    scale: uiLeaving ? 0.4 : 1
                  }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    left: n.gx - SQUARE_SIZE / 2,
                    top: n.gy - SQUARE_SIZE / 2,
                    width: SQUARE_SIZE,
                    height: SQUARE_SIZE
                  }}
                >
                  <motion.div
                    onMouseEnter={() => !uiLeaving && setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => roads === 'open' && !uiLeaving && onSelectRoute?.(n.id)}
                    style={{
                      width: '100%',
                      height: '100%',
                      background: isHover ? 'var(--accent)' : 'var(--ink)',
                      cursor: 'pointer',
                      animation:
                        isHover || uiLeaving
                          ? 'none'
                          : `wo-blink ${n.blinkDur}s steps(1) ${n.blinkDelay}s infinite`
                    }}
                  />
                </motion.div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
