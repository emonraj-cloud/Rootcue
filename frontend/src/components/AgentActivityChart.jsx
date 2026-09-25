import { Activity, TrendingUp } from 'lucide-react'

const defaultData = [
  { day: 'Mon', value: 62 },
  { day: 'Tue', value: 78 },
  { day: 'Wed', value: 55 },
  { day: 'Thu', value: 84 },
  { day: 'Fri', value: 71 },
  { day: 'Sat', value: 92 },
  { day: 'Sun', value: 68 },
]

const WIDTH = 640
const HEIGHT = 250
const PADDING = { top: 24, right: 20, bottom: 36, left: 44 }
const chartWidth = WIDTH - PADDING.left - PADDING.right
const chartHeight = HEIGHT - PADDING.top - PADDING.bottom
const maxValue = 100

const points = defaultData.map((item, index) => ({
  x: PADDING.left + (index * chartWidth) / (defaultData.length - 1),
  y: PADDING.top + chartHeight - (item.value / maxValue) * chartHeight,
}))

const linePath = points.reduce((path, point, index) => {
  if (index === 0) return `M ${point.x} ${point.y}`
  return `${path} L ${point.x} ${point.y}`
}, '')

const areaPath = `${linePath} L ${points[points.length - 1].x} ${PADDING.top + chartHeight} L ${points[0].x} ${PADDING.top + chartHeight} Z`

export default function AgentActivityChart() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Agent Activity</h3>
          <p className="mt-1 text-xs text-slate-500">Execution volume across your agents</p>
        </div>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-all hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          defaultValue="7"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full">
          <defs>
            <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((tick) => {
            const y = PADDING.top + chartHeight - (tick / maxValue) * chartHeight
            return (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? '0' : '3 4'}
                />
                <text x={PADDING.left - 12} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                  {tick}
                </text>
              </g>
            )
          })}

          <path d={areaPath} fill="url(#chartArea)" />
          <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point, index) => (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r="4" fill="white" stroke="#3b82f6" strokeWidth="2.5" />
              <text
                x={point.x}
                y={HEIGHT - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#64748b"
              >
                {defaultData[index].day}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

export function ActivitySummary() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 text-emerald-600">
        <TrendingUp size={14} />
        <span className="text-xs font-medium">+18.2%</span>
      </div>
      <div className="flex items-center gap-1.5 text-slate-500">
        <Activity size={14} />
        <span className="text-xs">Avg. 73 executions/day</span>
      </div>
    </div>
  )
}
