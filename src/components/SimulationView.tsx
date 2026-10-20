import { ControlPanel } from './ControlPanel'
import { DidacticPanel } from './DidacticPanel'
import { PipeScene } from './scene/PipeScene'
import { PressureChart } from './PressureChart'
import { ReadoutPanel } from './ReadoutPanel'

export function SimulationView() {
  return (
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
  )
}
