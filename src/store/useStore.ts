import { create } from 'zustand'
import type { ShaderDef, Uniform, UniformMap, GeometryKind } from '../types'
import { SHADERS, getShader } from '../shaders/library'

export type { GeometryKind }

interface HistoryEntry {
  uniforms: UniformMap
}

interface State {
  activeId: string
  // live, editable copy of the active shader's uniforms
  uniforms: UniformMap
  geometry: GeometryKind
  autoRotate: boolean
  wireframe: boolean
  showGrid: boolean
  showFps: boolean
  paused: boolean
  search: string
  category: string | null
  // history
  past: HistoryEntry[]
  future: HistoryEntry[]

  active: () => ShaderDef
  selectShader: (id: string) => void
  setUniform: (key: string, value: Uniform['value']) => void
  commit: () => void
  undo: () => void
  redo: () => void
  resetUniforms: () => void
  setGeometry: (g: GeometryKind) => void
  toggle: (k: 'autoRotate' | 'wireframe' | 'showGrid' | 'showFps' | 'paused') => void
  setSearch: (s: string) => void
  setCategory: (c: string | null) => void
}

function clone(u: UniformMap): UniformMap {
  return JSON.parse(JSON.stringify(u))
}

const first = SHADERS[0]

export const useStore = create<State>((set, get) => ({
  activeId: first.id,
  uniforms: clone(first.uniforms),
  geometry: 'plane',
  autoRotate: true,
  wireframe: false,
  showGrid: false,
  showFps: true,
  paused: false,
  search: '',
  category: null,
  past: [],
  future: [],

  active: () => getShader(get().activeId),

  selectShader: (id) => {
    const def = getShader(id)
    set((s) => ({
      activeId: id,
      uniforms: clone(def.uniforms),
      past: [],
      future: [],
      // vertex shaders look best on a specific surface — switch automatically
      geometry: def.preferredGeometry ?? s.geometry,
    }))
  },

  setUniform: (key, value) =>
    set((s) => {
      const u = s.uniforms[key]
      if (!u) return s
      return { uniforms: { ...s.uniforms, [key]: { ...u, value } as Uniform } }
    }),

  // push a snapshot onto the undo stack (call before/after a discrete edit)
  commit: () =>
    set((s) => ({
      past: [...s.past.slice(-49), { uniforms: clone(s.uniforms) }],
      future: [],
    })),

  undo: () =>
    set((s) => {
      if (!s.past.length) return s
      const prev = s.past[s.past.length - 1]
      return {
        past: s.past.slice(0, -1),
        future: [{ uniforms: clone(s.uniforms) }, ...s.future],
        uniforms: clone(prev.uniforms),
      }
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return s
      const next = s.future[0]
      return {
        future: s.future.slice(1),
        past: [...s.past, { uniforms: clone(s.uniforms) }],
        uniforms: clone(next.uniforms),
      }
    }),

  resetUniforms: () =>
    set((s) => ({ uniforms: clone(getShader(s.activeId).uniforms), past: [], future: [] })),

  setGeometry: (geometry) => set({ geometry }),
  toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<State>),
  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category }),
}))
