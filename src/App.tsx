import { WaveCanvas } from './components/WaveCanvas'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-sky-400">
            Ecuaciones Diferenciales
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Medición no invasiva de presión en tuberías
          </h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Prototipo 2D: propagación de una onda ultrasónica en la pared de una tubería con
            velocidad dependiente de la presión (efecto acustoelástico).
          </p>
        </header>

        <WaveCanvas />

        <footer className="mt-6 text-sm text-slate-500">
          Ajusta la presión y observa cómo cambia la velocidad de onda y el tiempo de vuelo. Usa
          la frontera reflejante para ver el pulso rebotar.
        </footer>
      </div>
    </div>
  )
}
