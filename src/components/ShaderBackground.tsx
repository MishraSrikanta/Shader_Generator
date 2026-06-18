import { useEffect, useRef } from 'react'
import type { ShaderDef } from '../types'
import { buildFragment, buildUniformValues } from '../shaders/build'

/**
 * Lightweight raw-WebGL fullscreen renderer for a single shader.
 * Used for the landing hero (avoids pulling R3F into the initial bundle).
 */
export default function ShaderBackground({ def }: { def: ShaderDef }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false })
    if (!gl) return

    const vsSrc = `attribute vec2 aPos; varying vec2 vUv;
      void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`
    const fsSrc = buildFragment(def)

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh), src)
      }
      return sh
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const u = buildUniformValues(def.uniforms)
    const locs: Record<string, WebGLUniformLocation | null> = {}
    for (const name of Object.keys(u)) locs[name] = gl.getUniformLocation(prog, name)

    const mouse = { x: 0.5, y: 0.5 }
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth
      mouse.y = 1 - e.clientY / window.innerHeight
    }
    window.addEventListener('mousemove', onMove)

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const setUniform = (name: string, value: unknown) => {
      const l = locs[name]
      if (l === null || l === undefined) return
      if (typeof value === 'number') gl.uniform1f(l, value)
      else if (typeof value === 'boolean') gl.uniform1i(l, value ? 1 : 0)
      else if (Array.isArray(value)) {
        if (value.length === 2) gl.uniform2f(l, value[0], value[1])
        else if (value.length === 3) gl.uniform3f(l, value[0], value[1], value[2])
      }
    }

    const start = performance.now()
    let raf = 0
    const loop = () => {
      const t = (performance.now() - start) / 1000
      for (const [name, obj] of Object.entries(u)) {
        if (name === 'uTime') setUniform(name, t)
        else if (name === 'uMouse') setUniform(name, [mouse.x, mouse.y])
        else if (name === 'uResolution') setUniform(name, [canvas.width, canvas.height])
        else setUniform(name, (obj as { value: unknown }).value)
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', resize)
      gl.deleteProgram(prog)
    }
  }, [def])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />
}
