import { Bell, ChevronDown, Moon, Search, Sun, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

export default function TopNavbar() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()

  const userName = user?.name || 'Md. Rakib Hasan'
  const userRole = user?.role || 'Administrator'
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-6">
        <div className="relative flex-1 max-w-xl">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search agents, workflows..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-10 py-2.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
            ⌘K
          </kbd>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="flex h-10 w-10 rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition-all hover:bg-slate-50 hover:text-blue-600"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 transition-all hover:bg-slate-50 hover:text-blue-600"
          >
            <Bell size={18} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>

          <div className="ml-1 flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white shadow-sm">
              {initials || <User size={16} />}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-slate-900">{userName}</p>
              <p className="text-xs text-slate-500">{userRole}</p>
            </div>
            <ChevronDown size={15} className="hidden text-slate-400 md:block" />
          </div>
        </div>
      </div>
    </header>
  )
}
