import { useEffect, useState } from 'react'
import Toolbar from '../components/Toolbar'
import Sidebar from '../components/Sidebar'
import Preview from '../components/Preview'
import PropertyPanel from '../components/PropertyPanel'
import CodePanel from '../components/CodePanel'
import { useStore } from '../store/useStore'

type MobilePanel = 'library' | 'preview' | 'code' | 'properties'

const MOBILE_TABS: { id: MobilePanel; label: string; icon: string }[] = [
  { id: 'library', label: 'Library', icon: '☰' },
  { id: 'preview', label: 'Preview', icon: '◉' },
  { id: 'properties', label: 'Props', icon: '⚙' },
  { id: 'code', label: 'Code', icon: '{ }' },
]

export default function Workspace() {
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const [panel, setPanel] = useState<MobilePanel>('preview')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // On large screens every panel is visible (lg:* classes win). On small screens only the
  // active mobile panel is shown; the bottom tab bar switches between them. Components stay
  // mounted (toggled with display) so the WebGL canvas isn't torn down on each switch.
  const show = (p: MobilePanel) => (panel === p ? 'flex' : 'hidden')

  return (
    <div className="flex h-full flex-col bg-bg text-white">
      <Toolbar />

      <div className="flex min-h-0 flex-1">
        {/* left: library */}
        <aside
          className={`${panel === 'library' ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-r border-edge bg-panel lg:flex lg:w-72`}
        >
          <Sidebar />
        </aside>

        {/* center: preview + code */}
        <section
          className={`${panel === 'preview' || panel === 'code' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col lg:flex`}
        >
          <div className={`${show('preview')} min-h-0 flex-1 lg:flex`}>
            <Preview />
          </div>
          <div
            className={`${show('code')} min-h-[200px] flex-1 border-t border-edge bg-panel lg:flex lg:h-[38%] lg:flex-none`}
          >
            <CodePanel />
          </div>
        </section>

        {/* right: properties */}
        <aside
          className={`${panel === 'properties' ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-l border-edge bg-panel lg:flex lg:w-80`}
        >
          <PropertyPanel />
        </aside>
      </div>

      {/* mobile bottom navigation */}
      <nav className="flex shrink-0 border-t border-edge bg-panel lg:hidden">
        {MOBILE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setPanel(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              panel === t.id ? 'text-accent' : 'text-muted'
            }`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
