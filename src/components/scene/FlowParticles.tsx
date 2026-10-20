import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { createRng } from '../../simulation'
import type { ParticleStyle } from './flowStyles'

interface FlowParticlesProps {
  style: ParticleStyle
  length?: number
  motionScale?: number
}

interface FlowData {
  geometry: THREE.BufferGeometry
  positions: Float32Array
  speeds: Float32Array
  phases: Float32Array
  baseY: Float32Array
  baseZ: Float32Array
  count: number
  length: number
}

function advanceParticles(
  data: FlowData,
  elapsed: number,
  delta: number,
  motionScale: number,
  turbulence: number,
) {
  const step = Math.min(delta, 0.05) * motionScale
  const { positions, speeds, phases, baseY, baseZ, count, length } = data

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] += speeds[index] * step
    if (positions[index * 3] > length / 2) positions[index * 3] -= length
    if (turbulence > 0) {
      positions[index * 3 + 1] =
        baseY[index] + Math.sin(elapsed * 1.5 + phases[index]) * turbulence
      positions[index * 3 + 2] =
        baseZ[index] + Math.cos(elapsed * 1.3 + phases[index]) * turbulence
    }
  }

  data.geometry.attributes.position.needsUpdate = true
}

export function FlowParticles({ style, length = 5.6, motionScale = 1 }: FlowParticlesProps) {
  const data = useMemo<FlowData>(() => {
    const rng = createRng(24680)
    const { count, speed } = style
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const phases = new Float32Array(count)
    const baseY = new Float32Array(count)
    const baseZ = new Float32Array(count)

    for (let index = 0; index < count; index += 1) {
      const radius = Math.sqrt(rng()) * 0.46
      const angle = rng() * Math.PI * 2
      const y = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      positions[index * 3] = (rng() - 0.5) * length
      positions[index * 3 + 1] = y
      positions[index * 3 + 2] = z
      speeds[index] = speed * (0.55 + rng() * 0.9)
      phases[index] = rng() * Math.PI * 2
      baseY[index] = y
      baseZ[index] = z
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry, positions, speeds, phases, baseY, baseZ, count, length }
  }, [style, length])

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: style.color,
        size: style.size,
        sizeAttenuation: true,
        transparent: true,
        opacity: style.opacity,
        depthWrite: false,
        blending:
          style.blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
        toneMapped: false,
      }),
    [style],
  )

  useEffect(
    () => () => {
      data.geometry.dispose()
    },
    [data],
  )

  useEffect(
    () => () => {
      material.dispose()
    },
    [material],
  )

  useFrame((state, delta) => {
    advanceParticles(data, state.clock.elapsedTime, delta, motionScale, style.turbulence)
  })

  return <points geometry={data.geometry} material={material} frustumCulled={false} />
}
