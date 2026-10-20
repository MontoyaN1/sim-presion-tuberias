import * as THREE from 'three'
import type { Fluid, WaveField } from '../../simulation/types'
import { WaveRings } from './WaveRings'

interface PipeAssemblyProps {
  fluid: Fluid
  field: WaveField
  amplitude: number
  pressure: number
  wallColor: string
}

const PIPE_LENGTH = 6

export function PipeAssembly({ fluid, field, amplitude, pressure, wallColor }: PipeAssemblyProps) {
  return (
    <group>
      <FluidColumn fluid={fluid} />
      <PipeWall color={wallColor} />
      <Flange x={-3.05} />
      <Flange x={3.05} />
      <Sensor x={-3.05} color="#34d399" />
      <Sensor x={3.05} color="#fbbf24" />
      <GaugeStem />
      <Manometer pressure={pressure} />
      <WaveRings field={field} amplitude={amplitude} length={PIPE_LENGTH} />
    </group>
  )
}

function FluidColumn({ fluid }: { fluid: Fluid }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.54, 0.54, 6, 64, 1, false]} />
      <meshStandardMaterial
        color={fluid.color}
        emissive={fluid.color}
        emissiveIntensity={0.4}
        transparent
        opacity={0.55}
        roughness={0.35}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function PipeWall({ color }: { color: string }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.6, 0.6, 6, 96, 1, true]} />
      <meshStandardMaterial
        color={color}
        metalness={0.9}
        roughness={0.25}
        transparent
        opacity={0.28}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function Flange({ x }: { x: number }) {
  return (
    <mesh position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.7, 0.7, 0.14, 64]} />
      <meshStandardMaterial color="#94a3b8" metalness={0.2} roughness={0.55} />
    </mesh>
  )
}

function Sensor({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.74, 0.045, 16, 48]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[0.16, 0.22, 0.16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.87, 0]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function GaugeStem() {
  return (
    <mesh position={[0, 1.15, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 1.0, 16]} />
      <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
    </mesh>
  )
}

function Manometer({ pressure }: { pressure: number }) {
  const maxPressure = 10e6
  const needleAngle = Math.PI * 0.75 - (pressure / maxPressure) * Math.PI * 1.5
  const ticks = Array.from({ length: 21 }, (_, index) => {
    const angle = Math.PI * 0.75 - (index / 20) * Math.PI * 1.5
    return { angle, major: index % 5 === 0 }
  })

  return (
    <group position={[0, 1.75, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.1, 64]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.35} />
      </mesh>

      <mesh position={[0, 0, 0.055]}>
        <circleGeometry args={[0.5, 64]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.85} metalness={0.05} />
      </mesh>

      <mesh position={[0, 0, 0.06]}>
        <torusGeometry args={[0.52, 0.025, 16, 64]} />
        <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.3} />
      </mesh>

      {ticks.map(({ angle, major }, index) => (
        <mesh
          key={index}
          position={[-Math.sin(angle) * 0.4, Math.cos(angle) * 0.4, 0.07]}
          rotation={[0, 0, angle]}
        >
          <boxGeometry args={[0.018, major ? 0.09 : 0.05, 0.012]} />
          <meshBasicMaterial color="#334155" />
        </mesh>
      ))}

      <group rotation={[0, 0, needleAngle]}>
        <mesh position={[0, 0.19, 0.085]}>
          <boxGeometry args={[0.02, 0.38, 0.012]} />
          <meshBasicMaterial color="#ef4444" toneMapped={false} />
        </mesh>
      </group>

      <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 24]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}
