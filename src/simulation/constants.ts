import type { Geometry, Material, SolverConfig } from './types'

export const DEFAULT_GEOMETRY: Geometry = {
  innerRadius: 0.1,
  wallThickness: 0.005,
  length: 1.0,
}

export const MATERIALS: Material[] = [
  {
    id: 'steel',
    name: 'Acero',
    youngModulus: 200e9,
    poisson: 0.3,
    density: 7850,
    acoustoelastic: -1.0e-10,
  },
  {
    id: 'aluminum',
    name: 'Aluminio',
    youngModulus: 69e9,
    poisson: 0.33,
    density: 2700,
    acoustoelastic: -1.5e-10,
  },
  {
    id: 'copper',
    name: 'Cobre',
    youngModulus: 110e9,
    poisson: 0.34,
    density: 8960,
    acoustoelastic: -0.8e-10,
  },
]

export const DEFAULT_MATERIAL = MATERIALS[0]

export const DEFAULT_SOLVER: SolverConfig = {
  nodes: 500,
  courant: 0.9,
  frequency: 200e3,
  pulseWidth: 5e-6,
  amplitude: 1e-6,
  damping: 0,
  maxPressure: 20e6,
}

export const GAS_CONSTANT = 8.314462618
export const DEFAULT_TEMPERATURE = 300
export const MAX_OPERATING_PRESSURE = 10e6
