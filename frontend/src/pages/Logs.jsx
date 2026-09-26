import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

// audit_logs has no level column, so tone is derived from the action text.
function actionTone(action) {
  const a = String(action || '').toLowerCase()
  if (a.includes('delete') || a.includes('remove') || a.includes('fail') || a.includes('error')) return 'error'
  if (a.includes('update') || a.includes('warn')) return 'warn'
  return 'info'
}

const TONE_CHIP = {
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  warn: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
}

const TONE_ICON = {
  error: 'fa-triangle-exclamation',
  warn: 'fa-circle-exclamation',
  info: 'fa-circle-info'
}

function formatTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function keyValue(details) {
  if (!details || typeof details !== 'object') return []
  return Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '')
}

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [facets, setFacets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [action, setAction] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState('')
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(
    async (overrides = {}) => {
      const next = { action, resourceType, query, ...overrides }
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        if (next.action) params.set('action', next.action)
        if (next.resourceType) params.set('resourceType', next.resourceType)
        if (next.query) params.set('search', next.query)

        const res = await api.get(`/api/logs${params.toString() ? `?${params}` : ''}`)
        setLogs(res.logs || [])
        if (Array.isArray(res.facets)) setFacets(res.facets)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [action, resourceType, query]
  )

  useEffect(() => {
    load()
  }, [load])

  const actions = [...new Set(facets.map((f) => f.action).filter(Boolean))].sort()
  const resourceTypes = [...new Set(facets.map((f) => f.resourceType).filter(Boolean))].sort()

  async function clearAll() {
    setClearing(true)
    setError('')
    try {
      await api.delete('/api/logs')
      setConfirmClear(false)
      setExpanded('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setClearing(false)
    }
  }

  const hasFilters = Boolean(action || resourceType || query)

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{logs.length} shown</span>
          {logs.length > 0 &&
            (confirmClear ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={clearing}
                  onClick={clearAll}
                  className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:border-red-400 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
              >
                Clear
              </button>
            ))}
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Every action someone takes in this workspace is recorded here.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ---------- filters ---------- */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setQuery(search.trim())
          }}
          placeholder="Search action, resource or details"
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
        />

        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={resourceType}
          onChange={(e) => setResourceType(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
        >
          <option value="">All resources</option>
          {resourceTypes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

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
              setAction('')
              setResourceType('')
              setSearch('')
              setQuery('')
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-indigo-400 dark:border-gray-600 dark:text-gray-300"
          >
            Reset
          </button>
        )}
      </div>

      {/* ---------- list ---------- */}
      <div className="space-y-2">
        {loading && <p className="py-6 text-sm text-gray-500 dark:text-gray-400">Loading logs...</p>}

        {!loading &&
          logs.map((log) => {
            const tone = actionTone(log.action)
            const pairs = keyValue(log.details)
            const isOpen = expanded === log.id

            return (
              <div
                key={log.id}
                className="rounded-lg border border-gray-200 bg-white/60 dark:border-gray-700 dark:bg-slate-900/40"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? '' : log.id)}
                  className="flex w-full items-start gap-3 p-3 text-left"
                >
                  <i
                    className={`fa-solid ${TONE_ICON[tone]} mt-0.5 shrink-0 text-xs ${
                      tone === 'error'
                        ? 'text-red-500'
                        : tone === 'warn'
                          ? 'text-yellow-500'
                          : 'text-blue-500'
                    }`}
                  ></i>

                  <span
                    className={`shrink-0 rounded px-2 py-1 text-xs font-semibold whitespace-nowrap ${TONE_CHIP[tone]}`}
                  >
                    {log.action}
                  </span>

                  <span className="shrink-0 rounded bg-gray-100 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {log.resourceType}
                  </span>

                  <span className="min-w-0 flex-1 text-xs text-gray-700 dark:text-gray-300">
                    {log.agentName ? (
                      <span className="font-semibold">{log.agentName}</span>
                    ) : null}
                    {log.userName ? (
                      <span className="text-gray-500 dark:text-gray-400"> by {log.userName}</span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400"> by system</span>
                    )}
                  </span>

                  <span className="shrink-0 text-[11px] whitespace-nowrap text-gray-400 dark:text-gray-500">
                    {formatTime(log.createdAt)}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200 px-3 py-3 dark:border-gray-700">
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Resource id
                        </dt>
                        <dd className="break-all font-mono text-[11px] text-gray-700 dark:text-gray-300">
                          {log.resourceId || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          IP address
                        </dt>
                        <dd className="font-mono text-[11px] text-gray-700 dark:text-gray-300">
                          {log.ipAddress || '—'}
                        </dd>
                      </div>
                    </dl>

                    {pairs.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Details
                        </p>
                        <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                          {pairs.map(([k, v]) => (
                            <div key={k} className="flex items-baseline gap-1.5">
                              <dt className="text-[11px] text-gray-500 dark:text-gray-400">{k}:</dt>
                              <dd className="break-all font-mono text-[11px] text-gray-800 dark:text-gray-200">
                                {String(v)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    )}

                    {log.userAgent && (
                      <p className="mt-3 break-all text-[10px] text-gray-400 dark:text-gray-500">
                        {log.userAgent}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}

        {!loading && logs.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
            <i className="fa-solid fa-terminal text-3xl text-gray-300 dark:text-gray-600"></i>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {hasFilters ? 'No entries match these filters.' : 'No logs yet.'}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Run a diagnosis, save a credential or start a conversation and it shows up here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
