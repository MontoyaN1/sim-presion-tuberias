import { useMemo } from 'react'
import {
  DEFAULT_GEOMETRY,
  DEFAULT_MATERIAL,
  DEFAULT_SOLVER,
  FLUIDS,
  MATERIALS,
  acousticState,
  createRng,
  gaussian,
  measurePressure,
  mechanicalState,
  phaseFromTimeOfFlight,
  pressureFromPhase,
} from '../simulation'
import { useSimulationStore } from '../store/simulationStore'

export function useSimulationModel() {
  const pressure = useSimulationStore((state) => state.pressure)
  const fluidId = useSimulationStore((state) => state.fluidId)
  const materialId = useSimulationStore((state) => state.materialId)
  const innerRadius = useSimulationStore((state) => state.innerRadius)
  const wallThickness = useSimulationStore((state) => state.wallThickness)
  const noise = useSimulationStore((state) => state.noise)
  const method = useSimulationStore((state) => state.method)

  const fluid = FLUIDS[fluidId]
  const material = MATERIALS.find((item) => item.id === materialId) ?? DEFAULT_MATERIAL
  const geometry = useMemo(
    () => ({ ...DEFAULT_GEOMETRY, innerRadius, wallThickness }),
    [innerRadius, wallThickness],
  )

  const mechanical = mechanicalState(pressure, geometry, material)
  const acoustic = acousticState(pressure, geometry, material)
  const tof = geometry.length / acoustic.waveSpeed
  const phase = phaseFromTimeOfFlight(tof, DEFAULT_SOLVER.frequency)
  const phaseAtZero = phaseFromTimeOfFlight(
    geometry.length / acoustic.referenceSpeed,
    DEFAULT_SOLVER.frequency,
  )
  const phaseShift = phase - phaseAtZero

  const estimated = useMemo(() => {
    if (method === 'tof') {
      return measurePressure({
        truePressure: pressure,
        geometry,
        material,
        tofNoise: noise,
        alphaUncertainty: 0.005,
        c0Uncertainty: 0.0002,
        rng: createRng(12345),
      }).estimatedPressure
    }
    const phaseMeasured = phase * (1 + noise * gaussian(createRng(54321)))
    return pressureFromPhase(phaseMeasured, DEFAULT_SOLVER.frequency, geometry, material)
  }, [geometry, material, method, noise, phase, pressure])

  const error = estimated - pressure
  const relativeError = pressure === 0 ? 0 : error / pressure
  const amplification =
    mechanical.hoopStress === 0
      ? Number.POSITIVE_INFINITY
      : 1 / Math.abs(material.acoustoelastic * mechanical.hoopStress)

  return {
    pressure,
    fluid,
    material,
    geometry,
    mechanical,
    acoustic,
    tof,
    phase,
    phaseShift,
    method,
    estimated,
    error,
    relativeError,
    amplification,
  }
}
