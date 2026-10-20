import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GEOMETRY,
  DEFAULT_MATERIAL,
  FLUID_LIST,
  validateFluid,
} from '../src/simulation'

const P1 = 10e6
const P2 = 8e6
const SECTION = 0.5
const TRIALS = 500
const TOF_NOISE = 0.0005
const ALPHA = 0.02
const C0 = 0.0002
const SEED = 12345
const TEMPERATURE = 300

describe('exportación para validación en Python', () => {
  it('escribe validation/ts_results.json con el mismo caso que compare.py', () => {
    const results = FLUID_LIST.map((fluid) =>
      validateFluid(fluid, DEFAULT_GEOMETRY, DEFAULT_MATERIAL, P1, P2, SECTION, {
        trials: TRIALS,
        tofNoise: TOF_NOISE,
        alphaUncertainty: ALPHA,
        c0Uncertainty: C0,
        seed: SEED,
        temperature: TEMPERATURE,
      }),
    )

    const payload = {
      config: {
        p1: P1,
        p2: P2,
        sectionFraction: SECTION,
        trials: TRIALS,
        tofNoise: TOF_NOISE,
        alphaUncertainty: ALPHA,
        c0Uncertainty: C0,
        seed: SEED,
        temperature: TEMPERATURE,
      },
      fluids: results.map((result) => ({
        id: result.fluid.id,
        truePressure: result.truePressure,
        estimatedPressure: result.estimatedPressure,
        stats: result.stats,
        modelError: result.modelError,
        totalError: result.totalError,
        flow: {
          reynolds: result.flow.reynolds,
          laminar: result.flow.laminar,
          model: result.flow.model,
        },
      })),
    }

    const directory = resolve(process.cwd(), 'validation')
    mkdirSync(directory, { recursive: true })
    writeFileSync(
      resolve(directory, 'ts_results.json'),
      `${JSON.stringify(payload, null, 2)}\n`,
    )

    expect(results).toHaveLength(3)
  })
})
