import { useCallback, useEffect, useState } from 'react'
import {
  deleteMeasurement,
  downloadMeasurementsCsv,
  listMeasurements,
  RUNS_CHANGED_EVENT,
} from '../api/metrics'
import type { MeasurementRun } from '../api/metrics'

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function toneFor(relativeError: number) {
  const error = Math.abs(relativeError * 100)
  if (error > 5) return 'text-rose-300'
  if (error > 2) return 'text-amber-300'
  return 'text-emerald-300'
}

export function HistoryPanel() {
  const [runs, setRuns] = useState<MeasurementRun[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const loadRuns = useCallback(async () => {
    try {
      const nextRuns = await listMeasurements(12)
      setRuns(nextRuns)
      setStatus('ready')
      setError('')
    } catch (loadError) {
      setStatus('error')
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el historial')
    }
  }, [])

  useEffect(() => {
    let active = true

    listMeasurements(12)
      .then((nextRuns) => {
        if (!active) return
        setRuns(nextRuns)
        setStatus('ready')
        setError('')
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setStatus('error')
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el historial')
      })

    const refresh = () => void loadRuns()
    window.addEventListener(RUNS_CHANGED_EVENT, refresh)
    return () => {
      active = false
      window.removeEventListener(RUNS_CHANGED_EVENT, refresh)
    }
  }, [loadRuns])

  async function handleExport() {
    setExporting(true)
    try {
      await downloadMeasurementsCsv()
      setError('')
    } catch (exportError) {
      setStatus('error')
      setError(exportError instanceof Error ? exportError.message : 'No se pudo exportar el CSV')
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteMeasurement(id)
      setRuns((current) => current.filter((run) => run.id !== id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar')
      setStatus('error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <section className="self-start rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Historial SQLite
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {status === 'ready' ? `${runs.length} mediciones recientes` : 'Persistencia local'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => void loadRuns()}
            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            aria-label="Descargar historial en CSV"
            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50"
          >
            {exporting ? 'Generando…' : 'CSV'}
          </button>
        </div>
      </div>

      {status === 'loading' && runs.length === 0 && (
        <p className="mt-4 text-sm text-slate-500" aria-live="polite">
          Cargando historial…
        </p>
      )}

      {status === 'error' && (
        <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200" aria-live="polite">
          {error}. Comprueba que la API esté corriendo con `npm run dev`.
        </p>
      )}

      {status !== 'error' && runs.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          Aún no hay mediciones guardadas. Usa “Guardar medición” en el resultado.
        </p>
      )}

      {runs.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-800">
          {runs.map((run) => (
            <li key={run.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">{run.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {dateFormatter.format(new Date(run.createdAt))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(run.id)}
                  disabled={deleting === run.id}
                  aria-label={`Eliminar ${run.label}`}
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
                >
                  {deleting === run.id ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-slate-400">
                <span>{((run.pressurePa) / 1e6).toFixed(2)} MPa</span>
                <span className={toneFor(run.relativeError)}>
                  error {(run.relativeError * 100).toFixed(2)} %
                </span>
                <span>TOF {(run.tofS * 1e6).toFixed(2)} µs</span>
                <span>{run.method === 'tof' ? 'TOF' : 'Desfase'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
