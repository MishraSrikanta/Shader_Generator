import type { ShaderDef, UniformMap } from '../types'

/** Default vertex shader for FRAGMENT-kind shaders (just passes UVs through). */
export const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const GLSL_TYPE: Record<string, string> = {
  float: 'float',
  color: 'vec3',
  vec2: 'vec2',
  bool: 'bool',
}

function fmtFloat(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n)
}

/** GLSL literal for a uniform's current value (used in export comments). */
function glslValue(u: UniformMap[string]): string {
  if (u.type === 'color') return `vec3(${u.value.map(fmtFloat).join(', ')})`
  if (u.type === 'vec2') return `vec2(${u.value.map(fmtFloat).join(', ')})`
  if (u.type === 'bool') return String(u.value)
  return fmtFloat(u.value)
}

/** Auto-generated declarations for a shader's custom uniforms.
 *  When `withValues` is set, the current value is appended to each comment so exported
 *  GLSL reflects live edits to the parameters. */
export function declareUniforms(uniforms: UniformMap, withValues = false): string {
  return Object.entries(uniforms)
    .map(([name, u]) => {
      const comment = withValues ? `${u.label} = ${glslValue(u)}` : u.label
      return `uniform ${GLSL_TYPE[u.type]} ${name}; // ${comment}`
    })
    .join('\n')
}

const COMMON_UNIFORMS = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;`

/** Shared GLSL helper chunk injected into every VERTEX shader so displace()
 *  bodies can use noise / fbm / curl / rotation without redefining them. */
export const GLSL_HELPERS = /* glsl */ `
#define PI 3.14159265359
mat2 rot2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
vec3 rotateY(vec3 p, float a){ p.xz = rot2(a) * p.xz; return p; }
vec3 rotateX(vec3 p, float a){ p.yz = rot2(a) * p.yz; return p; }
vec3 rotateZ(vec3 p, float a){ p.xy = rot2(a) * p.xy; return p; }

float hash11(float p){ p = fract(p*0.1031); p *= p+33.33; p *= p+p; return fract(p); }
float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.yzx+33.33); return fract((p.x+p.y)*p.z); }
vec3 hash33(vec3 p){
  p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
  return fract(sin(p)*43758.5453);
}

// 3D value noise
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f*f*(3.0-2.0*f);
  float n000=hash13(i+vec3(0,0,0)), n100=hash13(i+vec3(1,0,0));
  float n010=hash13(i+vec3(0,1,0)), n110=hash13(i+vec3(1,1,0));
  float n001=hash13(i+vec3(0,0,1)), n101=hash13(i+vec3(1,0,1));
  float n011=hash13(i+vec3(0,1,1)), n111=hash13(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),
             mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y), f.z) * 2.0 - 1.0;
}

float fbm(vec3 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v += a*vnoise(p); p*=2.02; a*=0.5; }
  return v;
}

// gradient of value noise -> cheap curl-ish vector field
vec3 curl(vec3 p){
  float e = 0.1;
  vec3 dx = vec3(e,0,0), dy = vec3(0,e,0), dz = vec3(0,0,e);
  float x = vnoise(p+dy)-vnoise(p-dy) - (vnoise(p+dz)-vnoise(p-dz));
  float y = vnoise(p+dz)-vnoise(p-dz) - (vnoise(p+dx)-vnoise(p-dx));
  float z = vnoise(p+dx)-vnoise(p-dx) - (vnoise(p+dy)-vnoise(p-dy));
  return normalize(vec3(x,y,z) + 1e-5);
}

