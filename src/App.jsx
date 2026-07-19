import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Experience from './components/Experience.jsx'
import RoutePage from './components/RoutePage.jsx'
import GlobalRoutes from './components/GlobalRoutes.jsx'
import ScrollHint from './components/ScrollHint.jsx'
import CursorSquare from './components/CursorSquare.jsx'
import Screensaver from './components/Screensaver.jsx'
import { HintProvider } from './components/HintContext.jsx'

const params = new URLSearchParams(window.location.search)
const devRoute = params.get('route')
const devGlobal = params.get('global') === '1'
const devSaver = params.get('saver') === '1' // ?saver=1 opens the screensaver right away (testing)
const IDLE_MS = 60000 // a minute of no interaction → screensaver

export default function App() {
  const [route, setRoute] = useState(devRoute || null)
  const [showAll, setShowAll] = useState(devGlobal)
  const [view, setView] = useState('home')
  const [expKey, setExpKey] = useState(0) // bump to remount the map back to the opening screen
  // bumped whenever a route / all-routes overlay closes, so the map returns
  // to section 2 with the roads already open (not back to the home screen)
  const [mapResume, setMapResume] = useState(0)
  const closeRoute = () => {
    setRoute(null)
    setMapResume((n) => n + 1)
  }
  const closeAll = () => {
    setShowAll(false)
    setMapResume((n) => n + 1)
  }

  // ---- opening / idle screensaver ----
  // the pattern screen IS the opening screen: it shows on first load, and the
  // interface returns to it after a minute of no interaction. (Dev shortcuts
  // that jump straight into a route / the map skip it.)
  const [idle, setIdle] = useState(devSaver || (!devRoute && !devGlobal))
  const [autoIntro, setAutoIntro] = useState(false) // build the intro after the pattern dissolves
  const idleTimer = useRef(null)
  useEffect(() => {
    const arm = () => {
      if (idle) return // while the saver is up, only its button dismisses it
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart']
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    arm()
    return () => {
      events.forEach((e) => window.removeEventListener(e, arm))
      clearTimeout(idleTimer.current)
    }
  }, [idle])

  // the pattern's centre button (after its squares dissolve): the line + text
  // open on their own, then the user scrolls down to the routes.
  const exitScreensaver = () => {
    setRoute(null)
    setShowAll(false)
    setAutoIntro(true)
    setExpKey((k) => k + 1) // remount fresh so the intro rebuilds from the square
    setIdle(false)
  }

  // the scroll cue shows wherever scrolling actually does something: the
  // home section and the (scrollable) route page — but NOT the map, nor the
  // all-routes window (that one pans/zooms, it doesn't scroll).
  const hintActive = !!route || view === 'home'

  return (
    <HintProvider>
      {/* the map stays mounted underneath so its state is preserved */}
      <Experience
        key={expKey}
        onSelectRoute={setRoute}
        onOpenAll={() => setShowAll(true)}
        onViewChange={setView}
        resumeMap={mapResume}
        paused={!!route || showAll || idle}
        autoIntro={autoIntro}
        onReturnToOpening={() => setIdle(true)}
      />
      <AnimatePresence>
        {route && (
          <RoutePage
            key={route}
            id={route}
            onBack={closeRoute}
            onNavigate={setRoute}
          />
        )}
        {showAll && (
          <GlobalRoutes key="all" onBack={closeAll} />
        )}
      </AnimatePresence>
      <ScrollHint active={hintActive} />
      <CursorSquare />
      {idle && <Screensaver onExit={exitScreensaver} />}
    </HintProvider>
  )
}
