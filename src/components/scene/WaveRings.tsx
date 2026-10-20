import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { WaveField } from '../../simulation/types'

interface WaveRingsProps {
  field: WaveField
  amplitude: number
  count?: number
  length?: number
}

const RING_RADIUS = 0.62

export function WaveRings({ field, amplitude, count = 150, length = 6 }: WaveRingsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  const geometry = useMemo(() => {
    const next = new THREE.TorusGeometry(RING_RADIUS, 0.022, 8, 48)
    next.rotateY(Math.PI / 2)
    return next
  }, [])
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < count; i++) {
      color.setRGB(0, 0, 0)
      mesh.setColorAt(i, color)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [count, color])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const nodes = field.u.length
    for (let i = 0; i < count; i++) {
      const node = Math.floor((i / (count - 1)) * (nodes - 1))
      const value = Math.abs(field.u[node]) / amplitude
      const intensity = Math.min(value, 1)
      const bulge = 1 + Math.min(value, 1.25) * 0.28
      dummy.position.set((i / (count - 1) - 0.5) * length, 0, 0)
      dummy.scale.set(bulge, bulge, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      color.setRGB(0.18 * intensity, 0.7 * intensity, intensity)
      mesh.setColorAt(i, color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />
}
