import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'

const NODE_TYPES = [
  { value: 'trigger', label: 'Trigger', icon: 'fa-bolt', hint: 'Starts the run' },
  { value: 'action', label: 'Action', icon: 'fa-play', hint: 'Calls a tool or API' },
  { value: 'agent', label: 'Agent', icon: 'fa-robot', hint: 'Delegates to an agent' },
  { value: 'condition', label: 'Condition', icon: 'fa-code-branch', hint: 'Branches the flow' }
]

const EMPTY_NODE = { node_id: '', name: '', node_type: 'action', category: '', description: '' }

export default function WorkflowDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [workflow, setWorkflow] = useState(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nodeDraft, setNodeDraft] = useState(EMPTY_NODE)
  const [addingNode, setAddingNode] = useState(false)

  const loadWorkflow = useCallback(async () => {
    try {
      const res = await api.get(`/api/workflows/${id}`)
      setWorkflow(res.workflow)
      setNodes(res.nodes || [])
      setEdges(res.edges || [])
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to fetch workflow')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadWorkflow()
  }, [loadWorkflow])

  async function handleStatusChange(status) {
    try {
      const res = await api.put(`/api/workflows/${id}`, { status })
      setWorkflow(res.workflow)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to update workflow')
    }
  }

  async function handleToggleActive() {
    try {
      const res = await api.put(`/api/workflows/${id}`, { is_active: !workflow.is_active })
      setWorkflow(res.workflow)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to update workflow')
    }
  }

  async function handleAddNode(e) {
    e.preventDefault()
    const nodeId = nodeDraft.node_id.trim() || nodeDraft.name.trim().toLowerCase().replace(/\s+/g, '-')
    if (!nodeId) {
      setError('Give the step a name or an id.')
      return
    }

    setAddingNode(true)
    try {
      const res = await api.post(`/api/workflows/${id}/nodes`, {
        node_id: nodeId,
        name: nodeDraft.name.trim() || nodeId,
        node_type: nodeDraft.node_type,
        category: nodeDraft.category.trim() || null,
        description: nodeDraft.description.trim() || null,
        config: {},
        position_x: 120 + nodes.length * 40,
        position_y: 120
      })
      setNodes((prev) => [...prev, res.node])
      setNodeDraft(EMPTY_NODE)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to add step')
    } finally {
      setAddingNode(false)
    }
  }

  async function handleDeleteNode(rowId) {
    try {
      await api.delete(`/api/workflows/${id}/nodes/${rowId}`)
      setNodes((prev) => prev.filter((n) => n.id !== rowId))
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to delete step')
    }
  }

  async function handleDeleteWorkflow() {
    if (!window.confirm('Delete this workflow and all of its steps? This cannot be undone.')) return
    setSaving(true)
    try {
      await api.delete(`/api/workflows/${id}`)
      navigate('/workflows')
    } catch (err) {
      setError(err.message || 'Failed to delete workflow')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="wf-page">
        <div className="wf-card">
          <div className="wf-skeleton wf-skeleton-title"></div>
          <div className="wf-skeleton wf-skeleton-line"></div>
        </div>
      </div>
    )
  }

  if (error && !workflow) {
    return (
      <div className="wf-page">
        <div className="wf-card">
          <div className="empty-state">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <p>{error}</p>
            <button type="button" className="wf-btn-ghost" onClick={() => navigate('/workflows')}>
              <i className="fa-solid fa-arrow-left"></i>
              Back to workflows
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!workflow) return null

  return (
    <div className="wf-page">
      <div className="wf-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button"
            className="wf-btn-icon"
            onClick={() => navigate('/workflows')}
            aria-label="Back to workflows"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="wf-title">{workflow.name}</h1>
            <p className="wf-subtitle">{workflow.description || 'No description provided.'}</p>
          </div>
        </div>

        <div className="wf-header-actions">
          <select
            className="wf-select wf-select-inline"
            value={workflow.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label="Workflow status"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
          </select>
          <button type="button" className="wf-btn-ghost" onClick={handleToggleActive}>
            <i className={`fa-solid ${workflow.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
            {workflow.is_active ? 'Enabled' : 'Disabled'}
          </button>
          <button type="button" className="wf-btn-danger" onClick={handleDeleteWorkflow} disabled={saving}>
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <i className="fa-solid fa-circle-exclamation"></i> {error}
        </div>
      )}

      <div className="wf-stats">
        <div className="wf-stat">
          <div className="wf-stat-label">Steps</div>
          <div className="wf-stat-value">{nodes.length}</div>
        </div>
        <div className="wf-stat">
          <div className="wf-stat-label">Connections</div>
          <div className="wf-stat-value">{edges.length}</div>
        </div>
        <div className="wf-stat">
          <div className="wf-stat-label">Status</div>
          <div className="wf-stat-value">{workflow.status}</div>
        </div>
      </div>

      <div className="wf-card">
        <div className="wf-section-header">
          <div>
            <h2 className="wf-section-title">Steps</h2>
            <p className="wf-section-desc">Each step runs in the order you add them.</p>
          </div>
        </div>

        {nodes.length === 0 ? (
          <div className="wf-empty">
            <i className="fa-solid fa-circle-nodes"></i>
            <div className="wf-empty-title">No steps yet</div>
            <div className="wf-empty-desc">Add the first step below to start building the flow.</div>
          </div>
        ) : (
          <ul className="wf-node-list">
            {nodes.map((node, index) => {
              const meta = NODE_TYPES.find((t) => t.value === node.node_type) || NODE_TYPES[1]
              return (
                <li key={node.id} className="wf-node">
                  <div className="wf-node-index">{index + 1}</div>
                  <div className="wf-node-icon">
                    <i className={`fa-solid ${meta.icon}`}></i>
                  </div>
                  <div className="wf-node-body">
                    <div className="wf-node-name">{node.name}</div>
                    <div className="wf-node-meta">
                      <span className="wf-tag">{node.node_type}</span>
                      {node.category && <span className="wf-tag">{node.category}</span>}
                      {node.description && <span className="wf-node-desc">{node.description}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="wf-btn-icon"
                    onClick={() => handleDeleteNode(node.id)}
                    aria-label={`Delete step ${node.name}`}
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <form className="wf-add-node" onSubmit={handleAddNode}>
          <div className="wf-field">
            <div className="wf-label">
              <span>Step name</span>
              <span className="wf-hint">Used as the id if you leave it blank</span>
            </div>
            <input
              type="text"
              className="wf-input"
              value={nodeDraft.name}
              onChange={(e) => setNodeDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Fetch today's orders"
            />
          </div>

          <div className="wf-add-node-row">
            <select
              className="wf-select"
              value={nodeDraft.node_type}
              onChange={(e) => setNodeDraft((prev) => ({ ...prev, node_type: e.target.value }))}
              aria-label="Step type"
            >
              {NODE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="wf-input"
              value={nodeDraft.category}
              onChange={(e) => setNodeDraft((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="Category (optional)"
            />
            <button type="submit" className="wf-btn-primary" disabled={addingNode}>
              {addingNode ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
              Add step
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
