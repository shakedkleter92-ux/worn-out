/* Tiny shared signal: is the all-routes window currently being panned/zoomed?
   While it is, the mapping shimmer stops inlining/tearing down SVGs as cells
   cross the window edge (that churn crashed the tab). When panning settles,
   registered listeners re-evaluate once. */
let panning = false
const listeners = new Set()

export const isPanning = () => panning

export const setPanning = (v) => {
  if (panning === v) return
  panning = v
  // pause every shimmer animation while the canvas is moving — animating
  // content inside a transforming layer forces per-frame re-rasterisation
  // (GPU thrash) and crashes the tab
  if (typeof document !== 'undefined') document.body.classList.toggle('wo-panning', v)
  if (!v) for (const fn of listeners) fn()
}

export const onPanEnd = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
