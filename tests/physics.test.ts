import { describe, expect, it } from 'vitest'
import { DEFAULT_GEOMETRY, DEFAULT_MATERIAL } from '../src/simulation/constants'
import {
  acousticState,
  hoopStrain,
  hoopStress,
  longitudinalStress,
  mechanicalState,
  pressureFromToF,
  pressureFromWaveSpeed,
  radialDisplacement,
  referenceWaveSpeed,
  waveSpeedAtPressure,
} from '../src/simulation/physics'

const geometry = DEFAULT_GEOMETRY
const material = DEFAULT_MATERIAL

describe('estado mecánico', () => {
  it('calcula el esfuerzo circunferencial como P*r/t', () => {
    const pressure = 5e6
    const expected = (pressure * geometry.innerRadius) / geometry.wallThickness
    expect(hoopStress(pressure, geometry)).toBeCloseTo(expected, 6)
  })

  it('el esfuerzo longitudinal es la mitad del circunferencial', () => {
    const pressure = 5e6
    expect(longitudinalStress(pressure, geometry)).toBeCloseTo(
      hoopStress(pressure, geometry) / 2,
      6,
    )
  })

  it('la deformación y el desplazamiento radial son positivos', () => {
    const state = mechanicalState(5e6, geometry, material)
    expect(state.hoopStrain).toBeGreaterThan(0)
    expect(state.radialDisplacement).toBeGreaterThan(0)
    expect(state.radialDisplacement).toBeCloseTo(
      radialDisplacement(state.hoopStrain, geometry),
      12,
    )
    expect(hoopStrain(state.hoopStress, state.longitudinalStress, material)).toBeCloseTo(
      state.hoopStrain,
      12,
    )
  })
})

describe('efecto acustoelástico', () => {
  it('la velocidad de referencia es sqrt(E/rho)', () => {
    expect(referenceWaveSpeed(material)).toBeCloseTo(
      Math.sqrt(material.youngModulus / material.density),
      6,
    )
  })

  it('la velocidad disminuye con la presión para alfa negativo', () => {
    const c0 = waveSpeedAtPressure(0, geometry, material)
    const c1 = waveSpeedAtPressure(5e6, geometry, material)
    expect(c1).toBeLessThan(c0)
    expect(c1 / c0).toBeCloseTo(1 + material.acoustoelastic * hoopStress(5e6, geometry), 10)
  })

  it('el estado acústico reporta el cambio relativo correcto', () => {
    const state = acousticState(5e6, geometry, material)
    expect(state.relativeChange).toBeCloseTo(state.deltaSpeed / state.referenceSpeed, 12)
    expect(state.waveSpeed).toBeCloseTo(state.referenceSpeed + state.deltaSpeed, 12)
  })

  it('la inversión desde velocidad recupera la presión', () => {
    const pressure = 5e6
    const waveSpeed = waveSpeedAtPressure(pressure, geometry, material)
    expect(pressureFromWaveSpeed(waveSpeed, geometry, material) / pressure).toBeCloseTo(1, 9)
  })

  it('la inversión desde TOF recupera la presión', () => {
    const pressure = 5e6
    const waveSpeed = waveSpeedAtPressure(pressure, geometry, material)
    const tof = geometry.length / waveSpeed
    expect(pressureFromToF(tof, geometry, material) / pressure).toBeCloseTo(1, 9)
  })
})
