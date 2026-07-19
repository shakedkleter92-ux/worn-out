import { useEffect, useRef } from 'react'
import { randomPulse } from '../lib/blink.js'
import { ROUTES, mediaUrl } from '../data/routes.js'

/* ==================================================================
   SCREENSAVER / OPENING PATTERN
   A full-screen field built from the ACTUAL route mapping SVGs — the same
   little square modules as the all-routes window, at the same size — laid
   out in per-route columns. Everything is drawn on ONE <canvas>, so even
   thousands of squares cost almost nothing (no animated DOM/SVG nodes).

   The squares twinkle continuously; the cursor clears the ones under it,
   which recover behind it in a trail. A centre square button, blinking
   orange in a white passe-partout, takes you back to the opening screen —
   clicking it first dissolves the whole pattern away, square by square.
================================================================== */

const VIEWBOX = 1080
const RECT = 40.81 // the mapping's square size in the 1080 viewBox
const SQUARE_PX = 5 // desired on-screen square size — small + fine
const CELL_PX = Math.round((SQUARE_PX * VIEWBOX) / RECT) // one mapping cell on screen
const CELLS_PER_ROUTE = 4 // how many of each route's mappings to sample
const MATTE = 150 // white square around the centre button
// where Experience's home square rests, as a fraction of the viewport WIDTH
// (design stage is 2000 wide; the square sits at 1000,562). Pinning the
// button here means it doesn't jump when the pattern hands off to the intro.
const BTN = { xF: 1000 / 2000, yF: 562 / 2000 }
const HIDE_MIN = 6
const HIDE_MAX = 24
const TRAIL_FRAMES = 46 // how long a cursor-brushed square stays gone (gentle wake)
const CURSOR_R = 50 // brush reach — small
const DISSOLVE_MS = 1000 // click → squares vanish over this long, then exit
const APPEAR_MS = 1100 // on arrival → squares materialise in (reverse of dissolve)

const tileCache = new Map()
function loadTile(url) {
  if (!tileCache.has(url)) {
    tileCache.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.text() : ''))
        .then((t) => {
          const doc = new DOMParser().parseFromString(t || '<svg></svg>', 'image/svg+xml')
          return Array.from(doc.querySelectorAll('rect')).map((el) => ({
            x: (parseFloat(el.getAttribute('x')) || 0) / VIEWBOX,
            y: (parseFloat(el.getAttribute('y')) || 0) / VIEWBOX,
            s: (parseFloat(el.getAttribute('width')) || 0) / VIEWBOX
          }))
        })
        .catch(() => [])
    )
  }
  return tileCache.get(url)
}

