import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Typewriter from './Typewriter.jsx'
import LinesReveal, { linesRevealMs } from './LinesReveal.jsx'
import CoordScramble from './CoordScramble.jsx'
import { similarityPath, toPolyPoints } from '../lib/geometry.js'
import { randomPulse } from '../lib/blink.js'
import { ROUTE_PATHS } from '../data/routePaths.js'
import { HOME, ROUTES, routeLabel } from '../data/routes.js'
import { H1_POS, MAP_NODES, SQUARE_SIZE } from '../data/mapLayout.js'
import { useSetHint } from './HintContext.jsx'

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
// WORN OUT + line + paragraph start here on the left
const INTRO_LEFT = 440
const HLINE = { xFrom: HOME_SQ.cx - HOME_SQ.size / 2, xTo: INTRO_LEFT, y: HOME_SQ.cy }
const LABEL = { leftX: INTRO_LEFT, size: 18 }

// ---- map (screen 2) in global space ----
const H1G = { x: H1_POS.x, y: H1_POS.y + MAP_Y0 }
const CENTRAL = { x: 1000, y1: HOME_SQ.cy + HOME_SQ.size / 2, y2: H1G.y }

/* --- timing --- slow, patient, cinematic (Revision 01).
   Everything unfolds gradually; each stage has room to breathe. */
const DRAW_H = 1.4 // horizontal intro line
const DRAW_V = 4.2 // central vertical line build (long + slow)
const DRAW = 3.4 // roads draw out (all the same, per spec)
const UI_EXIT = 1700 // ms for labels/squares to erase before lines retract
const NAME_SIZE = 17
const COORD_SIZE = 11
const CAM = 2.6 // s camera travel
const PAUSE_HV = 600 // ms pause between the two intro lines
const PAUSE_READY = 700 // ms pause before H1 appears
const PAUSE_ROUTES = 900 // ms pause after roads draw, before labels appear

const INTRO_TEXT =
  'Erosion maps recurring routes of everyday relief through the worn ' +
  'textures they leave behind. By documenting material that being ' +
  'transformed by repeated movement, the interface reveals how human ' +
  'routines become embedded in the environment over time.'

// paragraph reveal options (shared by the component + close timing)
const PARA_OPTS = { speed: 70, maxChars: 54 }
const PARA_MS = linesRevealMs(INTRO_TEXT, PARA_OPTS)

const routeById = Object.fromEntries(ROUTES.map((r) => [r.id, r]))

// dev shortcut: ?dev=map opens straight into the revealed map
const DEV = new URLSearchParams(window.location.search).get('dev')

