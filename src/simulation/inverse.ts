import { pressureFromToF, pressureFromWaveSpeed, waveSpeedAtPressure } from './physics'
import type { Geometry, Material } from './types'

export function pressureFromTimeOfFlight(
  tof: number,
  geometry: Geometry,
  material: Material,
): number {
  return pressureFromToF(tof, geometry, material)
}

export function pressureFromPhase(
  deltaPhase: number,
  frequency: number,
  geometry: Geometry,
  material: Material,
): number {
  const omega = 2 * Math.PI * frequency
  const waveSpeed = (omega * geometry.length) / deltaPhase
  return pressureFromWaveSpeed(waveSpeed, geometry, material)
}

export function timeOfFlight(
  pressure: number,
  geometry: Geometry,
  material: Material,
): number {
  return geometry.length / waveSpeedAtPressure(pressure, geometry, material)
}

export function phaseFromTimeOfFlight(
  tof: number,
  frequency: number,
): number {
  return 2 * Math.PI * frequency * tof
}
