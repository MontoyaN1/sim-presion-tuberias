import { describe, expect, it } from 'vitest'
import { DEFAULT_GEOMETRY, DEFAULT_TEMPERATURE, GAS_CONSTANT } from '../src/simulation/constants'
import { FLUIDS } from '../src/simulation/fluids'
import {
  compressibleMassFlow,
  flowState,
  gasPressure,
  hagenPoiseuille,
  linearPressure,
  modelComparison,
  pressureAtSection,
} from '../src/simulation/physics'

const geometry = DEFAULT_GEOMETRY

describe('Hagen-Poiseuille', () => {
  it('calcula el caudal volumétrico con la fórmula correcta', () => {
    const fluid = FLUIDS.water
    const pressureDrop = 1e4
    const flow = hagenPoiseuille(fluid, geometry, pressureDrop)
    const expected =
      (Math.PI * Math.pow(geometry.innerRadius, 4) * pressureDrop) /
      (8 * fluid.viscosity * geometry.length)
    expect(flow.volumetricFlow).toBeCloseTo(expected, 12)
    expect(flow.maxVelocity).toBeCloseTo(2 * flow.meanVelocity, 12)
    expect(flow.model).toBe('hagen-poiseuille')
  })

  it('calcula el número de Reynolds', () => {
    const fluid = FLUIDS.water
    const flow = hagenPoiseuille(fluid, geometry, 1e4)
    const expected =
      (fluid.density * flow.meanVelocity * 2 * geometry.innerRadius) / fluid.viscosity
    expect(flow.reynolds).toBeCloseTo(expected, 9)
  })
})

describe('modelo compresible isotérmico', () => {
  it('calcula el flujo másico desde p1 y p2', () => {
    const fluid = FLUIDS.hydrogen
    const p1 = 1e6
    const p2 = 0.9e6
    const massFlow = compressibleMassFlow(fluid, geometry, p1, p2, DEFAULT_TEMPERATURE)
    const diameter = 2 * geometry.innerRadius
    const expected =
      ((Math.PI * Math.pow(diameter, 4)) /
        (256 * fluid.viscosity * geometry.length)) *
      (fluid.molarMass! / (GAS_CONSTANT * DEFAULT_TEMPERATURE)) *
      (p1 * p1 - p2 * p2)
    expect(massFlow).toBeCloseTo(expected, 15)
  })

  it('el perfil de gas es mayor que la interpolación lineal', () => {
    const p1 = 1e6
    const p2 = 0.9e6
    const x = geometry.length / 2
    const gas = gasPressure(p1, p2, x, geometry.length)
    const linear = linearPressure(p1, p2, x, geometry.length)
    expect(gas).toBeGreaterThan(linear)
  })

  it('el agua sigue un perfil lineal', () => {
    const p1 = 1e6
    const p2 = 0.9e6
    const x = geometry.length / 2
    const water = pressureAtSection(FLUIDS.water, geometry, p1, p2, x)
    const linear = linearPressure(p1, p2, x, geometry.length)
    expect(water).toBeCloseTo(linear, 6)
  })

  it('el hidrógeno tiene mayor error de modelo que el agua', () => {
    const p1 = 1e6
    const p2 = 0.9e6
    const x = geometry.length / 2
    const hydrogen = modelComparison(FLUIDS.hydrogen, geometry, p1, p2, x)
    const water = modelComparison(FLUIDS.water, geometry, p1, p2, x)
    expect(hydrogen.modelError).toBeGreaterThan(0)
    expect(Math.abs(water.modelError)).toBeLessThan(1)
    expect(Math.abs(hydrogen.modelError)).toBeGreaterThan(Math.abs(water.modelError))
  })

  it('flowState despacha al modelo correcto según la fase', () => {
    expect(flowState(FLUIDS.water, geometry, 1e6, 0.9e6).model).toBe('hagen-poiseuille')
    expect(flowState(FLUIDS.hydrogen, geometry, 1e6, 0.9e6).model).toBe(
      'compressible-isothermal',
    )
  })
})