export default function Experience({ onSelectRoute, onOpenAll, onViewChange, resumeMap = 0, paused = false, autoIntro = false, onReturnToOpening }) {
  const setHint = useSetHint() // cursor cue text while hovering a map button
  // viewport-width scale (vertical scroll space)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => setScale(window.innerWidth / DESIGN_W)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // intro build: idle -> h -> v -> ready
  const [phase, setPhase] = useState(DEV === 'map' || DEV === 'intro' ? 'ready' : 'idle')

  // coming back from the opening/screensaver: once the pattern has dissolved
  // away, the line + text open on their own (no scroll needed), then the user
  // scrolls down to the routes — the order the user asked for.
  useEffect(() => {
    if (!autoIntro) return
    const t = setTimeout(() => setPhase((p) => (p === 'idle' ? 'h' : p)), 450)
    return () => clearTimeout(t)
  }, [autoIntro])

  // once the self-opening intro is fully built, hold the wheel shut for a
  // moment so trackpad momentum can't drop straight to the map — the user
  // gets to read, and the descent waits for a fresh, deliberate scroll.
  useEffect(() => {
    if (!autoIntro || phase !== 'ready') return
    lock.current = true
    const t = setTimeout(() => {
      lock.current = false
    }, 1000)
    return () => clearTimeout(t)
  }, [autoIntro, phase])
  const [homeHover, setHomeHover] = useState(false)
  const homePulse = useRef(randomPulse())
  const h1Pulse = useRef(randomPulse())
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
          blink: randomPulse(),
          closeDur: 1.4 + Math.random() * 1.4 // random (slow) retract speed
        }
      }),
    []
  )
  const maxClose = useMemo(() => Math.max(...nodes.map((n) => n.closeDur)), [nodes])

  // -------- open / close roads --------
  const openRoads = () => {
    if (roads !== 'closed') return
    setRoads('opening')
    // roads finish drawing -> pause so the user can take them in -> labels
    setTimeout(() => {
      setRoads('open')
      setTimeout(() => setRoutesUI(true), PAUSE_ROUTES)
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

  // -------- wheel navigation --------
  // scroll direction: forward = deeper into the archive, back = retreat.
  useEffect(() => {
    const onWheel = (e) => {
      if (lock.current || paused) return
      const forward = e.deltaY > 0
      const back = e.deltaY < 0

      // -- intro (first square) opens forward, reverses back --
      if (phase === 'idle') {
        if (forward) setPhase('h') // build the intro
        else if (back) onReturnToOpening?.() // keep scrolling up → back to the pattern screen
        return
      }
      if (phase !== 'ready') return // build/reverse in progress -> ignore
      if (back && view === 'home') {
        // reverse of clicking the button: the text erases (mirror of the
        // reveal), then we land straight back on the opening pattern screen,
        // where its squares materialise in. text -> pattern in one scroll.
        lock.current = true
        setPhase('closing')
        setTimeout(() => {
          setPhase('idle')
          onReturnToOpening?.()
          lock.current = false
        }, PARA_MS + 200)
        return
      }

      if (forward && view === 'home') {
        // travel to H1, then the roads open
        lock.current = true
        setView('map')
        setTimeout(() => {
          openRoads()
          lock.current = false
        }, CAM * 1000)
      } else if (back && view === 'map') {
        if (roads === 'open' || roads === 'opening') {
          // roads close first, THEN travel back
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
  }, [phase, view, roads, maxClose, paused, onOpenAll, onReturnToOpening])

  // report the current section (home vs map) to the parent
  useEffect(() => {
    onViewChange?.(view)
  }, [view, onViewChange])

  // returning from a route / all-routes overlay: snap the map back to
  // section 2 with the roads already open (never to the home screen), and
  // briefly lock the wheel so trackpad momentum can't navigate it away.
  // NB: compare the value rather than a "first run" flag — under StrictMode
  // the mount effect fires twice, which would otherwise force the map open on
  // a fresh remount (e.g. arriving from the opening pattern via autoIntro).
  const lastResume = useRef(resumeMap)
  useEffect(() => {
    if (resumeMap === lastResume.current) return // mount / no real change
    lastResume.current = resumeMap
    setView('map')
    setPhase('ready')
    setRoads('open')
    setRoutesUI(true)
    lock.current = true
    const t = setTimeout(() => {
      lock.current = false
    }, 650)
    return () => clearTimeout(t)
  }, [resumeMap])

  const cameraY = view === 'map' ? FRAME_H : 0
  const introClosing = phase === 'closing' // intro reversing back to the bare square
  const showRoads = roads === 'opening' || roads === 'open' || roads === 'closing'
  const showHLine = phase !== 'idle'
  const showVLine = phase === 'v' || phase === 'ready' || introClosing
  const showLabel = phase === 'v' || phase === 'ready' || introClosing
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
              animate={{ pathLength: introClosing ? 0 : 1 }}
              transition={{ duration: introClosing ? 0.9 : DRAW_H, ease: 'easeInOut' }}
              onAnimationComplete={() =>
                setTimeout(() => setPhase((p) => (p === 'h' ? 'v' : p)), PAUSE_HV)
              }
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
              animate={{ pathLength: introClosing ? 0 : 1 }}
              transition={{ duration: introClosing ? 1.6 : DRAW_V, ease: 'easeInOut' }}
              onAnimationComplete={() =>
                setTimeout(() => setPhase((p) => (p === 'v' ? 'ready' : p)), PAUSE_READY)
              }
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
            <Typewriter text="WORN OUT" speed={115} leaving={introClosing} />
          </div>
        )}

        {/* ---- introductory paragraph — appears with WORN OUT, just below
             the line, aligned under WORN OUT (first page) ---- */}
        {showLabel && (
          <div
            style={{
              position: 'absolute',
              left: LABEL.leftX,
              // stay clear of the vertical line at x=1000
              top: HLINE.y + 24,
              width: 1000 - LABEL.leftX - 18,
              letterSpacing: '0.02em',
              opacity: 0.6
            }}
          >
            <LinesReveal text={INTRO_TEXT} {...PARA_OPTS} leaving={introClosing} />
          </div>
        )}

        {/* ---------------- home square (stays put) ---------------- */}
        <div
          onMouseEnter={() => setHomeHover(true)}
          onMouseLeave={() => setHomeHover(false)}
          onClick={() => phase === 'idle' && setPhase('h')}
          style={{
            position: 'absolute',
            left: HOME_SQ.cx - HOME_SQ.size / 2,
            top: HOME_SQ.cy - HOME_SQ.size / 2,
            width: HOME_SQ.size,
            height: HOME_SQ.size,
            background: homeHover ? 'var(--accent)' : undefined,
            animation: homeHover ? 'none' : homePulse.current
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
              <Typewriter text="H1" speed={130} delay={600} leaving={uiLeaving} />
            </span>
          </div>
        )}

        {/* ---------------- H1 square (its own square, stays) ---------------- */}
        {showH1 && (
          <motion.div
            onMouseEnter={() => {
              setH1Hover(true)
              setHint('ALL ROUTES')
            }}
            onMouseLeave={() => {
              setH1Hover(false)
              setHint(null)
            }}
            onClick={() => roads === 'open' && onOpenAll?.()}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: H1G.x - SQUARE_SIZE / 2,
              top: H1G.y - SQUARE_SIZE / 2,
              width: SQUARE_SIZE,
              height: SQUARE_SIZE,
              // same hover behaviour as the route squares (future: opens
              // the all-routes screen). Hover -> accent colour + no blink.
              background: h1Hover ? 'var(--accent)' : undefined,
              cursor: 'pointer',
              animation: h1Hover ? 'none' : h1Pulse.current
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
                <Typewriter text={routeLabel(n.id)} speed={95} leaving={uiLeaving} />
              </span>
            )
            const coords = (
              <span style={{ fontSize: COORD_SIZE }}>
                <CoordScramble text={n.route.coordinates} frozen={isHover} leaving={uiLeaving} />
              </span>
            )
            return (
              <div key={n.id}>
                <div
                  style={{ ...labelStyle, cursor: 'pointer' }}
                  onMouseEnter={() => {
                    if (uiLeaving) return
                    setHovered(n.id)
                    setHint('ENTER')
                  }}
                  onMouseLeave={() => {
                    setHovered(null)
                    setHint(null)
                  }}
                  onClick={() => roads === 'open' && !uiLeaving && onSelectRoute?.(n.id)}
                >
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
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    left: n.gx - SQUARE_SIZE / 2,
                    top: n.gy - SQUARE_SIZE / 2,
                    width: SQUARE_SIZE,
                    height: SQUARE_SIZE
                  }}
                >
                  <motion.div
                    onMouseEnter={() => {
                      if (uiLeaving) return
                      setHovered(n.id)
                      setHint('ENTER')
                    }}
                    onMouseLeave={() => {
                      setHovered(null)
                      setHint(null)
                    }}
                    onClick={() => roads === 'open' && !uiLeaving && onSelectRoute?.(n.id)}
                    style={{
                      width: '100%',
                      height: '100%',
                      background: isHover ? 'var(--accent)' : undefined,
                      cursor: 'pointer',
                      animation: isHover || uiLeaving ? 'none' : n.blink
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
