import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { createRng } from '../../simulation'
import type { FluidId } from '../../simulation/types'
import type { FluidVisualStyle } from './flowStyles'

const TEXTURE_SIZE = 512

function createPatternTexture(style: FluidVisualStyle, seed: number) {
  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  const rng = createRng(seed)
  context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

  if (style.pattern.kind === 'caustics') {
    context.globalCompositeOperation = 'lighter'
    for (let index = 0; index < 110; index += 1) {
      const x = rng() * TEXTURE_SIZE
      const y = rng() * TEXTURE_SIZE
      const radius = 8 + rng() * 70
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(186, 230, 253, ${0.03 + rng() * 0.16})`)
      gradient.addColorStop(0.55, `rgba(56, 189, 248, ${0.02 + rng() * 0.07})`)
      gradient.addColorStop(1, 'rgba(14, 116, 144, 0)')
      context.fillStyle = gradient
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    }

    context.lineCap = 'round'
    for (let index = 0; index < 70; index += 1) {
      const x = rng() * TEXTURE_SIZE
      const y = rng() * TEXTURE_SIZE
      context.strokeStyle = `rgba(224, 242, 254, ${0.08 + rng() * 0.22})`
      context.lineWidth = 0.6 + rng() * 1.8
      context.beginPath()
      context.moveTo(x, y)
      context.bezierCurveTo(
        x + 20 + rng() * 70,
        y - 18 + rng() * 36,
        x - 30 - rng() * 60,
        y + 30 + rng() * 50,
        x + 80 + rng() * 90,
        y + 8 + rng() * 40,
      )
      context.stroke()
    }
  }

  if (style.pattern.kind === 'viscous') {
    context.fillStyle = 'rgba(18, 9, 3, 0.94)'
    context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

    for (let index = 0; index < 90; index += 1) {
      const x = rng() * TEXTURE_SIZE
      const y = rng() * TEXTURE_SIZE
      const radiusX = 20 + rng() * 110
      const radiusY = 4 + rng() * 18
      const gradient = context.createRadialGradient(x, y, 0, x, y, radiusX)
      gradient.addColorStop(0, `rgba(120, 53, 15, ${0.2 + rng() * 0.35})`)
      gradient.addColorStop(0.6, `rgba(69, 26, 3, ${0.18 + rng() * 0.25})`)
      gradient.addColorStop(1, 'rgba(12, 6, 2, 0)')
      context.fillStyle = gradient
      context.beginPath()
      context.ellipse(x, y, radiusX, radiusY, rng() * 0.3 - 0.15, 0, Math.PI * 2)
      context.fill()
    }

    for (let index = 0; index < 30; index += 1) {
      const x = rng() * TEXTURE_SIZE
      const y = rng() * TEXTURE_SIZE
      context.strokeStyle = `rgba(217, 119, 6, ${0.05 + rng() * 0.12})`
      context.lineWidth = 0.8 + rng() * 2
      context.beginPath()
      context.moveTo(x, y)
      context.quadraticCurveTo(x + 30 + rng() * 60, y - 8 + rng() * 16, x + 90 + rng() * 100, y + 6)
      context.stroke()
    }

    for (let index = 0; index < 35; index += 1) {
      context.fillStyle = `rgba(251, 191, 36, ${0.08 + rng() * 0.2})`
      context.beginPath()
      context.arc(rng() * TEXTURE_SIZE, rng() * TEXTURE_SIZE, 0.8 + rng() * 2.2, 0, Math.PI * 2)
      context.fill()
    }
  }

  if (style.pattern.kind === 'gas') {
    context.globalCompositeOperation = 'lighter'
    context.lineCap = 'round'
    for (let index = 0; index < 90; index += 1) {
      const x = rng() * TEXTURE_SIZE
      const y = rng() * TEXTURE_SIZE
      context.strokeStyle = `rgba(187, 247, 208, ${0.04 + rng() * 0.14})`
      context.lineWidth = 0.5 + rng() * 1.4
      context.beginPath()
      context.moveTo(x, y)
      context.bezierCurveTo(
        x + 15 + rng() * 55,
        y - 12 + rng() * 24,
        x - 20 - rng() * 45,
        y + 18 + rng() * 35,
        x + 60 + rng() * 80,
        y + 4 + rng() * 30,
      )
      context.stroke()
    }

    for (let index = 0; index < 55; index += 1) {
      context.fillStyle = `rgba(240, 253, 244, ${0.04 + rng() * 0.16})`
      context.beginPath()
      context.arc(rng() * TEXTURE_SIZE, rng() * TEXTURE_SIZE, 0.6 + rng() * 1.8, 0, Math.PI * 2)
      context.fill()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(style.pattern.repeat[0], style.pattern.repeat[1])
  texture.needsUpdate = true
  return texture
}

function flowTextures(textures: THREE.Texture[], elapsed: number, speed: number) {
  textures[0].offset.y = (elapsed * speed) % 1
  textures[1].offset.y = (-elapsed * speed * 0.55) % 1
}

interface FluidPatternProps {
  fluidId: FluidId
  style: FluidVisualStyle
  motionScale?: number
}

export function FluidPattern({ fluidId, style, motionScale = 1 }: FluidPatternProps) {
  const textures = useMemo(
    () => [
      createPatternTexture(style, 24680 + fluidId.length * 31),
      createPatternTexture(style, 97531 + fluidId.length * 17),
    ],
    [fluidId, style],
  )

  const materials = useMemo(
    () =>
      textures.map(
        (texture, index) =>
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: style.pattern.opacity * (index === 0 ? 1 : 0.42),
            side: THREE.DoubleSide,
            depthWrite: false,
            blending:
              style.pattern.blending === 'additive'
                ? THREE.AdditiveBlending
                : THREE.NormalBlending,
            toneMapped: false,
          }),
      ),
    [style, textures],
  )

  useEffect(
    () => () => {
      textures.forEach((texture) => texture.dispose())
      materials.forEach((material) => material.dispose())
    },
    [materials, textures],
  )

  useFrame((state) => {
    flowTextures(textures, state.clock.elapsedTime * motionScale, style.pattern.speed)
  })

  return (
    <group>
      {materials.map((material, index) => (
        <mesh key={index} rotation={[0, 0, Math.PI / 2]} renderOrder={1}>
          <cylinderGeometry args={[0.547, 0.547, 5.92, 64, 1, true]} />
          <primitive object={material} attach="material" />
        </mesh>
      ))}
    </group>
  )
}
