import { useEffect, useRef, useState } from 'react'

/* Shows `text`; whenever `text` changes it scrambles/decodes to the new
   value (left-to-right resolve). Characters still in flux are RED, and
   settle to black once resolved. Works for digits and letters; spacing
   and punctuation stay fixed. */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const isDigit = (c) => c >= '0' && c <= '9'
const isAlpha = (c) => (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')
const randLike = (c) => {
  if (isDigit(c)) return String((Math.random() * 10) | 0)
  if (c >= 'a' && c <= 'z') return LETTERS[(Math.random() * 26) | 0].toLowerCase()
  if (c >= 'A' && c <= 'Z') return LETTERS[(Math.random() * 26) | 0]
  return c
}

export default function ScrambleTo({ text }) {
  const [display, setDisplay] = useState(text)
  const [locked, setLocked] = useState(text.length)
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
        if (!isDigit(ch) && !isAlpha(ch)) out += ch
        else if (k < step) out += ch
        else out += randLike(ch)
      }
      setDisplay(out)
      setLocked(Math.min(step, text.length))
      if (step >= steps) {
        clearInterval(iv)
        setDisplay(text)
        setLocked(text.length)
      }
    }, 55)
    return () => clearInterval(iv)
  }, [text])

  return (
    <span>
      {Array.from(display).map((ch, k) => {
        const changing = k >= locked && (isDigit(ch) || isAlpha(ch))
        return (
          <span key={k} style={{ color: changing ? 'var(--accent)' : 'var(--ink)' }}>
            {ch}
          </span>
        )
      })}
    </span>
  )
}
