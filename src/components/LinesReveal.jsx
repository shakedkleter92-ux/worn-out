import { useMemo } from 'react'
import Typewriter from './Typewriter.jsx'

/* Reveals a paragraph with ALL lines typing at the same time (in
   parallel), at the normal slow speed. Closing is the exact mirror:
   every line erases at the same time, at the same speed. */
export function wrapLines(text, maxChars) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    if (!cur) cur = w
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

/* total ms the reveal (and mirrored close) takes — the longest line */
export function linesRevealMs(text, { speed = 70, maxChars = 40 } = {}) {
  const lines = wrapLines(text, maxChars)
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0)
  return longest * speed + 150
}

export default function LinesReveal({
  text,
  leaving = false,
  speed = 70, // ms per character (slow, matches the interface)
  maxChars = 40, // characters per line (kept within the column width)
  fontSize = 14,
  lineHeight = 1.8
}) {
  const lines = useMemo(() => wrapLines(text, maxChars), [text, maxChars])
  return (
    <div style={{ fontSize, lineHeight }}>
      {lines.map((line, i) => (
        <div key={i} style={{ whiteSpace: 'nowrap', height: `${lineHeight}em` }}>
          {/* every line starts together (no delay) and erases together */}
          <Typewriter text={line} speed={speed} eraseSpeed={speed} leaving={leaving} />
        </div>
      ))}
    </div>
  )
}
