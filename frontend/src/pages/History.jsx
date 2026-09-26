import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'

const AGENT_META = {
  devops: { icon: 'fa-server', label: 'DevOps' },
  database: { icon: 'fa-database', label: 'Database' },
  code: { icon: 'fa-code', label: 'Code' },
  visual: { icon: 'fa-eye', label: 'Visual' },
  general: { icon: 'fa-robot', label: 'General' }
}

const OUTCOME_META = {
  success: { icon: 'fa-circle-check', label: 'Worked' },
  failed: { icon: 'fa-circle-xmark', label: "Didn't work" },
  partial: { icon: 'fa-circle-half-stroke', label: 'Partly worked' }
}

function agentMeta(agent) {
  return AGENT_META[agent] || { icon: 'fa-robot', label: agent || 'General' }
}

// A wall of raw timestamps forces the reader to do arithmetic on every row.
// Grouping by day makes "what did I just work on" answerable at a glance.
function dayKey(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const same = (a, b) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Today'
  if (same(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeOnly(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso) {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function History() {
  const [params, setParams] = useSearchParams()
  const [history, setHistory] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [agents, setAgents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const searchInput = useRef(null)

  const search = params.get('search') || ''
  const agent = params.get('agent') || 'all'
  const outcome = params.get('outcome') || 'all'
  const page = Math.max(1, Number(params.get('page')) || 1)

  // Filters live in the URL so a filtered view survives a refresh and can be
  // shared or bookmarked.
  const setFilter = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = new URLSearchParams(params)
      for (const [k, v] of Object.entries(patch)) {
        if (v === 'all' || v === '' || v == null) next.delete(k)
        else next.set(k, v)
      }
      if (resetPage) next.delete('page')
      setParams(next, { replace: true })
    },
    [params, setParams]
  )

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page) })
    if (search) qs.set('search', search)
    if (agent !== 'all') qs.set('agent', agent)
    if (outcome !== 'all') qs.set('outcome', outcome)

    api
      .get(`/api/diagnosis/history?${qs.toString()}`)
      .then((data) => {
        setHistory(data.history || [])
        setTotal(data.total ?? 0)
        setPages(data.pages ?? 1)
        setAgents(data.agents || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, search, agent, outcome])

  // Typing should not fire a request per keystroke.
  const [searchDraft, setSearchDraft] = useState(search)
  useEffect(() => setSearchDraft(search), [search])
  useEffect(() => {
    if (searchDraft === search) return undefined
    const id = setTimeout(() => setFilter({ search: searchDraft }), 300)
    return () => clearTimeout(id)
  }, [searchDraft, search, setFilter])

  const grouped = useMemo(() => {
    const out = []
    for (const item of history) {
      const key = dayKey(item.created_at)
      const last = out[out.length - 1]
      if (last && last.key === key) last.items.push(item)
      else out.push({ key, items: [item] })
    }
    return out
  }, [history])

  async function handleDelete(id) {
    setDeleting(true)
    setError('')
    try {
      await api.delete(`/api/diagnosis/${id}`)
      // Drop it locally so the list does not visibly jump, then resync in
      // case the deletion changed the page boundaries.
      setHistory((h) => h.filter((i) => i.id !== id))
      setTotal((t) => Math.max(0, t - 1))
      setConfirmId(null)
      if (history.length === 1 && page > 1) setFilter({ page: String(page - 1) }, { resetPage: false })
    } catch (err) {
      setError(err.message)
      setConfirmId(null)
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = search || agent !== 'all' || outcome !== 'all'

  return (
    <div className="hist-page">
      <div className="hist-head">
        <div>
          <h1 className="hist-title">History</h1>
          <p className="hist-sub">
            {loading ? 'Loading...' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
            {hasFilters && ' matching your filters'}
          </p>
        </div>
        <Link to="/diagnose" className="hist-new">
          <i className="fa-solid fa-plus"></i>
          New diagnosis
        </Link>
      </div>

      <div className="hist-filters">
        <div className="hist-search">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            ref={searchInput}
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchDraft('')
                setFilter({ search: '' })
              }
            }}
            placeholder="Search the problem text..."
            aria-label="Search history"
          />
          {searchDraft && (
            <button
              type="button"
              className="hist-search-x"
              onClick={() => {
                setSearchDraft('')
                setFilter({ search: '' })
                searchInput.current?.focus()
              }}
              aria-label="Clear search"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        <select
          className="hist-select"
          value={agent}
          onChange={(e) => setFilter({ agent: e.target.value })}
          aria-label="Filter by agent"
        >
          <option value="all">All agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {agentMeta(a).label}
            </option>
          ))}
        </select>

        <select
          className="hist-select"
          value={outcome}
          onChange={(e) => setFilter({ outcome: e.target.value })}
          aria-label="Filter by outcome"
        >
          <option value="all">Any outcome</option>
          <option value="rated">Rated</option>
          <option value="unrated">Not rated yet</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            className="hist-clear"
            onClick={() => {
              setSearchDraft('')
              setParams(new URLSearchParams(), { replace: true })
            }}
          >
            <i className="fa-solid fa-xmark"></i>
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="hist-skeletons">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="hist-skeleton" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="hist-empty">
          <i className="fa-solid fa-clock-rotate-left hist-empty-icon"></i>
          <p>
            {hasFilters
              ? 'Nothing matches these filters.'
              : 'No diagnoses yet. Every diagnosis, code fix and screenshot analysis shows up here.'}
          </p>
          {hasFilters ? (
            <button
              type="button"
              className="hist-clear"
              onClick={() => {
                setSearchDraft('')
                setParams(new URLSearchParams(), { replace: true })
              }}
            >
              Clear filters
            </button>
          ) : (
            <Link to="/diagnose" className="hist-new">
              Run your first diagnosis
            </Link>
          )}
        </div>
      ) : (
        <>
          {grouped.map((group) => (
            <section key={group.key} className="hist-group">
              <h2 className="hist-group-title">
                {group.key}
                <span className="hist-group-count">{group.items.length}</span>
              </h2>
              <ul className="hist-list">
                {group.items.map((item) => {
                  const meta = agentMeta(item.agent_used)
                  const outcomeMeta = OUTCOME_META[item.outcome]
                  return (
                    <li key={item.id}>
                      <div className={`hist-row ${confirmId === item.id ? 'confirming' : ''}`}>
                        <Link to={`/diagnosis/${item.id}`} className="hist-row__main">
                          <span className="hist-row__icon" title={meta.label}>
                            <i className={`fa-solid ${meta.icon}`}></i>
                          </span>
                          <span className="hist-row__body">
                            <span className="hist-row__text">{item.problem}</span>
                            <span className="hist-row__meta">
                              <span className="hist-row__agent">{meta.label}</span>
                              <span title={new Date(item.created_at).toLocaleString()}>
                                {timeOnly(item.created_at)}
                              </span>
                              <span className="hist-row__ago">{timeAgo(item.created_at)}</span>
                            </span>
                          </span>
                          {outcomeMeta ? (
                            <span className={`hist-outcome hist-outcome--${item.outcome}`}>
                              <i className={`fa-solid ${outcomeMeta.icon}`}></i>
                              {outcomeMeta.label}
                            </span>
                          ) : (
                            <span className="hist-outcome hist-outcome--none" title="You have not rated this yet">
                              Unrated
                            </span>
                          )}
                        </Link>

                        {confirmId === item.id ? (
                          <div className="hist-confirm">
                            <span>Delete this permanently?</span>
                            <button
                              type="button"
                              className="hist-danger"
                              disabled={deleting}
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              className="hist-cancel"
                              onClick={() => setConfirmId(null)}
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="hist-row__delete"
                            onClick={() => setConfirmId(item.id)}
                            aria-label="Delete this entry"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          {pages > 1 && (
            <nav className="hist-pager">
              <button disabled={page <= 1} onClick={() => setFilter({ page: String(page - 1) }, { resetPage: false })}>
                <i className="fa-solid fa-chevron-left"></i>
                Newer
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setFilter({ page: String(page + 1) }, { resetPage: false })}
              >
                Older
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
