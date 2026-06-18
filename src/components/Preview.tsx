import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Stats } from '@react-three/drei'
import { Suspense } from 'react'
import ShaderMesh from './ShaderMesh'
import { useStore } from '../store/useStore'

export default function Preview() {
  const showGrid = useStore((s) => s.showGrid)
  const showFps = useStore((s) => s.showFps)

  return (
    <div className="relative h-full w-full bg-[#070709]">
      <Canvas
        camera={{ position: [0, 0.4, 3.4], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#070709']} />
        <Suspense fallback={null}>
          <ShaderMesh />
        </Suspense>
        {showGrid && (
          <Grid
            position={[0, -1.4, 0]}
            args={[20, 20]}
            cellColor="#1e1e2a"
            sectionColor="#7c5cff"
            fadeDistance={18}
            infiniteGrid
          />
        )}
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={1.5} maxDistance={10} />
        {showFps && <Stats />}
      </Canvas>
    </div>
  )
}
