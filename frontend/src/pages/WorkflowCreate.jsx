import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const STATUSES = [
  { value: 'draft', label: 'Draft', hint: 'Still being built' },
  { value: 'active', label: 'Active', hint: 'Ready to run' },
  { value: 'paused', label: 'Paused', hint: 'Temporarily switched off' }
]

const EMPTY_FORM = { name: '', description: '', agent_id: '', status: 'draft' }

export default function WorkflowCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/agents')
      .then((res) => setAgents(res.agents || []))
      .catch(() => setAgents([]))
  }, [])

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.name.trim()) {
      setError('Give your workflow a name to continue.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/workflows', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        agent_id: form.agent_id || null,
        status: form.status,
        definition: { nodes: [] }
      })
      navigate(`/workflows/${res.workflow.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create workflow')
      setLoading(false)
    }
  }

  return (
    <div className="wf-page wf-narrow">
      <div className="wf-page-header">
        <div>
          <h1 className="wf-title">New Workflow</h1>
          <p className="wf-subtitle">Name it, pick the agent it runs, then add steps.</p>
        </div>
        <button type="button" className="wf-btn-ghost" onClick={() => navigate('/workflows')}>
          <i className="fa-solid fa-xmark"></i>
          Cancel
        </button>
      </div>

      <form className="wf-card wf-form" onSubmit={handleSubmit} noValidate>
        <div className="wf-field">
          <div className="wf-label">
            <span>
              Workflow name <span className="wf-required">*</span>
            </span>
            <span className="wf-hint">{form.name.length}/60</span>
          </div>
          <input
            type="text"
            className="wf-input"
            value={form.name}
            maxLength={60}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Nightly report pipeline"
            autoFocus
          />
          {error && (
            <div className="wf-error">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}
        </div>

        <div className="wf-field">
          <div className="wf-label">
            <span>Description</span>
            <span className="wf-hint">Optional</span>
          </div>
          <textarea
            className="wf-textarea"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="What does this workflow do, and when should it run?"
          />
        </div>

        <div className="wf-field">
          <div className="wf-label">
            <span>Agent</span>
            <span className="wf-hint">{agents.length ? `${agents.length} available` : 'None created yet'}</span>
          </div>
          <select
            className="wf-select"
            value={form.agent_id}
            onChange={(e) => handleChange('agent_id', e.target.value)}
          >
            <option value="">No agent attached</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          {agents.length === 0 && (
            <p className="wf-hint-block">Create an agent first if this workflow should run one.</p>
          )}
        </div>

        <div className="wf-field">
          <div className="wf-label">
            <span>Status</span>
            <span className="wf-hint">You can change this later</span>
          </div>
          <div className="wf-options">
            {STATUSES.map((option) => (
              <label
                key={option.value}
                className={`wf-option ${form.status === option.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="status"
                  checked={form.status === option.value}
                  onChange={() => handleChange('status', option.value)}
                />
                <div>
                  <div className="wf-option-name">{option.label}</div>
                  <div className="wf-option-desc">{option.hint}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="wf-actions">
          <button type="button" className="wf-btn-ghost" onClick={() => navigate('/workflows')} disabled={loading}>
            Back
          </button>
          <button type="submit" className="wf-btn-primary" disabled={loading || !form.name.trim()}>
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Creating...
              </>
            ) : (
              <>
                Create Workflow
                <i className="fa-solid fa-arrow-right"></i>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
