import { Bot, Sparkles } from 'lucide-react'

export default function HeroBanner({ pills }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-white px-6 py-8 shadow-sm sm:px-8">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-100/60 blur-2xl"></div>
      <div className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-indigo-100/50 blur-2xl"></div>

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-blue-600 shadow-sm backdrop-blur">
            <Sparkles size={13} />
            AI Platform Overview
          </div>

          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Good morning, Rakib! <span className="text-2xl">👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">Your AI agents are running smoothly.</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {pills.map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-blue-100"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                {pill.value} {pill.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto md:mx-0">
          <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-br from-blue-200 to-indigo-200 opacity-40 blur-xl"></div>
          <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl bg-white/70 shadow-lg ring-1 ring-blue-100 backdrop-blur-sm">
            <Bot size={72} className="text-blue-500" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </section>
  )
}
