import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { WaveField } from '../../simulation/types'

interface WaveRingsProps {
  field: WaveField
  amplitude: number
  color?: string
  opacity?: number
  count?: number
  length?: number
}

const RING_RADIUS = 0.63

export function WaveRings({
  field,
  amplitude,
  color = '#38bdf8',
  opacity = 0.3,
  count = 90,
  length = 6,
}: WaveRingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const scratchColor = useMemo(() => new THREE.Color(), [])
  const baseColor = useMemo(() => new THREE.Color(color), [color])
  const geometry = useMemo(() => {
    const next = new THREE.TorusGeometry(RING_RADIUS, 0.007, 8, 48)
    next.rotateY(Math.PI / 2)
    return next
  }, [])
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [opacity],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let index = 0; index < count; index += 1) {
      scratchColor.setRGB(0, 0, 0)
      mesh.setColorAt(index, scratchColor)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [count, scratchColor])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const nodes = field.u.length
    for (let index = 0; index < count; index += 1) {
      const node = Math.floor((index / (count - 1)) * (nodes - 1))
      const value = Math.abs(field.u[node]) / amplitude
      const intensity = Math.min(value, 1)
      const bulge = 1 + Math.min(value, 1.25) * 0.07
      dummy.position.set((index / (count - 1) - 0.5) * length, 0, 0)
      dummy.scale.set(bulge, bulge, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
      scratchColor.copy(baseColor).multiplyScalar(0.08 + intensity * 0.92)
      mesh.setColorAt(index, scratchColor)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />
}
