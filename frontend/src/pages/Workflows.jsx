import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const STATUS_META = {
  active: { label: 'Active', className: 'wf-status active' },
  draft: { label: 'Draft', className: 'wf-status draft' },
  paused: { label: 'Paused', className: 'wf-status paused' },
  error: { label: 'Error', className: 'wf-status error' }
}

function statusMeta(status) {
  return STATUS_META[status] || { label: status || 'Unknown', className: 'wf-status draft' }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  const loadWorkflows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/workflows')
      setWorkflows(res.workflows || [])
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to fetch workflows')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  // Only used to show which agent each workflow is attached to.
  useEffect(() => {
    api
      .get('/api/agents')
      .then((res) => setAgents(res.agents || []))
      .catch(() => setAgents([]))
  }, [])

  async function handleDelete(id) {
    if (!window.confirm('Delete this workflow and its nodes? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await api.delete(`/api/workflows/${id}`)
      setWorkflows((prev) => prev.filter((wf) => wf.id !== id))
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to delete workflow')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="wf-page">
      <div className="wf-page-header">
        <div>
          <h1 className="wf-title">Workflows</h1>
          <p className="wf-subtitle">Chain agents and tools together into a repeatable process.</p>
        </div>
        <button type="button" className="wf-btn-primary" onClick={() => navigate('/workflows/create')}>
          <i className="fa-solid fa-plus"></i>
          New Workflow
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <i className="fa-solid fa-circle-exclamation"></i> {error}
        </div>
      )}

      {loading ? (
        <div className="wf-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="wf-card">
              <div className="wf-skeleton wf-skeleton-title"></div>
              <div className="wf-skeleton wf-skeleton-line"></div>
              <div className="wf-skeleton wf-skeleton-line short"></div>
            </div>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div className="wf-card">
          <div className="empty-state">
            <i className="fa-solid fa-diagram-project"></i>
            <p>No workflows yet</p>
            <span>Create one to start sequencing agents and tools.</span>
            <button type="button" className="wf-btn-primary" onClick={() => navigate('/workflows/create')}>
              <i className="fa-solid fa-plus"></i>
              Create your first workflow
            </button>
          </div>
        </div>
      ) : (
        <div className="wf-grid">
          {workflows.map((wf) => {
            const meta = statusMeta(wf.status)
            const agent = agents.find((a) => a.id === wf.agent_id)
            const nodeCount = Array.isArray(wf.definition?.nodes) ? wf.definition.nodes.length : null

            return (
              <div
                key={wf.id}
                className="wf-card wf-card-clickable"
                onClick={() => navigate(`/workflows/${wf.id}`)}
              >
                <div className="wf-card-top">
                  <div className="wf-card-icon">
                    <i className="fa-solid fa-diagram-successor-node"></i>
                  </div>
                  <span className={meta.className}>{meta.label}</span>
                </div>

                <h3 className="wf-card-title">{wf.name}</h3>
                <p className="wf-card-desc">
                  {wf.description || 'No description provided.'}
                </p>

                <div className="wf-card-meta">
                  <span className="wf-meta-item">
                    <i className="fa-solid fa-robot"></i>
                    {agent ? agent.name : 'No agent attached'}
                  </span>
                  {nodeCount !== null && (
                    <span className="wf-meta-item">
                      <i className="fa-solid fa-circle-nodes"></i>
                      {nodeCount} node{nodeCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                <div className="wf-card-footer">
                  <span className="wf-card-updated">Updated {formatDate(wf.updated_at)}</span>
                  <div className="wf-card-actions">
                    <button
                      type="button"
                      className="wf-btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/workflows/${wf.id}`)
                      }}
                    >
                      Open <i className="fa-solid fa-arrow-right"></i>
                    </button>
                    <button
                      type="button"
                      className="wf-btn-danger"
                      disabled={deletingId === wf.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(wf.id)
                      }}
                    >
                      {deletingId === wf.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
