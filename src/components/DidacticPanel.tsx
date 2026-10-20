import type { ReactNode } from 'react'
import { useSimulationModel } from '../hooks/useSimulationModel'
import { DEFAULT_SOLVER } from '../simulation'
import { useSimulationStore } from '../store/simulationStore'

interface Step {
  title: string
  equation: ReactNode
  description: string
}

const STEPS: Step[] = [
  {
    title: 'Esfuerzo',
    equation: (
      <>
        σ<sub>θ</sub> = P·r / t
      </>
    ),
    description:
      'La presión interna genera un esfuerzo circunferencial en la pared. A mayor radio o menor espesor, mayor esfuerzo.',
  },
  {
    title: 'Velocidad',
    equation: (
      <>
        c = c<sub>0</sub> · (1 + α·σ<sub>θ</sub>)
      </>
    ),
    description:
      'El esfuerzo modifica la velocidad de la onda en el material (efecto acustoelástico). En el acero la variación es de ~1 %.',
  },
  {
    title: 'Tiempo de vuelo',
    equation: (
      <>
        TOF = L / c
      </>
    ),
    description:
      'La onda recorre el tramo de medición L. El tiempo de vuelo es inversamente proporcional a la velocidad.',
  },
  {
    title: 'Inversión',
    equation: (
      <>
        P̂ = (t / (α·r)) · (c / c<sub>0</sub> − 1)
      </>
    ),
    description:
      'Al despejar la presión, un error pequeño en c se amplifica por 1/(ασθ). Es la etapa más sensible de la cadena.',
  },
]

export function DidacticPanel() {
  const didactic = useSimulationStore((state) => state.didactic)
  const step = useSimulationStore((state) => state.step)
  const setStep = useSimulationStore((state) => state.setStep)
  const {
    pressure,
    geometry,
    material,
    mechanical,
    acoustic,
    tof,
    estimated,
    relativeError,
    amplification,
  } = useSimulationModel()

  if (!didactic) return null

  const current = STEPS[step]
  const values = (() => {
    switch (step) {
      case 0:
        return [
          { label: 'P', value: `${(pressure / 1e6).toFixed(2)} MPa` },
          { label: 'r', value: `${(geometry.innerRadius * 1000).toFixed(0)} mm` },
          { label: 't', value: `${(geometry.wallThickness * 1000).toFixed(1)} mm` },
          { label: 'σθ', value: `${(mechanical.hoopStress / 1e6).toFixed(2)} MPa` },
        ]
      case 1:
        return [
          { label: 'c0', value: `${acoustic.referenceSpeed.toFixed(1)} m/s` },
          {
            label: 'α·σθ',
            value: `${(material.acoustoelastic * mechanical.hoopStress * 100).toFixed(2)} %`,
          },
          { label: 'c', value: `${acoustic.waveSpeed.toFixed(1)} m/s` },
          { label: 'Δc', value: `${acoustic.deltaSpeed.toFixed(1)} m/s` },
        ]
      case 2:
        return [
          { label: 'L', value: `${geometry.length.toFixed(2)} m` },
          { label: 'c', value: `${acoustic.waveSpeed.toFixed(1)} m/s` },
          { label: 'f', value: `${(DEFAULT_SOLVER.frequency / 1000).toFixed(0)} kHz` },
          { label: 'TOF', value: `${(tof * 1e6).toFixed(2)} µs` },
        ]
      default:
        return [
          { label: 'P̂', value: `${(estimated / 1e6).toFixed(2)} MPa` },
          { label: 'P real', value: `${(pressure / 1e6).toFixed(2)} MPa` },
          { label: 'Error', value: `${(relativeError * 100).toFixed(1)} %` },
          {
            label: 'Factor',
            value: Number.isFinite(amplification) ? `×${amplification.toFixed(0)}` : '—',
          },
        ]
    }
  })()

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Modo didáctico
        </h2>
        <span className="text-xs text-slate-500">
          Paso {step + 1} de {STEPS.length}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
              step === index
                ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {index + 1}. {item.title}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
        <div className="text-xs uppercase tracking-widest text-sky-400">{current.title}</div>
        <p className="mt-2 font-mono text-xl text-sky-300">{current.equation}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{current.description}</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {values.map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-950/70 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                {item.label}
              </div>
              <div className="mt-0.5 font-mono text-sm text-slate-200">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep(Math.max(0, step - 1))}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={step === STEPS.length - 1}
          onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
          className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </section>
  )
}
