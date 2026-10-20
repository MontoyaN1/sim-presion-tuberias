export type FluidId = 'water' | 'crude' | 'hydrogen'
export type Phase = 'liquid' | 'gas'
export type MaterialId = 'steel' | 'aluminum' | 'copper'
export type FlowModel = 'hagen-poiseuille' | 'compressible-isothermal'
export type BoundaryType = 'absorbing' | 'reflecting'

export interface Fluid {
  id: FluidId
  name: string
  phase: Phase
  density: number
  viscosity: number
  molarMass?: number
  color: string
}

export interface Material {
  id: MaterialId
  name: string
  youngModulus: number
  poisson: number
  density: number
  acoustoelastic: number
}

export interface Geometry {
  innerRadius: number
  wallThickness: number
  length: number
}

export interface MechanicalState {
  hoopStress: number
  longitudinalStress: number
  hoopStrain: number
  radialDisplacement: number
}

export interface AcousticState {
  referenceSpeed: number
  waveSpeed: number
  deltaSpeed: number
  relativeChange: number
}

export interface FlowState {
  pressureDrop: number
  volumetricFlow: number
  meanVelocity: number
  maxVelocity: number
  reynolds: number
  laminar: boolean
  model: FlowModel
}

export interface ModelComparison {
  truePressure: number
  incompressiblePressure: number
  modelError: number
}

export interface SolverConfig {
  nodes: number
  courant: number
  frequency: number
  pulseWidth: number
  amplitude: number
  damping: number
  maxPressure: number
  boundary: BoundaryType
}

export interface WaveField {
  x: Float32Array
  u: Float32Array
  uPrev: Float32Array
  uNext: Float32Array
  dx: number
  dt: number
  time: number
  steps: number
}

export interface ReceiverTrace {
  times: number[]
  values: number[]
}

export interface Measurement {
  truePressure: number
  tof: number
  waveSpeed: number
  estimatedPressure: number
  error: number
  relativeError: number
}

export interface MonteCarloOptions {
  fluid: Fluid
  material: Material
  geometry: Geometry
  pressures: number[]
  trials: number
  tofNoise: number
  alphaUncertainty: number
  c0Uncertainty: number
  seed?: number
}

export interface PressureStats {
  truePressure: number
  mean: number
  std: number
  bias: number
  rmse: number
  mae: number
  ci95: number
  relativeError: number
}

export interface FluidValidationOptions {
  trials: number
  tofNoise: number
  alphaUncertainty: number
  c0Uncertainty: number
  seed?: number
  temperature?: number
}

export interface FluidValidationResult {
  fluid: Fluid
  truePressure: number
  estimatedPressure: number
  measurementError: number
  modelError: number
  totalError: number
  flow: FlowState
  stats: PressureStats
}
