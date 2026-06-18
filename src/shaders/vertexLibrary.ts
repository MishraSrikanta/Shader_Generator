import type { ShaderDef, UniformMap, FloatUniform, Complexity, Performance, GeometryKind } from '../types'

// ---- small authoring helpers -------------------------------------------------
const f = (label: string, value: number, min: number, max: number, step = 0.01): FloatUniform => ({
  type: 'float',
  label,
  value,
  min,
  max,
  step,
})

interface VtxOpts {
  id: string
  name: string
  category: string
  description: string
  complexity?: Complexity
  performance?: Performance
  geom?: GeometryKind
  colorA?: [number, number, number]
  colorB?: [number, number, number]
  uniforms?: UniformMap
  /** Full GLSL function: `vec3 displace(vec3 p, vec3 n){ ... }` (plus any helpers above it). */
  displace: string
}

/** Build a vertex-kind ShaderDef, auto-injecting the two color uniforms the shared
 *  lit fragment needs. Authors only write the displacement maths. */
function vtx(o: VtxOpts): ShaderDef {
  return {
    id: o.id,
    name: o.name,
    category: o.category,
    description: o.description,
    complexity: o.complexity ?? 'Medium',
    performance: o.performance ?? 3,
    kind: 'vertex',
    preferredGeometry: o.geom ?? 'sphere',
    displace: o.displace,
    uniforms: {
      uColorA: { type: 'color', label: 'Color A', value: o.colorA ?? [0.49, 0.36, 1.0] },
      uColorB: { type: 'color', label: 'Color B', value: o.colorB ?? [0.13, 0.83, 0.93] },
      ...(o.uniforms ?? {}),
    },
  }
}

// mouse projected onto a plane near the surface (object space approximation)
const MOUSE_TARGET = `vec3 mouseTarget(){ return vec3((uMouse - 0.5) * 3.0, 0.0); }`

