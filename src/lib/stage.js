import { useLayoutEffect, useState } from 'react'

/* Shared design-stage constants. Every screen is authored inside this
   2000 x 1125 coordinate space (the Illustrator artboard) and uniformly
   scaled to fit the viewport, so positions stay exact everywhere. */
export const DESIGN_W = 2000
export const DESIGN_H = 1125

export function useStageScale() {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () =>
      setScale(
        Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
      )
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

export const stageStyle = (scale) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: DESIGN_W,
  height: DESIGN_H,
  transform: `translate(-50%, -50%) scale(${scale})`,
  transformOrigin: 'center center'
})
