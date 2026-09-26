import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'

// Stable per-project colour so the same project always looks the same.
const PALETTE = [
  { bg: '#eef2ff', fg: '#4f46e5', solid: '#6366f1' },
  { bg: '#ecfdf5', fg: '#047857', solid: '#10b981' },
  { bg: '#fff7ed', fg: '#c2410c', solid: '#f97316' },
  { bg: '#fdf2f8', fg: '#be185d', solid: '#ec4899' },
  { bg: '#f0f9ff', fg: '#0369a1', solid: '#0ea5e9' },
  { bg: '#faf5ff', fg: '#7e22ce', solid: '#a855f7' },
  { bg: '#fef2f2', fg: '#b91c1c', solid: '#ef4444' },
  { bg: '#f0fdf4', fg: '#15803d', solid: '#22c55e' }
]

function colourFor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

function timeAgo(iso) {
  if (!iso) return null
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const AGENT_ICON = {
  devops: 'fa-server',
  database: 'fa-database',
  code: 'fa-code',
  visual: 'fa-eye',
  general: 'fa-robot'
}

const OUTCOME = {
  success: { icon: 'fa-circle-check', label: 'Worked' },
  failed: { icon: 'fa-circle-xmark', label: "Didn't work" },
  partial: { icon: 'fa-circle-half-stroke', label: 'Partly worked' }
}

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [projectDiagnoses, setProjectDiagnoses] = useState({})
  const [loadingDiagnoses, setLoadingDiagnoses] = useState('')
  const [flash, setFlash] = useState('')
  const nameRef = useRef(null)

  const loadProjects = useCallback(() => {
    setLoading(true)
    api
      .get('/api/projects')
      .then((data) => setProjects(data.projects || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (!flash) return undefined
    const id = setTimeout(() => setFlash(''), 5000)
    return () => clearTimeout(id)
  }, [flash])

  async function handleCreate(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give the project a name.')
      return
    }
    setCreating(true)
    setError('')
    try {
      const data = await api.post('/api/projects', { name: trimmed, description })
      setProjects((prev) => [{ ...data.project, diagnosis_count: 0 }, ...prev])
      setName('')
      setDescription('')
      nameRef.current?.focus()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveEdit(id) {
    const trimmed = editing.name.trim()
    if (!trimmed) {
      setError('Project name cannot be empty.')
      return
    }
    setSavingEdit(true)
    setError('')
    try {
      const data = await api.put(`/api/projects/${id}`, { name: trimmed, description: editing.description })
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.project } : p)))
      setEditing(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(id) {
    setError('')
    try {
      const data = await api.delete(`/api/projects/${id}`)
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setProjectDiagnoses((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      if (expanded === id) setExpanded(null)
      setConfirmDelete(null)
      setFlash(
        data.diagnosesKept > 0
          ? `Project deleted. ${data.diagnosesKept} ${data.diagnosesKept === 1 ? 'diagnosis was' : 'diagnoses were'} kept in History, just without a project tag.`
          : 'Project deleted.'
      )
    } catch (err) {
      setError(err.message)
      setConfirmDelete(null)
    }
  }

  async function toggleExpand(project) {
    if (expanded === project.id) {
      setExpanded(null)
      return
    }
    setExpanded(project.id)
    if (projectDiagnoses[project.id]) return
    setLoadingDiagnoses(project.id)
    try {
      const data = await api.get(`/api/diagnosis/project/${project.id}`)
      setProjectDiagnoses((prev) => ({ ...prev, [project.id]: data.diagnoses || [] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingDiagnoses('')
    }
  }

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    )
  }, [projects, filter])

  const totals = useMemo(
    () =>
      projects.reduce(
        (acc, p) => {
          acc.diagnoses += p.diagnosis_count || 0
          acc.rated += (p.verified_success || 0) + (p.verified_failed || 0) + (p.verified_partial || 0)
          acc.success += p.verified_success || 0
          return acc
        },
        { diagnoses: 0, rated: 0, success: 0 }
      ),
    [projects]
  )

  return (
    <div className="pj-page">
      <div className="pj-head">
        <div>
          <h1 className="pj-title">Projects</h1>
          <p className="pj-sub">
            Group diagnoses by the system or service you are working on. Pick one on the Diagnose
            page and the history stays separated per project.
          </p>
        </div>
        {projects.length > 0 && (
          <div className="pj-totals">
            <div>
              <strong>{projects.length}</strong>
              <span>projects</span>
            </div>
            <div>
              <strong>{totals.diagnoses}</strong>
              <span>diagnoses</span>
            </div>
            {totals.rated > 0 && (
              <div>
                <strong>{Math.round((totals.success / totals.rated) * 100)}%</strong>
                <span>worked</span>
              </div>
            )}
          </div>
        )}
      </div>

      {flash && (
        <div className="pj-flash">
          <i className="fa-solid fa-circle-info"></i>
          {flash}
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}

      <form className="pj-create" onSubmit={handleCreate}>
        <input
          ref={nameRef}
          type="text"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={255}
          required
        />
        <input
          type="text"
          placeholder="What is it? (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
        <button type="submit" disabled={creating}>
          {creating ? (
            <i className="fa-solid fa-circle-notch fa-spin"></i>
          ) : (
            <i className="fa-solid fa-plus"></i>
          )}
          {creating ? 'Creating' : 'New project'}
        </button>
      </form>

      {projects.length > 3 && (
        <div className="pj-filter">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter projects..."
            aria-label="Filter projects"
          />
        </div>
      )}

      {loading ? (
        <div className="pj-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pj-skeleton" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="pj-empty">
          <i className="fa-solid fa-folder-open pj-empty-icon"></i>
          <p>No projects yet. Projects are optional, but they keep a busy workspace readable.</p>
          <Link to="/diagnose" className="pj-btn-primary">
            Run a diagnosis instead
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="pj-empty">
          <p>No project matches "{filter}".</p>
          <button type="button" className="pj-btn-ghost" onClick={() => setFilter('')}>
            Clear filter
          </button>
        </div>
      ) : (
        <div className="pj-grid">
          {visible.map((p) => {
            const colour = colourFor(p.name)
            const isEditing = editing?.id === p.id
            const isConfirming = confirmDelete === p.id
            const isExpanded = expanded === p.id
            const rated = (p.verified_success || 0) + (p.verified_failed || 0) + (p.verified_partial || 0)
            const rate = rated > 0 ? Math.round((p.verified_success / rated) * 100) : null

            return (
              <article key={p.id} className={`pj-card ${isExpanded ? 'open' : ''}`}>
                <div className="pj-card-top">
                  <span
                    className="pj-avatar"
                    style={{ background: colour.bg, color: colour.fg, borderColor: colour.solid }}
                  >
                    {initials(p.name)}
                  </span>
                  <div className="pj-card-title">
                    {isEditing ? (
                      <input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        maxLength={255}
                        autoFocus
                        className="pj-edit-input"
                      />
                    ) : (
                      <h2>{p.name}</h2>
                    )}
                    <span className="pj-created">
                      created {timeAgo(p.created_at)}
                      {p.updated_at && p.updated_at !== p.created_at && ' · edited'}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="pj-card-actions">
                      <button
                        type="button"
                        className="pj-btn-primary pj-btn-sm"
                        disabled={savingEdit}
                        onClick={() => handleSaveEdit(p.id)}
                      >
                        Save
                      </button>
                      <button type="button" className="pj-btn-ghost pj-btn-sm" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="pj-card-actions">
                      <button
                        type="button"
                        className="pj-icon-btn"
                        title="Rename"
                        onClick={() =>
                          setEditing({ id: p.id, name: p.name, description: p.description || '' })
                        }
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button
                        type="button"
                        className="pj-icon-btn danger"
                        title="Delete"
                        onClick={() => setConfirmDelete(p.id)}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    rows={2}
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    placeholder="Description (optional)"
                    maxLength={2000}
                    className="pj-edit-area"
                  />
                ) : (
                  p.description && <p className="pj-desc">{p.description}</p>
                )}

                <div className="pj-stats">
                  <span title="Diagnoses filed under this project">
                    <i className="fa-solid fa-stethoscope"></i>
                    {p.diagnosis_count || 0} {(p.diagnosis_count || 0) === 1 ? 'diagnosis' : 'diagnoses'}
                  </span>
                  {rate !== null && (
                    <span
                      className="pj-rate"
                      style={{ color: colour.fg, background: colour.bg, borderColor: colour.solid }}
                      title={`${p.verified_success} worked, ${p.verified_failed} failed, ${p.verified_partial} partly`}
                    >
                      {rate}% worked
                    </span>
                  )}
                  {p.last_activity && <span className="pj-ago">active {timeAgo(p.last_activity)}</span>}
                </div>

                {isConfirming && (
                  <div className="pj-confirm">
                    <p>
                      Delete <strong>{p.name}</strong>?
                      {(p.diagnosis_count || 0) > 0 && (
                        <>
                          {' '}
                          {(p.diagnosis_count || 0) === 1 ? 'Its 1 diagnosis' : `Its ${p.diagnosis_count} diagnoses`}{' '}
                          will be kept in History, only the project tag is removed.
                        </>
                      )}
                    </p>
                    <div>
                      <button type="button" className="pj-btn-danger" onClick={() => handleDelete(p.id)}>
                        Delete project
                      </button>
                      <button type="button" className="pj-btn-ghost" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="pj-card-foot">
                  <button type="button" className="pj-link" onClick={() => toggleExpand(p)}>
                    <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                    {isExpanded ? 'Hide diagnoses' : 'Show diagnoses'}
                  </button>
                  <Link to={`/diagnose?project=${p.id}`} className="pj-link strong">
                    <i className="fa-solid fa-plus"></i>
                    Diagnose in this project
                  </Link>
                </div>

                {isExpanded && (
                  <div className="pj-diagnoses">
                    {loadingDiagnoses === p.id ? (
                      <p className="pj-note">Loading...</p>
                    ) : !projectDiagnoses[p.id] || projectDiagnoses[p.id].length === 0 ? (
                      <p className="pj-note">
                        Nothing filed under this project yet. Use Diagnose above to add one.
                      </p>
                    ) : (
                      <ul>
                        {projectDiagnoses[p.id].map((d) => {
                          const outcome = OUTCOME[d.outcome]
                          return (
                            <li key={d.id}>
                              <button type="button" onClick={() => navigate(`/diagnosis/${d.id}`)}>
                                <i className={`fa-solid ${AGENT_ICON[d.agent_used] || 'fa-robot'}`}></i>
                                <span className="pj-d-text">{d.problem}</span>
                                <span className="pj-d-date">
                                  {new Date(d.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                                {outcome && (
                                  <span className={`pj-d-outcome pj-d-outcome--${d.outcome}`}>
                                    <i className={`fa-solid ${outcome.icon}`}></i>
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
