import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { FluidVisualStyle } from './flowStyles'

const BEAM_RADIUS = 0.5

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

  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32))
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    return new THREE.Line(geometry, material)
  }, [curve, color])

  useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    },
    [line],
  )

  const headRef = useRef<THREE.Mesh>(null)
  const midRef = useRef<THREE.Mesh>(null)
  const tailRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const t = ((state.clock.elapsedTime * motionScale) / duration) % 1
    const head = curve.getPoint(t)
    const mid = curve.getPoint(Math.max(0, t - 0.035))
    const tail = curve.getPoint(Math.max(0, t - 0.07))
    headRef.current?.position.copy(head)
    midRef.current?.position.copy(mid)
    tailRef.current?.position.copy(tail)
    lightRef.current?.position.copy(head)
  })

  return (
    <>
      <primitive object={line} />
      <mesh ref={headRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={midRef}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={tailRef}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight ref={lightRef} color={color} intensity={2.2} distance={1.8} />
    </>
  )
}
