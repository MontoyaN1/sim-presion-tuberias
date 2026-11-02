import type { BoundaryType, FluidId, MaterialId } from '../simulation/types'
import type { MeasurementMethod } from '../store/simulationStore'

export const RUNS_CHANGED_EVENT = 'metrics:runs-changed'

export interface MeasurementRunInput {
  label?: string
  fluidId: FluidId
  materialId: MaterialId
  pressurePa: number
  estimatedPressurePa: number
  errorPa: number
  relativeError: number
  tofS: number
  waveSpeedMps: number
  referenceSpeedMps: number
  phaseRad: number
  phaseShiftRad: number
  hoopStressPa: number
  method: MeasurementMethod
  noise: number
  innerRadiusM: number
  wallThicknessM: number
  boundary: BoundaryType
  amplification: number | null
}

export interface MeasurementRun extends MeasurementRunInput {
  id: string
  label: string
  createdAt: string
  appVersion: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error || `Error HTTP ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function saveMeasurement(input: MeasurementRunInput): Promise<MeasurementRun> {
  const run = await request<MeasurementRun>('/api/runs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  window.dispatchEvent(new Event(RUNS_CHANGED_EVENT))
  return run
}

export async function listMeasurements(limit = 12): Promise<MeasurementRun[]> {
  const payload = await request<{ runs: MeasurementRun[] }>(`/api/runs?limit=${limit}`)
  return payload.runs
}

export async function deleteMeasurement(id: string): Promise<void> {
  await request<void>(`/api/runs/${id}`, { method: 'DELETE' })
  window.dispatchEvent(new Event(RUNS_CHANGED_EVENT))
}

export async function downloadMeasurementsCsv(): Promise<void> {
  const response = await fetch('/api/runs/export.csv')
  if (!response.ok) {
    throw new Error(`No se pudo exportar el historial (HTTP ${response.status})`)
  }

  const csv = await response.text()
  const body = csv.charCodeAt(0) === 0xfeff ? csv : `\uFEFF${csv}`
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'mediciones.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
