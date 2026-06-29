import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Experience from './components/Experience.jsx'
import RoutePage from './components/RoutePage.jsx'
import GlobalRoutes from './components/GlobalRoutes.jsx'

const params = new URLSearchParams(window.location.search)
const devRoute = params.get('route')
const devGlobal = params.get('global') === '1'

export default function App() {
  const [route, setRoute] = useState(devRoute || null)
  const [showAll, setShowAll] = useState(devGlobal)

  return (
    <>
      {/* the map stays mounted underneath so its state is preserved */}
      <Experience
        onSelectRoute={setRoute}
        onOpenAll={() => setShowAll(true)}
        paused={!!route || showAll}
      />
      <AnimatePresence>
        {route && (
          <RoutePage key="route" id={route} onBack={() => setRoute(null)} />
        )}
        {showAll && (
          <GlobalRoutes key="all" onBack={() => setShowAll(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
