import { CheckCircle2, Server, Database, HardDrive, Wifi } from 'lucide-react'

const defaultItems = [
  { name: 'API Server', status: 'Healthy', icon: Server },
  { name: 'Database', status: 'Healthy', icon: Database },
  { name: 'Storage', status: 'Healthy', icon: HardDrive },
  { name: 'Network', status: 'Healthy', icon: Wifi },
]

export default function SystemStatus() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">System Status</h3>
          <p className="mt-1 text-xs text-slate-500">All systems operational</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
          Operational
        </div>
      </div>

      <div className="space-y-3">
        {defaultItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-3 transition-colors hover:bg-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                  <Icon size={15} />
                </div>
                <span className="text-sm font-medium text-slate-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-medium text-emerald-600">{item.status}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 size={14} />
          Last checked just now
        </div>
      </div>
    </div>
  )
}
