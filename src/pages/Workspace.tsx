import { useEffect } from 'react'
import Toolbar from '../components/Toolbar'
import Sidebar from '../components/Sidebar'
import Preview from '../components/Preview'
import PropertyPanel from '../components/PropertyPanel'
import CodePanel from '../components/CodePanel'
import { useStore } from '../store/useStore'

export default function Workspace() {
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)

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

  return (
    <div className="flex h-full flex-col bg-bg text-white">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        {/* left: library */}
        <aside className="w-72 shrink-0 border-r border-edge bg-panel">
          <Sidebar />
        </aside>

        {/* center: preview + code */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <Preview />
          </div>
          <div className="h-[38%] min-h-[200px] border-t border-edge bg-panel">
            <CodePanel />
          </div>
        </section>

        {/* right: properties */}
        <aside className="w-80 shrink-0 border-l border-edge bg-panel">
          <PropertyPanel />
        </aside>
      </div>
    </div>
  )
}
