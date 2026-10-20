import { describe, expect, it } from 'vitest'
import { DEFAULT_GEOMETRY, DEFAULT_MATERIAL } from '../src/simulation/constants'
import { FLUIDS } from '../src/simulation/fluids'
import { runMonteCarlo, validateFluid } from '../src/simulation/validation'

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
