import { create } from 'zustand'
import {
  DEFAULT_GEOMETRY,
  DEFAULT_MATERIAL,
  DEFAULT_SOLVER,
  MATERIALS,
  createWaveField,
} from '../simulation'
import type { BoundaryType, FluidId, MaterialId, WaveField } from '../simulation/types'

export type MeasurementMethod = 'tof' | 'phase'

const FIELD_CONFIG = { ...DEFAULT_SOLVER, nodes: 600 }

function buildField(
  innerRadius: number,
  wallThickness: number,
  materialId: MaterialId,
): WaveField {
  const geometry = { ...DEFAULT_GEOMETRY, innerRadius, wallThickness }
  const material = MATERIALS.find((item) => item.id === materialId) ?? DEFAULT_MATERIAL
  return createWaveField(geometry, material, FIELD_CONFIG)
}

interface SimulationStore {
  pressure: number
  fluidId: FluidId
  materialId: MaterialId
  boundary: BoundaryType
  playing: boolean
  didactic: boolean
  step: number
  innerRadius: number
  wallThickness: number
  noise: number
  method: MeasurementMethod
  field: WaveField

  setPressure: (value: number) => void
  setFluidId: (value: FluidId) => void
  setMaterialId: (value: MaterialId) => void
  setBoundary: (value: BoundaryType) => void
  setPlaying: (value: boolean) => void
  togglePlaying: () => void
  setDidactic: (value: boolean) => void
  setStep: (value: number) => void
  setInnerRadius: (value: number) => void
  setWallThickness: (value: number) => void
  setNoise: (value: number) => void
  setMethod: (value: MeasurementMethod) => void
  reset: () => void
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  pressure: 5e6,
  fluidId: 'water',
  materialId: 'steel',
  boundary: 'reflecting',
  playing: true,
  didactic: false,
  step: 0,
  innerRadius: 0.1,
  wallThickness: 0.005,
  noise: 0.0005,
  method: 'tof',
  field: buildField(0.1, 0.005, 'steel'),

  setPressure: (value) => set({ pressure: value }),
  setFluidId: (value) => set({ fluidId: value }),
  setMaterialId: (value) =>
    set((state) => ({
      materialId: value,
      field: buildField(state.innerRadius, state.wallThickness, value),
    })),
  setBoundary: (value) => set({ boundary: value }),
  setPlaying: (value) => set({ playing: value }),
  togglePlaying: () => set((state) => ({ playing: !state.playing })),
  setDidactic: (value) => set({ didactic: value }),
  setStep: (value) => set({ step: value }),
  setInnerRadius: (value) =>
    set((state) => ({
      innerRadius: value,
      field: buildField(value, state.wallThickness, state.materialId),
    })),
  setWallThickness: (value) =>
    set((state) => ({
      wallThickness: value,
      field: buildField(state.innerRadius, value, state.materialId),
    })),
  setNoise: (value) => set({ noise: value }),
  setMethod: (value) => set({ method: value }),
  reset: () =>
    set({
      pressure: 5e6,
      fluidId: 'water',
      materialId: 'steel',
      boundary: 'reflecting',
      playing: true,
      step: 0,
      innerRadius: 0.1,
      wallThickness: 0.005,
      noise: 0.0005,
      method: 'tof',
      field: buildField(0.1, 0.005, 'steel'),
    }),
}))
