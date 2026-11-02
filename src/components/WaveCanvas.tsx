import { useEffect, useRef, useState } from 'react'
import { DEFAULT_GEOMETRY, DEFAULT_MATERIAL, DEFAULT_SOLVER } from '../simulation/constants'
import { waveSpeedAtPressure } from '../simulation/physics'
import { createWaveField, gaussianPulse, stepWave } from '../simulation/waveSolver'
import type { BoundaryType, SolverConfig, WaveField } from '../simulation/types'

const GEOMETRY = DEFAULT_GEOMETRY
const MATERIAL = DEFAULT_MATERIAL
const NODES = 600
const STEPS_PER_FRAME = 6
const DEFAULT_PRESSURE = 5e6

function buildConfig(boundary: BoundaryType): SolverConfig {
  return { ...DEFAULT_SOLVER, nodes: NODES, boundary }
}

function draw(
  ctx: CanvasRenderingContext2D,
  field: WaveField,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height)

  const centerY = height * 0.5
  const wallHeight = Math.max(24, height * 0.16)
  const wallTop = centerY - wallHeight / 2

  const wallGradient = ctx.createLinearGradient(0, wallTop, 0, wallTop + wallHeight)
  wallGradient.addColorStop(0, '#334155')
  wallGradient.addColorStop(0.5, '#1e293b')
  wallGradient.addColorStop(1, '#334155')
  ctx.fillStyle = wallGradient
  ctx.fillRect(0, wallTop, width, wallHeight)

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(width, centerY)
  ctx.stroke()

  const scale = (height * 0.32) / DEFAULT_SOLVER.amplitude
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (let i = 0; i < field.u.length; i++) {
    const x = (i / (field.u.length - 1)) * width
    const y = centerY - field.u[i] * scale
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  ctx.fillStyle = '#22c55e'
  ctx.fillRect(0, wallTop - 10, 12, wallHeight + 20)
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(width - 12, wallTop - 10, 12, wallHeight + 20)
}

export function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<WaveField | null>(null)
  const configRef = useRef<SolverConfig>(buildConfig('reflecting'))
  const pressureRef = useRef(DEFAULT_PRESSURE)
  const playingRef = useRef(true)
  const frameRef = useRef(0)

  const [pressure, setPressure] = useState(DEFAULT_PRESSURE)
  const [playing, setPlaying] = useState(true)
  const [boundary, setBoundary] = useState<BoundaryType>('reflecting')
  const [readout, setReadout] = useState({ speed: 0, tof: 0, time: 0 })

  useEffect(() => {
    pressureRef.current = pressure
  }, [pressure])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    configRef.current.boundary = boundary
  }, [boundary])

  const reset = () => {
    fieldRef.current = createWaveField(GEOMETRY, MATERIAL, configRef.current)
    frameRef.current = 0
    setReadout({ speed: 0, tof: 0, time: 0 })
  }

  useEffect(() => {
    if (!fieldRef.current) {
      fieldRef.current = createWaveField(GEOMETRY, MATERIAL, configRef.current)
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const render = () => {
      const field = fieldRef.current
      const config = configRef.current
      if (field) {
        const speed = waveSpeedAtPressure(pressureRef.current, GEOMETRY, MATERIAL)
        if (playingRef.current) {
          for (let i = 0; i < STEPS_PER_FRAME; i++) {
            stepWave(field, speed, config, (t) => gaussianPulse(t, config))
          }
        }

        const rect = canvas.getBoundingClientRect()
        const dpr = window.devicePixelRatio || 1
        const width = rect.width
        const height = rect.height
        if (
          canvas.width !== Math.round(width * dpr) ||
          canvas.height !== Math.round(height * dpr)
        ) {
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        draw(ctx, field, width, height)

        frameRef.current += 1
        if (frameRef.current % 6 === 0) {
          setReadout({ speed, tof: GEOMETRY.length / speed, time: field.time })
        }
      }
      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
      <canvas
        ref={canvasRef}
        className="h-[320px] w-full rounded-xl border border-slate-800 bg-slate-950"
      />

      <div className="mt-4 flex flex-wrap items-center gap-4">
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
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-wider text-slate-500">Velocidad c(P)</div>
          <div className="font-mono text-lg text-sky-300">{readout.speed.toFixed(1)} m/s</div>
        </div>
        <div className="rounded-lg bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-wider text-slate-500">TOF teórico</div>
          <div className="font-mono text-lg text-emerald-300">
            {(readout.tof * 1e6).toFixed(2)} µs
          </div>
        </div>
        <div className="rounded-lg bg-slate-950/70 p-3">
          <div className="text-xs uppercase tracking-wider text-slate-500">Tiempo simulado</div>
          <div className="font-mono text-lg text-amber-300">
            {(readout.time * 1e6).toFixed(2)} µs
          </div>
        </div>
      </div>
    </div>
  )
}
