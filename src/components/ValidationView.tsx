import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSimulationModel } from '../hooks/useSimulationModel'
import {
  FLUID_LIST,
  errorBudget,
  samplePressureEstimates,
  validateFluid,
} from '../simulation'
import type { FluidId } from '../simulation'
import { useSimulationStore } from '../store/simulationStore'

const P1 = 10e6
const P2 = 8e6
const SECTION = 0.5
const TRIALS = 500
const ALPHA_TOLERANCE = 0.02
const C0_TOLERANCE = 0.0002
const PHASE_COLORS = ['#38bdf8', '#22d3ee', '#a78bfa', '#f59e0b', '#f43f5e', '#34d399']

const mpa = (value: number) => (value / 1e6).toFixed(2)

export function ValidationView() {
  const { geometry, material, amplification } = useSimulationModel()
  const noise = useSimulationStore((state) => state.noise)
  const pressure = useSimulationStore((state) => state.pressure)
  const [histFluid, setHistFluid] = useState<FluidId>('water')

  const results = useMemo(
    () =>
      FLUID_LIST.map((fluid) =>
        validateFluid(fluid, geometry, material, P1, P2, SECTION, {
          trials: TRIALS,
          tofNoise: noise,
          alphaUncertainty: ALPHA_TOLERANCE,
          c0Uncertainty: C0_TOLERANCE,
          seed: 12345,
          temperature: 300,
        }),
      ),
    [geometry, material, noise],
  )

  const budget = useMemo(
    () => errorBudget(pressure, geometry, material, noise),
    [pressure, geometry, material, noise],
  )

  const waterfall = useMemo(() => {
    const rows = budget.map((phase) => ({
      phase: phase.phase,
      base: (phase.cumulative - phase.contribution) * 100,
      delta: phase.contribution * 100,
      cumulative: phase.cumulative * 100,
    }))
    const total = budget[budget.length - 1]?.cumulative ?? 0
    rows.push({ phase: 'Total', base: 0, delta: total * 100, cumulative: total * 100 })
    return rows
  }, [budget])

  const histResult = results.find((result) => result.fluid.id === histFluid) ?? results[0]

  const estimates = useMemo(
    () =>
      samplePressureEstimates({
        pressure: histResult.truePressure,
        geometry,
        material,
        trials: 1000,
        tofNoise: noise,
        alphaUncertainty: ALPHA_TOLERANCE,
        c0Uncertainty: C0_TOLERANCE,
        seed: 12345,
      }),
    [histResult.truePressure, geometry, material, noise],
  )

  const histogram = useMemo(() => {
    const errors = estimates.map((estimate) => (estimate - histResult.truePressure) / 1e6)
    let min = Math.min(...errors)
    let max = Math.max(...errors)
    if (min === max) {
      min -= 0.5
      max += 0.5
    }
    const binCount = 24
    const binWidth = (max - min) / binCount
    const bins = Array.from({ length: binCount }, (_, index) => ({
      center: min + (index + 0.5) * binWidth,
      count: 0,
    }))
    for (const error of errors) {
      const index = Math.min(binCount - 1, Math.max(0, Math.floor((error - min) / binWidth)))
      bins[index].count += 1
    }
    return bins
  }, [estimates, histResult.truePressure])

  const amplificationText = Number.isFinite(amplification)
    ? `×${amplification.toFixed(0)}`
    : '—'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Validación por fluido
          </h2>
          <p className="text-xs text-slate-500">
            P1 = {(P1 / 1e6).toFixed(1)} MPa · P2 = {(P2 / 1e6).toFixed(1)} MPa · sección 0.5 L
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                <th className="pb-2 pr-3 font-medium">Fluido</th>
                <th className="pb-2 pr-3 font-medium">P real</th>
                <th className="pb-2 pr-3 font-medium">P̂</th>
                <th className="pb-2 pr-3 font-medium">Sesgo</th>
                <th className="pb-2 pr-3 font-medium">RMSE</th>
                <th className="pb-2 pr-3 font-medium">MAE</th>
                <th className="pb-2 pr-3 font-medium">IC 95 %</th>
                <th className="pb-2 pr-3 font-medium">Error modelo</th>
                <th className="pb-2 pr-3 font-medium">Error total</th>
                <th className="pb-2 pr-3 font-medium">Re</th>
                <th className="pb-2 font-medium">Modelo</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const totalError = Math.hypot(result.stats.rmse, result.modelError)
                const totalPercent =
                  result.truePressure === 0 ? 0 : (totalError / result.truePressure) * 100
                const errorClass =
                  Math.abs(totalPercent) > 10
                    ? 'text-rose-400'
                    : Math.abs(totalPercent) > 5
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                return (
                  <tr key={result.fluid.id} className="border-t border-slate-800/80">
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-2 text-slate-200">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: result.fluid.color }}
                        />
                        {result.fluid.name}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-400">
                      {mpa(result.truePressure)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-sky-300">
                      {mpa(result.estimatedPressure)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-400">
                      {mpa(result.stats.bias)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-300">
                      {mpa(result.stats.rmse)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-300">
                      {mpa(result.stats.mae)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-400">
                      ±{mpa(result.stats.ci95)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-400">
                      {mpa(result.modelError)}
                    </td>
                    <td className={`py-2 pr-3 font-mono font-semibold ${errorClass}`}>
                      {totalPercent.toFixed(1)} %
                    </td>
                    <td className="py-2 pr-3 font-mono text-slate-500">
                      {result.flow.reynolds.toExponential(1)}
                    </td>
                    <td className="py-2 font-mono text-slate-500">
                      {result.flow.model === 'hagen-poiseuille' ? 'H-P' : 'Gas ideal'} ·{' '}
                      {result.flow.laminar ? 'lam.' : 'turb.'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {TRIALS} corridas Monte Carlo por fluido con α ±{(ALPHA_TOLERANCE * 100).toFixed(0)} %,
          c0 ±{(C0_TOLERANCE * 100).toFixed(2)} % y ruido TOF de{' '}
          {(noise * 100).toFixed(2)} %. El error total combina la dispersión (RMSE) y el error del
          modelo de flujo (gas ideal vs. incompresible): √(RMSE² + error modelo²). El Re se evalúa
          con el ΔP total y la geometría de laboratorio; con r = 100 mm resulta turbulento, así que
          Hagen-Poiseuille se usa solo como referencia.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Presupuesto de error
            </h2>
            <p className="text-xs text-slate-500">
              P = {(pressure / 1e6).toFixed(2)} MPa · inversión {amplificationText}
            </p>
          </div>

          <div className="mt-4">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={waterfall} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="phase"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  interval={0}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(value) => `${Number(value).toFixed(1)} %`}
                />
                <Tooltip
                  cursor={{ fill: '#1e293b', opacity: 0.35 }}
                  formatter={(value) => `${Number(value).toFixed(3)} %`}
                  contentStyle={{
                    background: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="delta" stackId="waterfall" isAnimationActive={false}>
                  {waterfall.map((row, index) => (
                    <Cell
                      key={row.phase}
                      fill={PHASE_COLORS[index] ?? '#38bdf8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 grid grid-cols-6 gap-1 text-[10px]">
            {waterfall.map((row) => (
              <div key={row.phase} className="min-w-0">
                <div className="truncate text-slate-500">{row.phase}</div>
                <div className="font-mono text-slate-300">{row.delta.toFixed(3)} %</div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Las cuatro primeras barras son errores de la velocidad c (valores en la fila inferior);
            la quinta aplica la amplificación 1/(ασθ) ≈ {amplificationText} y la última es el
            total. Un error minúsculo en c se convierte en un error grande en presión.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Histograma del error
            </h2>
            <select
              value={histFluid}
              onChange={(event) => setHistFluid(event.target.value as FluidId)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 outline-none focus:border-sky-500"
            >
              {FLUID_LIST.map((fluid) => (
                <option key={fluid.id} value={fluid.id}>
                  {fluid.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={histogram} margin={{ top: 8, right: 8, bottom: 8, left: -8 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="center"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(value) => Number(value).toFixed(2)}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#1e293b', opacity: 0.35 }}
                  labelFormatter={(value) => `Error ${Number(value).toFixed(3)} MPa`}
                  formatter={(value) => `${Number(value)} corridas`}
                  contentStyle={{
                    background: '#020617',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#e2e8f0',
                  }}
                />
                <ReferenceLine x={0} stroke="#f43f5e" strokeDasharray="4 4" />
                <Bar dataKey="count" fill="#38bdf8" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            1000 corridas para {histResult.fluid.name}. Eje x: P̂ − P real (MPa); la línea roja marca
            error cero. Sesgo {mpa(histResult.stats.bias)} MPa · RMSE{' '}
            {mpa(histResult.stats.rmse)} MPa.
          </p>
        </section>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Contraste independiente: <code className="text-slate-400">python3 validation/compare.py</code>{' '}
        replica el modelo y el generador aleatorio en Python, compara contra{' '}
        <code className="text-slate-400">validation/ts_results.json</code> y escribe las figuras
        del informe en <code className="text-slate-400">validation/</code>.
      </p>
    </div>
  )
}
