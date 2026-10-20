import { describe, expect, it } from 'vitest'
import { DEFAULT_GEOMETRY, DEFAULT_MATERIAL, DEFAULT_SOLVER } from '../src/simulation/constants'
import { referenceWaveSpeed } from '../src/simulation/physics'
import {
  createTrace,
  createWaveField,
  detectArrival,
  detectPeak,
  gaussianEnvelope,
  record,
  stepWave,
} from '../src/simulation/waveSolver'

const geometry = DEFAULT_GEOMETRY
const material = DEFAULT_MATERIAL
const config = { ...DEFAULT_SOLVER, nodes: 800 }

describe('solver FDTD 1D', () => {
  it('permanece estable bajo la condición CFL', () => {
    const field = createWaveField(geometry, material, config)
    const waveSpeed = referenceWaveSpeed(material)
    for (let i = 0; i < 5000; i++) {
      stepWave(field, waveSpeed, config, (t) => config.amplitude * gaussianEnvelope(t, 4 * config.pulseWidth, config.pulseWidth))
    }
    for (let i = 0; i < field.u.length; i++) {
      expect(Number.isFinite(field.u[i])).toBe(true)
      expect(Math.abs(field.u[i])).toBeLessThan(10 * config.amplitude)
    }
  })

  it('el pulso viaja a la velocidad de onda', () => {
    const field = createWaveField(geometry, material, config)
    const waveSpeed = referenceWaveSpeed(material)
    const center = 4 * config.pulseWidth
    const width = config.pulseWidth
    const source = (t: number) => config.amplitude * gaussianEnvelope(t, center, width)

    let peakTime = 0
    let peakAbs = 0
    const limit = center + 1.5 * (geometry.length / waveSpeed)
    for (let i = 0; i < 20000 && field.time < limit; i++) {
      stepWave(field, waveSpeed, config, source)
      const value = Math.abs(field.u[field.u.length - 1])
      if (value > peakAbs) {
        peakAbs = value
        peakTime = field.time
      }
    }

    const measuredTof = peakTime - center
    const expectedTof = geometry.length / waveSpeed
    expect(peakAbs).toBeGreaterThan(0)
    expect(measuredTof / expectedTof).toBeCloseTo(1, 2)
  })
})

describe('detección de arribo', () => {
  it('detecta el tiempo de un pulso sintético', () => {
    const trace = createTrace()
    const dt = 1e-7
    const center = 1e-5
    const width = 1e-6
    for (let i = 0; i < 200; i++) {
      const t = i * dt
      record(trace, t, Math.exp(-((t - center) ** 2) / (2 * width * width)))
    }
    const threshold = 0.2
    const arrival = detectArrival(trace, threshold)
    const expectedLeadingEdge = center - width * Math.sqrt(2 * Math.log(1 / threshold))
    expect(arrival).not.toBeNull()
    expect(arrival! / expectedLeadingEdge).toBeCloseTo(1, 2)
  })

  it('encuentra el pico máximo', () => {
    const trace = createTrace()
    record(trace, 0, 0)
    record(trace, 1, 0.3)
    record(trace, 2, -0.8)
    record(trace, 3, 0.1)
    const peak = detectPeak(trace)
    expect(peak).not.toBeNull()
    expect(peak!.time).toBe(2)
    expect(peak!.value).toBe(-0.8)
  })
})
