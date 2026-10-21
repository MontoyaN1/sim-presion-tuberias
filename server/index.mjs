import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allRuns, deleteRun, getRun, insertRun, listRuns, openDatabase } from './db.mjs'

const SERVER_DIR = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = resolve(SERVER_DIR, '..')
const DIST_DIR = resolve(PROJECT_ROOT, 'dist')
const PORT = Number(process.env.PORT || 3001)
const APP_VERSION = process.env.APP_VERSION || '0.1.0'
const MAX_BODY_BYTES = 256 * 1024
const MAX_ABS_PRESSURE_PA = 1e9
const MAX_ABS_STRESS_PA = 2e9
const MAX_ABS_ERROR_PA = 2e9

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const { db, databasePath } = openDatabase()

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url)
      return
    }

    await serveStatic(response, url.pathname)
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500
    if (status === 500) console.error(error)
    sendJson(response, status, {
      error: status === 500 ? 'Error interno del servidor' : error.message,
    })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`API de métricas en http://127.0.0.1:${PORT}`)
  console.log(`SQLite: ${databasePath}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close()
      process.exit(0)
    })
  })
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true })
    return
  }

  if (url.pathname === '/api/runs' && request.method === 'GET') {
    const limit = clampLimit(url.searchParams.get('limit'))
    sendJson(response, 200, { runs: listRuns(db, limit) })
    return
  }

  if (url.pathname === '/api/runs' && request.method === 'POST') {
    const payload = await readJson(request)
    const run = normalizeRun(payload)
    sendJson(response, 201, insertRun(db, run))
    return
  }

  if (url.pathname === '/api/runs/export.csv' && request.method === 'GET') {
    sendCsv(response, allRuns(db))
    return
  }

  const match = url.pathname.match(/^\/api\/runs\/([0-9a-f-]+)$/i)
  if (match) {
    const id = match[1]

    if (request.method === 'GET') {
      const run = getRun(db, id)
      if (!run) throw new HttpError(404, 'Medición no encontrada')
      sendJson(response, 200, run)
      return
    }

    if (request.method === 'DELETE') {
      if (!deleteRun(db, id)) throw new HttpError(404, 'Medición no encontrada')
      response.writeHead(204)
      response.end()
      return
    }
  }

  throw new HttpError(404, 'Ruta no encontrada')
}

function normalizeRun(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'El cuerpo debe ser un objeto JSON')
  }

  const fluidId = readEnum(payload.fluidId, 'fluidId', ['water', 'crude', 'hydrogen'])
  const materialId = readEnum(payload.materialId, 'materialId', ['steel', 'aluminum', 'copper'])
  const method = readEnum(payload.method, 'method', ['tof', 'phase'])
  const boundary = readEnum(payload.boundary, 'boundary', ['absorbing', 'reflecting'])
  const label = readLabel(payload.label, fluidId)

  return {
    id: randomUUID(),
    label,
    createdAt: new Date().toISOString(),
    fluidId,
    materialId,
    pressurePa: readNumber(payload.pressurePa, 'pressurePa', 0, MAX_ABS_PRESSURE_PA),
    estimatedPressurePa: readNumber(
      payload.estimatedPressurePa,
      'estimatedPressurePa',
      -MAX_ABS_PRESSURE_PA,
      MAX_ABS_PRESSURE_PA,
    ),
    errorPa: readNumber(payload.errorPa, 'errorPa', -MAX_ABS_ERROR_PA, MAX_ABS_ERROR_PA),
    relativeError: readNumber(payload.relativeError, 'relativeError', -1e6, 1e6),
    tofS: readNumber(payload.tofS, 'tofS', 0, 1e6),
    waveSpeedMps: readNumber(payload.waveSpeedMps, 'waveSpeedMps', 0, 1e6),
    referenceSpeedMps: readNumber(payload.referenceSpeedMps, 'referenceSpeedMps', 0, 1e6),
    phaseRad: readNumber(payload.phaseRad, 'phaseRad', -1e9, 1e9),
    phaseShiftRad: readNumber(payload.phaseShiftRad, 'phaseShiftRad', -1e9, 1e9),
    hoopStressPa: readNumber(
      payload.hoopStressPa,
      'hoopStressPa',
      -MAX_ABS_STRESS_PA,
      MAX_ABS_STRESS_PA,
    ),
    method,
    noise: readNumber(payload.noise, 'noise', 0, 1),
    innerRadiusM: readNumber(payload.innerRadiusM, 'innerRadiusM', 0, 1e3),
    wallThicknessM: readNumber(payload.wallThicknessM, 'wallThicknessM', 0, 1e3),
    boundary,
    amplification: readOptionalNumber(payload.amplification, 'amplification', 1e9),
    appVersion: APP_VERSION,
  }
}

function readLabel(value, fluidId) {
  if (value === undefined || value === null || value === '') {
    return `Medición ${fluidId} · ${new Date().toLocaleString('es-CO')}`
  }
  if (typeof value !== 'string') throw new HttpError(400, 'label debe ser texto')
  return value.trim().slice(0, 120) || `Medición ${fluidId}`
}

function readEnum(value, name, allowed) {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new HttpError(400, `${name} inválido`)
  }
  return value
}

function readNumber(value, name, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new HttpError(400, `${name} debe ser un número entre ${min} y ${max}`)
  }
  return number
}

function readOptionalNumber(value, name, max) {
  if (value === null || value === undefined) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > max) return null
  return number
}

function clampLimit(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 30
  return Math.max(1, Math.min(100, Math.trunc(number)))
}

function readJson(request) {
  return new Promise((resolveBody, reject) => {
    let size = 0
    const chunks = []

    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Cuerpo demasiado grande'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })

    request.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolveBody(text ? JSON.parse(text) : null)
      } catch {
        reject(new HttpError(400, 'JSON inválido'))
      }
    })

    request.on('error', reject)
  })
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  response.end(body)
}

function sendCsv(response, runs) {
  const headers = [
    'id',
    'fecha',
    'etiqueta',
    'fluido',
    'material',
    'presion_pa',
    'presion_estimada_pa',
    'error_pa',
    'error_relativo',
    'tof_s',
    'velocidad_onda_m_s',
    'metodo',
    'ruido',
    'radio_interno_m',
    'espesor_pared_m',
    'frontera',
    'amplificacion',
    'version',
  ]

  const rows = runs.map((run) =>
    [
      run.id,
      run.createdAt,
      run.label,
      run.fluidId,
      run.materialId,
      run.pressurePa,
      run.estimatedPressurePa,
      run.errorPa,
      run.relativeError,
      run.tofS,
      run.waveSpeedMps,
      run.method,
      run.noise,
      run.innerRadiusM,
      run.wallThicknessM,
      run.boundary,
      run.amplification,
      run.appVersion,
    ]
      .map(csvCell)
      .join(','),
  )

  const body = [headers.join(','), ...rows].join('\n')
  response.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="mediciones.csv"',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  response.end(body)
}

function csvCell(value) {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

async function serveStatic(response, pathname) {
  const cleanPath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname)
  const filePath = resolve(DIST_DIR, `.${cleanPath}`)

  if (!filePath.startsWith(DIST_DIR)) {
    throw new HttpError(403, 'Ruta inválida')
  }

  try {
    const fileStat = await stat(filePath)
    if (fileStat.isFile()) {
      const body = await readFile(filePath)
      response.writeHead(200, {
        'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
        'Content-Length': body.length,
      })
      response.end(body)
      return
    }
  } catch {
    // SPA fallback below.
  }

  try {
    const body = await readFile(resolve(DIST_DIR, 'index.html'))
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': body.length,
    })
    response.end(body)
  } catch {
    throw new HttpError(404, 'Ejecuta npm run build para servir la aplicación')
  }
}
