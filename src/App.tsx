import { PipeScene } from './components/scene/PipeScene'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-sky-400">
            Ecuaciones Diferenciales
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Medición no invasiva de presión en tuberías
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Escena 3D: la onda ultrasónica viaja por la pared de la tubería y su velocidad depende de
            la presión (efecto acustoelástico). El manómetro muestra la presión aplicada y los anillos
            luminosos, el pulso en movimiento.
          </p>
        </header>

        <PipeScene />

        <footer className="mt-6 text-sm text-slate-500">
          Ajusta la presión, cambia el fluido y observa cómo el pulso recorre la tubería. Los sensores
          emisor (verde) y receptor (ámbar) marcan los extremos del tramo de medición.
        </footer>
      </div>
    </div>
  )
}
