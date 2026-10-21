import { FLUID_LIST, MATERIALS } from '../simulation'
import type { BoundaryType, FluidId, MaterialId } from '../simulation/types'
import { useSimulationStore } from '../store/simulationStore'
import type { MeasurementMethod } from '../store/simulationStore'

const selectClass =
  'mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400'

const buttonBase =
  'rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'

const sliderClass = 'mt-2 w-full accent-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'

const METHOD_OPTIONS: { id: MeasurementMethod; label: string }[] = [
  { id: 'tof', label: 'TOF' },
  { id: 'phase', label: 'Desfase' },
]

export function ControlPanel() {
  const pressure = useSimulationStore((state) => state.pressure)
  const fluidId = useSimulationStore((state) => state.fluidId)
  const materialId = useSimulationStore((state) => state.materialId)
  const boundary = useSimulationStore((state) => state.boundary)
  const playing = useSimulationStore((state) => state.playing)
  const didactic = useSimulationStore((state) => state.didactic)
  const innerRadius = useSimulationStore((state) => state.innerRadius)
  const wallThickness = useSimulationStore((state) => state.wallThickness)
  const noise = useSimulationStore((state) => state.noise)
  const method = useSimulationStore((state) => state.method)

  const setPressure = useSimulationStore((state) => state.setPressure)
  const setFluidId = useSimulationStore((state) => state.setFluidId)
  const setMaterialId = useSimulationStore((state) => state.setMaterialId)
  const setBoundary = useSimulationStore((state) => state.setBoundary)
  const togglePlaying = useSimulationStore((state) => state.togglePlaying)
  const setDidactic = useSimulationStore((state) => state.setDidactic)
  const setInnerRadius = useSimulationStore((state) => state.setInnerRadius)
  const setWallThickness = useSimulationStore((state) => state.setWallThickness)
  const setNoise = useSimulationStore((state) => state.setNoise)
  const setMethod = useSimulationStore((state) => state.setMethod)
  const reset = useSimulationStore((state) => state.reset)

  return (
    <section className="self-start rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Controles
      </h2>

      <div className="mt-4 space-y-4">
        <label className="block">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Presión interna</span>
            <span className="font-mono text-slate-200">{(pressure / 1e6).toFixed(1)} MPa</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={pressure / 1e6}
            aria-label="Presión interna"
            aria-valuetext={`${(pressure / 1e6).toFixed(1)} megapascales`}
            onChange={(event) => setPressure(Number(event.target.value) * 1e6)}
            className={sliderClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-400">
            <span>Fluido</span>
            <select
              value={fluidId}
              onChange={(event) => setFluidId(event.target.value as FluidId)}
              className={selectClass}
            >
              {FLUID_LIST.map((fluid) => (
                <option key={fluid.id} value={fluid.id}>
                  {fluid.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-400">
            <span>Material</span>
            <select
              value={materialId}
              onChange={(event) => setMaterialId(event.target.value as MaterialId)}
              className={selectClass}
            >
              {MATERIALS.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Radio interno</span>
            <span className="font-mono text-slate-200">
              {(innerRadius * 1000).toFixed(0)} mm
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={200}
            step={5}
            value={Math.round(innerRadius * 1000)}
            aria-label="Radio interno"
            aria-valuetext={`${(innerRadius * 1000).toFixed(0)} milímetros`}
            onChange={(event) => setInnerRadius(Number(event.target.value) / 1000)}
            className={sliderClass}
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Espesor de pared</span>
            <span className="font-mono text-slate-200">
              {(wallThickness * 1000).toFixed(1)} mm
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={15}
            step={0.5}
            value={wallThickness * 1000}
            aria-label="Espesor de pared"
            aria-valuetext={`${(wallThickness * 1000).toFixed(1)} milímetros`}
            onChange={(event) => setWallThickness(Number(event.target.value) / 1000)}
            className={sliderClass}
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Ruido de medición</span>
            <span className="font-mono text-slate-200">{(noise * 100).toFixed(2)} %</span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={0.05}
            value={noise * 100}
            aria-label="Ruido de medición"
            aria-valuetext={`${(noise * 100).toFixed(2)} por ciento`}
            onChange={(event) => setNoise(Number(event.target.value) / 100)}
            className={sliderClass}
          />
        </label>

        <div>
          <span className="text-sm text-slate-400">Método</span>
          <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg border border-slate-700 bg-slate-950 p-1">
            {METHOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={method === option.id}
                onClick={() => setMethod(option.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  method === option.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-400">
            <span>Frontera</span>
            <select
              value={boundary}
              onChange={(event) => setBoundary(event.target.value as BoundaryType)}
              className={selectClass}
            >
              <option value="reflecting">Reflejante</option>
              <option value="absorbing">Absorbente</option>
            </select>
          </label>

          <label className="flex items-end gap-2 pb-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={didactic}
              onChange={(event) => setDidactic(event.target.checked)}
              className="h-4 w-4 accent-sky-400"
            />
            Modo didáctico
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={togglePlaying}
            className={`${buttonBase} bg-sky-500 text-slate-950 hover:bg-sky-400`}
          >
            {playing ? 'Pausar' : 'Reproducir'}
          </button>
          <button
            type="button"
            onClick={reset}
            className={`${buttonBase} border border-slate-700 text-slate-200 hover:border-slate-500`}
          >
            Reiniciar
          </button>
        </div>
      </div>
    </section>
  )
}
