import { ControlPanel } from './ControlPanel'
import { DidacticPanel } from './DidacticPanel'
import { PipeScene } from './scene/PipeScene'
import { PressureChart } from './PressureChart'
import { ReadoutPanel } from './ReadoutPanel'
import { ResultPanel } from './ResultPanel'

export function SimulationView() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:items-start xl:gap-6">
      <div className="contents lg:block lg:min-w-0 lg:space-y-5 xl:space-y-6">
        <div className="order-1">
          <PipeScene />
        </div>
        <div className="order-4">
          <PressureChart />
        </div>
        <div className="order-6">
          <DidacticPanel />
        </div>
      </div>

      <div className="contents lg:block lg:min-w-0 lg:space-y-5 xl:space-y-6">
        <div className="order-2">
          <ResultPanel />
        </div>
        <div className="order-3">
          <ControlPanel />
        </div>
        <div className="order-5">
          <ReadoutPanel />
        </div>
      </div>
    </div>
  )
}
