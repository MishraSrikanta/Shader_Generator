import { useNavigate } from 'react-router-dom'
import { useStore, type GeometryKind } from '../store/useStore'

const GEOMETRIES: { id: GeometryKind; label: string; icon: string }[] = [
  { id: 'plane', label: 'Plane', icon: '▭' },
  { id: 'sphere', label: 'Sphere', icon: '●' },
  { id: 'cube', label: 'Cube', icon: '◼' },
  { id: 'torus', label: 'Torus', icon: '◯' },
  { id: 'cylinder', label: 'Cylinder', icon: '⬭' },
]

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        on ? 'bg-accent/20 text-white ring-1 ring-accent' : 'text-muted hover:bg-panel2 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export default function Toolbar() {
  const nav = useNavigate()
  const geometry = useStore((s) => s.geometry)
  const setGeometry = useStore((s) => s.setGeometry)
  const toggle = useStore((s) => s.toggle)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const autoRotate = useStore((s) => s.autoRotate)
  const wireframe = useStore((s) => s.wireframe)
  const showGrid = useStore((s) => s.showGrid)
  const showFps = useStore((s) => s.showFps)
  const paused = useStore((s) => s.paused)

  return (
    <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-edge bg-panel px-3 py-2 sm:px-4">
      <div className="flex shrink-0 items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-sm font-bold"
          onClick={() => nav('/')}
          title="Home"
        >
          <span className="grid h-6 w-6 place-items-center rounded bg-accent text-xs">◈</span>
          Studio
        </button>

        <div className="h-5 w-px bg-edge" />

        <div className="flex gap-0.5 rounded-lg bg-panel2 p-0.5">
          {GEOMETRIES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGeometry(g.id)}
              title={g.label}
              className={`rounded px-2 py-1 text-sm transition-colors ${
                geometry === g.id ? 'bg-accent text-white' : 'text-muted hover:text-white'
              }`}
            >
              {g.icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Toggle on={!paused} onClick={() => toggle('paused')}>
          {paused ? '▶ Play' : '⏸ Pause'}
        </Toggle>
        <Toggle on={autoRotate} onClick={() => toggle('autoRotate')}>
          Rotate
        </Toggle>
        <Toggle on={wireframe} onClick={() => toggle('wireframe')}>
          Wireframe
        </Toggle>
        <Toggle on={showGrid} onClick={() => toggle('showGrid')}>
          Grid
        </Toggle>
        <Toggle on={showFps} onClick={() => toggle('showFps')}>
          FPS
        </Toggle>

        <div className="mx-1 h-5 w-px bg-edge" />

        <button
          className="btn-ghost px-2 py-1 text-xs disabled:opacity-30"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          className="btn-ghost px-2 py-1 text-xs disabled:opacity-30"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>

        <div className="mx-1 h-5 w-px bg-edge" />

        <a
          className="btn-ghost hidden whitespace-nowrap px-2 py-1 text-xs md:inline-flex"
          href="https://srikantalandingpage.vercel.app/"
          target="_blank"
          rel="noreferrer"
          title="Designed by Srikanta Kumar Mishra — visit my landing page"
        >
          Designed by Srikanta Kumar Mishra ↗
        </a>
      </div>
    </div>
  )
}
