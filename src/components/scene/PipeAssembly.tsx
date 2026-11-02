import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Fluid, WaveField } from '../../simulation/types'
import { BeamPaths } from './BeamPaths'
import { FluidPattern } from './FluidPattern'
import { FlowParticles } from './FlowParticles'
import { FLUID_VISUALS } from './flowStyles'
import type { FluidVisualStyle } from './flowStyles'
import { WaveRings } from './WaveRings'

interface PipeAssemblyProps {
  fluid: Fluid
  field: WaveField
  amplitude: number
  pressure: number
  wallColor: string
  motionScale?: number
}

interface SensorSpec {
  id: string
  role: 'emitter' | 'receiver'
  x: number
  angle: number
  color: string
}

const PIPE_LENGTH = 6
const SENSOR_RADIUS = 0.62
const EMITTER_COLOR = '#22c55e'
const RECEIVER_COLOR = '#f59e0b'

const SENSORS: SensorSpec[] = [
  {
    id: 'E1',
    role: 'emitter',
    x: -1.2,
    angle: Math.PI / 4,
    color: EMITTER_COLOR,
  },
  {
    id: 'E2',
    role: 'emitter',
    x: -1.2,
    angle: -Math.PI / 4,
    color: EMITTER_COLOR,
  },
  {
    id: 'R1',
    role: 'receiver',
    x: 1.2,
    angle: (3 * Math.PI) / 4,
    color: RECEIVER_COLOR,
  },
  {
    id: 'R2',
    role: 'receiver',
    x: 1.2,
    angle: (-3 * Math.PI) / 4,
    color: RECEIVER_COLOR,
  },
]

export function PipeAssembly({
  fluid,
  field,
  amplitude,
  pressure,
  wallColor,
  motionScale = 1,
}: PipeAssemblyProps) {
  const style = FLUID_VISUALS[fluid.id]

  return (
    <group>
      <FluidColumn fluid={fluid} style={style} />
      <FluidPattern fluidId={fluid.id} style={style} motionScale={motionScale} />
      <FlowParticles style={style.particles} length={PIPE_LENGTH - 0.4} motionScale={motionScale} />
      <PipeWall color={wallColor} />
      <InnerWall />
      <EndRims />
      <Flange x={-3.05} />
      <Flange x={3.05} />
      <Support x={-2.4} />
      <Support x={2.4} />
      <BaseSkid />
      <ClampBand x={-1.2} />
      <ClampBand x={1.2} />
      <Valve x={2.05} />
      <WarningBand x={-2.25} />
      <Nameplate x={-1.85} />
      {SENSORS.map((sensor) => (
        <Transducer key={sensor.id} {...sensor} />
      ))}
      <CableRun />
      <ControlBox />
      <BeamPaths style={style} motionScale={motionScale} />
      <GaugeStem />
      <Manometer pressure={pressure} />
      <WaveRings
        field={field}
        amplitude={amplitude}
        length={PIPE_LENGTH}
        color={style.ringColor}
        opacity={0.055}
        count={28}
      />
    </group>
  )
}

function FluidColumn({ fluid, style }: { fluid: Fluid; style: FluidVisualStyle }) {
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.54, 0.54, 5.96, 64, 1, false]} />
        <meshPhysicalMaterial
          color={style.color}
          emissive={style.emissive}
          emissiveIntensity={style.emissiveIntensity}
          transparent
          opacity={style.opacity}
          roughness={style.roughness}
          metalness={style.metalness}
          clearcoat={style.clearcoat}
          clearcoatRoughness={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {fluid.id === 'hydrogen' && (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.51, 0.51, 5.9, 48, 1, false]} />
          <meshBasicMaterial
            color={style.pulseColor}
            transparent
            opacity={0.05}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

function PipeWall({ color }: { color: string }) {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.6, 0.6, 6, 96, 1, true]} />
      <meshPhysicalMaterial
        color={color}
        metalness={0.9}
        roughness={0.22}
        clearcoat={0.55}
        clearcoatRoughness={0.2}
        transparent
        opacity={0.32}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function InnerWall() {
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.575, 0.575, 5.98, 96, 1, true]} />
      <meshStandardMaterial
        color="#0f172a"
        metalness={0.8}
        roughness={0.45}
        transparent
        opacity={0.35}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function EndRims() {
  return (
    <>
      {[-2.99, 2.99].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.595, 0.018, 10, 64]} />
          <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.28} />
        </mesh>
      ))}
    </>
  )
}

