# Shader Studio

A browser-based **visual GLSL shader creator** — build, preview and export shaders
in real time without writing GLSL by hand.

> This is a focused, working **foundation** of the full vision. The core creation loop
> (library → live 3D preview → live parameter editing → code export) is fully functional.
> Heavier features (node graph, timeline, particle sim, lighting editor, WGSL transpiler)
> are on the roadmap below.

## Features (implemented)

- **Animated landing page** — the hero background is rendered live by the shader engine
  (raw WebGL), with a switcher between several built-in shaders and mouse interaction.
- **Workspace** — four-panel layout:
  - **Library** (left): searchable, category-filtered shader browser with performance ratings.
  - **Live preview** (center, top): real-time GPU rendering via React Three Fiber, with
    geometry switcher (plane / sphere / cube / torus / cylinder), orbit / zoom / pan,
    auto-rotate, wireframe, grid and FPS counter.
  - **Code / export** (center, bottom): Monaco editor showing generated source.
  - **Properties** (right): live-editable uniforms (sliders, color pickers) — every change
    updates the preview instantly.
- **12 effect (fragment) shaders** across Gradient, Background, Water, Fire, Voronoi, Aurora,
  Galaxy, Clouds, Wireframe, Glitch, Hologram — each with editable parameters.
- **20 premium showcase shaders** (category Premium) — Liquid Metal, Mercury Flow, Hologram,
  Digital Rain, Cyber Grid, Quantum Warp, Aurora, Galaxy, Black Hole, Energy Crystal,
  Infinity Mirror, Portal Opening, Glass Shatter, Ice Crack, Electric Surge, Magic Rune,
  Time Warp, Dimensional Tear, Fractal Bloom, Particle Explosion.
- **143 image / post-processing effects** applied to a procedural test image — Distortion,
  Dissolve & Burn, Reveal, Color FX, Digital, Glass FX, Glow, Blur, Morph, Energy and
  Interactive (Ripple, Pixelate, RGB Split, CRT, VHS, Bloom, Burn, Circular Reveal,
  Hue Rotation, Lens/Barrel, Mouse Magnet…). Move the mouse for interactive ones.
- **41 vertex (deform) shaders** — real mesh-displacement shaders with analytic normals,
  across Wave & Flow, Organic Motion, Energy, Noise, Twisting, Geometric, Sci-Fi, Cosmic,
  Reactive and Mathematical categories (Twist, Helix, DNA, Explosion, Black Hole, Force Field,
  Mouse Attraction, Audio Reactive, …). Filter via the **Deform** tab.
- **140 procedural PBR materials** — albedo/roughness/metalness generated procedurally and lit
  with GGX shading, across Metal, Wood, Stone, Glass, Fabric, Liquid, Ice & Snow, Brick & Wall
  and Ground (Gold, Brushed Steel, Marble, Oak, Frosted Glass, Velvet, Lava, Blue Ice, …).
  Editable colour, scale, roughness and metalness. Filter via the **Materials** tab.
- **Export** to: Fragment GLSL, Vertex GLSL, Three.js `ShaderMaterial`, React Three Fiber
  component, and Uniforms JSON. Copy or download.
- **Undo / redo** of parameter edits (Ctrl+Z / Ctrl+Y), reset to defaults.

## Tech stack

React · TypeScript · Vite · Tailwind CSS · Three.js · React Three Fiber · drei ·
Zustand · Monaco Editor · Framer Motion. Three.js and Monaco are code-split and lazy-loaded.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Architecture

| Path | Role |
| --- | --- |
| `src/types.ts` | Shader & uniform type model |
| `src/shaders/library.ts` | Effect (fragment) shader definitions + merges all libraries |
| `src/shaders/premiumLibrary.ts` | 20 polished full-screen showcase shaders |
| `src/shaders/imageLibrary.ts` | Image/post FX — effect kernels + preset table over a procedural source image |
| `src/shaders/vertexLibrary.ts` | Vertex (deform) shaders — `vec3 displace(p, n)` bodies |
| `src/shaders/materialLibrary.ts` | Procedural PBR materials — preset table over shared generators |
| `src/shaders/build.ts` | Assembles vertex/fragment source per kind + Three uniform objects |
| `src/lib/export.ts` | Code generators for each export target |
| `src/store/useStore.ts` | Zustand store (active shader, live uniforms, view, history) |
| `src/components/ShaderBackground.tsx` | Raw-WebGL fullscreen renderer (landing) |
| `src/components/ShaderMesh.tsx` | R3F mesh + ShaderMaterial (workspace preview) |

Adding a shader = appending one object to `SHADERS` in `library.ts`. The body references
`uTime`, `uResolution`, `uMouse`, `vUv` and any custom uniforms (auto-declared from the
`uniforms` map), so it works in the preview, the landing hero and every export target
with no extra wiring.

## Roadmap (from the full spec, not yet built)

Node-based editor · layer/blend mixer · timeline & keyframes · particle shader builder ·
dedicated glitch/wireframe/lighting editors · image-effect pipeline · GLSL/ShaderToy import ·
WGSL & Babylon.js/PixiJS export · in-editor compile-error inspector · command palette · autosave.
