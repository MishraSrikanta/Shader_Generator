import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Landing from './pages/Landing'

const Workspace = lazy(() => import('./pages/Workspace'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/studio"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <Workspace />
          </Suspense>
        }
      />
    </Routes>
  )
}

function LoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg text-muted">
      <div className="animate-pulse text-sm tracking-widest">LOADING STUDIO…</div>
    </div>
  )
}
