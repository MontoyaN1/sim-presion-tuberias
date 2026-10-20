import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { useSimulationModel } from '../../hooks/useSimulationModel'
import { DEFAULT_SOLVER, gaussianPulse, stepWave, waveSpeedAtPressure } from '../../simulation'
import type { Geometry, Material, MaterialId, SolverConfig, WaveField } from '../../simulation/types'
import { useSimulationStore } from '../../store/simulationStore'
import { PipeAssembly } from './PipeAssembly'

const NODES = 600
const STEPS_PER_FRAME = 8

const WALL_COLORS: Record<MaterialId, string> = {
  steel: '#cbd5e1',
  aluminum: '#e2e8f0',
  copper: '#b87333',
}

function SimulationDriver({
  field,
  config,
  pressure,
  playing,
  geometry,
  material,
}: {
  field: WaveField
  config: SolverConfig
  pressure: number
  playing: boolean
  geometry: Geometry
  material: Material
}) {
  useFrame(() => {
    if (!playing) return
    const speed = waveSpeedAtPressure(pressure, geometry, material)
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      stepWave(field, speed, config, (t) => gaussianPulse(t, config))
    }
  })

  return null
}

export function PipeScene() {
  const { pressure, fluid, material, geometry, acoustic, tof } = useSimulationModel()
  const playing = useSimulationStore((state) => state.playing)
  const boundary = useSimulationStore((state) => state.boundary)
  const field = useSimulationStore((state) => state.field)

  const stepConfig = useMemo<SolverConfig>(
    () => ({ ...DEFAULT_SOLVER, nodes: NODES, boundary }),
    [boundary],
  )

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow-2xl shadow-black/30 sm:p-5">
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 sm:h-[520px]">
        <Canvas camera={{ position: [5.2, 3.2, 6.2], fov: 42 }} dpr={[1, 2]}>
          <color attach="background" args={['#020617']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[6, 8, 5]} intensity={1.4} />
          <directionalLight position={[0, 2, 8]} intensity={0.45} />
          <directionalLight position={[-6, 4, -5]} intensity={0.7} color="#38bdf8" />
          <pointLight position={[0, 2, 3]} intensity={14} distance={14} color="#f8fafc" />

          <SimulationDriver
            field={field}
            config={stepConfig}
            pressure={pressure}
            playing={playing}
            geometry={geometry}
            material={material}
          />
          <PipeAssembly
            fluid={fluid}
            field={field}
            amplitude={DEFAULT_SOLVER.amplitude}
            pressure={pressure}
            wallColor={WALL_COLORS[material.id]}
          />

          <Grid
            position={[0, -1.4, 0]}
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.6}
            cellColor="#1e293b"
            sectionSize={2.5}
            sectionThickness={1}
            sectionColor="#334155"
            fadeDistance={25}
            fadeStrength={1.5}
            infiniteGrid
          />

          <OrbitControls
            enablePan={false}
            minDistance={4}
            maxDistance={16}
            minPolarAngle={Math.PI * 0.18}
            maxPolarAngle={Math.PI * 0.55}
            target={[0, 0.4, 0]}
            enableDamping
            dampingFactor={0.08}
            makeDefault
          />
        </Canvas>

        <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-slate-700/60 bg-slate-950/70 px-4 py-3 backdrop-blur">
          <div className="text-xs uppercase tracking-widest text-slate-500">Presión</div>
          <div className="font-mono text-2xl font-semibold text-sky-300">
            {(pressure / 1e6).toFixed(1)} MPa
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {fluid.name} · {material.name}
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 space-y-1 rounded-xl border border-slate-700/60 bg-slate-950/70 px-4 py-3 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-widest text-slate-500">c(P)</div>
          <div className="font-mono text-lg text-emerald-300">
            {acoustic.waveSpeed.toFixed(1)} m/s
          </div>
          <div className="text-xs uppercase tracking-widest text-slate-500">TOF</div>
          <div className="font-mono text-lg text-amber-300">{(tof * 1e6).toFixed(2)} µs</div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-4 text-xs text-slate-500">
          Esquema no a escala · arrastra para rotar · rueda para acercar
        </div>
      </div>
    </div>
  )
}
