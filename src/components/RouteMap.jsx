import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Typewriter from './Typewriter.jsx'
import CoordScramble from './CoordScramble.jsx'
import { DESIGN_W, DESIGN_H, useStageScale, stageStyle } from '../lib/stage.js'
import { similarityPath, toPolyPoints } from '../lib/geometry.js'
import { ROUTE_PATHS } from '../data/routePaths.js'
import { HOME, ROUTES } from '../data/routes.js'
import {
  H1_POS,
  MAP_VLINE,
  MAP_NODES,
  SQUARE_SIZE
} from '../data/mapLayout.js'

const DRAW = 1.6 // s — every route draws in the same duration
const CLOSE = 1.0 // s — routes retract back into H1
const NAME_SIZE = 17 // road name / H1 — larger
const COORD_SIZE = 11 // coordinates — smaller than the name

const routeById = Object.fromEntries(ROUTES.map((r) => [r.id, r]))

export default function RouteMap({ autoReveal = false, onSelectRoute, onBack }) {
  const scale = useStageScale()
  // closed -> H1 blinking ; open -> H1 info + routes ; closing -> retracting
  const [phase, setPhase] = useState(autoReveal ? 'open' : 'closed')
  const [routesDrawn, setRoutesDrawn] = useState(autoReveal)
  const [h1Hover, setH1Hover] = useState(false)
  const [hovered, setHovered] = useState(null)

  const open = phase === 'open'
  const closing = phase === 'closing'

  // scroll UP: open -> retract roads into H1 ; closed -> travel back home
  const lock = useRef(false)
  useEffect(() => {
    const onWheel = (e) => {
      if (e.deltaY >= 0 || lock.current) return
      if (phase === 'open') {
        lock.current = true
        setHovered(null)
        setPhase('closing')
        setTimeout(() => {
          setPhase('closed')
          setRoutesDrawn(false)
          lock.current = false
        }, CLOSE * 1000)
      } else if (phase === 'closed') {
        lock.current = true
        onBack?.()
        setTimeout(() => (lock.current = false), 800)
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [phase, onBack])

  // precompute every route's screen-space polyline once
  const nodes = useMemo(
    () =>
      MAP_NODES.map((n) => {
        const geo = ROUTE_PATHS[n.id]
        const pts = similarityPath(geo.points, H1_POS, { x: n.x, y: n.y }, n.homeIsFirst)
        // randomise each square's blink so they fall out of sync
        const blinkDur = 0.9 + Math.random() * 0.8 // 0.9s - 1.7s
        const blinkDelay = -(Math.random() * blinkDur) // start mid-cycle
        return {
          ...n,
          route: routeById[n.id],
          poly: toPolyPoints(pts),
          blinkDur,
          blinkDelay
        }
      }),
    []
  )

  const handleH1Click = () => {
    if (phase !== 'closed') return
    setPhase('open')
    setTimeout(() => setRoutesDrawn(true), DRAW * 1000)
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg)'
      }}
    >
      <div style={stageStyle(scale)}>
        {/* ---------------- lines ---------------- */}
        <svg
          width={DESIGN_W}
          height={DESIGN_H}
          viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {/* vertical line arriving from screen 1 into H1.
              static (already drawn) so it never flickers on the
              home -> map transition: a vertical line is always visible */}
          <line
            x1={MAP_VLINE.x}
            y1={MAP_VLINE.yFrom}
            x2={MAP_VLINE.x}
            y2={MAP_VLINE.yTo}
            stroke="var(--ink)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {/* route polylines: draw out on open, retract into H1 on close */}
          {(open || closing) &&
            nodes.map((n) => (
              <motion.polyline
                key={n.id}
                points={n.poly}
                fill="none"
                stroke="var(--ink)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: autoReveal ? 1 : 0 }}
                animate={{ pathLength: closing ? 0 : 1 }}
                transition={{ duration: closing ? CLOSE : DRAW, ease: 'easeInOut' }}
              />
            ))}
        </svg>

        {/* ---------------- H1 info ---------------- */}
        {open && (
          <div
            style={{
              position: 'absolute',
              right: DESIGN_W - (H1_POS.x - SQUARE_SIZE / 2 - 12),
              top: H1_POS.y,
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
              <CoordScramble text={HOME.coordinates} frozen={h1Hover} />
            </span>
            <span style={{ fontSize: NAME_SIZE }}>
              <Typewriter text="H1" speed={60} delay={300} />
            </span>
          </div>
        )}

        {/* ---------------- H1 square ---------------- */}
        <motion.div
          layoutId="core-square"
          onClick={handleH1Click}
          onMouseEnter={() => setH1Hover(true)}
          onMouseLeave={() => setH1Hover(false)}
          style={{
            position: 'absolute',
            left: H1_POS.x - SQUARE_SIZE / 2,
            top: H1_POS.y - SQUARE_SIZE / 2,
            width: SQUARE_SIZE,
            height: SQUARE_SIZE,
            background: 'var(--ink)',
            cursor: phase === 'closed' ? 'pointer' : 'default',
            animation:
              phase === 'closed' && !h1Hover
                ? 'wo-blink 1.1s steps(1) infinite'
                : 'none'
          }}
        />

        {/* ---------------- route squares + labels ---------------- */}
        {routesDrawn &&
          nodes.map((n) => {
            const isHover = hovered === n.id
            const left = n.side === 'left'
            const labelStyle = {
              position: 'absolute',
              top: n.y,
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              display: 'flex',
              gap: '0.7em',
              alignItems: 'baseline',
              background: 'var(--bg)',
              padding: '3px 5px',
              ...(left
                ? { right: DESIGN_W - (n.x - SQUARE_SIZE / 2 - 8) }
                : { left: n.x + SQUARE_SIZE / 2 + 8 })
            }
            const name = (
              <span style={{ fontSize: NAME_SIZE }}>
                <Typewriter text={n.id} speed={45} />
              </span>
            )
            const coords = (
              <span style={{ fontSize: COORD_SIZE }}>
                <CoordScramble text={n.route.coordinates} frozen={isHover} />
              </span>
            )
            return (
              <div key={n.id}>
                {/* label + coordinates (fades out while closing) */}
                <motion.div
                  style={labelStyle}
                  initial={false}
                  animate={{ opacity: closing ? 0 : 1 }}
                  transition={{ duration: closing ? 0.35 : 0 }}
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
                </motion.div>
                {/* square (retracts into H1 while closing) */}
                <motion.div
                  onMouseEnter={() => !closing && setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => !closing && onSelectRoute?.(n.id)}
                  initial={false}
                  animate={{
                    x: closing ? H1_POS.x - n.x : 0,
                    y: closing ? H1_POS.y - n.y : 0,
                    opacity: closing ? 0 : 1
                  }}
                  transition={{ duration: CLOSE, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    left: n.x - SQUARE_SIZE / 2,
                    top: n.y - SQUARE_SIZE / 2,
                    width: SQUARE_SIZE,
                    height: SQUARE_SIZE,
                    background: isHover ? 'var(--accent)' : 'var(--ink)',
                    cursor: 'pointer',
                    animation:
                      isHover || closing
                        ? 'none'
                        : `wo-blink ${n.blinkDur}s steps(1) ${n.blinkDelay}s infinite`
                  }}
                />
              </div>
            )
          })}
      </div>
    </div>
  )
}
