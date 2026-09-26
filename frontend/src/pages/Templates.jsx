import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const CATEGORY_LABELS = {
  customer_support: 'Customer support',
  marketing: 'Marketing',
  sales: 'Sales',
  hr: 'HR',
  research: 'Research',
  development: 'Development',
  data: 'Data',
  productivity: 'Productivity',
  personal: 'Personal',
  custom: 'Custom'
}

const AGENT_BADGE = {
  general: { label: 'Troubleshooting', cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
  database: { label: 'Database', cls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300' },
  devops: { label: 'DevOps', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  code: { label: 'Code', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  visual: { label: 'Visual', cls: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300' }
}

export default function Templates() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [facets, setFacets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState('')
  const [preview, setPreview] = useState(null)
  const [copied, setCopied] = useState('')

  const load = useCallback(
    async (overrides = {}) => {
      const next = { category, query, ...overrides }
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        if (next.category) params.set('category', next.category)
        if (next.query) params.set('search', next.query)

        const res = await api.get(`/api/templates${params.toString() ? `?${params}` : ''}`)
        setTemplates(res.templates || [])
        if (Array.isArray(res.facets)) setFacets(res.facets)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [category, query]
  )

  useEffect(() => {
    load()
  }, [load])

  // The old button had an empty onClick, so a template could not be applied.
  // "Use" now asks the server for the prompt and opens the Diagnose page with
  // it already filled in, which is the one path that actually runs it.
  async function useTemplate(t) {
    setBusyId(t.id)
    setError('')
    try {
      const res = await api.post(`/api/templates/${t.id}/use`, {})
      if (!res.prompt) {
        setError('That template has no prompt attached.')
        return
      }
      navigate(`${res.target || '/diagnose'}?problem=${encodeURIComponent(res.prompt)}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function copyPrompt(t) {
    const text = t.config?.prompt
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(t.id)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      setCopied('')
    }
  }

  if (loading && templates.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-44 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-44 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-44 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    )
  }

  const hasFilters = Boolean(category || query)

  return (
    <div className="p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{templates.length} available</span>
      </div>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        A template is a proven question. Using one opens the Diagnose tool with the question already
        written for you.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ---------- filters ---------- */}
      <div className="mb-5 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setQuery(search.trim())
          }}
          placeholder="Search templates"
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="button"
          onClick={() => setQuery(search.trim())}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Search
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setCategory('')
              setSearch('')
              setQuery('')
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-indigo-400 dark:border-gray-600 dark:text-gray-300"
          >
            Reset
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={
            category === ''
              ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white'
              : 'rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:border-indigo-400 dark:border-gray-600 dark:text-gray-300'
          }
        >
          All
        </button>
        {facets.map((f) => (
          <button
            key={f.category}
            type="button"
            onClick={() => setCategory(f.category)}
            className={
              category === f.category
                ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white'
                : 'rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:border-indigo-400 dark:border-gray-600 dark:text-gray-300'
            }
          >
            {CATEGORY_LABELS[f.category] || f.category} ({f.count})
          </button>
        ))}
      </div>

      {/* ---------- grid ---------- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const agent = AGENT_BADGE[t.config?.agentType] || AGENT_BADGE.general

          return (
            <div
              key={t.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white/60 p-5 transition hover:border-indigo-300 hover:shadow-lg dark:border-gray-700 dark:bg-slate-900/40"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <i className={`fa-solid ${t.config?.icon || 'fa-copy'}`}></i>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {t.isFeatured && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      Featured
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${agent.cls}`}>
                    {agent.label}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t.name}</h3>
              <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">{t.description}</p>

              <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                {CATEGORY_LABELS[t.category] || t.category}
                {t.usageCount > 0 ? ` · used ${t.usageCount} time${t.usageCount === 1 ? '' : 's'}` : ''}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => useTemplate(t)}
                  className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
                >
                  {busyId === t.id ? 'Opening...' : 'Use Template'}
                </button>
                <button
                  type="button"
                  onClick={() => copyPrompt(t)}
                  title="Copy the question"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-400"
                >
                  {copied === t.id ? 'Copied' : <i className="fa-solid fa-copy"></i>}
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(t)}
                  title="See the question"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-400"
                >
                  <i className="fa-solid fa-eye"></i>
                </button>
              </div>
            </div>
          )
        })}

        {templates.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
            <i className="fa-solid fa-copy text-3xl text-gray-300 dark:text-gray-600"></i>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {hasFilters ? 'No templates match this filter.' : 'No templates available.'}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {hasFilters ? 'Try a different category or search term.' : 'Reset the filters to see the whole catalogue.'}
            </p>
          </div>
        )}
      </div>

      {/* ---------- preview ---------- */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(null)
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                <i className={`fa-solid ${preview.config?.icon || 'fa-copy'}`}></i>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{preview.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {CATEGORY_LABELS[preview.category] || preview.category}
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{preview.description}</p>

            <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              The question this asks
            </p>
            <p className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-200">
              {preview.config?.prompt || 'No prompt attached to this template.'}
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = preview
                  setPreview(null)
                  useTemplate(t)
                }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
