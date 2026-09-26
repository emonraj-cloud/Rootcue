import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'

// The schema only allows these five, so a successful run reads 'success'.
const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'success', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'running', label: 'Running' }
]

const STATUS_STYLE = {
  success: { label: 'Success', chip: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: 'Failed', chip: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  running: { label: 'Running', chip: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  pending: { label: 'Pending', chip: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  cancelled: { label: 'Cancelled', chip: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
}

function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const mins = Math.floor(ms / 60000)
  return `${mins}m ${Math.round((ms % 60000) / 1000)}s`
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

function pretty(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function Executions() {
  const [executions, setExecutions] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [status, setStatus] = useState('')
  const [agentId, setAgentId] = useState('')
  const [problem, setProblem] = useState('')
  const [running, setRunning] = useState(false)

  const [activeId, setActiveId] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [confirmId, setConfirmId] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = useCallback(
    async (nextStatus = status) => {
      setLoading(true)
      try {
        const query = nextStatus ? `?status=${nextStatus}` : ''
        const res = await api.get(`/api/executions${query}`)
        setExecutions(res.executions || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [status]
  )

  useEffect(() => {
    load(status)
  }, [status, load])

  useEffect(() => {
    api
      .get('/api/agents')
      .then((res) => setAgents(res.agents || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    api
      .get(`/api/executions/${activeId}`)
      .then((res) => setDetail({ execution: res.execution, steps: res.steps || [] }))
      .catch((err) => setError(err.message))
      .finally(() => setDetailLoading(false))
  }, [activeId])

  async function run(e) {
    e.preventDefault()
    if (!problem.trim() || !agentId || running) return

    setRunning(true)
    setError('')
    setNotice('')
    try {
      const res = await api.post('/api/executions', { agentId, problem: problem.trim() })
      setProblem('')
      const created = res.execution
      if (created.status === 'failed') {
        setNotice('The run was recorded but the agent failed. Open it to see the error.')
      } else {
        setNotice('Run finished. Open it to see the full result.')
      }
      setActiveId(created.id)
      await load(status)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  async function remove(id) {
    setBusyId(id)
    setError('')
    try {
      await api.delete(`/api/executions/${id}`)
      setConfirmId('')
      if (activeId === id) setActiveId('')
      await load(status)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const shown = executions.length
  const succeeded = executions.filter((e) => e.status === 'success').length
  const failed = executions.filter((e) => e.status === 'failed').length
  const avgMs = (() => {
    const timed = executions.filter((e) => typeof e.durationMs === 'number')
    if (timed.length === 0) return null
    return Math.round(timed.reduce((sum, e) => sum + e.durationMs, 0) / timed.length)
  })()

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executions</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{shown} shown</span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Run an agent, then read exactly what it did, how long it took and what it returned.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-950/40 dark:text-indigo-300">
          {notice}
        </div>
      )}

      {/* ---------- summary ---------- */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: shown, tone: 'text-gray-900 dark:text-white' },
          { label: 'Succeeded', value: succeeded, tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Failed', value: failed, tone: 'text-red-600 dark:text-red-400' },
          { label: 'Avg duration', value: formatDuration(avgMs), tone: 'text-gray-900 dark:text-white' }
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white/60 px-4 py-3 dark:border-gray-700 dark:bg-slate-900/40"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {s.label}
            </p>
            <p className={`mt-1 text-lg font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {/* ---------- run ---------- */}
          <form
            onSubmit={run}
            className="grid gap-3 rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40"
          >
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Run an agent</h2>

            {agents.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No agents yet. Create one on the Agents page first.
              </p>
            ) : (
              <>
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Agent
                  <select
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">Choose an agent</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Input
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    rows={3}
                    placeholder="What should the agent work on?"
                    className="mt-1 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <button
                  type="submit"
                  disabled={!agentId || !problem.trim() || running}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {running ? 'Running...' : 'Run agent'}
                </button>
              </>
            )}
          </form>

          {/* ---------- filters ---------- */}
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={
                  status === tab.value
                    ? 'rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white'
                    : 'rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:border-indigo-400 dark:border-gray-600 dark:text-gray-300'
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ---------- list ---------- */}
          <div className="space-y-2">
            {executions.map((x) => {
              const s = STATUS_STYLE[x.status] || STATUS_STYLE.pending
              const prompt = x.input?.problem || 'No input recorded'
              return (
                <div
                  key={x.id}
                  className={
                    x.id === activeId
                      ? 'rounded-xl border border-indigo-400 bg-indigo-50 p-3 dark:border-indigo-400/50 dark:bg-indigo-950/30'
                      : 'rounded-xl border border-gray-200 bg-white/60 p-3 hover:border-indigo-300 dark:border-gray-700 dark:bg-slate-900/40'
                  }
                >
                  <button type="button" onClick={() => setActiveId(x.id)} className="w-full text-left">
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.chip}`}
                      >
                        {s.label}
                      </span>
                      <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {x.agentName || x.workflowName || `Execution ${x.id.slice(0, 8)}`}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{prompt}</p>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      {formatTime(x.createdAt)} · {formatDuration(x.durationMs)} · {x.stepCount || 0} step
                      {(x.stepCount || 0) === 1 ? '' : 's'}
                    </p>
                  </button>

                  {confirmId === x.id ? (
                    <span className="mt-2 flex gap-1">
                      <button
                        type="button"
                        disabled={busyId === x.id}
                        onClick={() => remove(x.id)}
                        className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId('')}
                        className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-600 dark:border-gray-600 dark:text-gray-300"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === x.id}
                      onClick={() => setConfirmId(x.id)}
                      title="Delete execution"
                      className="mt-2 rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-500 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              )
            })}

            {executions.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                <i className="fa-solid fa-play-circle text-3xl text-gray-300 dark:text-gray-600"></i>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {status ? 'No runs with that status.' : 'No executions yet.'}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Run an agent above and the record shows up here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------- detail ---------- */}
        <div className="rounded-xl border border-gray-200 bg-white/60 dark:border-gray-700 dark:bg-slate-900/40 lg:sticky lg:top-4 self-start">
          {!activeId ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <i className="fa-solid fa-diagram-project text-2xl text-gray-300 dark:text-gray-600"></i>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Select a run to see its steps and output.
              </p>
            </div>
          ) : detailLoading ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading run...</p>
          ) : detail ? (
            <div className="p-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {detail.execution.agentName || detail.execution.workflowName || 'Execution'}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {formatTime(detail.execution.createdAt)} ·{' '}
                {formatDuration(detail.execution.durationMs)}
              </p>

              {detail.execution.errorMessage && (
                <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
                  {detail.execution.errorMessage}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {detail.steps.map((step) => {
                  const s = STATUS_STYLE[step.status] || STATUS_STYLE.pending
                  return (
                    <div
                      key={step.id}
                      className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.chip}`}
                        >
                          {s.label}
                        </span>
                        <span className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                          {step.name || step.stepType}
                        </span>
                        <span className="ml-auto shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                          {formatDuration(step.durationMs)}
                        </span>
                      </div>

                      {step.input && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            Input
                          </summary>
                          <pre className="exec-json">{pretty(step.input)}</pre>
                        </details>
                      )}

                      {step.output && (
                        <details className="mt-1" open>
                          <summary className="cursor-pointer text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            Output
                          </summary>
                          <pre className="exec-json">{pretty(step.output)}</pre>
                        </details>
                      )}
                    </div>
                  )
                })}

                {detail.steps.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">This run has no steps.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
