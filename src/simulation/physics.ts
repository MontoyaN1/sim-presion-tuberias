import { DEFAULT_TEMPERATURE, GAS_CONSTANT } from './constants'
import type {
  AcousticState,
  FlowState,
  Fluid,
  Geometry,
  Material,
  MechanicalState,
  ModelComparison,
} from './types'

export function hoopStress(pressure: number, geometry: Geometry): number {
  return (pressure * geometry.innerRadius) / geometry.wallThickness
}

export function longitudinalStress(pressure: number, geometry: Geometry): number {
  return (pressure * geometry.innerRadius) / (2 * geometry.wallThickness)
}

export function hoopStrain(hoop: number, longitudinal: number, material: Material): number {
  return (hoop - material.poisson * longitudinal) / material.youngModulus
}

export function radialDisplacement(strain: number, geometry: Geometry): number {
  return strain * geometry.innerRadius
}

export function mechanicalState(pressure: number, geometry: Geometry, material: Material): MechanicalState {
  const hoop = hoopStress(pressure, geometry)
  const longitudinal = longitudinalStress(pressure, geometry)
  const strain = hoopStrain(hoop, longitudinal, material)
  return {
    hoopStress: hoop,
    longitudinalStress: longitudinal,
    hoopStrain: strain,
    radialDisplacement: radialDisplacement(strain, geometry),
  }
}

export function referenceWaveSpeed(material: Material): number {
  return Math.sqrt(material.youngModulus / material.density)
}

export function waveSpeedAtPressure(pressure: number, geometry: Geometry, material: Material): number {
  const stress = hoopStress(pressure, geometry)
  return referenceWaveSpeed(material) * (1 + material.acoustoelastic * stress)
}

export function acousticState(pressure: number, geometry: Geometry, material: Material): AcousticState {
  const referenceSpeed = referenceWaveSpeed(material)
  const waveSpeed = waveSpeedAtPressure(pressure, geometry, material)
  return {
    referenceSpeed,
    waveSpeed,
    deltaSpeed: waveSpeed - referenceSpeed,
    relativeChange: (waveSpeed - referenceSpeed) / referenceSpeed,
  }
}

export function pressureFromWaveSpeed(waveSpeed: number, geometry: Geometry, material: Material): number {
  const c0 = referenceWaveSpeed(material)
  return (geometry.wallThickness / (material.acoustoelastic * geometry.innerRadius)) * (waveSpeed / c0 - 1)
}

export function pressureFromToF(tof: number, geometry: Geometry, material: Material): number {
  return pressureFromWaveSpeed(geometry.length / tof, geometry, material)
}

export function hagenPoiseuille(fluid: Fluid, geometry: Geometry, pressureDrop: number): FlowState {
  const radius = geometry.innerRadius
  const area = Math.PI * radius * radius
  const volumetricFlow =
    (Math.PI * Math.pow(radius, 4) * pressureDrop) / (8 * fluid.viscosity * geometry.length)
  const meanVelocity = volumetricFlow / area
  const maxVelocity = 2 * meanVelocity
  const diameter = 2 * radius
  const reynolds = (fluid.density * meanVelocity * diameter) / fluid.viscosity
  return {
    pressureDrop,
    volumetricFlow,
    meanVelocity,
    maxVelocity,
    reynolds,
    laminar: reynolds < 2300,
    model: 'hagen-poiseuille',
  }
}

export function linearPressure(p1: number, p2: number, x: number, length: number): number {
  return p1 - (x / length) * (p1 - p2)
}

export function gasPressure(p1: number, p2: number, x: number, length: number): number {
  const p1sq = p1 * p1
  const p2sq = p2 * p2
  return Math.sqrt(p1sq - (x / length) * (p1sq - p2sq))
}

export function compressibleMassFlow(
  fluid: Fluid,
  geometry: Geometry,
  p1: number,
  p2: number,
  temperature: number = DEFAULT_TEMPERATURE,
): number {
  const diameter = 2 * geometry.innerRadius
  const molarMass = fluid.molarMass ?? 2.016e-3
  return (
    (Math.PI * Math.pow(diameter, 4)) /
    (256 * fluid.viscosity * geometry.length) *
    (molarMass / (GAS_CONSTANT * temperature)) *
    (p1 * p1 - p2 * p2)
  )
}

export function gasFlow(
  fluid: Fluid,
  geometry: Geometry,
  p1: number,
  p2: number,
  temperature: number = DEFAULT_TEMPERATURE,
): FlowState {
  const pressureDrop = p1 - p2
  const massFlow = compressibleMassFlow(fluid, geometry, p1, p2, temperature)
  const molarMass = fluid.molarMass ?? 2.016e-3
  const meanPressure = 0.5 * (p1 + p2)
  const meanDensity = (meanPressure * molarMass) / (GAS_CONSTANT * temperature)
  const volumetricFlow = massFlow / meanDensity
  const area = Math.PI * geometry.innerRadius * geometry.innerRadius
  const meanVelocity = volumetricFlow / area
  const diameter = 2 * geometry.innerRadius
  const reynolds = (meanDensity * meanVelocity * diameter) / fluid.viscosity
  return {
    pressureDrop,
    volumetricFlow,
    meanVelocity,
    maxVelocity: 2 * meanVelocity,
    reynolds,
    laminar: reynolds < 2300,
    model: 'compressible-isothermal',
  }
}

export function flowState(
  fluid: Fluid,
  geometry: Geometry,
  p1: number,
  p2: number,
  temperature: number = DEFAULT_TEMPERATURE,
): FlowState {
  return fluid.phase === 'gas'
    ? gasFlow(fluid, geometry, p1, p2, temperature)
    : hagenPoiseuille(fluid, geometry, p1 - p2)
}

export function pressureAtSection(
  fluid: Fluid,
  geometry: Geometry,
  p1: number,
  p2: number,
  x: number,
  _temperature: number = DEFAULT_TEMPERATURE,
): number {
  return fluid.phase === 'gas'
    ? gasPressure(p1, p2, x, geometry.length)
    : linearPressure(p1, p2, x, geometry.length)
}

export function modelComparison(
  fluid: Fluid,
  geometry: Geometry,
  p1: number,
  p2: number,
  x: number,
  temperature: number = DEFAULT_TEMPERATURE,
): ModelComparison {
  const truePressure = pressureAtSection(fluid, geometry, p1, p2, x, temperature)
  const incompressiblePressure = linearPressure(p1, p2, x, geometry.length)
  return {
    truePressure,
    incompressiblePressure,
    modelError: truePressure - incompressiblePressure,
  }
}
