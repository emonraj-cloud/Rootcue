import { TrendingDown, TrendingUp } from 'lucide-react'

const iconColors = {
  blue: {
    background: 'bg-blue-50',
    icon: 'text-blue-600',
  },
  indigo: {
    background: 'bg-indigo-50',
    icon: 'text-indigo-600',
  },
  emerald: {
    background: 'bg-emerald-50',
    icon: 'text-emerald-600',
  },
  amber: {
    background: 'bg-amber-50',
    icon: 'text-amber-600',
  },
  purple: {
    background: 'bg-purple-50',
    icon: 'text-purple-600',
  },
}

export default function StatCard({ label, value, icon: Icon, color = 'blue', trend, trendUp = true }) {
  const colors = iconColors[color] || iconColors.blue

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.background}`}>
          <Icon size={20} className={colors.icon} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {trendUp ? (
          <TrendingUp size={14} className="text-emerald-500" />
        ) : (
          <TrendingDown size={14} className="text-rose-500" />
        )}
        <span className={trendUp ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-rose-600'}>
          {trend}
        </span>
        <span className="text-xs text-slate-400">vs last month</span>
      </div>
    </div>
  )
}
