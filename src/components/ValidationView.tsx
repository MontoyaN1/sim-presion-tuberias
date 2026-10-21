import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { listMeasurements, RUNS_CHANGED_EVENT } from '../api/metrics'
import type { MeasurementRun } from '../api/metrics'
import { useSimulationModel } from '../hooks/useSimulationModel'
import { FLUID_LIST, MATERIALS, errorBudget } from '../simulation'
import type { Fluid, FluidId, Material } from '../simulation'
import { useSimulationStore } from '../store/simulationStore'

const PHASE_COLORS = ['#38bdf8', '#22d3ee', '#a78bfa', '#f59e0b', '#f43f5e', '#34d399']
const mpa = (value: number) => (value / 1e6).toFixed(2)

function mean(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[], center: number) {
  if (values.length < 2) return 0
  const variance =
    values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

interface MeasurementGroup {
  fluid: Fluid
  material: Material
  runs: MeasurementRun[]
  count: number
  meanPressure: number
  meanEstimated: number
  bias: number
  rmse: number
  mae: number
  ci95: number
  relativeRmse: number
}

function groupMeasurements(runs: MeasurementRun[]): MeasurementGroup[] {
  const buckets = new Map<string, MeasurementRun[]>()

  for (const run of runs) {
    const key = `${run.fluidId}:${run.materialId}`
    const bucket = buckets.get(key)
    if (bucket) bucket.push(run)
    else buckets.set(key, [run])
  }

  return FLUID_LIST.flatMap((fluid) =>
    MATERIALS.filter((material) => buckets.has(`${fluid.id}:${material.id}`)).map((material) => {
      const groupRuns = buckets.get(`${fluid.id}:${material.id}`) ?? []
      const errors = groupRuns.map((run) => run.errorPa)
      const meanPressure = mean(groupRuns.map((run) => run.pressurePa))
      const meanEstimated = mean(groupRuns.map((run) => run.estimatedPressurePa))
      const bias = mean(errors)
      const rmse = Math.sqrt(mean(errors.map((error) => error ** 2)))
      const mae = mean(errors.map((error) => Math.abs(error)))
      const ci95 = 1.96 * standardDeviation(errors, bias)

      return {
        fluid,
        material,
        runs: groupRuns,
        count: groupRuns.length,
        meanPressure,
        meanEstimated,
        bias,
        rmse,
        mae,
        ci95,
        relativeRmse: meanPressure === 0 ? 0 : rmse / meanPressure,
      }
    }),
  )
}

function buildHistogram(errors: number[], binCount = 24) {
  if (errors.length === 0) return []

  let min = Math.min(...errors)
  let max = Math.max(...errors)
  if (min === max) {
    min -= 0.5
    max += 0.5
  }

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
}

export function ValidationView() {
  const { geometry, material, amplification } = useSimulationModel()
  const noise = useSimulationStore((state) => state.noise)
  const pressure = useSimulationStore((state) => state.pressure)
  const [runs, setRuns] = useState<MeasurementRun[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [histFluid, setHistFluid] = useState<FluidId>('water')

  const loadRuns = useCallback(async () => {
    try {
      const nextRuns = await listMeasurements(100)
      setRuns(nextRuns)
      setStatus('ready')
      setLoadError('')
    } catch (error) {
      setStatus('error')
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la validación')
    }
  }, [])

  useEffect(() => {
    let active = true

    listMeasurements(100)
      .then((nextRuns) => {
        if (!active) return
        setRuns(nextRuns)
        setStatus('ready')
        setLoadError('')
      })
      .catch((error: unknown) => {
        if (!active) return
        setStatus('error')
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la validación')
      })

    const refresh = () => void loadRuns()
    window.addEventListener(RUNS_CHANGED_EVENT, refresh)
    return () => {
      active = false
      window.removeEventListener(RUNS_CHANGED_EVENT, refresh)
    }
  }, [loadRuns])

  const groups = useMemo(() => groupMeasurements(runs), [runs])
  const countsByFluid = useMemo(() => {
    const counts = new Map<FluidId, number>()
    for (const run of runs) counts.set(run.fluidId, (counts.get(run.fluidId) ?? 0) + 1)
    return counts
  }, [runs])

  const availableFluids = FLUID_LIST.filter((fluid) => (countsByFluid.get(fluid.id) ?? 0) > 0)
  const effectiveHistFluid = availableFluids.some((fluid) => fluid.id === histFluid)
    ? histFluid
    : (availableFluids[0]?.id ?? histFluid)

  const histRuns = useMemo(
    () => runs.filter((run) => run.fluidId === effectiveHistFluid),
    [effectiveHistFluid, runs],
  )
  const histFluidInfo = FLUID_LIST.find((fluid) => fluid.id === effectiveHistFluid) ?? FLUID_LIST[0]
  const histogram = useMemo(
    () => buildHistogram(histRuns.map((run) => run.errorPa / 1e6)),
    [histRuns],
  )
  const histBias = mean(histRuns.map((run) => run.errorPa))
  const histRmse = Math.sqrt(mean(histRuns.map((run) => run.errorPa ** 2)))

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

  const amplificationText = Number.isFinite(amplification)
    ? `×${amplification.toFixed(0)}`
    : '—'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Validación con mediciones guardadas
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Datos de SQLite · se actualiza al guardar o eliminar mediciones
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {status === 'ready'
                ? `${runs.length} ${runs.length === 1 ? 'medición' : 'mediciones'}`
                : 'Cargando…'}
            </span>
            <button
              type="button"
              onClick={() => void loadRuns()}
              className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Actualizar
            </button>
          </div>
        </div>

        {status === 'error' && (
          <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200" aria-live="polite">
            {loadError}. Comprueba que la API esté corriendo con `npm run dev`.
          </p>
        )}

        {status !== 'error' && runs.length === 0 && (
          <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Todavía no hay mediciones guardadas. Ve a <strong className="text-slate-200">Simulación</strong>,
            ajusta presión, fluido, material y geometría, y pulsa <strong className="text-slate-200">Guardar medición</strong>.
          </p>
        )}

        {runs.length > 0 && (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="pb-2 pr-3 font-medium">Fluido</th>
                    <th className="pb-2 pr-3 font-medium">Material</th>
                    <th className="pb-2 pr-3 font-medium">N</th>
                    <th className="pb-2 pr-3 font-medium">P real</th>
                    <th className="pb-2 pr-3 font-medium">P̂ media</th>
                    <th className="pb-2 pr-3 font-medium">Sesgo</th>
                    <th className="pb-2 pr-3 font-medium">RMSE</th>
                    <th className="pb-2 pr-3 font-medium">MAE</th>
                    <th className="pb-2 pr-3 font-medium">IC 95 %</th>
                    <th className="pb-2 font-medium">Error RMSE</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => {
                    const errorPercent = group.relativeRmse * 100
                    const errorClass =
                      Math.abs(errorPercent) > 10
                        ? 'text-rose-400'
                        : Math.abs(errorPercent) > 5
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                    return (
                      <tr
                        key={`${group.fluid.id}:${group.material.id}`}
                        className="border-t border-slate-800/80"
                      >
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-2 text-slate-200">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: group.fluid.color }}
                            />
                            {group.fluid.name}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-400">{group.material.name}</td>
                        <td className="py-2 pr-3 font-mono text-slate-400">{group.count}</td>
                        <td className="py-2 pr-3 font-mono text-slate-400">
                          {mpa(group.meanPressure)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-sky-300">
                          {mpa(group.meanEstimated)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-slate-400">
                          {mpa(group.bias)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-slate-300">
                          {mpa(group.rmse)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-slate-300">
                          {mpa(group.mae)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-slate-400">
                          ±{mpa(group.ci95)}
                        </td>
                        <td className={`py-2 font-mono font-semibold ${errorClass}`}>
                          {errorPercent.toFixed(1)} %
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Cada fila agrupa las mediciones guardadas por fluido y material. Sesgo, RMSE, MAE e
              IC 95 % se calculan sobre el error P̂ − P real; por eso los valores cambian al variar
              presión, geometría, ruido o material. El histograma usa la dispersión de esos errores.
            </p>
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Presupuesto de error actual
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
                    <Cell key={row.phase} fill={PHASE_COLORS[index] ?? '#38bdf8'} />
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
            total. Este bloque sí usa la configuración actual de la simulación.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Histograma de mediciones
            </h2>
            <select
              value={effectiveHistFluid}
              onChange={(event) => setHistFluid(event.target.value as FluidId)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 outline-none focus:border-sky-500"
            >
              {FLUID_LIST.map((fluid) => (
                <option key={fluid.id} value={fluid.id}>
                  {fluid.name} ({countsByFluid.get(fluid.id) ?? 0})
                </option>
              ))}
            </select>
          </div>

          {histogram.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Aún no hay mediciones guardadas para {histFluidInfo.name.toLowerCase()}.
            </p>
          ) : (
            <>
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
                      formatter={(value) => `${Number(value)} mediciones`}
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
                {histRuns.length} {histRuns.length === 1 ? 'medición guardada' : 'mediciones guardadas'} para{' '}
                {histFluidInfo.name.toLowerCase()}. Eje x:
                P̂ − P real (MPa); la línea roja marca error cero. Sesgo {mpa(histBias)} MPa · RMSE{' '}
                {mpa(histRmse)} MPa.
              </p>
            </>
          )}
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
