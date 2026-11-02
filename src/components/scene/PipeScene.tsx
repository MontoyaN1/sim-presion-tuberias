import { ContactShadows, Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useSimulationModel } from '../../hooks/useSimulationModel'
import { DEFAULT_SOLVER, gaussianPulse, stepWave, waveSpeedAtPressure } from '../../simulation'
import type { Geometry, Material, MaterialId, SolverConfig, WaveField } from '../../simulation/types'
import { useSimulationStore } from '../../store/simulationStore'
import { PipeAssembly } from './PipeAssembly'

const NODES = 600
const STEPS_PER_FRAME = 8

function ResponsiveCamera() {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const factor = aspect < 1 ? 1.3 : 1
    camera.position.set(6.9 * factor, 4.1 * factor, 8.3 * factor)
    camera.lookAt(0, 0.2, 0)
    camera.updateProjectionMatrix()
  }, [camera, size])

  return null
}

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
  motionScale,
}: {
  field: WaveField
  config: SolverConfig
  pressure: number
  playing: boolean
  geometry: Geometry
  material: Material
  motionScale: number
}) {
  useFrame(() => {
    if (!playing) return
    const speed = waveSpeedAtPressure(pressure, geometry, material)
    const steps = Math.max(1, Math.round(STEPS_PER_FRAME * motionScale))
    for (let index = 0; index < steps; index += 1) {
      stepWave(field, speed, config, (time) => gaussianPulse(time, config))
    }
  })

  return null
}

export function PipeScene() {
  const { pressure, fluid, material, geometry, acoustic, tof } = useSimulationModel()
  const playing = useSimulationStore((state) => state.playing)
  const boundary = useSimulationStore((state) => state.boundary)
  const field = useSimulationStore((state) => state.field)
  const reduceMotion = usePrefersReducedMotion()
  const motionScale = reduceMotion ? 0.25 : 1

  const stepConfig = useMemo<SolverConfig>(
    () => ({ ...DEFAULT_SOLVER, nodes: NODES, boundary }),
    [boundary],
  )

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow-2xl shadow-black/30 sm:p-5">
      <p className="sr-only">
        Escena 3D de una tubería con cuatro transductores ultrasónicos: dos emisores verdes
        (E1/E2) y dos receptores ámbar (R1/R2), dispuestos en diagonal alrededor de la tubería.
        Dos haces cruzados atraviesan el fluido para medir el tiempo de vuelo. Los paneles
        inferiores contienen las lecturas numéricas.
      </p>
      <div
        className="relative h-[420px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 sm:h-[520px]"
        role="img"
        aria-label="Tubería 3D con cuatro sensores diagonales, dos emisores verdes y dos receptores ámbar, y dos haces ultrasónicos cruzados."
      >
        <Canvas camera={{ position: [6.9, 4.1, 8.3], fov: 40 }} dpr={[1, 2]}>
          <ResponsiveCamera />
          <color attach="background" args={['#040a16']} />
          <fog attach="fog" args={['#040a16', 9, 26]} />
          <ambientLight intensity={0.28} />
          <hemisphereLight args={['#bae6fd', '#020617', 0.5]} />
          <directionalLight position={[6, 9, 5]} intensity={2.2} color="#f8fafc" />
          <directionalLight position={[-6, 5, -5]} intensity={1.2} color="#38bdf8" />
          <spotLight
            position={[-3, 7, 4]}
            angle={0.55}
            penumbra={1}
            intensity={38}
            distance={20}
            color="#e0f2fe"
          />
          <pointLight position={[0, 3, 3.5]} intensity={22} distance={16} color="#e0f2fe" />
          <pointLight position={[-3, -1.5, 3]} intensity={8} distance={10} color="#f59e0b" />
          <pointLight position={[3, 1.2, -2.5]} intensity={12} distance={12} color="#a78bfa" />

          <SimulationDriver
            field={field}
            config={stepConfig}
            pressure={pressure}
            playing={playing}
            geometry={geometry}
            material={material}
            motionScale={motionScale}
          />
          <PipeAssembly
            fluid={fluid}
            field={field}
            amplitude={DEFAULT_SOLVER.amplitude}
            pressure={pressure}
            wallColor={WALL_COLORS[material.id]}
            motionScale={motionScale}
          />

          <ContactShadows
            position={[0, -1.38, 0]}
            opacity={0.55}
            scale={14}
            blur={2.8}
            far={4.5}
            color="#000000"
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
            minDistance={5}
            maxDistance={20}
            minPolarAngle={Math.PI * 0.18}
            maxPolarAngle={Math.PI * 0.55}
            target={[0, 0.2, 0]}
            enableDamping
            dampingFactor={0.08}
            makeDefault
          />
        </Canvas>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
          <div className="min-w-0 rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-2 backdrop-blur sm:px-4 sm:py-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 sm:text-xs">
              Presión
            </div>
            <div className="whitespace-nowrap font-mono text-lg font-semibold text-sky-300 sm:text-2xl">
              {(pressure / 1e6).toFixed(1)} MPa
            </div>
            <div className="mt-1 truncate text-xs text-slate-400 sm:text-sm">
              {fluid.name} · {material.name}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-wider text-emerald-400/80 sm:text-[10px]">
              4 sensores · 2E / 2R
            </div>
          </div>

          <div className="min-w-0 space-y-1 rounded-xl border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-right backdrop-blur sm:px-4 sm:py-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 sm:text-xs">
              c(P)
            </div>
            <div className="whitespace-nowrap font-mono text-sm text-emerald-300 sm:text-lg">
              {acoustic.waveSpeed.toFixed(1)} m/s
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 sm:text-xs">
              TOF
            </div>
            <div className="whitespace-nowrap font-mono text-sm text-amber-300 sm:text-lg">
              {(tof * 1e6).toFixed(2)} µs
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-4 hidden text-xs text-slate-500 sm:block">
          Esquema no a escala · arrastra para rotar · rueda para acercar
        </div>

        <div className="pointer-events-none absolute bottom-3 right-4 space-y-1 rounded-xl border border-slate-700/60 bg-slate-950/75 px-3 py-2 text-[10px] backdrop-blur">
          <div className="flex items-center justify-end gap-1.5 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            E1 · E2 emisores
          </div>
          <div className="flex items-center justify-end gap-1.5 text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            R1 · R2 receptores
          </div>
          <div className="text-slate-500">2 trayectorias cruzadas</div>
        </div>

        {reduceMotion && (
          <div className="pointer-events-none absolute left-4 top-28 rounded-lg border border-slate-700/60 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400">
            Movimiento reducido
          </div>
        )}
      </div>
    </div>
  )
}
