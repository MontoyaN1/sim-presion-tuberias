import { referenceWaveSpeed } from './physics'
import type {
  Geometry,
  Material,
  ReceiverTrace,
  SolverConfig,
  WaveField,
} from './types'

export function createWaveField(
  geometry: Geometry,
  material: Material,
  config: SolverConfig,
): WaveField {
  const nodes = config.nodes
  const dx = geometry.length / (nodes - 1)
  const c0 = referenceWaveSpeed(material)
  const maxStress = (config.maxPressure * geometry.innerRadius) / geometry.wallThickness
  const cMax = c0 * (1 + Math.abs(material.acoustoelastic) * maxStress)
  const dt = (config.courant * dx) / cMax
  const x = new Float32Array(nodes)
  for (let i = 0; i < nodes; i++) x[i] = i * dx
  return {
    x,
    u: new Float32Array(nodes),
    uPrev: new Float32Array(nodes),
    uNext: new Float32Array(nodes),
    dx,
    dt,
    time: 0,
    steps: 0,
  }
}

export function stepWave(
  field: WaveField,
  waveSpeed: number,
  config: SolverConfig,
  source?: (t: number) => number,
): void {
  const n = field.u.length
  const c = Math.min(waveSpeed, (0.99 * field.dx) / field.dt)
  const courant = (c * field.dt) / field.dx
  const courant2 = courant * courant
  const damping = config.damping

  for (let i = 1; i < n - 1; i++) {
    field.uNext[i] =
      2 * field.u[i] -
      field.uPrev[i] +
      courant2 * (field.u[i + 1] - 2 * field.u[i] + field.u[i - 1]) -
      damping * (field.u[i] - field.uPrev[i])
  }

  field.uNext[0] = source ? source(field.time + field.dt) : 0
  if (config.boundary === 'reflecting') {
    field.uNext[n - 1] = 0
  } else {
    field.uNext[n - 1] =
      field.u[n - 2] +
      ((courant - 1) / (courant + 1)) * (field.uNext[n - 2] - field.u[n - 1])
  }

  const tmp = field.uPrev
  field.uPrev = field.u
  field.u = field.uNext
  field.uNext = tmp
  field.time += field.dt
  field.steps += 1
}

export function gaussianEnvelope(t: number, center: number, width: number): number {
  return Math.exp(-((t - center) ** 2) / (2 * width * width))
}

export function gaussianPulse(t: number, config: SolverConfig): number {
  const center = 4 * config.pulseWidth
  return (
    config.amplitude *
    gaussianEnvelope(t, center, config.pulseWidth) *
    Math.sin(2 * Math.PI * config.frequency * t)
  )
}

export function gaussianSource(t: number, config: SolverConfig): number {
  return config.amplitude * gaussianEnvelope(t, 4 * config.pulseWidth, config.pulseWidth)
}

export function createTrace(): ReceiverTrace {
  return { times: [], values: [] }
}

export function record(trace: ReceiverTrace, time: number, value: number): void {
  trace.times.push(time)
  trace.values.push(value)
}

export function detectArrival(trace: ReceiverTrace, threshold: number): number | null {
  for (let i = 1; i < trace.values.length; i++) {
    const v0 = Math.abs(trace.values[i - 1])
    const v1 = Math.abs(trace.values[i])
    if (v1 >= threshold) {
      const denom = v1 - v0
      const frac = denom === 0 ? 0 : (threshold - v0) / denom
      return trace.times[i - 1] + frac * (trace.times[i] - trace.times[i - 1])
    }
  }
  return null
}

export function detectPeak(trace: ReceiverTrace): { time: number; value: number } | null {
  if (trace.values.length === 0) return null
  let best = 0
  for (let i = 1; i < trace.values.length; i++) {
    if (Math.abs(trace.values[i]) > Math.abs(trace.values[best])) best = i
  }
  return { time: trace.times[best], value: trace.values[best] }
}
