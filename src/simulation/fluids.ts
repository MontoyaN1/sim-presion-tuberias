import type { Fluid, FluidId } from './types'

export const FLUIDS: Record<FluidId, Fluid> = {
  water: {
    id: 'water',
    name: 'Agua',
    phase: 'liquid',
    density: 1000,
    viscosity: 1.0e-3,
    color: '#3b82f6',
  },
  crude: {
    id: 'crude',
    name: 'Crudo',
    phase: 'liquid',
    density: 900,
    viscosity: 5.0e-2,
    color: '#b45309',
  },
  hydrogen: {
    id: 'hydrogen',
    name: 'Hidrógeno',
    phase: 'gas',
    density: 0.0899,
    viscosity: 8.9e-6,
    molarMass: 2.016e-3,
    color: '#22c55e',
  },
}

export const FLUID_LIST: Fluid[] = Object.values(FLUIDS)
