import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import ShaderBackground from '../components/ShaderBackground'
import { SHADERS, getShader } from '../shaders/library'

const HERO_IDS = ['aurora-borealis', 'galaxy', 'plasma', 'fbm-clouds']

export default function Landing() {
  const nav = useNavigate()
  const [heroIdx, setHeroIdx] = useState(0)
  const heroDef = useMemo(() => getShader(HERO_IDS[heroIdx]), [heroIdx])

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <ShaderBackground def={heroDef} />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-bg/10 to-bg/80" />

      {/* nav */}
      <header className="absolute top-0 z-10 flex w-full items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent shadow-glow">◈</span>
          Shader<span className="text-accent2">Studio</span>
        </div>
        <nav className="hidden gap-6 text-sm text-muted md:flex">
          <a className="hover:text-white" href="#features">Features</a>
          <a className="hover:text-white" href="#library">Library</a>
          <a
            className="hover:text-white"
            href="https://srikantalandingpage.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Portfolio
          </a>
        </nav>
        <button className="btn-primary" onClick={() => nav('/studio')}>
          Open Studio
        </button>
      </header>

      {/* hero */}
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="glass mb-6 rounded-full px-4 py-1.5 text-xs font-medium text-accent2"
        >
          ⚡ Visual GLSL creator — no shader code required
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl"
        >
          Design shaders
          <br />
          <span className="bg-gradient-to-r from-accent via-accent2 to-accent bg-clip-text text-transparent">
            visually, in real time.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-6 max-w-xl text-base text-muted md:text-lg"
        >
          Build, preview and export production-ready GLSL, Three.js and React Three Fiber
          shaders. This entire background is rendered live by the editor.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <button className="btn-primary px-6 py-3 text-base" onClick={() => nav('/studio')}>
            Start Creating →
          </button>
          <button
            className="btn-ghost glass px-6 py-3 text-base"
            onClick={() => nav('/studio')}
          >
            Browse Library
          </button>
        </motion.div>

        {/* hero shader switcher */}
        <div className="mt-12 flex items-center gap-2">
          {HERO_IDS.map((id, i) => (
            <button
              key={id}
              onClick={() => setHeroIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === heroIdx ? 'w-8 bg-accent2' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              title={getShader(id).name}
            />
          ))}
        </div>
      </main>

      {/* feature strip */}
      <div className="absolute bottom-0 z-10 w-full">
        <div className="glass mx-auto mb-3 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-2xl px-6 py-3 text-xs text-muted">
          <span>{SHADERS.length} built-in shaders</span>
          <span className="text-edge">•</span>
          <span>Live 3D preview</span>
          <span className="text-edge">•</span>
          <span>Monaco GLSL editor</span>
          <span className="text-edge">•</span>
          <span>Export to GLSL / Three.js / R3F</span>
        </div>
        <div className="mb-5 flex items-center justify-center gap-3 text-xs text-muted">
          <span>
            Designed by{' '}
            <span className="font-semibold text-white">Srikanta Kumar Mishra</span>
          </span>
          <a
            className="rounded-full border border-edge px-3 py-1 font-medium text-accent2 transition-colors hover:border-accent2 hover:text-white"
            href="https://srikantalandingpage.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Visit my landing page ↗
          </a>
        </div>
        <div className="mb-4 text-center text-[11px] text-muted/70">
          © 2026 Srikanta Kumar Mishra. All rights reserved.
        </div>
      </div>
    </div>
  )
}
