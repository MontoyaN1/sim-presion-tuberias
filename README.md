# Simulación de presión no invasiva

Aplicación React + Vite para estimar la presión interna de una tubería mediante sensores ultrasónicos y el efecto acustoelástico.

## Desarrollo

```bash
npm install
npm run dev
```

`npm run dev` levanta dos procesos:

- Vite en `http://localhost:3010`
- API de métricas en `http://127.0.0.1:3001`

Vite redirige `/api` al backend, así que la aplicación sigue usando rutas relativas.

## Persistencia SQLite

Las mediciones se guardan en `data/metrics.db` usando `node:sqlite`. La base se crea automáticamente al arrancar la API y no se versiona en Git.

```bash
npm run dev:api   # solo API
npm run build
npm start         # sirve dist/ y la API desde el mismo proceso
```

Variables opcionales:

```bash
PORT=3001
DATABASE_PATH=/ruta/a/metrics.db
APP_VERSION=0.1.0
```

### Endpoints

```text
GET    /api/health
GET    /api/runs?limit=30
POST   /api/runs
GET    /api/runs/:id
DELETE /api/runs/:id
GET    /api/runs/export.csv
```

El botón **Guardar medición** del panel de resultado persiste una corrida completa: configuración, presión real, presión estimada, TOF, velocidad de onda, error y metadatos. El panel **Historial SQLite** permite actualizar, eliminar y exportar las mediciones.

> `node:sqlite` es una API experimental de Node 22; emite una advertencia al iniciar. Para una versión estable se puede sustituir por `better-sqlite3` sin cambiar el esquema ni los endpoints.
