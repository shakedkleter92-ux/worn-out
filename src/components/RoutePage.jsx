import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ROUTES, HOME, mediaUrl } from '../data/routes.js'

// keep the exact format (dots, comma, spacing) — only swap the digits
const randomizeDigits = (s) => s.replace(/[0-9]/g, () => Math.floor(Math.random() * 10))

/* shows `text`, and whenever `text` changes it scrambles/decodes to the
   new value (left-to-right resolve) — same feel as the map readouts */
function ScrambleTo({ text }) {
  const [display, setDisplay] = useState(text)
  const prev = useRef(text)
  useEffect(() => {
    if (text === prev.current) return
    prev.current = text
    let step = 0
    const steps = text.length + 4
    const iv = setInterval(() => {
      step += 1
      let out = ''
      for (let k = 0; k < text.length; k++) {
        const ch = text[k]
        if (ch < '0' || ch > '9') out += ch
        else if (k < step) out += ch
        else out += ((Math.random() * 10) | 0)
      }
      setDisplay(out)
      if (step >= steps) {
        clearInterval(iv)
        setDisplay(text)
      }
    }, 30)
    return () => clearInterval(iv)
  }, [text])
  return <span>{display}</span>
}

/* ==================================================================
   SINGLE ROUTE PAGE
   header (back square + id + coords) -> layer toggles -> video ->
   long vertical strip of layered cells (Texture / Grid / Mapping).
   Every cell is 1080x1080; the three layers are stacked pixel-aligned.
   Layer order is ALWAYS texture (bottom) -> grid -> mapping (top).
================================================================== */

// video and every strip cell share the exact same width/size
const CELL = 150 // px — rendered size of each 1080x1080 cell AND the video

/* a row whose SQUARE is centred on the page axis (aligned with the
   video + strip), with its label/typography offset to the right so it
   never pushes the square off-centre */
function AxisRow({ children, label }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      {children}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translateY(-50%)',
          marginLeft: 16,
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </span>
    </div>
  )
}

const LAYER_KEYS = [
  ['mapping', 'MAPPING'],
  ['grid', 'GRID'],
  ['texture', 'TEXTURE']
]

// dev: ?all=1 reveals every cell immediately (for verification)
const FORCE_REVEAL = new URLSearchParams(window.location.search).get('all') === '1'

export default function RoutePage({ id, onBack }) {
  const route = ROUTES.find((r) => r.id === id)
  const [layers, setLayers] = useState({ texture: true, grid: true, mapping: true })
  const toggle = (k) => setLayers((s) => ({ ...s, [k]: !s[k] }))
  const cells = Array.from({ length: route.cells }, (_, i) => i + 1)

  // hovering a strip cell shows a per-cell random coordinate readout
  const [hoverCell, setHoverCell] = useState(null)
  const randomCoords = useMemo(
    () =>
      cells.map(() => ({
        home: randomizeDigits(HOME.coordinates),
        route: randomizeDigits(route.coordinates)
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const homeCoord =
    hoverCell != null ? randomCoords[hoverCell - 1].home : HOME.coordinates
  const routeCoord =
    hoverCell != null ? randomCoords[hoverCell - 1].route : route.coordinates

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: 'var(--bg)'
      }}
    >
      {/* HOME coordinate — bottom-left corner */}
      <div
        style={{
          position: 'fixed',
          bottom: 30,
          left: 44,
          fontSize: 11,
          letterSpacing: '0.04em',
          opacity: 0.85,
          zIndex: 5
        }}
      >
        <ScrambleTo text={homeCoord} />
      </div>

      {/* route coordinate — bottom-right corner */}
      <div
        style={{
          position: 'fixed',
          bottom: 30,
          right: 44,
          fontSize: 11,
          letterSpacing: '0.04em',
          opacity: 0.85,
          zIndex: 5
        }}
      >
        <ScrambleTo text={routeCoord} />
      </div>

      {/* everything sits in one centred column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 95
        }}
      >
        {/* ---------------- header (square centred on axis) ---------------- */}
        <AxisRow
          label={
            <span style={{ fontSize: 13, letterSpacing: '0.12em' }}>{id}</span>
          }
        >
          <div
            onClick={onBack}
            title="back to map"
            style={{
              width: 13,
              height: 13,
              background: 'var(--accent)',
              cursor: 'pointer'
            }}
          />
        </AxisRow>

        {/* ---------------- layer toggles (squares centred on axis) ---------------- */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
            marginTop: 22
          }}
        >
          {LAYER_KEYS.map(([k, label]) => {
            const on = layers[k]
            return (
              <AxisRow
                key={k}
                label={
                  <span
                    onClick={() => toggle(k)}
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      opacity: on ? 1 : 0.45,
                      cursor: 'pointer'
                    }}
                  >
                    {label}
                  </span>
                }
              >
                <div
                  onClick={() => toggle(k)}
                  style={{
                    width: on ? 12 : 6,
                    height: on ? 12 : 6,
                    background: 'var(--ink)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                />
              </AxisRow>
            )
          })}
        </div>

        {/* ---------------- video (same width as the strip) ---------------- */}
        <div style={{ width: CELL, height: CELL, position: 'relative', margin: '40px 0 0' }}>
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
                border: '1px solid var(--ink)',
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

        {/* ---------------- media strip ---------------- */}
        <div
          onMouseLeave={() => setHoverCell(null)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 40,
            paddingBottom: 160
          }}
        >
          {cells.map((i) => (
            <Cell
              key={i}
              folder={route.folder}
              i={i}
              layers={layers}
              onHover={setHoverCell}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* a single stacked layer — module-level so it never remounts on re-render */
function Layer({ src, on, inView, idx, z }) {
  return (
    <motion.img
      src={src}
      alt=""
      initial={{ opacity: FORCE_REVEAL ? 1 : 0 }}
      animate={{ opacity: inView && on ? 1 : 0 }}
      transition={{ duration: 0.5, delay: inView ? idx * 0.18 : 0 }}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: z
      }}
    />
  )
}

/* one 1080x1080 cell — three stacked layers revealed in order on scroll.
   memoised so hovering (which re-renders the page) never remounts it */
const Cell = memo(function Cell({ folder, i, layers, onHover }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '-12% 0px' })
  const inView = seen || FORCE_REVEAL

  return (
    <div
      ref={ref}
      onMouseEnter={() => onHover?.(i)}
      style={{ position: 'relative', width: CELL, height: CELL }}
    >
      <Layer src={mediaUrl(folder, 'TEXTURE', `T${i}.png`)} on={layers.texture} inView={inView} idx={0} z={1} />
      {/* grid is RED while texture is on, BLACK while texture is off */}
      <Layer
        src={mediaUrl(folder, layers.texture ? 'grid_red.svg' : 'grid_black.svg')}
        on={layers.grid}
        inView={inView}
        idx={1}
        z={2}
      />
      <Layer src={mediaUrl(folder, 'MAPPING', `M${i}.svg`)} on={layers.mapping} inView={inView} idx={2} z={3} />
    </div>
  )
})
