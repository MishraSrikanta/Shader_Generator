import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import { buildFragment, buildUniformValues, buildVertex } from '../shaders/build'
import type { GeometryKind } from '../store/useStore'

// Vertex (deformation) shaders need a dense mesh; fragment shaders barely subdivide.
function makeGeometry(kind: GeometryKind, dense: boolean): THREE.BufferGeometry {
  const s = dense
  switch (kind) {
    case 'sphere':
      return new THREE.SphereGeometry(1.2, s ? 160 : 64, s ? 160 : 64)
    case 'cube':
      return new THREE.BoxGeometry(1.8, 1.8, 1.8, s ? 64 : 8, s ? 64 : 8, s ? 64 : 8)
    case 'torus':
      return new THREE.TorusGeometry(1, 0.42, s ? 128 : 48, s ? 256 : 96)
    case 'cylinder':
      return new THREE.CylinderGeometry(1, 1, 2, s ? 128 : 48, s ? 64 : 1, true)
    case 'plane':
    default:
      return new THREE.PlaneGeometry(2.6, 2.6, s ? 200 : 1, s ? 200 : 1)
  }
}

export default function ShaderMesh() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const { size } = useThree()

  const activeId = useStore((s) => s.activeId)
  const geometry = useStore((s) => s.geometry)
  const wireframe = useStore((s) => s.wireframe)
  const autoRotate = useStore((s) => s.autoRotate)
  const paused = useStore((s) => s.paused)
  const def = useStore((s) => s.active())

  const isVertex = def.kind === 'vertex'

  // rebuild material when the shader changes
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: buildUniformValues(def.uniforms),
      vertexShader: buildVertex(def),
      fragmentShader: buildFragment(def),
      side: THREE.DoubleSide,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  const geo = useMemo(() => makeGeometry(geometry, isVertex), [geometry, isVertex])

  useFrame((state, delta) => {
    const u = material.uniforms
    if (!paused) u.uTime.value = state.clock.elapsedTime
    u.uResolution.value = [size.width, size.height]
    const m = state.pointer
    u.uMouse.value = [m.x * 0.5 + 0.5, m.y * 0.5 + 0.5]
    // pull live uniform values from the store
    const live = useStore.getState().uniforms
    for (const [k, val] of Object.entries(live)) {
      if (u[k]) u[k].value = Array.isArray(val.value) ? [...val.value] : val.value
    }
    material.wireframe = wireframe
    if (autoRotate && meshRef.current && geometry !== 'plane') {
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15
    }
  })

  return (
    <mesh ref={meshRef} geometry={geo}>
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  )
}
