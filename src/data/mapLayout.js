/* ============================================================
   SCREEN 2 — map layout (design space: 2000 x 1125)
   Positions measured from the Illustrator reference. Tweak freely;
   nothing else needs to change.
   - x, y       : centre of each square
   - side       : which way the label/coords expand
   - homeIsFirst: which end of the route polyline anchors at H1
   ============================================================ */

export const SQUARE_SIZE = 22

export const H1_POS = { x: 1000, y: 672 }

// vertical line arrives from the top of the frame into H1
export const MAP_VLINE = { x: 1000, yFrom: 0, yTo: H1_POS.y }

export const MAP_NODES = [
  { id: 'R3HTP', x: 390, y: 152, side: 'left', homeIsFirst: true },
  { id: 'R6HTS', x: 1185, y: 175, side: 'right', homeIsFirst: true },
  { id: 'R8HTB', x: 1265, y: 397, side: 'right', homeIsFirst: true },
  { id: 'R7HTE', x: 430, y: 628, side: 'left', homeIsFirst: true },
  { id: 'R4HTS', x: 1460, y: 660, side: 'right', homeIsFirst: true },
  { id: 'R1HTS', x: 1285, y: 775, side: 'right', homeIsFirst: true },
  { id: 'R2HTG', x: 475, y: 985, side: 'left', homeIsFirst: true },
  { id: 'R5HTF', x: 720, y: 1058, side: 'left', homeIsFirst: true }
]
