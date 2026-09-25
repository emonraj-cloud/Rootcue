import { MessageCircle } from 'lucide-react'

export default function AgentCard({ agent }) {
  const Icon = agent.icon

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${agent.iconBackground}`}>
          <Icon size={20} className={agent.iconColor} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">{agent.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{agent.model}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Active
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">{agent.description}</p>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-xs text-slate-400">Last active: {agent.lastActive}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-all hover:bg-blue-100"
        >
          <MessageCircle size={13} />
          Chat
        </button>
      </div>
    </div>
  )
}
