import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Bot,
  Clock,
  Code,
  Copy,
  Eye,
  Folder,
  GitBranch,
  HelpCircle,
  Key,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  PlayCircle,
  Plug,
  QrCode,
  Server,
  Settings,
  Stethoscope,
  Terminal,
  Wrench,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Dashboard',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/agents', label: 'Agents', icon: Bot },
      { to: '/workflows', label: 'Workflows', icon: GitBranch },
      { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
      { to: '/tools', label: 'Tools', icon: Wrench },
      { to: '/conversations', label: 'Conversations', icon: MessageCircle },
      { to: '/projects', label: 'Projects', icon: Folder },
      { to: '/providers', label: 'Providers', icon: Server },
      { to: '/credentials', label: 'Credentials', icon: Key },
      { to: '/integrations', label: 'Integrations', icon: Plug },
      { to: '/templates', label: 'Templates', icon: Copy },
      { to: '/diagnose', label: 'Diagnose', icon: Stethoscope },
      { to: '/visual', label: 'Visual Diagnose', icon: Eye },
      { to: '/code-fix', label: 'Code Fix', icon: Code },
      { to: '/history', label: 'History', icon: Clock },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/executions', label: 'Executions', icon: PlayCircle },
      { to: '/logs', label: 'Logs', icon: Terminal },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/api-keys', label: 'API Keys', icon: QrCode },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/help', label: 'Help', icon: LifeBuoy },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-[260px] flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200">
          <Bot size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-slate-900">AgentFlow</h1>
          <span className="text-xs text-slate-500">AI Agent Automation</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.label}
            </p>
            <div className="flex flex-col gap-1.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        className={`flex-shrink-0 transition-colors duration-200 ${
                          isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                        }`}
                      />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-blue-50 p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <HelpCircle size={18} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Need help?</h3>
          <p className="mb-3 mt-1 text-xs leading-relaxed text-slate-600">
            Visit our Help Center for guides, tutorials, and support.
          </p>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-600 shadow-sm transition-all hover:bg-blue-50 hover:shadow"
          >
            View Help Center
            <LifeBuoy size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
