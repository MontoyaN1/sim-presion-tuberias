import { useState } from 'react'
import { SimulationView } from './components/SimulationView'
import { ValidationView } from './components/ValidationView'

type View = 'sim' | 'val'

const TABS: { id: View; label: string }[] = [
  { id: 'sim', label: 'Simulación' },
  { id: 'val', label: 'Validación' },
]

export default function App() {
  const [view, setView] = useState<View>('sim')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-sm font-medium uppercase tracking-widest text-sky-400">
            Ecuaciones Diferenciales
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Medición no invasiva de presión en tuberías
          </h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            {view === 'sim'
              ? 'Escena 3D con cuatro sensores en diagonal (dos emisores y dos receptores): los haces cruzan el fluido y su tiempo de vuelo depende de la presión (efecto acustoelástico). Cambia el fluido para ver agua, crudo o hidrógeno, y ajusta geometría, material y ruido.'
              : 'Validación numérica: Monte Carlo sobre las cinco fases del modelo, comparación entre fluidos y presupuesto de error. Contrasta la sensibilidad de la inversión antes de confiar en una lectura.'}
          </p>
        </header>

        <div className="mb-6 flex gap-2" role="tablist" aria-label="Vistas del proyecto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={view === tab.id}
              aria-controls={view === tab.id ? `panel-${tab.id}` : undefined}
              onClick={() => setView(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                view === tab.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${view}`}
          aria-labelledby={`tab-${view}`}
        >
          {view === 'sim' ? <SimulationView /> : <ValidationView />}
        </div>

        <footer className="mt-6 text-sm text-slate-500">
          {view === 'sim'
            ? 'Cuatro sensores en diagonal: E1/E2 emiten y R1/R2 reciben sobre dos trayectorias cruzadas. La inversión amplifica el error de la onda: por eso la precisión del TOF es crítica.'
            : 'La tabla usa 500 corridas Monte Carlo por fluido. El presupuesto descompone la cadena de velocidad y muestra cómo la inversión amplifica cada contribución.'}
        </footer>
      </div>
    </div>
  )
}
