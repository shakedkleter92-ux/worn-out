import { useEffect, useLayoutEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Typewriter from './Typewriter.jsx'

/* ==================================================================
   SCREEN 1 — HOME
   Built inside a fixed 2000x1125 "design stage" that maps 1:1 to the
   Illustrator reference, then uniformly scaled to fit the viewport.
   ------------------------------------------------------------------
   idle  -> click stops the blink
   hline -> a line draws OUT to the left from the square
   vline -> a second line draws straight DOWN (180deg)
   typing-> typography types OUT from the right side of the line
            (it grows leftward, emerging at the square)
================================================================== */

const DESIGN_W = 2000
const DESIGN_H = 1125

// --- exact reference coordinates (design space: 2000 x 1125) ---
const SQUARE = { cx: 1000, cy: 562, size: 20 }
const LINE_Y = SQUARE.cy
const HLINE = { xFrom: SQUARE.cx - SQUARE.size / 2, xTo: 772 } // out to the left
const VLINE = { x: SQUARE.cx, yFrom: SQUARE.cy + SQUARE.size / 2, yTo: DESIGN_H }
const LABEL = { leftX: HLINE.xTo, size: 18 } // starts where the line ends
const DRAW = 0.55 // s per line

function useStageScale() {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () =>
      setScale(
        Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
      )
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

export default function Home({ onAdvance, introDone = false, onIntroDone }) {
  const scale = useStageScale()
  // when returning from the map the intro is already done -> show final state
  const [phase, setPhase] = useState(introDone ? 'typing' : 'idle')
  const [hovering, setHovering] = useState(false)
  const [ready, setReady] = useState(introDone) // intro finished -> scroll enabled
  const blinking = phase === 'idle' && !hovering

  const handleClick = () => {
    if (phase === 'idle') setPhase('hline')
  }

  // once the intro has finished, scrolling/wheel down travels to the map
  useEffect(() => {
    if (!ready) return
    const go = (e) => {
      if (e.deltaY > 0) onAdvance?.()
    }
    window.addEventListener('wheel', go, { passive: true })
    return () => window.removeEventListener('wheel', go)
  }, [ready, onAdvance])

  const showH = phase === 'hline' || phase === 'vline' || phase === 'typing'
  const showV = phase === 'vline' || phase === 'typing'

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
      {/* ---------- scaled design stage ---------- */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {/* the two lines */}
        <svg
          width={DESIGN_W}
          height={DESIGN_H}
          viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {/* horizontal line OUT to the left */}
          {showH && (
            <motion.line
              x1={HLINE.xFrom}
              y1={LINE_Y}
              x2={HLINE.xTo}
              y2={LINE_Y}
              stroke="var(--ink)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: introDone ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: introDone ? 0 : DRAW, ease: 'easeInOut' }}
              onAnimationComplete={() =>
                setPhase((p) => (p === 'hline' ? 'vline' : p))
              }
            />
          )}
          {/* vertical line straight DOWN (180deg) */}
          {showV && (
            <motion.line
              x1={VLINE.x}
              y1={VLINE.yFrom}
              x2={VLINE.x}
              y2={VLINE.yTo}
              stroke="var(--ink)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: introDone ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: introDone ? 0 : DRAW, ease: 'easeInOut' }}
              onAnimationComplete={() =>
                setPhase((p) => (p === 'vline' ? 'typing' : p))
              }
            />
          )}
        </svg>

        {/* typography — emerges from the RIGHT side of the line, grows left */}
        {phase === 'typing' && (
          <div
            style={{
              position: 'absolute',
              left: LABEL.leftX,
              top: LINE_Y - LABEL.size - 4,
              whiteSpace: 'nowrap',
              fontSize: LABEL.size,
              lineHeight: 1,
              letterSpacing: '0.02em'
            }}
          >
            {introDone ? (
              'WORN OUT'
            ) : (
              <Typewriter
                text="WORN OUT"
                speed={55}
                onDone={() => {
                  setReady(true)
                  onIntroDone?.()
                }}
              />
            )}
          </div>
        )}

        {/* the core square */}
        <motion.div
          layoutId="core-square"
          onClick={handleClick}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            position: 'absolute',
            left: SQUARE.cx - SQUARE.size / 2,
            top: SQUARE.cy - SQUARE.size / 2,
            width: SQUARE.size,
            height: SQUARE.size,
            background: 'var(--ink)',
            cursor: phase === 'idle' ? 'pointer' : 'default',
            animation: blinking ? 'wo-blink 1.1s steps(1) infinite' : 'none'
          }}
        />
      </div>
    </div>
  )
}
