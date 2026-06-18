import type { ShaderDef } from '../types'
import { VERTEX_SHADERS } from './vertexLibrary'
import { MATERIAL_SHADERS } from './materialLibrary'
import { IMAGE_SHADERS } from './imageLibrary'
import { PREMIUM_SHADERS } from './premiumLibrary'

/**
 * Each shader body may use these injected globals (declared in the generated header):
 *   varying vec2 vUv;        // 0..1 surface coords
 *   uniform float uTime;     // seconds
 *   uniform vec2  uResolution;
 *   uniform vec2  uMouse;    // 0..1
 * plus every key in `uniforms` auto-declared with the right GLSL type.
 * Helper functions are inlined per-shader (each compiles as its own program).
 */

export const FRAGMENT_SHADERS: ShaderDef[] = [
  {
    id: 'aurora-gradient',
    name: 'Aurora Gradient',
    category: 'Gradient',
    description: 'Smooth flowing two-color gradient with animated diagonal sweep.',
    complexity: 'Low',
    performance: 5,
    uniforms: {
      uColorA: { type: 'color', label: 'Color A', value: [0.49, 0.36, 1.0] },
      uColorB: { type: 'color', label: 'Color B', value: [0.13, 0.83, 0.93] },
      uAngle: { type: 'float', label: 'Angle', value: 0.6, min: 0, max: 6.28, step: 0.01 },
      uSpeed: { type: 'float', label: 'Speed', value: 0.3, min: 0, max: 2, step: 0.01 },
    },
    fragment: /* glsl */ `
void main() {
  vec2 dir = vec2(cos(uAngle), sin(uAngle));
  float t = dot(vUv - 0.5, dir) + 0.5;
  t += 0.15 * sin(uTime * uSpeed + vUv.x * 6.2831);
  t = clamp(t, 0.0, 1.0);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 1.0, t));
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'plasma',
    name: 'Plasma Field',
    category: 'Background',
    description: 'Classic layered sine plasma with hue-shifting palette.',
    complexity: 'Medium',
    performance: 4,
    uniforms: {
      uSpeed: { type: 'float', label: 'Speed', value: 1.0, min: 0, max: 4, step: 0.01 },
      uScale: { type: 'float', label: 'Scale', value: 4.0, min: 1, max: 16, step: 0.1 },
      uTint: { type: 'color', label: 'Tint', value: [1.0, 0.6, 0.9] },
    },
    fragment: /* glsl */ `
void main() {
  vec2 p = vUv * uScale;
  float t = uTime * uSpeed;
  float v = sin(p.x + t);
  v += sin((p.y + t) * 0.7);
  v += sin((p.x + p.y + t) * 0.5);
  v += sin(length(p - uScale * 0.5) + t);
  v *= 0.25;
  vec3 col = 0.5 + 0.5 * cos(6.2831 * (v + vec3(0.0, 0.33, 0.67)));
  col *= uTint;
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'water-ripple',
    name: 'Water Ripple',
    category: 'Water',
    description: 'Concentric refractive ripples driven from the mouse position.',
    complexity: 'Medium',
    performance: 4,
    uniforms: {
      uDeep: { type: 'color', label: 'Deep', value: [0.02, 0.18, 0.35] },
      uShallow: { type: 'color', label: 'Shallow', value: [0.3, 0.75, 0.9] },
      uFreq: { type: 'float', label: 'Frequency', value: 30.0, min: 4, max: 80, step: 0.5 },
      uSpeed: { type: 'float', label: 'Speed', value: 1.5, min: 0, max: 6, step: 0.01 },
      uAmp: { type: 'float', label: 'Amplitude', value: 0.5, min: 0, max: 1, step: 0.01 },
    },
    fragment: /* glsl */ `
void main() {
  vec2 c = uMouse;
  float d = distance(vUv, c);
  float w = sin(d * uFreq - uTime * uSpeed) * uAmp;
  w *= exp(-d * 3.0);
  float mixv = clamp(0.5 + w + (1.0 - vUv.y) * 0.3, 0.0, 1.0);
  vec3 col = mix(uDeep, uShallow, mixv);
  col += w * 0.4;
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'fire',
    name: 'Ember Fire',
    category: 'Fire',
    description: 'Rising procedural flame using stacked value noise (FBM).',
    complexity: 'High',
    performance: 3,
    uniforms: {
      uSpeed: { type: 'float', label: 'Speed', value: 1.4, min: 0, max: 4, step: 0.01 },
      uScale: { type: 'float', label: 'Scale', value: 3.0, min: 1, max: 8, step: 0.1 },
      uIntensity: { type: 'float', label: 'Intensity', value: 1.3, min: 0.2, max: 3, step: 0.01 },
    },
    fragment: /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<5;i++){ v += a*noise(p); p*=2.0; a*=0.5; }
  return v;
}
void main() {
  vec2 uv = vUv;
  vec2 p = uv * uScale;
  p.y -= uTime * uSpeed;
  float n = fbm(p + fbm(p));
  float flame = n * pow(uv.y, 0.6) ;
  float heat = smoothstep(0.0, 1.0, (1.0 - uv.y) * 1.4 * uIntensity * (0.6 + n));
  vec3 col = vec3(0.0);
  col += vec3(1.4, 0.5, 0.1) * heat;
  col += vec3(1.5, 1.2, 0.3) * pow(heat, 3.0);
  col *= smoothstep(0.0, 0.2, uv.y) * (0.4 + flame);
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'voronoi',
    name: 'Voronoi Cells',
    category: 'Voronoi',
    description: 'Animated cellular noise with glowing cell borders.',
    complexity: 'Medium',
    performance: 3,
    uniforms: {
      uScale: { type: 'float', label: 'Scale', value: 6.0, min: 1, max: 20, step: 0.1 },
      uSpeed: { type: 'float', label: 'Speed', value: 0.6, min: 0, max: 3, step: 0.01 },
      uColorA: { type: 'color', label: 'Cell', value: [0.05, 0.06, 0.12] },
      uColorB: { type: 'color', label: 'Edge', value: [0.49, 0.36, 1.0] },
    },
    fragment: /* glsl */ `
vec2 hash2(vec2 p){
  p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453);
}
void main(){
  vec2 p = vUv * uScale;
  vec2 i = floor(p), f = fract(p);
  float md = 1.0;
  for(int y=-1;y<=1;y++)
  for(int x=-1;x<=1;x++){
    vec2 g = vec2(float(x), float(y));
    vec2 o = hash2(i+g);
    o = 0.5 + 0.5*sin(uTime*uSpeed + 6.2831*o);
    float d = length(g + o - f);
    md = min(md, d);
  }
  float edge = smoothstep(0.0, 0.08, md);
  vec3 col = mix(uColorB, uColorA, edge);
  col += (1.0 - edge) * uColorB * 1.5;
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    category: 'Aurora',
    description: 'Layered northern-lights curtains with soft vertical falloff.',
    complexity: 'High',
    performance: 3,
    uniforms: {
      uSpeed: { type: 'float', label: 'Speed', value: 0.5, min: 0, max: 2, step: 0.01 },
      uColorA: { type: 'color', label: 'Green', value: [0.1, 1.0, 0.5] },
      uColorB: { type: 'color', label: 'Violet', value: [0.5, 0.2, 1.0] },
      uIntensity: { type: 'float', label: 'Intensity', value: 1.0, min: 0.2, max: 3, step: 0.01 },
    },
    fragment: /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
void main(){
  vec2 uv = vUv;
  float t = uTime * uSpeed;
  vec3 col = vec3(0.01, 0.02, 0.06);
  for(int i=0;i<3;i++){
    float fi = float(i);
    float wave = noise(vec2(uv.x*3.0 + t + fi*5.0, fi)) * 0.25;
    float band = 0.55 + 0.12*fi + wave;
    float d = abs(uv.y - band);
    float glow = exp(-d*d*60.0) * uIntensity;
    vec3 c = mix(uColorA, uColorB, fract(fi*0.5 + uv.x*0.5));
    col += c * glow;
  }
  col += vec3(0.02,0.01,0.05);
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'galaxy',
    name: 'Spiral Galaxy',
    category: 'Galaxy',
    description: 'Rotating spiral arms with twinkling star field.',
    complexity: 'High',
    performance: 3,
    uniforms: {
      uSpeed: { type: 'float', label: 'Spin', value: 0.3, min: 0, max: 2, step: 0.01 },
      uArms: { type: 'float', label: 'Arms', value: 5.0, min: 1, max: 10, step: 1 },
      uCore: { type: 'color', label: 'Core', value: [1.0, 0.85, 0.6] },
      uOuter: { type: 'color', label: 'Outer', value: [0.4, 0.3, 1.0] },
    },
    fragment: /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = vUv - 0.5;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float spiral = sin(a*uArms + r*18.0 - uTime*uSpeed*6.2831);
  float arm = smoothstep(0.0, 0.6, spiral) * exp(-r*3.0);
  vec3 col = mix(uOuter, uCore, exp(-r*5.0));
  col *= arm * 2.0;
  // stars
  vec2 g = floor((uv+0.5)*200.0);
  float star = step(0.995, hash(g)) * (0.5+0.5*sin(uTime*3.0+hash(g)*30.0));
  col += vec3(star);
  col += uCore * exp(-r*r*40.0); // bright core
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'fbm-clouds',
    name: 'Drifting Clouds',
    category: 'Clouds',
    description: 'Fractal Brownian motion clouds over a sky gradient.',
    complexity: 'Medium',
    performance: 3,
    uniforms: {
      uSpeed: { type: 'float', label: 'Wind', value: 0.4, min: 0, max: 3, step: 0.01 },
      uScale: { type: 'float', label: 'Scale', value: 3.0, min: 1, max: 8, step: 0.1 },
      uSky: { type: 'color', label: 'Sky', value: [0.25, 0.5, 0.85] },
      uCloud: { type: 'color', label: 'Cloud', value: [1.0, 1.0, 1.0] },
    },
    fragment: /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<6;i++){ v+=a*noise(p); p*=2.0; a*=0.5;} return v; }
void main(){
  vec2 uv = vUv * uScale;
  uv.x += uTime * uSpeed;
  float c = fbm(uv + fbm(uv*0.5));
  vec3 sky = mix(uSky*0.6, uSky, vUv.y);
  vec3 col = mix(sky, uCloud, smoothstep(0.4, 0.9, c));
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'cyber-grid',
    name: 'Cyber Grid',
    category: 'Wireframe',
    description: 'Neon perspective grid with scanning pulse — synthwave style.',
    complexity: 'Medium',
    performance: 4,
    uniforms: {
      uColor: { type: 'color', label: 'Line', value: [0.13, 0.95, 0.95] },
      uSpeed: { type: 'float', label: 'Speed', value: 0.8, min: 0, max: 3, step: 0.01 },
      uDensity: { type: 'float', label: 'Density', value: 16.0, min: 4, max: 40, step: 1 },
    },
    fragment: /* glsl */ `
void main(){
  vec2 uv = vUv;
  uv.y += uTime * uSpeed * 0.1;
  vec2 g = abs(fract(uv * uDensity) - 0.5);
  float line = min(g.x, g.y);
  float glow = smoothstep(0.06, 0.0, line);
  float pulse = 0.6 + 0.4*sin(uTime*2.0 - uv.y*10.0);
  vec3 col = uColor * glow * pulse;
  col += uColor * 0.03;
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'glitch',
    name: 'Signal Glitch',
    category: 'Glitch',
    description: 'RGB-split channel offset, scanlines and block corruption.',
    complexity: 'Medium',
    performance: 4,
    uniforms: {
      uAmount: { type: 'float', label: 'Glitch', value: 0.5, min: 0, max: 1, step: 0.01 },
      uColorA: { type: 'color', label: 'Base A', value: [0.49, 0.36, 1.0] },
      uColorB: { type: 'color', label: 'Base B', value: [0.13, 0.83, 0.93] },
      uScan: { type: 'float', label: 'Scanlines', value: 0.4, min: 0, max: 1, step: 0.01 },
    },
    fragment: /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec3 base(vec2 uv){ return mix(uColorA, uColorB, uv.x); }
void main(){
  vec2 uv = vUv;
  float blockY = floor(uv.y * 24.0);
  float t = floor(uTime * 12.0);
  float jitter = (hash(vec2(blockY, t)) - 0.5) * uAmount;
  jitter *= step(0.7, hash(vec2(blockY*1.7, t)));
  uv.x += jitter;
  float o = 0.02 * uAmount;
  vec3 col;
  col.r = base(uv + vec2(o, 0.0)).r;
  col.g = base(uv).g;
  col.b = base(uv - vec2(o, 0.0)).b;
  float scan = sin(uv.y * 800.0) * 0.5 + 0.5;
  col *= 1.0 - uScan * 0.5 * scan;
  col += hash(uv + t) * 0.06 * uAmount;
  gl_FragColor = vec4(col, 1.0);
}`,
  },

  {
    id: 'hologram',
    name: 'Hologram',
    category: 'Hologram',
    description: 'Fresnel-style additive hologram with horizontal scan bands.',
    complexity: 'Medium',
    performance: 4,
    uniforms: {
      uColor: { type: 'color', label: 'Color', value: [0.2, 0.9, 1.0] },
      uSpeed: { type: 'float', label: 'Scan Speed', value: 1.0, min: 0, max: 4, step: 0.01 },
      uBands: { type: 'float', label: 'Bands', value: 60.0, min: 10, max: 200, step: 1 },
    },
    fragment: /* glsl */ `
void main(){
  vec2 uv = vUv;
  float scan = 0.5 + 0.5*sin(uv.y * uBands - uTime * uSpeed * 6.2831);
  float edge = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
  edge *= smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);
  vec3 col = uColor * (0.3 + 0.7*scan);
  col += uColor * (1.0 - edge) * 0.6;
  float flicker = 0.9 + 0.1*sin(uTime*40.0);
  gl_FragColor = vec4(col * flicker, 1.0);
}`,
  },

  {
    id: 'digital-rain',
    name: 'Digital Rain',
    category: 'Background',
    description: 'Matrix-style falling glyph columns.',
    complexity: 'Medium',
    performance: 4,
    uniforms: {
      uColor: { type: 'color', label: 'Color', value: [0.2, 1.0, 0.4] },
      uSpeed: { type: 'float', label: 'Speed', value: 1.0, min: 0, max: 4, step: 0.01 },
      uColumns: { type: 'float', label: 'Columns', value: 40.0, min: 10, max: 120, step: 1 },
    },
    fragment: /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 uv = vUv;
  float col = floor(uv.x * uColumns);
  float speed = uSpeed * (0.5 + hash(vec2(col, 0.0)));
  float y = fract(uv.y + uTime * speed * 0.2 + hash(vec2(col, 1.0)));
  float cell = floor(uv.y * 30.0);
  float glyph = step(0.5, hash(vec2(col, cell + floor(uTime*8.0))));
  float trail = pow(1.0 - y, 4.0);
  vec3 c = uColor * trail * glyph;
  c += uColor * step(0.98, trail) ; // bright head
  gl_FragColor = vec4(c, 1.0);
}`,
  },
]

/** All shaders: fragment effects + premium showcases + image FX + vertex deform + materials. */
export const SHADERS: ShaderDef[] = [
  ...FRAGMENT_SHADERS,
  ...PREMIUM_SHADERS,
  ...IMAGE_SHADERS,
  ...VERTEX_SHADERS,
  ...MATERIAL_SHADERS,
]

export const CATEGORIES = Array.from(new Set(SHADERS.map((s) => s.category))).sort()

export function getShader(id: string): ShaderDef {
  return SHADERS.find((s) => s.id === id) ?? SHADERS[0]
}
