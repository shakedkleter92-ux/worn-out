/* Similarity transform: map a route's own polyline so that one end
   sits exactly on H1 (A) and the other end sits exactly on the route
   square (B), preserving the real jagged shape (rotation + uniform
   scale, no distortion).

   points       : [[x,y], ...] in the route's own coordinate space
   A            : { x, y }  -> where the HOME end should land
   B            : { x, y }  -> where the DESTINATION end should land
   homeIsFirst  : whether points[0] is the home end (else last point)

   returns      : [[x,y], ...] in design space                       */
export function similarityPath(points, A, B, homeIsFirst = true) {
  const last = points.length - 1
  const [sx, sy] = homeIsFirst ? points[0] : points[last]
  const [ex, ey] = homeIsFirst ? points[last] : points[0]

  const vx = ex - sx
  const vy = ey - sy
  const wx = B.x - A.x
  const wy = B.y - A.y
  const d = vx * vx + vy * vy || 1

  // complex division (w / v) -> rotation + scale
  const a = (wx * vx + wy * vy) / d
  const b = (wy * vx - wx * vy) / d

  return points.map(([px, py]) => {
    const dx = px - sx
    const dy = py - sy
    return [A.x + a * dx - b * dy, A.y + b * dx + a * dy]
  })
}

export const toPolyPoints = (pts) => pts.map((p) => p.join(',')).join(' ')