export const VERTEX_SHADERS: ShaderDef[] = [
  // ───────────────────────── Wave & Flow ─────────────────────────
  vtx({
    id: 'smooth-wave',
    name: 'Smooth Wave',
    category: 'Wave & Flow',
    description: 'Travelling sine wave displacing the surface along its normal.',
    complexity: 'Low',
    performance: 5,
    geom: 'plane',
    uniforms: { uFreq: f('Frequency', 3.0, 0.5, 12, 0.1), uAmp: f('Amplitude', 0.25, 0, 1), uSpeed: f('Speed', 1.5, 0, 6) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float h = sin(p.x * uFreq + uTime * uSpeed) * uAmp;
      h += cos(p.y * uFreq * 0.7 - uTime * uSpeed * 0.8) * uAmp * 0.5;
      return p + n * h;
    }`,
  }),
  vtx({
    id: 'ripple',
    name: 'Ripple',
    category: 'Wave & Flow',
    description: 'Concentric rings radiating from the surface centre.',
    complexity: 'Low',
    performance: 5,
    geom: 'plane',
    uniforms: { uFreq: f('Frequency', 10.0, 1, 30, 0.1), uAmp: f('Amplitude', 0.18, 0, 1), uSpeed: f('Speed', 3.0, 0, 10) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float d = length(p.xy);
      float h = sin(d * uFreq - uTime * uSpeed) * uAmp / (1.0 + d * 1.5);
      return p + n * h;
    }`,
  }),
  vtx({
    id: 'ocean-waves',
    name: 'Ocean Waves',
    category: 'Wave & Flow',
    description: 'Summed directional swells approximating an ocean surface.',
    complexity: 'Medium',
    performance: 4,
    geom: 'plane',
    uniforms: { uAmp: f('Amplitude', 0.22, 0, 1), uSpeed: f('Speed', 1.2, 0, 6), uScale: f('Scale', 2.5, 0.5, 8) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float t = uTime * uSpeed;
      vec2 q = p.xy * uScale;
      float h = sin(q.x + t) * 0.5;
      h += sin(q.y * 0.8 + t * 1.3) * 0.4;
      h += sin((q.x + q.y) * 0.6 - t) * 0.3;
      h += fbm(vec3(q * 0.5, t * 0.2)) * 0.5;
      return p + n * h * uAmp;
    }`,
  }),
  vtx({
    id: 'radial-wave',
    name: 'Radial Wave',
    category: 'Wave & Flow',
    description: 'Angular standing wave wrapped around the centre.',
    complexity: 'Low',
    performance: 5,
    geom: 'plane',
    uniforms: { uArms: f('Arms', 6.0, 1, 20, 1), uAmp: f('Amplitude', 0.2, 0, 1), uSpeed: f('Speed', 2.0, 0, 8) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float a = atan(p.y, p.x);
      float h = sin(a * uArms + uTime * uSpeed) * uAmp * smoothstep(0.0, 1.0, length(p.xy));
      return p + n * h;
    }`,
  }),
  vtx({
    id: 'elastic-mesh',
    name: 'Elastic Mesh',
    category: 'Wave & Flow',
    description: 'Springy overshooting oscillation across the whole surface.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Amplitude', 0.3, 0, 1), uSpeed: f('Speed', 4.0, 0, 12) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float w = sin(uTime * uSpeed - length(p) * 4.0);
      w *= exp(-fract(uTime * 0.25) * 3.0); // decaying bounce each cycle
      return p + n * w * uAmp;
    }`,
  }),

  // ───────────────────────── Organic Motion ─────────────────────────
  vtx({
    id: 'wind-sway',
    name: 'Wind Sway',
    category: 'Organic Motion',
    description: 'Lateral sway that increases with height — like plants in wind.',
    complexity: 'Low',
    performance: 5,
    geom: 'cylinder',
    uniforms: { uAmp: f('Sway', 0.35, 0, 1), uSpeed: f('Speed', 1.5, 0, 6) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float h = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
      float gust = sin(uTime * uSpeed) + 0.4 * sin(uTime * uSpeed * 2.7);
      p.x += gust * h * h * uAmp;
      p.z += cos(uTime * uSpeed * 0.8) * h * h * uAmp * 0.5;
      return p;
    }`,
  }),
  vtx({
    id: 'grass-animation',
    name: 'Grass Animation',
    category: 'Organic Motion',
    description: 'Noisy wind field rippling across blades of grass.',
    complexity: 'Medium',
    performance: 4,
    geom: 'plane',
    colorA: [0.1, 0.4, 0.1],
    colorB: [0.5, 0.9, 0.3],
    uniforms: { uAmp: f('Sway', 0.25, 0, 1), uSpeed: f('Speed', 1.0, 0, 5) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float h = clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
      float wind = fbm(vec3(p.x * 0.6, p.y * 0.3, uTime * uSpeed * 0.4));
      p.x += wind * h * h * uAmp * 2.0;
      return p + n * wind * 0.05;
    }`,
  }),
  vtx({
    id: 'cloth-flutter',
    name: 'Cloth Flutter',
    category: 'Organic Motion',
    description: 'Rippling fabric driven by layered noise.',
    complexity: 'Medium',
    performance: 4,
    geom: 'plane',
    uniforms: { uAmp: f('Amplitude', 0.3, 0, 1), uSpeed: f('Speed', 1.4, 0, 6), uScale: f('Scale', 2.0, 0.5, 6) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float w = fbm(vec3(p.xy * uScale, uTime * uSpeed * 0.5));
      w += 0.3 * sin(p.x * 4.0 + uTime * uSpeed * 2.0);
      return p + n * w * uAmp;
    }`,
  }),
  vtx({
    id: 'jelly',
    name: 'Jelly Motion',
    category: 'Organic Motion',
    description: 'Soft jiggling wobble like a gelatin blob.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Wobble', 0.25, 0, 1), uSpeed: f('Speed', 5.0, 0, 14) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float w = sin(p.y * 4.0 + uTime * uSpeed) + sin(p.x * 3.0 - uTime * uSpeed * 1.3);
      vec3 d = vec3(w, sin(uTime * uSpeed * 0.9) * 1.5, w);
      return p + d * uAmp * 0.25;
    }`,
  }),
  vtx({
    id: 'wobble',
    name: 'Wobble',
    category: 'Organic Motion',
    description: 'Slow low-frequency wobble of the whole mesh.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Amount', 0.2, 0, 1), uSpeed: f('Speed', 2.0, 0, 8) },
    displace: `vec3 displace(vec3 p, vec3 n){
      p.x += sin(uTime * uSpeed + p.y * 2.0) * uAmp;
      p.y += cos(uTime * uSpeed * 0.8 + p.z * 2.0) * uAmp;
      return p;
    }`,
  }),
  vtx({
    id: 'bubble-surface',
    name: 'Bubble Surface',
    category: 'Organic Motion',
    description: 'Rising bulges that swell and pop across the surface.',
    complexity: 'Medium',
    performance: 4,
    uniforms: { uAmp: f('Size', 0.35, 0, 1), uSpeed: f('Speed', 0.8, 0, 4), uScale: f('Density', 3.0, 0.5, 8) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float v = voronoi(p * uScale + vec3(0.0, 0.0, uTime * uSpeed));
      float bumps = smoothstep(0.5, 0.0, v);
      return p + n * bumps * uAmp;
    }`,
  }),
  vtx({
    id: 'blob-morph',
    name: 'Blob Morph',
    category: 'Organic Motion',
    description: 'Metaball-like blob continuously morphing its silhouette.',
    complexity: 'Medium',
    performance: 4,
    uniforms: { uAmp: f('Morph', 0.4, 0, 1.2), uSpeed: f('Speed', 0.6, 0, 3), uScale: f('Scale', 1.6, 0.3, 5) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float d = fbm(p * uScale + uTime * uSpeed);
      return p + n * d * uAmp;
    }`,
  }),

  // ───────────────────────── Energy & Distortion ─────────────────────────
  vtx({
    id: 'explosion',
    name: 'Explosion',
    category: 'Energy & Distortion',
    description: 'Vertices blasted outward by an expanding noisy shell.',
    complexity: 'Medium',
    performance: 4,
    colorA: [1.0, 0.5, 0.1],
    colorB: [1.0, 0.85, 0.3],
    uniforms: { uAmp: f('Force', 0.6, 0, 2), uSpeed: f('Speed', 1.0, 0, 4) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float burst = 0.5 + 0.5 * sin(uTime * uSpeed);
      float scatter = fbm(p * 3.0) * 0.5 + 0.5;
      return p + n * burst * scatter * uAmp;
    }`,
  }),
  vtx({
    id: 'implosion',
    name: 'Implosion',
    category: 'Energy & Distortion',
    description: 'Surface collapses inward toward the centre then rebounds.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Force', 0.5, 0, 1.5), uSpeed: f('Speed', 1.5, 0, 6) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float pull = (0.5 + 0.5 * sin(uTime * uSpeed)) * uAmp;
      return p - normalize(p + 1e-5) * pull * (fbm(p * 4.0) * 0.5 + 0.5);
    }`,
  }),
  vtx({
    id: 'energy-pulse',
    name: 'Energy Pulse',
    category: 'Energy & Distortion',
    description: 'Pulsing rings of energy sweeping outward from the core.',
    complexity: 'Low',
    performance: 5,
    colorA: [0.1, 0.6, 1.0],
    colorB: [0.6, 0.95, 1.0],
    uniforms: { uAmp: f('Amplitude', 0.25, 0, 1), uSpeed: f('Speed', 3.0, 0, 10), uFreq: f('Frequency', 8.0, 1, 24) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float r = length(p);
      float h = sin(r * uFreq - uTime * uSpeed) * uAmp;
      return p + n * h;
    }`,
  }),
  vtx({
    id: 'force-field',
    name: 'Force Field',
    category: 'Energy & Distortion',
    description: 'Surface bulges away from the mouse like a deflected shield.',
    complexity: 'Medium',
    performance: 4,
    colorA: [0.1, 0.7, 0.9],
    colorB: [0.7, 1.0, 1.0],
    uniforms: { uAmp: f('Strength', 0.5, 0, 1.5), uRadius: f('Radius', 1.2, 0.2, 3) },
    displace: `${MOUSE_TARGET}
    vec3 displace(vec3 p, vec3 n){
      vec3 m = mouseTarget();
      float d = distance(p, m);
      float push = exp(-d * d / (uRadius * uRadius)) * uAmp;
      return p + n * push;
    }`,
  }),
  vtx({
    id: 'shockwave',
    name: 'Shockwave',
    category: 'Energy & Distortion',
    description: 'A single sharp ring expanding outward over time.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Height', 0.4, 0, 1.5), uSpeed: f('Speed', 0.6, 0, 3), uWidth: f('Width', 0.15, 0.02, 0.6) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float r = length(p);
      float front = fract(uTime * uSpeed) * 2.5;
      float ring = exp(-pow((r - front) / uWidth, 2.0));
      return p + n * ring * uAmp;
    }`,
  }),
  vtx({
    id: 'lava-flow',
    name: 'Lava Flow',
    category: 'Energy & Distortion',
    description: 'Slow churning molten surface from drifting fractal noise.',
    complexity: 'Medium',
    performance: 4,
    colorA: [0.6, 0.05, 0.0],
    colorB: [1.0, 0.6, 0.1],
    uniforms: { uAmp: f('Amplitude', 0.25, 0, 1), uSpeed: f('Speed', 0.3, 0, 2), uScale: f('Scale', 2.0, 0.3, 6) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float d = fbm(p * uScale + vec3(0.0, uTime * uSpeed, 0.0));
      d = abs(d);
      return p + n * d * uAmp;
    }`,
  }),

  // ───────────────────────── Noise-Based ─────────────────────────
  vtx({
    id: 'perlin-noise',
    name: 'Perlin Noise',
    category: 'Noise-Based',
    description: 'Classic smooth value/gradient noise displacement.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Amplitude', 0.3, 0, 1), uScale: f('Scale', 2.0, 0.3, 8), uSpeed: f('Speed', 0.5, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float d = vnoise(p * uScale + uTime * uSpeed);
      return p + n * d * uAmp;
    }`,
  }),
  vtx({
    id: 'simplex-noise',
    name: 'Simplex Noise',
    category: 'Noise-Based',
    description: 'Domain-warped noise with a smoother, less grid-aligned feel.',
    complexity: 'Medium',
    performance: 4,
    uniforms: { uAmp: f('Amplitude', 0.3, 0, 1), uScale: f('Scale', 2.0, 0.3, 8), uSpeed: f('Speed', 0.5, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      vec3 q = p * uScale + uTime * uSpeed;
      float d = vnoise(q + vec3(vnoise(q * 1.7))); // warp domain
      return p + n * d * uAmp;
    }`,
  }),
  vtx({
    id: 'curl-noise',
    name: 'Curl Noise',
    category: 'Noise-Based',
    description: 'Divergence-free curl field swirling the vertices.',
    complexity: 'High',
    performance: 3,
    uniforms: { uAmp: f('Strength', 0.3, 0, 1), uScale: f('Scale', 1.5, 0.3, 5), uSpeed: f('Speed', 0.4, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      vec3 c = curl(p * uScale + uTime * uSpeed);
      return p + c * uAmp;
    }`,
  }),
  vtx({
    id: 'terrain-generator',
    name: 'Terrain Generator',
    category: 'Noise-Based',
    description: 'Procedural mountains/valleys from ridged fractal noise.',
    complexity: 'Medium',
    performance: 4,
    geom: 'plane',
    colorA: [0.2, 0.3, 0.15],
    colorB: [0.9, 0.9, 0.95],
    uniforms: { uAmp: f('Height', 0.5, 0, 1.5), uScale: f('Scale', 1.5, 0.2, 5) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float h = 0.0, a = 0.5; vec3 q = p * uScale;
      for(int i=0;i<5;i++){ h += a * (1.0 - abs(vnoise(q))); q *= 2.03; a *= 0.5; }
      return p + n * (h - 0.7) * uAmp;
    }`,
  }),
  vtx({
    id: 'liquid-metal',
    name: 'Liquid Metal',
    category: 'Noise-Based',
    description: 'Flowing chrome-like surface from slow advected noise.',
    complexity: 'Medium',
    performance: 4,
    colorA: [0.2, 0.22, 0.28],
    colorB: [0.9, 0.95, 1.0],
    uniforms: { uAmp: f('Amplitude', 0.22, 0, 1), uScale: f('Scale', 2.2, 0.3, 6), uSpeed: f('Speed', 0.5, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      vec3 q = p * uScale;
      float d = fbm(q + fbm(q + uTime * uSpeed) );
      return p + n * d * uAmp;
    }`,
  }),

  // ───────────────────────── Twisting & Rotation ─────────────────────────
  vtx({
    id: 'twist',
    name: 'Twist',
    category: 'Twisting & Rotation',
    description: 'Rotation about the Y axis that increases with height.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uTwist: f('Twist', 2.0, -6, 6), uSpeed: f('Speed', 0.5, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      return rotateY(p, p.y * uTwist + sin(uTime * uSpeed));
    }`,
  }),
  vtx({
    id: 'spiral',
    name: 'Spiral',
    category: 'Twisting & Rotation',
    description: 'Twist combined with an outward radial wave.',
    complexity: 'Medium',
    performance: 4,
    uniforms: { uTwist: f('Twist', 3.0, -8, 8), uAmp: f('Amplitude', 0.15, 0, 1), uSpeed: f('Speed', 1.0, 0, 5) },
    displace: `vec3 displace(vec3 p, vec3 n){
      p = rotateY(p, p.y * uTwist);
      float r = length(p.xz);
      p += n * sin(r * 6.0 - uTime * uSpeed) * uAmp;
      return p;
    }`,
  }),
  vtx({
    id: 'helix',
    name: 'Helix',
    category: 'Twisting & Rotation',
    description: 'Vertices wound onto a corkscrew path along Y.',
    complexity: 'Low',
    performance: 5,
    geom: 'cylinder',
    uniforms: { uFreq: f('Coils', 3.0, 0.5, 10), uAmp: f('Radius', 0.4, 0, 1), uSpeed: f('Speed', 1.0, 0, 5) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float a = p.y * uFreq + uTime * uSpeed;
      p.x += cos(a) * uAmp;
      p.z += sin(a) * uAmp;
      return p;
    }`,
  }),
  vtx({
    id: 'dna-twist',
    name: 'DNA Twist',
    category: 'Twisting & Rotation',
    description: 'Strong helical twist with a pinched double-strand profile.',
    complexity: 'Medium',
    performance: 4,
    geom: 'cylinder',
    uniforms: { uTwist: f('Twist', 5.0, 0, 12), uAmp: f('Pinch', 0.4, 0, 1), uSpeed: f('Speed', 0.8, 0, 4) },
    displace: `vec3 displace(vec3 p, vec3 n){
      p = rotateY(p, p.y * uTwist + uTime * uSpeed);
      float pinch = 0.6 + 0.4 * cos(p.y * uTwist * 2.0);
      p.xz *= mix(1.0, pinch, uAmp);
      return p;
    }`,
  }),
  vtx({
    id: 'tornado',
    name: 'Tornado',
    category: 'Twisting & Rotation',
    description: 'Funnel: twist intensifies and radius narrows toward the base.',
    complexity: 'Medium',
    performance: 4,
    geom: 'cylinder',
    uniforms: { uTwist: f('Spin', 4.0, 0, 12), uSpeed: f('Speed', 2.0, 0, 8) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float h = p.y * 0.5 + 0.5;
      p = rotateY(p, (uTwist / (h + 0.2)) + uTime * uSpeed);
      p.xz *= mix(0.2, 1.0, h);
      return p;
    }`,
  }),
  vtx({
    id: 'galaxy-swirl',
    name: 'Galaxy Swirl',
    category: 'Twisting & Rotation',
    description: 'Differential rotation — inner radius spins faster than outer.',
    complexity: 'Low',
    performance: 5,
    geom: 'plane',
    colorA: [0.4, 0.3, 1.0],
    colorB: [1.0, 0.85, 0.6],
    uniforms: { uAmp: f('Swirl', 2.0, -6, 6), uSpeed: f('Speed', 0.5, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float r = length(p.xy);
      float a = uAmp / (r + 0.3) + uTime * uSpeed;
      p.xy = rot2(a) * p.xy;
      return p + n * (0.15 / (r + 0.4));
    }`,
  }),
  vtx({
    id: 'polar-twist',
    name: 'Polar Twist',
    category: 'Twisting & Rotation',
    description: 'In-plane rotation proportional to radius — a vortex sheet.',
    complexity: 'Low',
    performance: 5,
    geom: 'plane',
    uniforms: { uAmp: f('Twist', 3.0, -8, 8), uSpeed: f('Speed', 0.6, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float a = length(p.xy) * uAmp + uTime * uSpeed;
      p.xy = rot2(a) * p.xy;
      return p;
    }`,
  }),

  // ───────────────────────── Geometric ─────────────────────────
  vtx({
    id: 'inflate',
    name: 'Inflate',
    category: 'Geometric',
    description: 'Pushes the surface outward along its normal, breathing in/out.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Amount', 0.3, 0, 1.5), uSpeed: f('Speed', 1.5, 0, 6) },
    displace: `vec3 displace(vec3 p, vec3 n){
      return p + n * (0.5 + 0.5 * sin(uTime * uSpeed)) * uAmp;
    }`,
  }),
  vtx({
    id: 'pulse-scale',
    name: 'Pulse Scale',
    category: 'Geometric',
    description: 'Uniform scaling pulse of the entire mesh.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Amount', 0.25, 0, 1), uSpeed: f('Speed', 3.0, 0, 10) },
    displace: `vec3 displace(vec3 p, vec3 n){
      return p * (1.0 + sin(uTime * uSpeed) * uAmp);
    }`,
  }),
  vtx({
    id: 'bend',
    name: 'Bend',
    category: 'Geometric',
    description: 'Parabolic bend of the mesh around the X axis.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Bend', 0.5, -2, 2), uSpeed: f('Speed', 1.0, 0, 5) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float k = uAmp * (0.6 + 0.4 * sin(uTime * uSpeed));
      p.y -= p.x * p.x * k;
      return p;
    }`,
  }),
  vtx({
    id: 'taper',
    name: 'Taper',
    category: 'Geometric',
    description: 'Cross-section scaled along the Y axis to a point.',
    complexity: 'Low',
    performance: 5,
    geom: 'cylinder',
    uniforms: { uAmp: f('Taper', 0.6, -1, 1), uSpeed: f('Speed', 1.0, 0, 5) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float k = uAmp * (0.6 + 0.4 * sin(uTime * uSpeed));
      p.xz *= (1.0 + p.y * k);
      return p;
    }`,
  }),
  vtx({
    id: 'pinch',
    name: 'Pinch',
    category: 'Geometric',
    description: 'Squeezes the middle band of the mesh inward.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Pinch', 0.5, 0, 1), uSpeed: f('Speed', 1.5, 0, 6) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float k = exp(-p.y * p.y * 4.0) * uAmp * (0.5 + 0.5 * sin(uTime * uSpeed));
      p.xz *= (1.0 - k);
      return p;
    }`,
  }),
  vtx({
    id: 'bulge',
    name: 'Bulge',
    category: 'Geometric',
    description: 'Localised swelling band travelling up the mesh.',
    complexity: 'Low',
    performance: 5,
    uniforms: { uAmp: f('Bulge', 0.4, 0, 1.2), uSpeed: f('Speed', 1.0, 0, 5) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float band = sin(uTime * uSpeed) * 0.6;
      float k = exp(-pow((p.y - band) * 3.0, 2.0)) * uAmp;
      return p + n * k;
    }`,
  }),

  // ───────────────────────── Sci-Fi ─────────────────────────
  vtx({
    id: 'hologram-vtx',
    name: 'Hologram',
    category: 'Sci-Fi',
    description: 'Horizontal scan bands jitter the surface like a flickering hologram.',
    complexity: 'Medium',
    performance: 4,
    colorA: [0.1, 0.7, 0.9],
    colorB: [0.6, 1.0, 1.0],
    uniforms: { uAmp: f('Glitch', 0.12, 0, 0.6), uSpeed: f('Speed', 3.0, 0, 10) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float band = step(0.6, fract(p.y * 8.0 - uTime * uSpeed));
      float jitter = (hash11(floor(p.y * 20.0) + floor(uTime * 12.0)) - 0.5);
      p.x += band * jitter * uAmp;
      return p;
    }`,
  }),
  vtx({
    id: 'vertex-glitch',
    name: 'Vertex Glitch',
    category: 'Sci-Fi',
    description: 'Random per-block displacement bursts — digital corruption.',
    complexity: 'Medium',
    performance: 4,
    colorA: [0.9, 0.1, 0.5],
    colorB: [0.2, 0.9, 0.9],
    uniforms: { uAmp: f('Glitch', 0.4, 0, 1.5), uSpeed: f('Rate', 10.0, 0, 30) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float t = floor(uTime * uSpeed);
      vec3 cell = floor(p * 6.0);
      float on = step(0.75, hash13(cell + t));
      vec3 dir = (hash33(cell + t) - 0.5) * 2.0;
      return p + dir * on * uAmp;
    }`,
  }),

  // ───────────────────────── Cosmic ─────────────────────────
  vtx({
    id: 'black-hole',
    name: 'Black Hole',
    category: 'Cosmic',
    description: 'Vertices spiral inward toward a gravitational sink.',
    complexity: 'Medium',
    performance: 4,
    geom: 'plane',
    colorA: [0.02, 0.0, 0.05],
    colorB: [0.6, 0.4, 1.0],
    uniforms: { uAmp: f('Pull', 0.4, 0, 1), uSpeed: f('Spin', 2.0, 0, 8) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float r = length(p.xy);
      float a = (1.0 / (r + 0.15)) * uSpeed * 0.2 + uTime;
      p.xy = rot2(a) * p.xy;
      p.xy *= mix(1.0, 0.2, exp(-r * 3.0) * uAmp);
      return p - n * exp(-r * 4.0) * uAmp;
    }`,
  }),
  vtx({
    id: 'aurora-motion',
    name: 'Aurora Motion',
    category: 'Cosmic',
    description: 'Slow undulating curtains rippling along the surface.',
    complexity: 'Medium',
    performance: 4,
    geom: 'plane',
    colorA: [0.1, 1.0, 0.5],
    colorB: [0.5, 0.2, 1.0],
    uniforms: { uAmp: f('Amplitude', 0.3, 0, 1), uSpeed: f('Speed', 0.5, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float w = sin(p.x * 2.0 + uTime * uSpeed) * 0.5;
      w += fbm(vec3(p.x * 1.5, uTime * uSpeed * 0.5, 0.0)) * 0.8;
      return p + n * w * uAmp;
    }`,
  }),

  // ───────────────────────── Reactive ─────────────────────────
  vtx({
    id: 'mouse-attraction',
    name: 'Mouse Attraction',
    category: 'Reactive',
    description: 'Surface is pulled toward the cursor position (move the mouse).',
    complexity: 'Medium',
    performance: 4,
    uniforms: { uAmp: f('Strength', 0.5, 0, 1.5), uRadius: f('Radius', 1.0, 0.2, 3) },
    displace: `${MOUSE_TARGET}
    vec3 displace(vec3 p, vec3 n){
      vec3 m = mouseTarget();
      float d = distance(p, m);
      float pull = exp(-d * d / (uRadius * uRadius)) * uAmp;
      return p + (m - p) * pull;
    }`,
  }),
  vtx({
    id: 'audio-reactive',
    name: 'Audio Reactive',
    category: 'Reactive',
    description: 'Simulated bass/mid/treble bands pulsing the mesh (no mic required).',
    complexity: 'Medium',
    performance: 4,
    colorA: [1.0, 0.2, 0.5],
    colorB: [0.2, 0.8, 1.0],
    uniforms: { uAmp: f('Reactivity', 0.4, 0, 1.5), uSpeed: f('Tempo', 4.0, 0, 12) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float bass = abs(sin(uTime * uSpeed * 0.5));
      float mid  = abs(sin(uTime * uSpeed + p.y * 6.0)) * 0.6;
      float treb = abs(sin(uTime * uSpeed * 2.3 + p.x * 12.0)) * 0.3;
      float beat = pow(bass, 4.0);
      return p + n * (beat + mid + treb) * uAmp;
    }`,
  }),

  // ───────────────────────── Mathematical ─────────────────────────
  vtx({
    id: 'mobius-twist',
    name: 'Möbius Twist',
    category: 'Mathematical',
    description: 'Half-turn twist of the cross-section as it wraps around.',
    complexity: 'Medium',
    performance: 4,
    geom: 'torus',
    uniforms: { uTwist: f('Half-turns', 1.0, 0, 6, 1), uSpeed: f('Speed', 0.4, 0, 3) },
    displace: `vec3 displace(vec3 p, vec3 n){
      float a = atan(p.z, p.x);
      return rotateX(p, a * uTwist + uTime * uSpeed);
    }`,
  }),
]
