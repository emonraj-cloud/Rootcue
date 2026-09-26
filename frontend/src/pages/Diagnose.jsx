import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import DiagnosisResultView from '../components/DiagnosisResultView.jsx'

// Below this the model has almost nothing to work with and returns a generic
// answer, so the submit is blocked with an explanation instead of a bad result.
const MIN_LENGTH = 15

const AGENT_LABEL = {
  general: 'Troubleshooting',
  database: 'Database',
  devops: 'DevOps',
  code: 'Code',
  troubleshooting: 'Troubleshooting'
}

function confidenceTone(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 'slate'
  if (n >= 80) return 'emerald'
  if (n >= 55) return 'amber'
  return 'rose'
}

const TONE_CHIP = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  slate: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

function timeAgo(value) {
  if (!value) return '—'
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(value).toLocaleDateString()
}

export default function Diagnose() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [problem, setProblem] = useState(searchParams.get('problem') || '')
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rawResponse, setRawResponse] = useState('')
  const [result, setResult] = useState(null)
  const [diagnosisId, setDiagnosisId] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [copied, setCopied] = useState(false)

  const [history, setHistory] = useState([])

  const [verifyStatus, setVerifyStatus] = useState(null)
  const [verifyNotes, setVerifyNotes] = useState('')
  const [verifySubmitting, setVerifySubmitting] = useState(false)
  const [verifySaved, setVerifySaved] = useState(false)

  const resultRef = useRef(null)

  useEffect(() => {
    api.get('/api/projects').then((data) => setProjects(data.projects)).catch(() => {})
  }, [])

  useEffect(() => {
    api
      .get('/api/diagnosis/history')
      .then((data) => setHistory((data.history || []).slice(0, 8)))
      .catch(() => {})
  }, [result])

  // Keep the box in step with the URL so a refresh, a shared link, or a
  // template landing here all behave the same.
  useEffect(() => {
    const fromUrl = searchParams.get('problem') || ''
    if (fromUrl && fromUrl !== problem) setProblem(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!loading) {
      setElapsed(0)
      return undefined
    }
    const started = Date.now()
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500)
    return () => clearInterval(id)
  }, [loading])

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  const trimmed = problem.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LENGTH
  const canRun = trimmed.length >= MIN_LENGTH && !loading

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!canRun) return

    setLoading(true)
    setError('')
    setRawResponse('')
    setResult(null)
    setVerifySaved(false)
    setVerifyStatus(null)
    setVerifyNotes('')

    try {
      const data = await api.post('/api/diagnosis', {
        problem: trimmed,
        projectId: projectId || undefined
      })
      setResult(data.diagnosis)
      setDiagnosisId(data.diagnosisId)
      // Reflect the text that was actually run, not a half-typed draft.
      setSearchParams({ problem: trimmed }, { replace: true })
    } catch (err) {
      setError(err.message)
      // The server returns the model's unparsable output on a 502. It is the
      // single most useful thing for working out what went wrong, so it is
      // surfaced instead of being thrown away with the error.
      setRawResponse(err.data?.rawResponse || '')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(status) {
    setVerifyStatus(status)
    setVerifySubmitting(true)
    setError('')
    try {
      await api.post('/api/verification', {
        problem: result.problem,
        solution: result.solution,
        status,
        notes: verifyNotes || undefined,
        diagnosisId: diagnosisId || undefined
      })
      setVerifySaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifySubmitting(false)
    }
  }

  async function copySolution() {
    if (!result) return
    const parts = [result.rootCause, result.solution, ...(result.steps || [])].filter(Boolean)
    try {
      await navigator.clipboard.writeText(parts.join('\n\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const agentUsed = result?.agentUsed
  const confidence = Number(result?.confidence)
  const hasConfidence = Number.isFinite(confidence)

  return (
    <div className="p-6 max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Diagnose a Problem</h1>
            {agentUsed && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                Handled by {AGENT_LABEL[agentUsed] || agentUsed}
              </span>
            )}
          </div>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            Describe what is going wrong. The more specific the symptom, the better the answer.
          </p>

          {/* ---------- input ---------- */}
          <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Describe your problem
              <textarea
                rows={4}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(e)
                }}
                placeholder="e.g. PostgreSQL connection refused on port 5432"
                className="mt-1 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
              />
            </label>

            {tooShort && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                A little more detail will help. Add what you expected, what actually happened, and when
                it started.
              </p>
            )}

            <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project (optional)
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canRun}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? `Analyzing... ${elapsed}s` : 'Analyze Problem'}
              </button>

              {problem && !loading && (
                <button
                  type="button"
                  onClick={() => {
                    setProblem('')
                    setSearchParams({}, { replace: true })
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:border-red-400 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
                >
                  Clear
                </button>
              )}

              <span className="text-xs text-gray-400 dark:text-gray-500">Ctrl + Enter to run</span>
            </div>
          </form>

          {loading && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-500/30 dark:bg-indigo-950/30">
              <div className="dash-thinking__dot" />
              <div className="dash-thinking__dot" />
              <div className="dash-thinking__dot" />
              <span className="text-sm text-indigo-700 dark:text-indigo-300">
                Reading the problem, choosing an agent, drafting a fix. The local model takes a few
                seconds.
              </span>
            </div>
          )}

          {/* ---------- error ---------- */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-950/40">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>

              {rawResponse && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-red-600 dark:text-red-400">
                    What the model actually returned
                  </summary>
                  <pre className="exec-json mt-2">{rawResponse}</pre>
                </details>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                className="mt-3 rounded-md border border-red-400 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40"
              >
                Try again
              </button>
            </div>
          )}

          {/* ---------- result ---------- */}
          {result && (
            <div ref={resultRef} className="mt-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {hasConfidence && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CHIP[confidenceTone(confidence)]}`}>
                    {Math.round(confidence)}% confidence
                  </span>
                )}
                {diagnosisId && (
                  <Link
                    to={`/diagnosis/${diagnosisId}`}
                    className="rounded-full border border-indigo-300 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300"
                  >
                    Open full report
                  </Link>
                )}
                <button
                  type="button"
                  onClick={copySolution}
                  className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-300"
                >
                  {copied ? 'Copied' : 'Copy fix'}
                </button>
                {hasConfidence && confidence < 55 && (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    Low confidence. Re-read the warnings before applying this.
                  </span>
                )}
              </div>

              <DiagnosisResultView result={result} />

              {/* ---------- verify ---------- */}
              <div className="mt-4 rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Did this solution work?
                </h2>

                {verifySaved ? (
                  <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                    Marked as <strong>{verifyStatus}</strong>
                    {diagnosisId ? ' and linked to this diagnosis' : ''}. This is what feeds the
                    success rate on your dashboard.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Rating the answer is what makes the accuracy numbers on the dashboard real.
                    </p>
                    <textarea
                      rows={2}
                      placeholder="Notes (optional)"
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      className="mt-3 w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={verifySubmitting}
                        onClick={() => handleVerify('success')}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Worked
                      </button>
                      <button
                        type="button"
                        disabled={verifySubmitting}
                        onClick={() => handleVerify('partial')}
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
                      >
                        Partially worked
                      </button>
                      <button
                        type="button"
                        disabled={verifySubmitting}
                        onClick={() => handleVerify('failed')}
                        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                      >
                        Didn't work
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ---------- recent ---------- */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent</h2>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                All
              </button>
            </div>

            {history.length === 0 ? (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Your past diagnoses show up here.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
                    <p className="line-clamp-2 text-xs text-gray-700 dark:text-gray-300">{h.problem}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {h.agent_used} · {timeAgo(h.created_at)}
                      </span>
                      <span className="flex gap-1">
                        <button
                          type="button"
                          title="Run this again"
                          onClick={() => {
                            setProblem(h.problem)
                            setSearchParams({ problem: h.problem }, { replace: true })
                          }}
                          className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-400"
                        >
                          Re-run
                        </button>
                        <Link
                          to={`/diagnosis/${h.id}`}
                          className="rounded border border-gray-300 px-1.5 py-0.5 text-[10px] text-gray-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-400"
                        >
                          Open
                        </Link>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Writing a good question</h2>
            <ul className="mt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <li>What you expected to happen</li>
              <li>What actually happened, with the exact error text</li>
              <li>When it started and what changed just before</li>
              <li>The versions or environment involved</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
