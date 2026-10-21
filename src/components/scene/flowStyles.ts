import type { FluidId } from '../../simulation/types'

export interface ParticleStyle {
  count: number
  color: string
  size: number
  speed: number
  opacity: number
  blending: 'normal' | 'additive'
  turbulence: number
}

export interface FluidPatternStyle {
  opacity: number
  speed: number
  repeat: [number, number]
  blending: 'normal' | 'additive'
  kind: 'caustics' | 'viscous' | 'gas'
}

export interface FluidVisualStyle {
  color: string
  emissive: string
  emissiveIntensity: number
  opacity: number
  roughness: number
  metalness: number
  clearcoat: number
  ringColor: string
  pulseColor: string
  pulseDuration: number
  pattern: FluidPatternStyle
  particles: ParticleStyle
}

export const FLUID_VISUALS: Record<FluidId, FluidVisualStyle> = {
  water: {
    color: '#1e40af',
    emissive: '#0ea5e9',
    emissiveIntensity: 0.04,
    opacity: 0.42,
    roughness: 0.06,
    metalness: 0.05,
    clearcoat: 0.9,
    ringColor: '#38bdf8',
    pulseColor: '#7dd3fc',
    pulseDuration: 1.3,
    pattern: {
      opacity: 0.5,
      speed: 0.09,
      repeat: [1.4, 2.4],
      blending: 'additive',
      kind: 'caustics',
    },
    particles: {
      count: 320,
      color: '#bae6fd',
      size: 0.022,
      speed: 1.8,
      opacity: 0.8,
      blending: 'normal',
      turbulence: 0.012,
    },
  },
  crude: {
    color: '#140b04',
    emissive: '#7c2d12',
    emissiveIntensity: 0.03,
    opacity: 0.96,
    roughness: 0.85,
    metalness: 0.1,
    clearcoat: 0,
    ringColor: '#f59e0b',
    pulseColor: '#fbbf24',
    pulseDuration: 2.4,
    pattern: {
      opacity: 0.62,
      speed: 0.025,
      repeat: [1, 2],
      blending: 'normal',
      kind: 'viscous',
    },
    particles: {
      count: 110,
      color: '#d97706',
      size: 0.05,
      speed: 0.4,
      opacity: 0.5,
      blending: 'normal',
      turbulence: 0.004,
    },
  },
  hydrogen: {
    color: '#6ee7b7',
    emissive: '#22c55e',
    emissiveIntensity: 0.2,
    opacity: 0.14,
    roughness: 0.05,
    metalness: 0,
    clearcoat: 0,
    ringColor: '#4ade80',
    pulseColor: '#bbf7d0',
    pulseDuration: 0.9,
    pattern: {
      opacity: 0.26,
      speed: 0.22,
      repeat: [2, 5],
      blending: 'additive',
      kind: 'gas',
    },
    particles: {
      count: 300,
      color: '#d9f99d',
      size: 0.02,
      speed: 3.4,
      opacity: 0.75,
      blending: 'additive',
      turbulence: 0.04,
    },
  },
}
