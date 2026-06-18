export type UniformType = 'float' | 'color' | 'vec2' | 'bool'

export interface FloatUniform {
  type: 'float'
  label: string
  value: number
  min: number
  max: number
  step?: number
}
export interface ColorUniform {
  type: 'color'
  label: string
  value: [number, number, number] // 0..1 linear-ish rgb
}
export interface Vec2Uniform {
  type: 'vec2'
  label: string
  value: [number, number]
  min: number
  max: number
  step?: number
}
export interface BoolUniform {
  type: 'bool'
  label: string
  value: boolean
}

export type Uniform = FloatUniform | ColorUniform | Vec2Uniform | BoolUniform

export type UniformMap = Record<string, Uniform>

export type Complexity = 'Low' | 'Medium' | 'High'
export type Performance = 1 | 2 | 3 | 4 | 5

/** 'fragment' = pixel/surface shader (writes color). 'vertex' = mesh deformation
 *  (displaces geometry). 'material' = procedural PBR surface (albedo/roughness/metalness
 *  + shared GGX lighting). */
export type ShaderKind = 'fragment' | 'vertex' | 'material'

export type GeometryKind = 'plane' | 'sphere' | 'cube' | 'torus' | 'cylinder'

export interface ShaderDef {
  id: string
  name: string
  category: string
  description: string
  complexity: Complexity
  performance: Performance // 5 = fastest / lightest
  kind?: ShaderKind // default 'fragment'
  /** FRAGMENT shaders: GLSL body defining `void main()` writing gl_FragColor.
   *  Built-in: uTime, uResolution, uMouse, varying vUv. Custom uniforms auto-declared. */
  fragment?: string
  /** VERTEX shaders: GLSL body of `vec3 displace(vec3 p, vec3 n)` returning the new
   *  object-space position. Built-in: uTime, uMouse + shared noise/rotation helpers.
   *  Custom uniforms auto-declared. Normals are recomputed analytically. */
  displace?: string
  /** MATERIAL shaders: GLSL body of
   *  `void material(vec2 uv, vec3 pos, vec3 nrm, out vec3 albedo, out float rough, out float metal)`.
   *  Built-in: uTime + shared noise/material generators. Custom uniforms auto-declared. */
  material?: string
  /** Geometry to switch to when this shader is selected (vertex shaders look best
   *  on specific surfaces — e.g. waves on a plane, twist on a sphere). */
  preferredGeometry?: GeometryKind
  uniforms: UniformMap
}
