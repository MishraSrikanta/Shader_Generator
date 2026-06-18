import { useMemo, useState } from 'react'
import { SHADERS } from '../shaders/library'
import { useStore } from '../store/useStore'

type KindFilter = 'all' | 'fragment' | 'vertex' | 'material'

const KIND_LABELS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'fragment', label: 'Effects' },
  { id: 'material', label: 'Materials' },
  { id: 'vertex', label: 'Deform' },
]

export default function Sidebar() {
  const activeId = useStore((s) => s.activeId)
  const select = useStore((s) => s.selectShader)
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const category = useStore((s) => s.category)
  const setCategory = useStore((s) => s.setCategory)
  const [kind, setKind] = useState<KindFilter>('all')

  // categories available for the current kind filter
  const categories = useMemo(() => {
    const set = new Set(
      SHADERS.filter((s) => kind === 'all' || (s.kind ?? 'fragment') === kind).map((s) => s.category),
    )
    return Array.from(set).sort()
  }, [kind])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SHADERS.filter((s) => {
      if (kind !== 'all' && (s.kind ?? 'fragment') !== kind) return false
      if (category && s.category !== category) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      )
    })
  }, [search, category, kind])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-edge px-4 py-3">
        <h2 className="mb-2 text-sm font-semibold">Shader Library</h2>
        <input
          className="w-full rounded-lg bg-panel2 px-3 py-2 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
          placeholder="Search shaders…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* shader type: surface (fragment) vs deform (vertex) */}
      <div className="flex gap-0.5 border-b border-edge px-3 py-2">
        <div className="flex w-full gap-0.5 rounded-lg bg-panel2 p-0.5">
          {KIND_LABELS.map((k) => (
            <button
              key={k.id}
              onClick={() => {
                setKind(k.id)
                setCategory(null)
              }}
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                kind === k.id ? 'bg-accent text-white' : 'text-muted hover:text-white'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-edge px-3 py-2">
        <button
          className={`chip ${category === null ? 'chip-active' : ''}`}
          onClick={() => setCategory(null)}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'chip-active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <div className="px-2 py-8 text-center text-sm text-muted">No shaders found.</div>
        )}
        <div className="grid grid-cols-1 gap-2">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => select(s.id)}
              className={`group flex items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                activeId === s.id
                  ? 'border-accent bg-accent/10'
                  : 'border-edge bg-panel2 hover:border-accent/50'
              }`}
            >
              <ShaderThumb id={s.id} kind={s.kind} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  {s.kind === 'vertex' && (
                    <span className="shrink-0 rounded bg-accent2/20 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent2">
                      Deform
                    </span>
                  )}
                  {s.kind === 'material' && (
                    <span className="shrink-0 rounded bg-accent/20 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
                      PBR
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span>{s.category}</span>
                  <span>·</span>
                  <PerfDots perf={s.performance} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// tiny CSS-gradient thumbnail keyed off the shader id (cheap, no extra GL contexts)
function ShaderThumb({ id, kind }: { id: string; kind?: string }) {
  const hue = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  const icon = kind === 'vertex' ? '◢' : kind === 'material' ? '◉' : ''
  return (
    <div
      className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-edge text-xs text-white/80"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 80% 55%), hsl(${(hue + 70) % 360} 80% 45%))`,
      }}
    >
      {icon}
    </div>
  )
}

function PerfDots({ perf }: { perf: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1 w-1 rounded-full ${i <= perf ? 'bg-accent2' : 'bg-edge'}`}
        />
      ))}
    </span>
  )
}
