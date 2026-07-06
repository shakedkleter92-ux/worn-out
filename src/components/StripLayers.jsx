import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { mediaUrl } from '../data/routes.js'
import MappingLayer from './MappingLayer.jsx'

/* ==================================================================
   SHARED STRIP REVEAL — one behaviour for every page.
   A strip is a vertical column of square cells; each cell stacks three
   layers (texture → grid → mapping). The rules, identical everywhere:

   • Reveal follows the scroll, strictly top-to-bottom. A cell only
     appears once it scrolls into view AND every cell above it has
     already been revealed — nothing lower ever jumps ahead.
   • Nothing wipes or fades. Elements simply appear, one at a time, with
     a short pause before each cell and between its layers.
   • Toggling a layer cascades one cell at a time: top-to-bottom when
     turning it ON, and the reverse (bottom-to-top) when turning it OFF.
================================================================== */

export const CELL_DELAY = 120 // ms a cell waits after it's eligible, before its first layer
export const LAYER_STAGGER = 180 // ms between each layer (texture → grid → mapping) within a cell
export const TOGGLE_STAGGER = 110 // ms between cells when a layer is toggled on/off

// dev: ?all=1 reveals every cell immediately (verification)
export const FORCE_REVEAL = new URLSearchParams(window.location.search).get('all') === '1'

/* one construction layer. No wipe / no fade — the image simply appears or
   is absent. But it never flips all at once across the strip: toggling a
   layer cascades one cell at a time, rippling out from wherever the user is
   currently looking: the cell nearest the centre of the viewport changes
   first, and the delay grows with each cell's distance from that point (up
   OR down). `anchorRef` is the cell's box, used to measure that distance.  */
function Layer({ src, on, z, anchorRef }) {
  const [shown, setShown] = useState(on)
  useEffect(() => {
    // how many cells away from the viewport centre this cell sits right now
    let steps = 0
    const el = anchorRef?.current
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.height) {
        const cellCentre = r.top + r.height / 2
        const viewCentre = window.innerHeight / 2
        steps = Math.abs(cellCentre - viewCentre) / r.height
      }
    }
    const t = setTimeout(() => setShown(on), steps * TOGGLE_STAGGER)
    return () => clearTimeout(t)
  }, [on, anchorRef])
  if (!shown) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: z }}
    />
  )
}

/* one cell — three stacked layers. Always reserves its box (so the user can
   scroll to it), reveals its layers one at a time once eligible, and unlocks
   the next cell down only after it has fully finished. `cellStyle` sets the
   box size (fixed on a route page, fluid on the all-routes grid).          */
const StripCell = memo(function StripCell({ folder, i, layers, onHover, canReveal, onReveal, cellStyle, instant, start = true, auto = false, shimmer = false }) {
  const ref = useRef(null)
  const seen = useInView(ref, { once: true, margin: '-20% 0px' })
  const immediate = instant || FORCE_REVEAL // show every layer at once (explore view)
  // `auto` cascades top-to-bottom on its own (no scroll needed — used by the
  // all-routes window); otherwise a cell also has to be scrolled into view
  const eligible = immediate || (start && canReveal && (auto || seen))

  const [layerStep, setLayerStep] = useState(immediate ? 3 : 0)
  useEffect(() => {
    if (immediate || !eligible) return
    const timers = [1, 2, 3].map((n) =>
      setTimeout(() => setLayerStep((s) => Math.max(s, n)), CELL_DELAY + (n - 1) * LAYER_STAGGER)
    )
    return () => timers.forEach(clearTimeout)
  }, [eligible, immediate])

  useEffect(() => {
    if (layerStep >= 3) onReveal(i) // uncover the next cell down
  }, [layerStep, i, onReveal])

  return (
    <div ref={ref} onMouseEnter={() => onHover?.(i)} style={{ position: 'relative', ...cellStyle }}>
      {layerStep >= 1 && (
        <Layer src={mediaUrl(folder, 'TEXTURE', `T${i}.png`)} on={layers.texture} z={1} anchorRef={ref} />
      )}
      {layerStep >= 2 && (
        <Layer
          src={mediaUrl(folder, layers.texture ? 'grid_red.svg' : 'grid_black.svg')}
          on={layers.grid}
          z={2}
          anchorRef={ref}
        />
      )}
      {layerStep >= 3 && (
        <MappingLayer src={mediaUrl(folder, 'MAPPING', `M${i}.svg`)} on={layers.mapping} z={3} autoShimmer={shimmer} />
      )}
    </div>
  )
})

/* a full vertical strip for one route. Owns the top-to-bottom reveal order
   (a cell may only reveal once the one above it has). Drop it in wherever a
   route's cells are shown so every page reveals and toggles the same way.  */
export default function StripColumn({ folder, count, layers, onHover, onMouseLeave, cellStyle, wrapperStyle, instant, start = true, auto = false, shimmer = false }) {
  const [revealed, setRevealed] = useState(FORCE_REVEAL || instant ? Infinity : 0)
  const advance = useCallback((idx) => setRevealed((r) => Math.max(r, idx)), [])

  return (
    <div onMouseLeave={onMouseLeave} style={wrapperStyle}>
      {Array.from({ length: count }, (_, k) => k + 1).map((i) => (
        <StripCell
          key={i}
          folder={folder}
          i={i}
          layers={layers}
          onHover={onHover}
          canReveal={revealed >= i - 1}
          onReveal={advance}
          cellStyle={cellStyle}
          instant={instant}
          start={start}
          auto={auto}
          shimmer={shimmer}
        />
      ))}
    </div>
  )
}
