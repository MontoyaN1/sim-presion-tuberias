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
              ? 'Escena 3D: la onda ultrasónica viaja por la pared de la tubería y su velocidad depende de la presión (efecto acustoelástico). Ajusta la geometría, el material y el ruido para ver cómo cambia la estimación.'
              : 'Validación numérica: Monte Carlo sobre las cinco fases del modelo, comparación entre fluidos y presupuesto de error. Contrasta la sensibilidad de la inversión antes de confiar en una lectura.'}
          </p>
        </header>

        <div className="mb-6 flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                view === tab.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === 'sim' ? <SimulationView /> : <ValidationView />}

        <footer className="mt-6 text-sm text-slate-500">
          {view === 'sim'
            ? 'Los sensores emisor (verde) y receptor (ámbar) marcan los extremos del tramo de medición. La inversión amplifica el error de la onda: por eso la precisión del TOF es crítica.'
            : 'La tabla usa 500 corridas Monte Carlo por fluido. El presupuesto descompone la cadena de velocidad y muestra cómo la inversión amplifica cada contribución.'}
        </footer>
      </div>
    </div>
  )
}