// F2-F1 voronoi (cellular)
float voronoi(vec3 p){
  vec3 b = floor(p), f = fract(p);
  float d = 1.0;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 g = vec3(float(x),float(y),float(z));
    vec3 o = hash33(b+g);
    d = min(d, length(g + o - f));
  }
  return d;
}`

/** Shared lit fragment shader used by ALL vertex-kind shaders. */
export const VERTEX_FRAGMENT = /* glsl */ `precision highp float;
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;
uniform vec3 uColorA;
uniform vec3 uColorB;
${COMMON_UNIFORMS}
void main(){
  vec3 N = normalize(vNormal);
  vec3 L = normalize(vec3(0.5, 0.8, 0.6));
  float diff = max(dot(N, L), 0.0);
  float fres = pow(1.0 - max(dot(N, normalize(vView)), 0.0), 2.5);
  vec3 base = mix(uColorA, uColorB, clamp(vDisp * 1.8, 0.0, 1.0));
  vec3 col = base * (0.22 + 0.9 * diff);
  col += uColorB * fres * 0.9;
  gl_FragColor = vec4(col, 1.0);
}`

/** Vertex wrapper for VERTEX-kind shaders: calls displace(), then recomputes the
 *  normal analytically by sampling displace() along two surface tangents. */
function buildVertexProgram(def: ShaderDef, withValues = false): string {
  return `precision highp float;
${COMMON_UNIFORMS}
${declareUniforms(def.uniforms, withValues)}
varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;
${GLSL_HELPERS}

${def.displace}

