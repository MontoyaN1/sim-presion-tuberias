import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { FluidVisualStyle } from './flowStyles'

const BEAM_RADIUS = 0.5
const WAVEFRONT_COUNT = 9

function beamPoint(x: number, angle: number): [number, number, number] {
  return [x, BEAM_RADIUS * Math.cos(angle), BEAM_RADIUS * Math.sin(angle)]
}

const BEAMS: { from: [number, number, number]; to: [number, number, number] }[] = [
  {
    from: beamPoint(-1.2, Math.PI / 4),
    to: beamPoint(1.2, (-3 * Math.PI) / 4),
  },
  {
    from: beamPoint(-1.2, -Math.PI / 4),
    to: beamPoint(1.2, (3 * Math.PI) / 4),
  },
]

interface BeamPathsProps {
  style: FluidVisualStyle
  motionScale?: number
}

export function BeamPaths({ style, motionScale = 1 }: BeamPathsProps) {
  return (
    <>
      {BEAMS.map((beam, index) => (
        <Beam
          key={index}
          from={beam.from}
          to={beam.to}
          color={style.pulseColor}
          duration={style.pulseDuration}
          motionScale={motionScale}
        />
      ))}
    </>
  )
}

function Beam({
  from,
  to,
  color,
  duration,
  motionScale,
}: {
  from: [number, number, number]
  to: [number, number, number]
  color: string
  duration: number
  motionScale: number
}) {
  const curve = useMemo(
    () => new THREE.LineCurve3(new THREE.Vector3(...from), new THREE.Vector3(...to)),
    [from, to],
  )
  const direction = useMemo(
    () => new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize(),
    [from, to],
  )
  const orientation = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction),
    [direction],
  )

  const guide = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40))
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    return new THREE.Line(geometry, material)
  }, [curve, color])

  useEffect(
    () => () => {
      guide.geometry.dispose()
      ;(guide.material as THREE.Material).dispose()
    },
    [guide],
  )

  const rings = useRef<THREE.Mesh[]>([])

  useFrame((state) => {
    const head = ((state.clock.elapsedTime * motionScale) / duration) % 1

    rings.current.forEach((ring, index) => {
      if (!ring) return
      const travel = ((head - index * 0.055) % 1 + 1) % 1
      const point = curve.getPoint(travel)
      const radius = 0.055 + index * 0.0075 + travel * 0.025
      const fade = Math.max(0, 1 - index / WAVEFRONT_COUNT)
      ring.position.copy(point)
      ring.quaternion.copy(orientation)
      ring.scale.setScalar(radius)
      const material = ring.material as THREE.MeshBasicMaterial
      material.opacity = fade * 0.52
    })
  })

  return (
    <>
      <primitive object={guide} />
      {Array.from({ length: WAVEFRONT_COUNT }).map((_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            if (node) rings.current[index] = node
          }}
          renderOrder={3}
        >
          <torusGeometry args={[1, 0.032, 8, 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}
