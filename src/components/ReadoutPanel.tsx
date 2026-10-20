import { useSimulationModel } from '../hooks/useSimulationModel'

function Metric({
  label,
  value,
  accent = 'text-slate-200',
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-lg bg-slate-950/70 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 font-mono text-sm ${accent}`}>{value}</div>
    </div>
  )
}

export function ReadoutPanel() {
  const {
    mechanical,
    acoustic,
    tof,
    phase,
    phaseShift,
    pressure,
    method,
    estimated,
    error,
    relativeError,
    amplification,
  } = useSimulationModel()

  const errorPercent = relativeError * 100
  const errorClass =
    Math.abs(errorPercent) > 5
      ? 'text-rose-400'
      : Math.abs(errorPercent) > 2
        ? 'text-amber-300'
        : 'text-emerald-300'
  const amplificationText = Number.isFinite(amplification)
    ? `×${amplification.toFixed(0)}`
    : '—'
  const sign = (value: number) => (value >= 0 ? '+' : '')

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Lecturas
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Metric
          label="σθ circunferencial"
          value={`${(mechanical.hoopStress / 1e6).toFixed(2)} MPa`}
          accent="text-sky-300"
        />
        <Metric
          label="σL longitudinal"
          value={`${(mechanical.longitudinalStress / 1e6).toFixed(2)} MPa`}
        />
        <Metric
          label="εθ deformación"
          value={`${(mechanical.hoopStrain * 1e6).toFixed(1)} µε`}
        />
        <Metric
          label="Δr radial"
          value={`${(mechanical.radialDisplacement * 1e6).toFixed(2)} µm`}
        />
        <Metric label="c0 referencia" value={`${acoustic.referenceSpeed.toFixed(1)} m/s`} />
        <Metric
          label="c(P) con presión"
          value={`${acoustic.waveSpeed.toFixed(1)} m/s`}
          accent="text-emerald-300"
        />
        <Metric
          label="Δc"
          value={`${sign(acoustic.deltaSpeed)}${acoustic.deltaSpeed.toFixed(1)} m/s`}
        />
        <Metric
          label="Δc / c0"
          value={`${sign(acoustic.relativeChange)}${(acoustic.relativeChange * 100).toFixed(2)} %`}
        />
        <Metric label="TOF" value={`${(tof * 1e6).toFixed(2)} µs`} accent="text-amber-300" />
        <Metric label="φ acumulada" value={`${phase.toFixed(0)} rad`} />
        <Metric
          label="Δφ por presión"
          value={`${(phaseShift * 180) / Math.PI >= 0 ? '+' : ''}${((phaseShift * 180) / Math.PI).toFixed(1)}°`}
        />
        <Metric
          label="Amplificación"
          value={amplificationText}
          accent="text-rose-300"
        />
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">P real</span>
          <span className="font-mono text-slate-200">{(pressure / 1e6).toFixed(2)} MPa</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-slate-400">
            P̂ ({method === 'tof' ? 'TOF' : 'desfase'})
          </span>
          <span className="font-mono text-sky-300">{(estimated / 1e6).toFixed(2)} MPa</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2 text-sm">
          <span className="text-slate-400">Error</span>
          <span className={`font-mono font-semibold ${errorClass}`}>
            {(error / 1e6).toFixed(2)} MPa ({errorPercent.toFixed(1)} %)
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        La inversión amplifica el error de velocidad por 1/(ασθ) ≈ {amplificationText}. Por eso un
        error de 0.1 % en TOF puede convertirse en ~10 % en presión.
      </p>
    </section>
  )
}
