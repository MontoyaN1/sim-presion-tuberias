import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import {
  DEFAULT_GEOMETRY,
  DEFAULT_MATERIAL,
  DEFAULT_SOLVER,
  FLUIDS,
  FLUID_LIST,
  createWaveField,
  gaussianPulse,
  stepWave,
  waveSpeedAtPressure,
} from '../../simulation'
import type { BoundaryType, FluidId, SolverConfig, WaveField } from '../../simulation/types'
import { PipeAssembly } from './PipeAssembly'

const GEOMETRY = DEFAULT_GEOMETRY
const MATERIAL = DEFAULT_MATERIAL
const NODES = 600
const STEPS_PER_FRAME = 8
const READOUT_EVERY = 15
const DEFAULT_PRESSURE = 5e6

interface Readout {
  speed: number
  tof: number
  time: number
}

function SimulationDriver({
  field,
  config,
  pressure,
  playing,
  onReadout,
}: {
  field: WaveField
  config: SolverConfig
  pressure: number
  playing: boolean
  onReadout: (readout: Readout) => void
}) {
  const frame = useRef(0)

  useFrame(() => {
    if (!playing) return
    const speed = waveSpeedAtPressure(pressure, GEOMETRY, MATERIAL)
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      stepWave(field, speed, config, (t) => gaussianPulse(t, config))
    }
    frame.current += 1
    if (frame.current % READOUT_EVERY === 0) {
      onReadout({ speed, tof: GEOMETRY.length / speed, time: field.time })
    }
  })

  return null
}

export function PipeScene() {
  const [field, setField] = useState(() =>
    createWaveField(GEOMETRY, MATERIAL, { ...DEFAULT_SOLVER, nodes: NODES }),
  )
  const [pressure, setPressure] = useState(DEFAULT_PRESSURE)
  const [playing, setPlaying] = useState(true)
  const [boundary, setBoundary] = useState<BoundaryType>('reflecting')
  const [fluidId, setFluidId] = useState<FluidId>('water')
  const [readout, setReadout] = useState<Readout>({ speed: 0, tof: 0, time: 0 })

  const config: SolverConfig = { ...DEFAULT_SOLVER, nodes: NODES, boundary }
  const fluid = FLUIDS[fluidId]

  const reset = () => {
    setField(createWaveField(GEOMETRY, MATERIAL, config))
    setReadout({ speed: 0, tof: 0, time: 0 })
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
      <div className="relative h-[520px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
        <Canvas camera={{ position: [5.2, 3.2, 6.2], fov: 42 }} dpr={[1, 2]}>
          <color attach="background" args={['#020617']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[6, 8, 5]} intensity={1.4} />
          <directionalLight position={[0, 2, 8]} intensity={0.45} />
          <directionalLight position={[-6, 4, -5]} intensity={0.7} color="#38bdf8" />
          <pointLight position={[0, 2, 3]} intensity={14} distance={14} color="#f8fafc" />

          <SimulationDriver
            field={field}
            config={config}
            pressure={pressure}
            playing={playing}
            onReadout={setReadout}
          />
          <PipeAssembly
            fluid={fluid}
            field={field}
            amplitude={DEFAULT_SOLVER.amplitude}
            pressure={pressure}
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
          <div className="mt-1 text-sm text-slate-400">{fluid.name}</div>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 space-y-1 rounded-xl border border-slate-700/60 bg-slate-950/70 px-4 py-3 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-widest text-slate-500">c(P)</div>
          <div className="font-mono text-lg text-emerald-300">{readout.speed.toFixed(1)} m/s</div>
          <div className="text-xs uppercase tracking-widest text-slate-500">TOF</div>
          <div className="font-mono text-lg text-amber-300">
            {(readout.tof * 1e6).toFixed(2)} µs
          </div>
          <div className="text-xs uppercase tracking-widest text-slate-500">t</div>
          <div className="font-mono text-sm text-slate-300">
            {(readout.time * 1e6).toFixed(1)} µs
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Presión
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={pressure / 1e6}
            onChange={(event) => setPressure(Number(event.target.value) * 1e6)}
            className="w-44 accent-sky-400"
          />
          <span className="w-20 text-right font-mono text-slate-200">
            {(pressure / 1e6).toFixed(1)} MPa
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-400">
          Fluido
          <select
            value={fluidId}
            onChange={(event) => setFluidId(event.target.value as FluidId)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
          >
            {FLUID_LIST.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-400">
          Frontera
          <select
            value={boundary}
            onChange={(event) => setBoundary(event.target.value as BoundaryType)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
          >
            <option value="reflecting">Reflejante</option>
            <option value="absorbing">Absorbente</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          {playing ? 'Pausar' : 'Reproducir'}
        </button>

        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
        >
          Reiniciar
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Emisor
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Receptor
        </span>
        <span>Arrastra para rotar · rueda para acercar</span>
      </div>
    </div>
  )
}
