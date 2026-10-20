import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSimulationModel } from '../hooks/useSimulationModel'
import { waveSpeedAtPressure } from '../simulation'

export function PressureChart() {
  const { geometry, material, pressure, acoustic } = useSimulationModel()

  const data = useMemo(
    () =>
      Array.from({ length: 41 }, (_, index) => {
        const p = (index / 40) * 10e6
        return { pressure: index / 4, speed: waveSpeedAtPressure(p, geometry, material) }
      }),
    [geometry, material],
  )

  const min = Math.min(...data.map((point) => point.speed))
  const max = Math.max(...data.map((point) => point.speed))
  const padding = Math.max((max - min) * 0.15, 5)

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-2xl shadow-black/30">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        c(P) — velocidad acustoelástica
      </h2>
      <div className="mt-3 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis
              dataKey="pressure"
              type="number"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              label={{
                value: 'P (MPa)',
                position: 'insideBottom',
                offset: -2,
                fill: '#64748b',
                fontSize: 11,
              }}
            />
            <YAxis
              domain={[Math.floor(min - padding), Math.ceil(max + padding)]}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(value) => Number(value).toFixed(0)}
            />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#e2e8f0',
                fontSize: 12,
              }}
              formatter={(value) => [`${Number(value).toFixed(1)} m/s`, 'c']}
              labelFormatter={(value) => `P = ${Number(value).toFixed(1)} MPa`}
            />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={pressure / 1e6}
              y={acoustic.waveSpeed}
              r={5}
              fill="#f59e0b"
              stroke="#0f172a"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        La pendiente es α·c0. El punto ámbar marca la presión actual.
      </p>
    </section>
  )
}
