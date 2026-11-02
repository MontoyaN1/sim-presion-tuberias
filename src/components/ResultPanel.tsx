import { useState } from 'react'
import { saveMeasurement } from '../api/metrics'
import { useSimulationModel } from '../hooks/useSimulationModel'
import { useSimulationStore } from '../store/simulationStore'

const MAX_PRESSURE = 10e6

const TONES = {
  emerald: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-400',
    border: 'border-emerald-400/40',
    soft: 'bg-emerald-400/10',
    label: 'Dentro de tolerancia',
  },
  amber: {
    text: 'text-amber-300',
    bg: 'bg-amber-400',
    border: 'border-amber-400/40',
    soft: 'bg-amber-400/10',
    label: 'Vigilar calibración',
  },
  rose: {
    text: 'text-rose-300',
    bg: 'bg-rose-400',
    border: 'border-rose-400/40',
    soft: 'bg-rose-400/10',
    label: 'Fuera de tolerancia',
  },
} as const

type Tone = keyof typeof TONES

function toneFor(errorPercent: number): Tone {
  const value = Math.abs(errorPercent)
  if (value > 5) return 'rose'
  if (value > 2) return 'amber'
  return 'emerald'
}

function ErrorDial({ percent, tone }: { percent: number; tone: Tone }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(percent, 20))
  const filled = (clamped / 20) * circumference
  const palette = TONES[tone]

  return (
    <div className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28 2xl:h-32 2xl:w-32">
      <svg viewBox="0 0 128 128" className={`h-full w-full ${palette.text}`} aria-hidden="true">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 64 64)"
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          error
        </span>
        <span className={`font-mono text-2xl font-bold tabular-nums ${palette.text}`}>
          {percent.toFixed(1)}%
        </span>
        <span className="text-[9px] text-slate-600">escala 0–20 %</span>
      </div>
    </div>
  )
}

function PressureBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  const percent = Math.max(0, Math.min(100, (value / MAX_PRESSURE) * 100))
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs text-slate-400">{label}</span>
        <span className="shrink-0 font-mono text-sm text-slate-200">{(value / 1e6).toFixed(2)} MPa</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-500 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2 sm:px-3">
      <div className="text-[10px] uppercase leading-tight tracking-wider text-slate-500 whitespace-nowrap">{label}</div>
      <div className="mt-0.5 truncate font-mono text-xs text-slate-200 sm:text-sm">{value}</div>
    </div>
  )
}

export function ResultPanel() {
  const { fluid, pressure, estimated, error, relativeError, acoustic, tof, method, amplification, material, geometry, mechanical, phase, phaseShift } =
    useSimulationModel()
  const boundary = useSimulationStore((state) => state.boundary)
  const noise = useSimulationStore((state) => state.noise)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')

  const errorPercent = relativeError * 100
  const absoluteError = Math.abs(errorPercent)
  const tone = toneFor(errorPercent)
  const palette = TONES[tone]
  const amplificationText = Number.isFinite(amplification)
    ? `×${amplification.toFixed(0)}`
    : '—'
  const sign = error >= 0 ? '+' : ''

  async function handleSave() {
    setSaveState('saving')
    setSaveError('')
    try {
      await saveMeasurement({
        label: `Medición ${fluid.name} · ${(pressure / 1e6).toFixed(2)} MPa`,
        fluidId: fluid.id,
        materialId: material.id,
        pressurePa: pressure,
        estimatedPressurePa: estimated,
        errorPa: error,
        relativeError,
        tofS: tof,
        waveSpeedMps: acoustic.waveSpeed,
        referenceSpeedMps: acoustic.referenceSpeed,
        phaseRad: phase,
        phaseShiftRad: phaseShift,
        hoopStressPa: mechanical.hoopStress,
        method,
        noise,
        innerRadiusM: geometry.innerRadius,
        wallThicknessM: geometry.wallThickness,
        boundary,
        amplification: Number.isFinite(amplification) ? amplification : null,
      })
      setSaveState('saved')
    } catch (saveFailure) {
      setSaveState('error')
      setSaveError(saveFailure instanceof Error ? saveFailure.message : 'No se pudo guardar')
    }
  }

  return (
    <section
      className={`relative self-start overflow-hidden rounded-2xl border bg-slate-900/70 p-4 shadow-2xl shadow-black/30 sm:p-5 ${palette.border}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${palette.bg}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Resultado de la medición
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            P̂ frente a P real · {material.name.toLowerCase()}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${palette.border} ${palette.soft} ${palette.text}`}
        >
          {palette.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            Error de estimación
          </div>
          <div
            className={`mt-1 font-mono text-4xl font-black leading-none tabular-nums sm:text-5xl 2xl:text-7xl ${palette.text}`}
            aria-live="polite"
          >
            {errorPercent.toFixed(1)}
            <span className="text-xl sm:text-2xl 2xl:text-3xl">%</span>
          </div>
          <div className="mt-2 text-sm text-slate-400">
            ΔP ={' '}
            <span className="font-mono text-slate-200">
              {sign}
              {(error / 1e6).toFixed(2)} MPa
            </span>
          </div>
        </div>
        <ErrorDial percent={absoluteError} tone={tone} />
      </div>

      <div className="mt-5 space-y-4">
        <PressureBar label="Presión real" value={pressure} color="bg-slate-400" />
        <PressureBar
          label={`Presión estimada (${method === 'tof' ? 'TOF' : 'desfase'})`}
          value={estimated}
          color={palette.bg}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Chip label="TOF" value={`${(tof * 1e6).toFixed(2)} µs`} />
        <Chip label="c(P)" value={`${acoustic.waveSpeed.toFixed(0)} m/s`} />
        <Chip label="Amplif." value={amplificationText} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saveState === 'saving'}
          className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {saveState === 'saving' ? 'Guardando…' : 'Guardar medición'}
        </button>
        <span
          className={`text-xs ${saveState === 'error' ? 'text-rose-300' : 'text-slate-500'}`}
          aria-live="polite"
        >
          {saveState === 'saved' && 'Guardada en SQLite'}
          {saveState === 'error' && saveError}
        </span>
      </div>
    </section>
  )
}
