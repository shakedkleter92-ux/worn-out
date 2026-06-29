import { memo, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ROUTES, HOME, mediaUrl } from '../data/routes.js'

/* ==================================================================
   GLOBAL ALL-ROUTES SCREEN  (press H1)
   Every route's strip placed directly next to the next, no gaps,
   in the original order. Same layer logic (Texture -> Grid ->
   Mapping), same toggles, same scroll reveal. Hovering a strip shows
   that route's name + coordinates in the sticky header.
================================================================== */

const LAYER_KEYS = [
  ['mapping', 'MAPPING'],
  ['grid', 'GRID'],
  ['texture', 'TEXTURE']
]

// dev: ?all=1 reveals every cell immediately (verification)
const FORCE_REVEAL = new URLSearchParams(window.location.search).get('all') === '1'

function GLayer({ src, on, inView, idx, z }) {
  return (
    <motion.img
      src={src}
      alt=""
      loading="lazy"
      initial={{ opacity: FORCE_REVEAL ? 1 : 0 }}
      animate={{ opacity: inView && on ? 1 : 0 }}
      transition={{ duration: 0.5, delay: inView ? idx * 0.12 : 0 }}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: z,
        display: 'block'
      }}
    />
  )
}

const GCell = memo(function GCell({ folder, i, layers, routeId, onHover }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '-8% 0px' })
  const inView = seen || FORCE_REVEAL
  return (
    <div
      ref={ref}
      onMouseEnter={() => onHover?.(routeId)}
      style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}
    >
      <GLayer src={mediaUrl(folder, 'TEXTURE', `T${i}.png`)} on={layers.texture} inView={inView} idx={0} z={1} />
      <GLayer
        src={mediaUrl(folder, layers.texture ? 'grid_red.svg' : 'grid_black.svg')}
        on={layers.grid}
        inView={inView}
        idx={1}
        z={2}
      />
      <GLayer src={mediaUrl(folder, 'MAPPING', `M${i}.svg`)} on={layers.mapping} inView={inView} idx={2} z={3} />
    </div>
  )
})

export default function GlobalRoutes({ onBack }) {
  const [layers, setLayers] = useState({ texture: true, grid: true, mapping: true })
  const toggle = (k) => setLayers((s) => ({ ...s, [k]: !s[k] }))
  const [hovered, setHovered] = useState(ROUTES[0].id)
  const route = ROUTES.find((r) => r.id === hovered)

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
        <span style={{ letterSpacing: '0.12em' }}>{route.title}</span>
        <span style={{ opacity: 0.85 }}>{route.coordinates}</span>
      </div>

      {/* ---------------- sticky header ---------------- */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '95px 0 95px'
        }}
      >
        {/* hovered route readout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.2em',
            fontSize: 11,
            letterSpacing: '0.04em'
          }}
        >
          <div
            onClick={onBack}
            title="back to map"
            style={{ width: 13, height: 13, background: 'var(--accent)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, letterSpacing: '0.12em' }}>{route.id}</span>
        </div>

        {/* layer toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 22 }}>
          {LAYER_KEYS.map(([k, label]) => {
            const on = layers[k]
            return (
              <button
                key={k}
                onClick={() => toggle(k)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 0 }}
              >
                <span
                  style={{
                    width: on ? 12 : 6,
                    height: on ? 12 : 6,
                    background: 'var(--ink)',
                    transition: 'all 0.2s ease',
                    display: 'inline-block'
                  }}
                />
                <span style={{ fontSize: 10, letterSpacing: '0.1em', opacity: on ? 1 : 0.45 }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------------- all strips, adjacent, no gaps ---------------- */}
      <div style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
        {ROUTES.map((r) => (
          <div key={r.id} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {Array.from({ length: r.cells }, (_, k) => k + 1).map((i) => (
              <GCell
                key={i}
                folder={r.folder}
                i={i}
                layers={layers}
                routeId={r.id}
                onHover={setHovered}
              />
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
