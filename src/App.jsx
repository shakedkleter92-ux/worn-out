import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Experience from './components/Experience.jsx'
import RoutePage from './components/RoutePage.jsx'
import GlobalRoutes from './components/GlobalRoutes.jsx'
import ScrollHint from './components/ScrollHint.jsx'
import CursorSquare from './components/CursorSquare.jsx'
import { HintProvider } from './components/HintContext.jsx'

const params = new URLSearchParams(window.location.search)
const devRoute = params.get('route')
const devGlobal = params.get('global') === '1'

export default function App() {
  const [route, setRoute] = useState(devRoute || null)
  const [showAll, setShowAll] = useState(devGlobal)
  const [view, setView] = useState('home')
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

  // the scroll cue shows wherever scrolling actually does something: the
  // home section and the (scrollable) route page — but NOT the map, nor the
  // all-routes window (that one pans/zooms, it doesn't scroll).
  const hintActive = !!route || view === 'home'

  return (
    <HintProvider>
      {/* the map stays mounted underneath so its state is preserved */}
      <Experience
        onSelectRoute={setRoute}
        onOpenAll={() => setShowAll(true)}
        onViewChange={setView}
        resumeMap={mapResume}
        paused={!!route || showAll}
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
    </HintProvider>
  )
}
