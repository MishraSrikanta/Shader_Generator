import { lazy, Suspense, useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { EXPORT_TARGETS, generateExport, type ExportTarget } from '../lib/export'

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

export default function CodePanel() {
  const def = useStore((s) => s.active())
  const uniforms = useStore((s) => s.uniforms)
  const [target, setTarget] = useState<ExportTarget>('glsl-frag')
  const [copied, setCopied] = useState(false)

  // merge live uniform values into the def for accurate export
  const liveDef = useMemo(() => ({ ...def, uniforms }), [def, uniforms])
  const meta = EXPORT_TARGETS.find((t) => t.id === target)!
  const code = useMemo(() => generateExport(liveDef, target), [liveDef, target])

  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const download = () => {
    const ext =
      target === 'uniforms-json'
        ? 'json'
        : target.startsWith('glsl')
          ? target === 'glsl-vert'
            ? 'vert'
            : 'frag'
          : target === 'threejs'
            ? 'js'
            : 'jsx'
    const blob = new Blob([code], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${def.id}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {EXPORT_TARGETS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTarget(t.id)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                target === t.id ? 'bg-accent text-white' : 'text-muted hover:bg-panel2 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button className="btn-ghost px-2 py-1 text-xs" onClick={copy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button className="btn-ghost px-2 py-1 text-xs" onClick={download}>
            Download
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense
          fallback={<div className="p-4 text-xs text-muted">Loading editor…</div>}
        >
          <MonacoEditor
            height="100%"
            theme="vs-dark"
            language={meta.lang}
            value={code}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              lineNumbers: 'on',
              renderLineHighlight: 'none',
            }}
          />
        </Suspense>
      </div>
    </div>
  )
}
