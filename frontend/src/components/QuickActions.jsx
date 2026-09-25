import { BarChart3, Download, PlayCircle, Plus } from 'lucide-react'

const defaultSecondaryActions = [
  { label: 'Run Workflow', icon: PlayCircle },
  { label: 'View Analytics', icon: BarChart3 },
  { label: 'Export Report', icon: Download },
]

export default function QuickActions({
  primaryAction = { label: 'Create New Agent', icon: Plus },
  secondaryActions = defaultSecondaryActions,
  onPrimaryAction,
}) {
  const PrimaryIcon = primaryAction.icon

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-slate-900">Quick Actions</h3>
        <p className="mt-1 text-xs text-slate-500">Frequently used operations</p>
      </div>

      <button
        type="button"
        onClick={onPrimaryAction}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
      >
        <PrimaryIcon size={16} />
        {primaryAction.label}
      </button>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {secondaryActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            >
              <Icon size={14} />
              {action.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
