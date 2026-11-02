import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const SERVER_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(SERVER_DIR, '..')
const DEFAULT_DATABASE_PATH = resolve(PROJECT_ROOT, 'data', 'metrics.db')

export function openDatabase() {
  const databasePath = resolve(process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH)
  mkdirSync(dirname(databasePath), { recursive: true })

  const db = new DatabaseSync(databasePath)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS measurement_runs (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      fluid_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      pressure_pa REAL NOT NULL,
      estimated_pressure_pa REAL NOT NULL,
      error_pa REAL NOT NULL,
      relative_error REAL NOT NULL,
      tof_s REAL NOT NULL,
      wave_speed_mps REAL NOT NULL,
      reference_speed_mps REAL NOT NULL,
      phase_rad REAL NOT NULL,
      phase_shift_rad REAL NOT NULL,
      hoop_stress_pa REAL NOT NULL,
      method TEXT NOT NULL,
      noise REAL NOT NULL,
      inner_radius_m REAL NOT NULL,
      wall_thickness_m REAL NOT NULL,
      boundary TEXT NOT NULL,
      amplification REAL,
      app_version TEXT NOT NULL
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_measurement_runs_created_at
      ON measurement_runs (created_at DESC);
  `)

  return { db, databasePath }
}

export function insertRun(db, run) {
  const statement = db.prepare(`
    INSERT INTO measurement_runs (
      id, label, created_at, fluid_id, material_id,
      pressure_pa, estimated_pressure_pa, error_pa, relative_error,
      tof_s, wave_speed_mps, reference_speed_mps, phase_rad, phase_shift_rad,
      hoop_stress_pa, method, noise, inner_radius_m, wall_thickness_m,
      boundary, amplification, app_version
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `)

  statement.run(
    run.id,
    run.label,
    run.createdAt,
    run.fluidId,
    run.materialId,
    run.pressurePa,
    run.estimatedPressurePa,
    run.errorPa,
    run.relativeError,
    run.tofS,
    run.waveSpeedMps,
    run.referenceSpeedMps,
    run.phaseRad,
    run.phaseShiftRad,
    run.hoopStressPa,
    run.method,
    run.noise,
    run.innerRadiusM,
    run.wallThicknessM,
    run.boundary,
    run.amplification,
    run.appVersion,
  )

  return getRun(db, run.id)
}

export function listRuns(db, limit = 30) {
  return db
    .prepare(
      `SELECT * FROM measurement_runs
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit)
    .map(toRun)
}

export function getRun(db, id) {
  const row = db.prepare('SELECT * FROM measurement_runs WHERE id = ?').get(id)
  return row ? toRun(row) : null
}

export function deleteRun(db, id) {
  return db.prepare('DELETE FROM measurement_runs WHERE id = ?').run(id).changes > 0
}

export function allRuns(db) {
  return db.prepare('SELECT * FROM measurement_runs ORDER BY created_at DESC').all().map(toRun)
}

function toRun(row) {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    fluidId: row.fluid_id,
    materialId: row.material_id,
    pressurePa: row.pressure_pa,
    estimatedPressurePa: row.estimated_pressure_pa,
    errorPa: row.error_pa,
    relativeError: row.relative_error,
    tofS: row.tof_s,
    waveSpeedMps: row.wave_speed_mps,
    referenceSpeedMps: row.reference_speed_mps,
    phaseRad: row.phase_rad,
    phaseShiftRad: row.phase_shift_rad,
    hoopStressPa: row.hoop_stress_pa,
    method: row.method,
    noise: row.noise,
    innerRadiusM: row.inner_radius_m,
    wallThicknessM: row.wall_thickness_m,
    boundary: row.boundary,
    amplification: row.amplification,
    appVersion: row.app_version,
  }
}
