import { ControlPanel } from './components/ControlPanel'
import { DidacticPanel } from './components/DidacticPanel'
import { PipeScene } from './components/scene/PipeScene'
import { PressureChart } from './components/PressureChart'
import { ReadoutPanel } from './components/ReadoutPanel'

export default function App() {
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
            Escena 3D: la onda ultrasónica viaja por la pared de la tubería y su velocidad depende de
            la presión (efecto acustoelástico). Ajusta la geometría, el material y el ruido para ver
            cómo cambia la estimación.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <PipeScene />
            <PressureChart />
            <DidacticPanel />
          </div>

          <div className="space-y-6">
            <ControlPanel />
            <ReadoutPanel />
          </div>
        </div>

        <footer className="mt-6 text-sm text-slate-500">
          Los sensores emisor (verde) y receptor (ámbar) marcan los extremos del tramo de medición.
          La inversión amplifica el error de la onda: por eso la precisión del TOF es crítica.
        </footer>
      </div>
    </div>
  )
}