void main(){
  vec3 p = position;
  vec3 n = normal;
  vec3 dp = displace(p, n);
  vDisp = length(dp - p);

  // two tangents orthogonal to the original normal
  vec3 t = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0)));
  vec3 b = normalize(cross(n, t));
  float e = 0.02;
  vec3 da = displace(p + t * e, n);
  vec3 db = displace(p + b * e, n);
  vec3 cr = cross(da - dp, db - dp);
  // fall back to the original normal when displacement is locally flat/discontinuous
  vec3 nn = length(cr) > 1e-6 ? normalize(cr) : n;
  if (dot(nn, n) < 0.0) nn = -nn;

  vNormal = normalMatrix * nn;
  vec4 mv = modelViewMatrix * vec4(dp, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`
}

/** Full FRAGMENT shader source for a fragment-kind shader. */
function buildFragmentProgram(def: ShaderDef, withValues = false): string {
  return `precision highp float;

varying vec2 vUv;
${COMMON_UNIFORMS}
${declareUniforms(def.uniforms, withValues)}
${def.fragment}`
}

// ───────────────────────── Procedural PBR Materials ─────────────────────────

/** Vertex shader for MATERIAL-kind shaders: passes world-space normal/position/view. */
export const MATERIAL_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vViewW;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vViewW = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

/** Procedural surface generators. Each writes albedo / roughness / metalness from the
 *  shared uniforms (uColorA, uColorB, uScale, uRough, uMetal, uTime). A preset's
 *  material() body just calls the generator it wants. Uses GLSL_HELPERS (noise/voronoi). */
export const MATERIAL_GENERATORS = /* glsl */ `
vec3 hsv2rgb(vec3 c){
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}
float n01(vec3 p){ return vnoise(p) * 0.5 + 0.5; }
float fbm01(vec3 p){ return fbm(p) * 0.5 + 0.5; }

void gen_metal(vec3 p, out vec3 a, out float r, out float m){
  float brushed = fbm01(vec3(p.x*uScale*0.4, p.y*uScale*30.0, p.z*uScale*0.4));
  a = uColorA; r = clamp(uRough + (brushed-0.5)*0.2, 0.02, 1.0); m = 1.0;
}
void gen_metalworn(vec3 p, out vec3 a, out float r, out float m){
  float patina = smoothstep(0.2, 0.7, fbm01(p*uScale*2.0));
  a = mix(uColorA, uColorB, patina);
  r = mix(uRough, 0.95, patina);
  m = mix(1.0, 0.0, patina*0.7);
}
void gen_wood(vec3 p, out vec3 a, out float r, out float m){
  float rings = length(p.xz)*uScale*2.0 + fbm01(p*uScale)*2.0;
  float rg = abs(fract(rings)*2.0 - 1.0);
  float grain = fbm01(vec3(p.y*uScale*30.0, p.x*uScale, p.z*uScale))*0.25;
  a = mix(uColorA, uColorB, smoothstep(0.2, 0.8, rg)*0.8 + grain);
  r = uRough; m = 0.0;
}
void gen_planks(vec3 p, out vec3 a, out float r, out float m){
  vec2 q = p.xz*uScale*2.0;
  float row = floor(q.y);
  q.x += mod(row, 2.0)*0.5;
  float pid = hash33(vec3(floor(q.x), row, 0.0)).x;
  vec2 f = fract(q);
  vec2 g = smoothstep(0.0, 0.04, f) * smoothstep(0.0, 0.04, 1.0-f);
  float gap = min(g.x, g.y);
  vec3 wood = mix(uColorA, uColorB, 0.3 + 0.5*pid + fbm01(p*uScale*8.0)*0.2);
  a = mix(uColorB*0.4, wood, gap);
  r = mix(0.9, uRough, gap); m = 0.0;
}
void gen_marble(vec3 p, out vec3 a, out float r, out float m){
  float turb = fbm01(p*uScale*1.5)*3.0;
  float vein = abs(sin(p.x*uScale*1.5 + turb*3.0));
  vein = pow(1.0 - vein, 2.0);
  a = mix(uColorA, uColorB, vein);
  r = uRough; m = 0.0;
}
void gen_granite(vec3 p, out vec3 a, out float r, out float m){
  float base = n01(p*uScale*8.0);
  float spec = step(0.65, n01(p*uScale*18.0));
  a = mix(uColorA, uColorB, base);
  a = mix(a, vec3(1.0), spec*0.25);
  r = uRough; m = 0.0;
}
void gen_stone(vec3 p, out vec3 a, out float r, out float m){
  float n = fbm01(p*uScale*2.5);
  float crack = smoothstep(0.05, 0.0, voronoi(p*uScale*3.0));
  a = mix(uColorA, uColorB, n);
  a *= (1.0 - crack*0.5);
  r = clamp(uRough + n*0.15, 0.0, 1.0); m = 0.0;
}
void gen_brick(vec3 p, out vec3 a, out float r, out float m){
  vec2 q = p.xy*uScale*2.0; q.y *= 2.0;
  float row = floor(q.y);
  q.x += mod(row, 2.0)*0.5;
  float id = hash33(vec3(floor(q.x), row, 0.0)).x;
  vec2 f = fract(q);
  vec2 g = smoothstep(0.0, 0.06, f) * smoothstep(0.0, 0.06, 1.0-f);
  float brick = min(g.x, g.y);
  vec3 bc = uColorA * (0.7 + 0.5*id) + fbm01(p*uScale*10.0)*0.1;
  a = mix(uColorB, bc, brick);
  r = mix(0.95, uRough, brick); m = 0.0;
}
void gen_fabric(vec3 p, out vec3 a, out float r, out float m){
  vec2 q = p.xy*uScale*30.0;
  float weave = (sin(q.x)*0.5+0.5) * (sin(q.y)*0.5+0.5);
  float thread = mix(sin(q.x), sin(q.y), step(0.5, fract((floor(q.x)+floor(q.y))*0.5)));
  a = mix(uColorB, uColorA, 0.6 + 0.4*weave);
  a *= (0.85 + 0.15*thread);
  r = uRough; m = 0.0;
}
void gen_carbon(vec3 p, out vec3 a, out float r, out float m){
  vec2 q = p.xy*uScale*20.0;
  vec2 cell = floor(q);
  float dir = mod(cell.x + cell.y, 2.0);
  vec2 f = fract(q);
  float w = dir > 0.5 ? sin(f.x*PI) : sin(f.y*PI);
  a = mix(uColorB, uColorA, 0.4 + 0.6*w);
  r = uRough; m = uMetal;
}
void gen_leather(vec3 p, out vec3 a, out float r, out float m){
  float cells = voronoi(p*uScale*8.0);
  float wrinkle = fbm01(p*uScale*3.0);
  a = mix(uColorB, uColorA, 0.4 + smoothstep(0.0, 0.4, cells)*0.6);
  a *= (0.8 + 0.2*wrinkle);
  r = clamp(uRough + smoothstep(0.0, 0.3, cells)*0.2, 0.0, 1.0); m = 0.0;
}
void gen_glass(vec3 p, out vec3 a, out float r, out float m){
  float ripple = fbm01(p*uScale*4.0 + uTime*0.2);
  a = uColorA * (0.9 + 0.1*ripple);
  r = uRough; m = 0.0;
}
void gen_holo(vec3 p, out vec3 a, out float r, out float m){
  float h = fract(p.y*uScale*0.5 + p.x*uScale*0.3 + uTime*0.1 + fbm01(p*uScale)*0.3);
  a = mix(hsv2rgb(vec3(h, 0.7, 1.0)), uColorA, 0.3);
  a = mix(a, uColorB, 0.2*sin(h*6.2831));
  r = uRough; m = 0.3;
}
void gen_liquid(vec3 p, out vec3 a, out float r, out float m){
  float flow = fbm01(p*uScale*2.0 + vec3(0.0, uTime*0.3, uTime*0.1));
  float h = fbm01(p*uScale*3.5 + uTime*0.2);
  a = mix(uColorA, uColorB, smoothstep(0.3, 0.7, flow)*0.7 + h*0.3);
  r = uRough; m = uMetal;
}
void gen_oil(vec3 p, out vec3 a, out float r, out float m){
  float h = fract(fbm01(p*uScale*2.0 + uTime*0.1)*3.0);
  a = mix(uColorA, hsv2rgb(vec3(h, 0.6, 1.0)), 0.5);
  r = uRough; m = 0.2;
}
void gen_ice(vec3 p, out vec3 a, out float r, out float m){
  float cracks = voronoi(p*uScale*4.0);
  float edge = smoothstep(0.06, 0.0, cracks);
  float sparkle = step(0.82, n01(p*uScale*40.0));
  a = mix(uColorA, uColorB, edge) + sparkle*0.25;
  r = clamp(mix(uRough, 0.6, edge), 0.0, 1.0); m = 0.0;
}
void gen_snow(vec3 p, out vec3 a, out float r, out float m){
  float bump = fbm01(p*uScale*6.0);
  float sparkle = step(0.86, n01(p*uScale*60.0));
  a = min(uColorA*(0.85 + 0.15*bump) + sparkle*0.5, vec3(1.0));
  r = uRough; m = 0.0;
}
void gen_sand(vec3 p, out vec3 a, out float r, out float m){
  float ripple = sin(p.x*uScale*8.0 + fbm01(p*uScale)*4.0)*0.5 + 0.5;
  float grain = n01(p*uScale*45.0);
  a = mix(uColorA, uColorB, ripple*0.4 + grain*0.25);
  r = clamp(uRough + grain*0.15, 0.0, 1.0); m = 0.0;
}
void gen_gravel(vec3 p, out vec3 a, out float r, out float m){
  float cells = voronoi(p*uScale*5.0);
  vec3 cid = hash33(floor(p*uScale*5.0));
  a = mix(uColorA, uColorB, cid.x) * (0.55 + 0.45*smoothstep(0.0, 0.35, cells));
  r = uRough; m = 0.0;
}
void gen_ground(vec3 p, out vec3 a, out float r, out float m){
  float n = fbm01(p*uScale*3.0);
  float speck = n01(p*uScale*30.0);
  a = mix(uColorA, uColorB, n*0.7 + speck*0.2);
  r = clamp(uRough + speck*0.1, 0.0, 1.0); m = 0.0;
}
void gen_grass(vec3 p, out vec3 a, out float r, out float m){
  float n = fbm01(p*uScale*8.0);
  float blades = n01(p*uScale*40.0);
  a = mix(uColorA, uColorB, n) * (0.65 + 0.35*blades);
  r = uRough; m = 0.0;
}
void gen_asphalt(vec3 p, out vec3 a, out float r, out float m){
  float speck = n01(p*uScale*30.0);
  float light = step(0.72, n01(p*uScale*60.0));
  a = mix(uColorA, uColorB, speck*0.4) + light*0.12;
  r = clamp(uRough, 0.4, 1.0); m = 0.0;
}`

/** Full FRAGMENT shader for a MATERIAL-kind shader (procedural surface + GGX lighting). */
function buildMaterialProgram(def: ShaderDef, withValues = false): string {
  return `precision highp float;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec3 vViewW;
${COMMON_UNIFORMS}
${declareUniforms(def.uniforms, withValues)}
${GLSL_HELPERS}
${MATERIAL_GENERATORS}

${def.material}

void main(){
  vec3 albedo; float rough; float metal;
  material(vUv, vPosW, normalize(vNormalW), albedo, rough, metal);

  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewW);
  vec3 L = normalize(vec3(0.5, 0.85, 0.45));
  vec3 H = normalize(L + V);
  float NdotL = max(dot(N, L), 0.0);
  float NdotV = max(dot(N, V), 0.0) + 1e-4;
  float NdotH = max(dot(N, H), 0.0);

  float a2 = max(rough*rough, 0.015); a2 *= a2;
  float denom = NdotH*NdotH*(a2 - 1.0) + 1.0;
  float D = a2 / (PI * denom * denom);
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - NdotV, 5.0);

  vec3 specCol = F * D;
  vec3 diff = albedo * (1.0 - metal) * NdotL;
  vec3 sky = vec3(0.5, 0.6, 0.75), grnd = vec3(0.2, 0.18, 0.15);
  vec3 amb = mix(grnd, sky, N.y*0.5 + 0.5) * albedo * 0.4;

  vec3 col = amb + diff + specCol * NdotL * 4.0;
  col += F0 * pow(1.0 - NdotV, 3.0) * metal * 0.5;
  col = pow(col, vec3(0.4545));
  gl_FragColor = vec4(col, 1.0);
}`
}

/** Vertex shader source for any shader kind. Pass withValues to embed current
 *  parameter values as comments (used for code export so it reflects live edits). */
export function buildVertex(def: ShaderDef, withValues = false): string {
  if (def.kind === 'vertex') return buildVertexProgram(def, withValues)
  if (def.kind === 'material') return MATERIAL_VERTEX.trim()
  return VERTEX_SHADER.trim()
}

/** Fragment shader source for any shader kind. Pass withValues to embed current
 *  parameter values as comments. */
export function buildFragment(def: ShaderDef, withValues = false): string {
  if (def.kind === 'vertex') return VERTEX_FRAGMENT
  if (def.kind === 'material') return buildMaterialProgram(def, withValues)
  return buildFragmentProgram(def, withValues)
}

export interface ThreeUniform {
  value: unknown
}

/** Build the THREE.ShaderMaterial uniform object from a uniform map (+ globals). */
export function buildUniformValues(uniforms: UniformMap): Record<string, ThreeUniform> {
  const out: Record<string, ThreeUniform> = {
    uTime: { value: 0 },
    uResolution: { value: [1, 1] },
    uMouse: { value: [0.5, 0.5] },
  }
  for (const [name, u] of Object.entries(uniforms)) {
    if (u.type === 'color') out[name] = { value: [...u.value] }
    else if (u.type === 'vec2') out[name] = { value: [...u.value] }
    else if (u.type === 'bool') out[name] = { value: u.value }
    else out[name] = { value: u.value }
  }
  return out
}