export default function Screensaver({ onExit }) {
  const canvasRef = useRef(null)
  const btnPulse = useRef(randomPulse())
  const dissolve = useRef(null) // { start } once the exit is triggered

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let alive = true
    let W = 0
    let H = 0
    let squares = [] // { x, y, s } in screen px
    let hide = new Int16Array(0) // frames a square stays cleared
    let gone = new Uint8Array(0) // 1 = not drawn (dissolving out / not yet materialised)
    let matte = { x0: 0, y0: 0, x1: 0, y1: 0 }
    let routeTiles = [] // routeTiles[ri] = [ [rects], ... ]
    const cursor = { x: -9999, y: -9999 }
    // materialise-in state (reverse of the dissolve), plays on every arrival
    let appearing = true
    let appearStart = null
    let visibleCount = 0

    const build = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cols = Math.ceil(W / CELL_PX)
      const rows = Math.ceil(H / CELL_PX)
      const cx = W * BTN.xF
      const cy = W * BTN.yF
      matte = { x0: cx - MATTE / 2, y0: cy - MATTE / 2, x1: cx + MATTE / 2, y1: cy + MATTE / 2 }
      squares = []
      for (let col = 0; col < cols; col++) {
        const tiles = routeTiles[col % ROUTES.length] || []
        if (!tiles.length) continue
        for (let row = 0; row < rows; row++) {
          const tile = tiles[row % tiles.length]
          const ox = col * CELL_PX
          const oy = row * CELL_PX
          for (const r of tile) {
            const x = ox + r.x * CELL_PX
            const y = oy + r.y * CELL_PX
            const s = r.s * CELL_PX
            if (x + s > matte.x0 && x < matte.x1 && y + s > matte.y0 && y < matte.y1) continue
            squares.push({ x, y, s })
          }
        }
      }
      hide = new Int16Array(squares.length)
      gone = new Uint8Array(squares.length)
      if (appearing) {
        gone.fill(1) // start empty, then materialise in
        visibleCount = 0
        appearStart = null
      }
    }

    Promise.all(
      ROUTES.map((r) => {
        // sample cells from the MIDDLE of the route (between its start and
        // end), where the worn textures are, rather than the first cells.
        const count = Math.min(r.cells, CELLS_PER_ROUTE)
        const start = Math.max(1, Math.floor(r.cells / 2) - Math.floor(count / 2))
        return Promise.all(
          Array.from({ length: count }, (_, i) =>
            loadTile(mediaUrl(r.folder, 'MAPPING', `M${Math.min(r.cells, start + i)}.svg`))
          )
        )
      })
    ).then((res) => {
      if (!alive) return
      routeTiles = res
      build()
    })

    window.addEventListener('resize', build)
    const onMove = (e) => {
      cursor.x = e.clientX
      cursor.y = e.clientY
    }
    window.addEventListener('mousemove', onMove)

    let raf
    let dissolvedCount = 0
    const draw = (now) => {
      const n = squares.length

      // materialise in: squares reappear at random — the exact reverse of the
      // click dissolve. Plays on first load and on every return here (scroll
      // up past the intro, or after a minute of no interaction).
      if (appearing && !dissolve.current && n) {
        if (appearStart == null) appearStart = now
        const t = Math.min(1, (now - appearStart) / APPEAR_MS)
        const want = Math.floor(t * n)
        while (visibleCount < want) {
          let i = (Math.random() * n) | 0
          for (let k = 0; k < n && !gone[i]; k++) i = (i + 1) % n
          gone[i] = 0
          visibleCount++
        }
        if (t >= 1) {
          appearing = false
          gone.fill(0)
        }
      }

      // dissolve on exit: remove a growing share of squares each frame
      if (dissolve.current && n) {
        const t = Math.min(1, (now - dissolve.current.start) / DISSOLVE_MS)
        const wantGone = Math.floor(t * n)
        while (dissolvedCount < wantGone) {
          let i = (Math.random() * n) | 0
          for (let k = 0; k < n && gone[i]; k++) i = (i + 1) % n
          gone[i] = 1
          dissolvedCount++
        }
        if (t >= 1) {
          onExit()
          return
        }
      }

      // recover cleared squares, then re-twinkle a few
      for (let i = 0; i < hide.length; i++) if (hide[i] > 0) hide[i]--
      if (!dissolve.current && !appearing) {
        const twinkle = Math.max(6, (n / 900) | 0)
        for (let k = 0; k < twinkle && n; k++) {
          hide[(Math.random() * n) | 0] = (HIDE_MIN + Math.random() * (HIDE_MAX - HIDE_MIN)) | 0
        }
        // cursor = a gentle organic wake, not a hard round brush: squares
        // clear with a probability that fades from the centre out and gets
        // ragged at the edge, so the boundary is soft and irregular. As the
        // cursor moves on, brushed squares recover, leaving a trail.
        const R = CURSOR_R
        for (let i = 0; i < n; i++) {
          const q = squares[i]
          const dx = q.x + q.s / 2 - cursor.x
          const dy = q.y + q.s / 2 - cursor.y
          if (dx < -R || dx > R || dy < -R || dy > R) continue // cheap box reject
          const d2 = dx * dx + dy * dy
          if (d2 > R * R) continue
          const t = 1 - Math.sqrt(d2) / R // 1 at centre → 0 at edge
          if (Math.random() < t * t * 1.15) hide[i] = TRAIL_FRAMES
        }
      }

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#000'
      for (let i = 0; i < n; i++) {
        if (hide[i] || gone[i]) continue
        const q = squares[i]
        ctx.fillRect(q.x, q.y, q.s, q.s)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    document.body.classList.add('wo-panning') // pause any hidden shimmer underneath
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', build)
      window.removeEventListener('mousemove', onMove)
      document.body.classList.remove('wo-panning')
    }
  }, [onExit])

  const startExit = () => {
    if (!dissolve.current) dissolve.current = { start: performance.now() }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg)', cursor: 'default' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {/* white square matte with the blinking button in its centre */}
      <div
        style={{
          position: 'fixed',
          top: `${BTN.yF * 100}vw`,
          left: `${BTN.xF * 100}vw`,
          transform: 'translate(-50%, -50%)',
          width: MATTE,
          height: MATTE,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          onClick={startExit}
          title="enter"
          style={{ width: 16, height: 16, cursor: 'pointer', animation: btnPulse.current }}
        />
      </div>
    </div>
  )
}
