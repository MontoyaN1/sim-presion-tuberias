import { describe, expect, it } from 'vitest'
import { DEFAULT_GEOMETRY, DEFAULT_MATERIAL } from '../src/simulation/constants'
import { FLUIDS } from '../src/simulation/fluids'
import {
  errorBudget,
  runMonteCarlo,
  samplePressureEstimates,
  validateFluid,
} from '../src/simulation/validation'

const geometry = DEFAULT_GEOMETRY
const material = DEFAULT_MATERIAL
const baseOptions = {
  fluid: FLUIDS.water,
  material,
  geometry,
  pressures: [5e6],
  trials: 500,
  tofNoise: 0,
  alphaUncertainty: 0,
  c0Uncertainty: 0,
  seed: 123,
}

describe('Monte Carlo', () => {
  it('sin ruido ni incertidumbre el error es despreciable', () => {
    const [stats] = runMonteCarlo(baseOptions)
    expect(stats.rmse).toBeLessThan(1)
    expect(Math.abs(stats.bias)).toBeLessThan(1)
  })

  it('la incertidumbre en alfa aumenta la dispersión', () => {
    const [low] = runMonteCarlo({ ...baseOptions, alphaUncertainty: 0.01 })
    const [high] = runMonteCarlo({ ...baseOptions, alphaUncertainty: 0.1 })
    expect(high.std).toBeGreaterThan(low.std)
  })

  it('el ruido en TOF aumenta el RMSE', () => {
    const [low] = runMonteCarlo({ ...baseOptions, tofNoise: 0.001 })
    const [high] = runMonteCarlo({ ...baseOptions, tofNoise: 0.01 })
    expect(high.rmse).toBeGreaterThan(low.rmse)
  })
})

describe('validación por fluido', () => {
  const options = {
    trials: 300,
    tofNoise: 0.002,
    alphaUncertainty: 0.02,
    c0Uncertainty: 0.01,
    seed: 42,
  }

  it('el agua no tiene error de modelo', () => {
    const result = validateFluid(FLUIDS.water, geometry, material, 1e6, 0.9e6, 0.5, options)
    expect(Math.abs(result.modelError)).toBeLessThan(1)
    expect(result.flow.model).toBe('hagen-poiseuille')
  })

  it('el hidrógeno tiene error de modelo positivo', () => {
    const result = validateFluid(FLUIDS.hydrogen, geometry, material, 1e6, 0.9e6, 0.5, options)
    expect(result.modelError).toBeGreaterThan(0)
    expect(result.flow.model).toBe('compressible-isothermal')
  })

  it('el crudo usa el modelo de líquido', () => {
    const result = validateFluid(FLUIDS.crude, geometry, material, 1e6, 0.9e6, 0.5, options)
    expect(result.flow.model).toBe('hagen-poiseuille')
    expect(Math.abs(result.modelError)).toBeLessThan(1)
  })
})

describe('muestras y presupuesto de error', () => {
  it('devuelve una muestra por corrida y converge a la presión real', () => {
    const samples = samplePressureEstimates({
      pressure: 5e6,
      geometry,
      material,
      trials: 200,
      tofNoise: 0,
      alphaUncertainty: 0,
      c0Uncertainty: 0,
      seed: 123,
    })
    expect(samples).toHaveLength(200)
    const average = samples.reduce((sum, value) => sum + value, 0) / samples.length
    expect(Math.abs(average - 5e6)).toBeLessThan(1)
  })

  it('el presupuesto cierra en la amplificación de la inversión', () => {
    const budget = errorBudget(5e6, geometry, material, 0.0005)
    expect(budget).toHaveLength(5)
    const total = budget.reduce((sum, phase) => sum + phase.contribution, 0)
    const last = budget[budget.length - 1]
    expect(last.cumulative).toBeCloseTo(total, 12)
    expect(last.cumulative).toBeGreaterThan(0.05)
    expect(last.cumulative).toBeLessThan(0.2)
    expect(budget[4].contribution).toBeGreaterThan(budget[0].contribution)
  })
})