const BOLT_ANGLES = Array.from({ length: 8 }, (_, index) => (index / 8) * Math.PI * 2)

function Flange({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.7, 0.7, 0.14, 64]} />
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.71, 0.71, 0.03, 64]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.62, 0.025, 8, 64]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {BOLT_ANGLES.map((angle) => (
        <mesh
          key={angle}
          position={[0, Math.cos(angle) * 0.56, Math.sin(angle) * 0.56]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.032, 0.032, 0.2, 6]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

function Support({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, -0.98, 0]}>
        <boxGeometry args={[0.22, 0.72, 0.5]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, -1.31, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.9]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.61, 0]}>
        <boxGeometry args={[0.26, 0.06, 0.86]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
    </group>
  )
}

function BaseSkid() {
  return (
    <group position={[0, -1.34, 0]}>
      <mesh>
        <boxGeometry args={[6.5, 0.08, 1.02]} />
        <meshStandardMaterial color="#0f172a" metalness={0.55} roughness={0.65} />
      </mesh>
      {[-0.43, 0.43].map((z) => (
        <mesh key={z} position={[0, 0.06, z]}>
          <boxGeometry args={[6.5, 0.04, 0.07]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      {[-3.16, 3.16].map((x) => (
        <mesh key={x} position={[x, 0.09, 0]}>
          <boxGeometry args={[0.1, 0.14, 1.02]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function ClampBand({ x }: { x: number }) {
  return (
    <mesh position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      <torusGeometry args={[0.645, 0.018, 8, 64]} />
      <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.35} />
    </mesh>
  )
}

function Transducer({ id, role, x, angle, color }: SensorSpec) {
  const tilt = role === 'emitter' ? -Math.PI / 4 : Math.PI / 4
  const position: [number, number, number] = [
    x,
    SENSOR_RADIUS * Math.cos(angle),
    SENSOR_RADIUS * Math.sin(angle),
  ]

  return (
    <group position={position} rotation={[angle, 0, 0]}>
      <mesh position={[0, 0.055, 0]}>
        <boxGeometry args={[0.26, 0.11, 0.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.115, 0]}>
        <boxGeometry args={[0.2, 0.02, 0.16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      <group position={[0, 0.12, 0]} rotation={[0, 0, tilt]}>
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.075, 0.085, 0.22, 24]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.225, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 20]} />
          <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.258, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.08, 8]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.082, 0.082, 0.018, 24]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.255, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.055, 0.01, 8, 20]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </mesh>
      </group>

      <SensorLabel id={id} role={role} />
    </group>
  )
}

function createLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, size, size)
    context.font = '700 58px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineWidth = 12
    context.strokeStyle = 'rgba(2, 6, 23, 0.92)'
    context.strokeText(text, size / 2, size / 2 + 2)
    context.fillStyle = color
    context.fillText(text, size / 2, size / 2 + 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function SensorLabel({ id, role }: { id: string; role: 'emitter' | 'receiver' }) {
  const texture = useMemo(
    () => createLabelTexture(id, role === 'emitter' ? '#6ee7b7' : '#fcd34d'),
    [id, role],
  )

  useEffect(
    () => () => {
      texture.dispose()
    },
    [texture],
  )

  return (
    <sprite position={[0, 0.58, 0]} scale={[0.22, 0.22, 1]} renderOrder={1000}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  )
}

function GaugeStem() {
  return (
    <group>
      <mesh position={[0, 0.63, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.08, 6]} />
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.6, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
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

      <mesh position={[0, 0, 0.115]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.02, 64]} />
        <meshPhysicalMaterial
          color="#e2e8f0"
          transparent
          opacity={0.14}
          roughness={0.05}
          metalness={0.1}
        />
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


function Valve({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.66, 0.66, 0.48, 48]} />
        <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
      </mesh>
      {[-0.26, 0.26].map((offset) => (
        <mesh key={offset} position={[offset, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.7, 0.7, 0.08, 48]} />
          <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.24, 20]} />
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.55, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.028, 10, 32]} />
        <meshStandardMaterial color="#dc2626" metalness={0.5} roughness={0.4} />
      </mesh>
      {[0, Math.PI / 2].map((angle) => (
        <mesh key={angle} position={[0, 1.26, 0]} rotation={[0, angle, 0]}>
          <boxGeometry args={[0.38, 0.018, 0.018]} />
          <meshStandardMaterial color="#dc2626" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.09, 16]} />
        <meshStandardMaterial color="#7f1d1d" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

function createWarningTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#facc15'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#111827'
    context.lineWidth = 28
    for (let offset = -canvas.height; offset < canvas.width + canvas.height; offset += 56) {
      context.beginPath()
      context.moveTo(offset, 0)
      context.lineTo(offset + canvas.height, canvas.height)
      context.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat.set(4, 1)
  texture.needsUpdate = true
  return texture
}

function WarningBand({ x }: { x: number }) {
  const texture = useMemo(() => createWarningTexture(), [])
  useEffect(
    () => () => {
      texture.dispose()
    },
    [texture],
  )

  return (
    <mesh position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.607, 0.607, 0.16, 64, 1, true]} />
      <meshStandardMaterial map={texture} metalness={0.35} roughness={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}

function createNameplateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 160
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#0f172a'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.strokeStyle = '#94a3b8'
    context.lineWidth = 6
    context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16)
    context.fillStyle = '#e2e8f0'
    context.font = '700 48px ui-monospace, SFMono-Regular, Menlo, monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('DN 80 · PN 40', canvas.width / 2, 62)
    context.fillStyle = '#38bdf8'
    context.font = '600 22px ui-sans-serif, system-ui, sans-serif'
    context.fillText('LÍNEA DE PRUEBA NO INVASIVA', canvas.width / 2, 116)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function Nameplate({ x }: { x: number }) {
  const texture = useMemo(() => createNameplateTexture(), [])
  useEffect(
    () => () => {
      texture.dispose()
    },
    [texture],
  )

  return (
    <group position={[x, -0.12, 0.59]}>
      <mesh position={[0, 0, -0.008]}>
        <boxGeometry args={[0.7, 0.25, 0.016]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <planeGeometry args={[0.64, 0.2]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

const CABLE_TARGET: [number, number, number] = [2.72, -1.03, 0.78]

function CableRun() {
  return (
    <>
      {SENSORS.map((sensor) => (
        <Cable
          key={sensor.id}
          from={[
            sensor.x,
            SENSOR_RADIUS * Math.cos(sensor.angle),
            SENSOR_RADIUS * Math.sin(sensor.angle),
          ]}
          color={sensor.role === 'emitter' ? '#1f2937' : '#3f2a1a'}
        />
      ))}
    </>
  )
}

function Cable({ from, color }: { from: [number, number, number]; color: string }) {
  const curve = useMemo(
    () =>
      new THREE.CubicBezierCurve3(
        new THREE.Vector3(...from),
        new THREE.Vector3(from[0] + 0.1, -0.82, Math.max(from[2], 0) + 0.55),
        new THREE.Vector3(CABLE_TARGET[0] - 0.9, -1.16, CABLE_TARGET[2] + 0.05),
        new THREE.Vector3(...CABLE_TARGET),
      ),
    [from],
  )
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 36, 0.018, 6, false), [curve])

  useEffect(
    () => () => {
      geometry.dispose()
    },
    [geometry],
  )

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} metalness={0.15} roughness={0.72} />
    </mesh>
  )
}

function ControlBox() {
  return (
    <group position={[CABLE_TARGET[0] + 0.33, CABLE_TARGET[1] - 0.02, CABLE_TARGET[2]]}>
      <mesh position={[0, -0.26, 0]}>
        <boxGeometry args={[0.74, 0.08, 0.46]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.62, 0.48, 0.38]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.194]}>
        <boxGeometry args={[0.5, 0.35, 0.02]} />
        <meshStandardMaterial color="#020617" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[-0.12, 0.07, 0.21]}>
        <boxGeometry args={[0.2, 0.11, 0.012]} />
        <meshBasicMaterial color="#22c55e" toneMapped={false} />
      </mesh>
      <mesh position={[0.12, 0.07, 0.21]}>
        <boxGeometry args={[0.12, 0.03, 0.012]} />
        <meshBasicMaterial color="#38bdf8" toneMapped={false} />
      </mesh>
      {[-0.1, 0, 0.1].map((y, index) => (
        <mesh key={y} position={[0.16, -0.09 + y, 0.21]}>
          <boxGeometry args={[0.06, 0.018, 0.012]} />
          <meshBasicMaterial color={index === 1 ? '#f59e0b' : '#475569'} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[-0.33, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0.22, 0.28, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.12, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  )
}
