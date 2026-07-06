/* One source of truth for the square blink. Randomised so every square
   is out of sync; kept short so the on/off is quick. */
export function randomBlink() {
  const dur = 0.9 + Math.random() * 0.8 // 0.9s – 1.7s (calm, slow)
  const delay = -(Math.random() * dur)
  return `wo-blink ${dur.toFixed(2)}s steps(1) ${delay.toFixed(2)}s infinite`
}

/* every clickable square / label pulses colour red <-> black, out of sync.
   kind = 'wo-redblack' (background) or 'wo-redblack-fg' (text color) */
export function randomPulse(kind = 'wo-redblack') {
  const dur = 1.4 + Math.random() * 1.2 // 1.4s – 2.6s
  const delay = -(Math.random() * dur)
  return `${kind} ${dur.toFixed(2)}s steps(1) ${delay.toFixed(2)}s infinite`
}
