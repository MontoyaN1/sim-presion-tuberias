import {
  flowState,
  hoopStress,
  modelComparison,
  referenceWaveSpeed,
  waveSpeedAtPressure,
} from './physics'
import type {
  ErrorBudgetPhase,
  Fluid,
  FluidValidationOptions,
  FluidValidationResult,
  Geometry,
  Material,
  Measurement,
  MonteCarloOptions,
  PressureStats,
} from './types'

export function createRng(seed = 12345): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12)
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

interface MeasureOptions {
  truePressure: number
  geometry: Geometry
  material: Material
  tofNoise: number
  alphaUncertainty: number
  c0Uncertainty: number
  rng: () => number
}

export function measurePressure(options: MeasureOptions): Measurement {
  const { truePressure, geometry, material, tofNoise, alphaUncertainty, c0Uncertainty, rng } =
    options
  const cTrue = waveSpeedAtPressure(truePressure, geometry, material)
  const tofTrue = geometry.length / cTrue
  const tof = tofTrue * (1 + tofNoise * gaussian(rng))
  const cMeasured = geometry.length / tof
  const alpha = material.acoustoelastic * (1 + alphaUncertainty * gaussian(rng))
  const c0 = referenceWaveSpeed(material) * (1 + c0Uncertainty * gaussian(rng))
  const estimatedPressure =
    (geometry.wallThickness / (alpha * geometry.innerRadius)) * (cMeasured / c0 - 1)
  const error = estimatedPressure - truePressure
  return {
    truePressure,
    tof,
    waveSpeed: cMeasured,
    estimatedPressure,
    error,
    relativeError: truePressure === 0 ? 0 : error / truePressure,
  }
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stddev(values: number[], center: number): number {
  if (values.length < 2) return 0
  return Math.sqrt(values.reduce((a, b) => a + (b - center) ** 2, 0) / (values.length - 1))
}

export function runMonteCarlo(options: MonteCarloOptions): PressureStats[] {
  const rng = createRng(options.seed ?? 12345)
  return options.pressures.map((truePressure) => {
    const estimates: number[] = []
    for (let i = 0; i < options.trials; i++) {
      estimates.push(
        measurePressure({
          truePressure,
          geometry: options.geometry,
          material: options.material,
          tofNoise: options.tofNoise,
          alphaUncertainty: options.alphaUncertainty,
          c0Uncertainty: options.c0Uncertainty,
          rng,
        }).estimatedPressure,
      )
    }
    const m = mean(estimates)
    const std = stddev(estimates, m)
    const bias = m - truePressure
    const rmse = Math.sqrt(mean(estimates.map((e) => (e - truePressure) ** 2)))
    const mae = mean(estimates.map((e) => Math.abs(e - truePressure)))
    return {
      truePressure,
      mean: m,
      std,
      bias,
      rmse,
      mae,
      ci95: 1.96 * std,
      relativeError: truePressure === 0 ? 0 : bias / truePressure,
    }
  })
}

export function validateFluid(
  fluid: Fluid,
  geometry: Geometry,
  material: Material,
  p1: number,
  p2: number,
  sectionFraction: number,
  options: FluidValidationOptions,
): FluidValidationResult {
  const x = sectionFraction * geometry.length
  const comparison = modelComparison(fluid, geometry, p1, p2, x, options.temperature)
  const stats = runMonteCarlo({
    fluid,
    material,
    geometry,
    pressures: [comparison.truePressure],
    trials: options.trials,
    tofNoise: options.tofNoise,
    alphaUncertainty: options.alphaUncertainty,
    c0Uncertainty: options.c0Uncertainty,
    seed: options.seed,
  })[0]
  const flow = flowState(fluid, geometry, p1, p2, options.temperature)
  return {
    fluid,
    truePressure: comparison.truePressure,
    estimatedPressure: stats.mean,
    measurementError: stats.bias,
    modelError: comparison.modelError,
    totalError: stats.bias + comparison.modelError,
    flow,
    stats,
  }
}

export function samplePressureEstimates(
  options: Omit<MonteCarloOptions, 'pressures' | 'fluid'> & { pressure: number },
): number[] {
  const rng = createRng(options.seed ?? 12345)
  const estimates: number[] = []
  for (let i = 0; i < options.trials; i += 1) {
    estimates.push(
      measurePressure({
        truePressure: options.pressure,
        geometry: options.geometry,
        material: options.material,
        tofNoise: options.tofNoise,
        alphaUncertainty: options.alphaUncertainty,
        c0Uncertainty: options.c0Uncertainty,
        rng,
      }).estimatedPressure,
    )
  }
  return estimates
}

export function errorBudget(
  pressure: number,
  geometry: Geometry,
  material: Material,
  noise: number,
): ErrorBudgetPhase[] {
  const stress = hoopStress(pressure, geometry)
  const acousticGain = Math.abs(material.acoustoelastic * stress)

  const pressureTolerance = 0.005
  const radiusTolerance = 0.001
  const thicknessTolerance = 0.002
  const alphaTolerance = 0.02
  const referenceTolerance = 0.0002
  const dispersionTolerance = 0.00002

  if (acousticGain === 0) {
    const total = referenceTolerance + dispersionTolerance + noise
    return [
      { phase: 'Mecánica', contribution: 0, cumulative: 0 },
      { phase: 'Acustoelástica', contribution: referenceTolerance, cumulative: referenceTolerance },
      {
        phase: 'Propagación',
        contribution: dispersionTolerance,
        cumulative: referenceTolerance + dispersionTolerance,
      },
      {
        phase: 'Detección',
        contribution: noise,
        cumulative: referenceTolerance + dispersionTolerance + noise,
      },
      { phase: 'Inversión', contribution: 0, cumulative: total },
    ]
  }

  const stressToSpeed = acousticGain / (1 - acousticGain)
  const mechanicalSpeed =
    stressToSpeed *
    Math.sqrt(
      pressureTolerance ** 2 + radiusTolerance ** 2 + thicknessTolerance ** 2,
    )
  const acousticSpeed = Math.sqrt(
    (stressToSpeed * alphaTolerance) ** 2 + referenceTolerance ** 2,
  )
  const propagationSpeed = dispersionTolerance
  const detectionSpeed = noise
  const totalSpeed =
    mechanicalSpeed + acousticSpeed + propagationSpeed + detectionSpeed
  const inverted = totalSpeed / acousticGain

  return [
    { phase: 'Mecánica', contribution: mechanicalSpeed, cumulative: mechanicalSpeed },
    {
      phase: 'Acustoelástica',
      contribution: acousticSpeed,
      cumulative: mechanicalSpeed + acousticSpeed,
    },
    {
      phase: 'Propagación',
      contribution: propagationSpeed,
      cumulative: mechanicalSpeed + acousticSpeed + propagationSpeed,
    },
    {
      phase: 'Detección',
      contribution: detectionSpeed,
      cumulative: totalSpeed,
    },
    {
      phase: 'Inversión',
      contribution: inverted - totalSpeed,
      cumulative: inverted,
    },
  ]
}
