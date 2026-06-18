import { useStore } from '../store/useStore'
import Slider from './controls/Slider'
import ColorInput from './controls/ColorInput'

const PERF_LABEL: Record<number, string> = {
  5: 'Very Light',
  4: 'Light',
  3: 'Moderate',
  2: 'Heavy',
  1: 'Very Heavy',
}

export default function PropertyPanel() {
  const def = useStore((s) => s.active())
  const uniforms = useStore((s) => s.uniforms)
  const setUniform = useStore((s) => s.setUniform)
  const commit = useStore((s) => s.commit)
  const reset = useStore((s) => s.resetUniforms)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <h2 className="text-sm font-semibold">Properties</h2>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={reset} title="Reset to defaults">
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4">
          <div className="text-base font-semibold text-white">{def.name}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted">{def.description}</div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded bg-panel2 px-2 py-0.5 text-muted">{def.category}</span>
            <span className="rounded bg-panel2 px-2 py-0.5 text-muted">
              Complexity: {def.complexity}
            </span>
            <span className="rounded bg-panel2 px-2 py-0.5 text-accent2">
              {PERF_LABEL[def.performance]}
            </span>
          </div>
        </div>

        <div className="my-4 h-px bg-edge" />

        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Parameters
        </div>

        {Object.entries(uniforms).map(([key, u]) => {
          if (u.type === 'float') {
            return (
              <Slider
                key={key}
                label={u.label}
                value={u.value}
                min={u.min}
                max={u.max}
                step={u.step}
                onChange={(v) => setUniform(key, v)}
                onCommit={commit}
              />
            )
          }
          if (u.type === 'color') {
            return (
              <ColorInput
                key={key}
                label={u.label}
                value={u.value}
                onChange={(v) => setUniform(key, v)}
                onCommit={commit}
              />
            )
          }
          if (u.type === 'vec2') {
            return (
              <div key={key} className="mb-3">
                <div className="mb-1 text-xs text-muted">{u.label}</div>
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1].map((i) => (
                    <Slider
                      key={i}
                      label={i === 0 ? 'X' : 'Y'}
                      value={u.value[i]}
                      min={u.min}
                      max={u.max}
                      step={u.step}
                      onChange={(v) => {
                        const nv: [number, number] = [...u.value] as [number, number]
                        nv[i] = v
                        setUniform(key, nv)
                      }}
                      onCommit={commit}
                    />
                  ))}
                </div>
              </div>
            )
          }
          if (u.type === 'bool') {
            return (
              <label key={key} className="mb-3 flex items-center justify-between text-xs">
                <span className="text-muted">{u.label}</span>
                <input
                  type="checkbox"
                  checked={u.value}
                  onChange={(e) => {
                    setUniform(key, e.target.checked)
                    commit()
                  }}
                />
              </label>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
