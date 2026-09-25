import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const STEPS = [
  { number: 1, title: 'Basic Info', hint: 'Name and purpose' },
  { number: 2, title: 'Model', hint: 'Provider and engine' },
  { number: 3, title: 'Configuration', hint: 'Prompt and tools' },
  { number: 4, title: 'Review', hint: 'Confirm and create' }
]

const PROVIDER_ICON = {
  openai: 'fa-bolt',
  anthropic: 'fa-brain',
  ollama: 'fa-server',
  google: 'fa-gem',
  azure: 'fa-cloud'
}

const EMPTY_FORM = {
  name: '',
  description: '',
  provider: '',
  model: '',
  system_prompt: '',
  tags: [],
  active: true,
  tools: [],
  config: {}
}

export default function CreateAgent() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [providers, setProviders] = useState([])
  const [models, setModels] = useState([])
  const [tools, setTools] = useState([])
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    fetchProviders()
    fetchModels()
    fetchTools()
  }, [])

  async function fetchProviders() {
    try {
      const res = await api.get('/api/models/providers')
      setProviders(res.providers || [])
    } catch (err) {
      console.error('Failed to fetch providers:', err)
    }
  }

  async function fetchModels() {
    try {
      const res = await api.get('/api/models')
      setModels(res.models || [])
    } catch (err) {
      console.error('Failed to fetch models:', err)
    }
  }

  async function fetchTools() {
    try {
      const res = await api.get('/api/tools')
      setTools(res.tools || [])
    } catch (err) {
      console.error('Failed to fetch tools:', err)
    }
  }

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  // Picking a different provider invalidates the model that belongs to the old one.
  function handleProviderSelect(providerName) {
    setFormData((prev) => (prev.provider === providerName ? prev : { ...prev, provider: providerName, model: '' }))
    setError('')
  }

  function handleToolToggle(toolId) {
    setFormData((prev) => {
      const current = prev.tools || []
      const updated = current.includes(toolId)
        ? current.filter((t) => t !== toolId)
        : [...current, toolId]
      return { ...prev, tools: updated }
    })
  }

  function commitTag(raw) {
    const tag = (raw || '').trim().toLowerCase()
    if (!tag) return
    setFormData((prev) =>
      prev.tags.includes(tag) ? prev : { ...prev, tags: [...prev.tags, tag] }
    )
    setTagDraft('')
  }

  function handleTagRemove(tag) {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (step !== 4) {
      if (step === 1 && !formData.name.trim()) {
        setError('Give your agent a name to continue.')
        return
      }
      setError('')
      setStep(step + 1)
      return
    }

    setLoading(true)
    setError('')
    try {
      // The form uses UI-level field names, but the agents table stores
      // different ones. Sending formData as-is created empty agents.
      const selectedModel = models.find((m) => m.name === formData.model)
      const res = await api.post('/api/agents', {
        name: formData.name.trim(),
        description: formData.description,
        agent_type: 'general',
        instructions: formData.system_prompt,
        tool_ids: formData.tools,
        model_config: {
          provider: formData.provider || null,
          provider_id: selectedProvider?.id || null,
          model: formData.model || null,
          model_id: selectedModel?.id || null,
          tags: formData.tags,
          config: formData.config
        }
      })
      navigate(`/agents/${res.agent.id}`)
    } catch (err) {
      setError(err.message || 'Failed to create agent')
      setLoading(false)
    }
  }

  function handleBack() {
    setError('')
    setStep((s) => Math.max(1, s - 1))
  }

  // The models table links to a provider through provider_id, and there is
  // no "provider" column on a model row.
  const selectedProvider = providers.find((p) => p.name === formData.provider)
  const availableModels = selectedProvider
    ? models.filter((m) => m.provider_id === selectedProvider.id)
    : models
  const selectedToolNames = tools.filter((t) => formData.tools.includes(t.id)).map((t) => t.name)
  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="wz-root">
      <div className="wz-header">
        <div>
          <h1 className="wz-title">Create New Agent</h1>
          <p className="wz-subtitle">Configure an AI agent in four short steps.</p>
        </div>
        <button type="button" className="wz-close" onClick={() => navigate('/agents')} aria-label="Cancel and go back to agents">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="wz-steps">
        {STEPS.map((s) => {
          const state = step === s.number ? 'active' : step > s.number ? 'done' : ''
          return (
            <div key={s.number} className={`wz-step ${state}`}>
              <div className="wz-step-dot">
                {step > s.number ? <i className="fa-solid fa-check"></i> : s.number}
              </div>
              <div>
                <div className="wz-step-title">{s.title}</div>
                <span className="wz-step-hint">{s.hint}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="wz-progress">
        <div className="wz-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="wz-card">
          {step === 1 && (
            <>
              <h2 className="wz-card-title">What does this agent do?</h2>
              <p className="wz-card-desc">A clear name and description make the agent easier to find and pick later.</p>

              <div className="wz-field">
                <div className="wz-label">
                  <span>
                    Agent name <span style={{ color: '#dc2626' }}>*</span>
                  </span>
                  <span className="wz-hint">{formData.name.length}/60</span>
                </div>
                <input
                  type="text"
                  className="wz-input"
                  value={formData.name}
                  maxLength={60}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Customer Support Assistant"
                  autoFocus
                />
                {error && (
                  <div className="wz-error">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {error}
                  </div>
                )}
              </div>

              <div className="wz-field">
                <div className="wz-label">
                  <span>Description</span>
                  <span className="wz-hint">Optional</span>
                </div>
                <textarea
                  className="wz-textarea"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="What should this agent handle? Who will use it?"
                />
              </div>

              <div className="wz-field">
                <div className="wz-label">
                  <span>Tags</span>
                  <span className="wz-hint">Press Enter to add</span>
                </div>

                {formData.tags.length > 0 && (
                  <div className="wz-chips">
                    {formData.tags.map((tag) => (
                      <span key={tag} className="wz-chip">
                        {tag}
                        <button type="button" onClick={() => handleTagRemove(tag)} aria-label={`Remove ${tag}`}>
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  className="wz-input"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitTag(tagDraft)
                    }
                    if (e.key === 'Backspace' && !tagDraft && formData.tags.length) {
                      handleTagRemove(formData.tags[formData.tags.length - 1])
                    }
                  }}
                  onBlur={() => commitTag(tagDraft)}
                  placeholder="e.g. billing, production, support"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="wz-card-title">Choose a model</h2>
              <p className="wz-card-desc">
                Pick the provider that will run this agent, then the model it uses. You can skip this and set a default later.
              </p>

              <div className="wz-field">
                <div className="wz-label">
                  <span>Provider</span>
                  <span className="wz-hint">{providers.length} available</span>
                </div>

                {providers.length === 0 ? (
                  <div className="wz-empty">
                    <i className="fa-solid fa-plug-circle-bolt"></i>
                    <div className="wz-empty-title">No providers configured</div>
                    <div className="wz-empty-desc">Add one from the Providers page to use a model here.</div>
                  </div>
                ) : (
                  <div className="wz-options">
                    <label className={`wz-option ${formData.provider === '' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="provider"
                        checked={formData.provider === ''}
                        onChange={() => handleProviderSelect('')}
                      />
                      <div className="wz-option-icon">
                        <i className="fa-solid fa-inbox"></i>
                      </div>
                      <div>
                        <div className="wz-option-name">No provider</div>
                        <div className="wz-option-desc">Use the platform default</div>
                      </div>
                    </label>

                    {providers.map((p) => (
                      <label
                        key={p.id}
                        className={`wz-option ${formData.provider === p.name ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="provider"
                          checked={formData.provider === p.name}
                          onChange={() => handleProviderSelect(p.name)}
                        />
                        <div className="wz-option-icon">
                          <i className={`fa-solid ${PROVIDER_ICON[String(p.type || '').toLowerCase()] || 'fa-server'}`}></i>
                        </div>
                        <div>
                          <div className="wz-option-name">{p.name}</div>
                          <div className="wz-option-desc">{p.type || 'provider'}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="wz-field">
                <div className="wz-label">
                  <span>Model</span>
                  <span className="wz-hint">
                    {availableModels.length} available
                    {selectedProvider ? ` for ${selectedProvider.name}` : ''}
                  </span>
                </div>

                {availableModels.length === 0 ? (
                  <div className="wz-empty">
                    <i className="fa-solid fa-cubes"></i>
                    <div className="wz-empty-title">No models to show</div>
                    <div className="wz-empty-desc">
                      {selectedProvider
                        ? `${selectedProvider.name} has no models yet. Add one from the Models page.`
                        : 'Register a model first, or continue without one.'}
                    </div>
                  </div>
                ) : (
                  <div className="wz-options">
                    <label className={`wz-option ${formData.model === '' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="model"
                        checked={formData.model === ''}
                        onChange={() => handleChange('model', '')}
                      />
                      <div className="wz-option-icon">
                        <i className="fa-solid fa-gauge-high"></i>
                      </div>
                      <div>
                        <div className="wz-option-name">Platform default</div>
                        <div className="wz-option-desc">Let the runtime decide</div>
                      </div>
                    </label>

                    {availableModels.map((m) => (
                      <label
                        key={m.id}
                        className={`wz-option ${formData.model === m.name ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="model"
                          checked={formData.model === m.name}
                          onChange={() => handleChange('model', m.name)}
                        />
                        <div className="wz-option-icon">
                          <i className="fa-solid fa-microchip"></i>
                        </div>
                        <div>
                          <div className="wz-option-name">{m.name}</div>
                          <div className="wz-option-desc">
                            {m.model_identifier || m.type || 'model'}
                            {m.context_length ? ` · ${Number(m.context_length).toLocaleString()} ctx` : ''}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="wz-card-title">Configure behaviour</h2>
              <p className="wz-card-desc">Write the system prompt that drives the agent, and connect any tools it can call.</p>

              <div className="wz-field">
                <div className="wz-label">
                  <span>System prompt</span>
                  <span className="wz-hint">{formData.system_prompt.length} characters</span>
                </div>
                <textarea
                  className="wz-textarea wz-textarea-code"
                  style={{ minHeight: 150 }}
                  value={formData.system_prompt}
                  onChange={(e) => handleChange('system_prompt', e.target.value)}
                  placeholder={'You are a customer support agent for Acme.\n\nRules:\n- Be concise and friendly\n- Never invent order details\n- Escalate refunds over $100'}
                />
              </div>

              <div className="wz-field">
                <div className="wz-label">
                  <span>Connected tools</span>
                  <span className="wz-hint">
                    {formData.tools.length} of {tools.length} selected
                  </span>
                </div>

                {tools.length === 0 ? (
                  <div className="wz-empty">
                    <i className="fa-solid fa-screwdriver-wrench"></i>
                    <div className="wz-empty-title">No tools yet</div>
                    <div className="wz-empty-desc">The agent can still run, it just will not be able to call anything.</div>
                  </div>
                ) : (
                  <div className="wz-options">
                    {tools.map((tool) => {
                      const isOn = formData.tools.includes(tool.id)
                      return (
                        <label key={tool.id} className={`wz-option ${isOn ? 'selected' : ''}`}>
                          <input type="checkbox" checked={isOn} onChange={() => handleToolToggle(tool.id)} />
                          <div className="wz-option-icon">
                            <i className="fa-solid fa-bolt"></i>
                          </div>
                          <div>
                            <div className="wz-option-name">{tool.name}</div>
                            <div className="wz-option-desc">{tool.description || tool.category || 'Tool'}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="wz-card-title">Review your agent</h2>
              <p className="wz-card-desc">Check everything below, then create the agent.</p>

              <div className="wz-review">
                <div className="wz-review-row">
                  <span className="wz-review-label">Name</span>
                  <span className="wz-review-value">{formData.name}</span>
                </div>
                <div className="wz-review-row">
                  <span className="wz-review-label">Description</span>
                  <span className={`wz-review-value ${formData.description ? '' : 'muted'}`}>
                    {formData.description || 'Not provided'}
                  </span>
                </div>
                <div className="wz-review-row">
                  <span className="wz-review-label">Provider</span>
                  <span className={`wz-review-value ${formData.provider ? '' : 'muted'}`}>
                    {formData.provider || 'Platform default'}
                  </span>
                </div>
                <div className="wz-review-row">
                  <span className="wz-review-label">Model</span>
                  <span className={`wz-review-value ${formData.model ? '' : 'muted'}`}>
                    {formData.model || 'Platform default'}
                  </span>
                </div>
                <div className="wz-review-row">
                  <span className="wz-review-label">System prompt</span>
                  <span className={`wz-review-value ${formData.system_prompt ? '' : 'muted'}`}>
                    {formData.system_prompt || 'Not provided'}
                  </span>
                </div>
                <div className="wz-review-row">
                  <span className="wz-review-label">Tools</span>
                  <span className={`wz-review-value ${selectedToolNames.length ? '' : 'muted'}`}>
                    {selectedToolNames.length ? selectedToolNames.join(', ') : 'None connected'}
                  </span>
                </div>
                <div className="wz-review-row">
                  <span className="wz-review-label">Tags</span>
                  <span className={`wz-review-value ${formData.tags.length ? '' : 'muted'}`}>
                    {formData.tags.length ? formData.tags.join(', ') : 'None'}
                  </span>
                </div>
              </div>

              <div className="wz-summary-pills">
                <span className={`wz-pill ${formData.name ? '' : 'missing'}`}>
                  <i className={`fa-solid ${formData.name ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
                  {formData.name ? 'Named' : 'Name required'}
                </span>
                <span className={`wz-pill ${formData.model ? '' : 'missing'}`}>
                  <i className={`fa-solid ${formData.model ? 'fa-circle-check' : 'fa-circle-info'}`}></i>
                  {formData.model || 'Default model'}
                </span>
                <span className="wz-pill">
                  <i className="fa-solid fa-screwdriver-wrench"></i>
                  {formData.tools.length} tool{formData.tools.length === 1 ? '' : 's'}
                </span>
                <span className="wz-pill">
                  <i className="fa-solid fa-tag"></i>
                  {formData.tags.length} tag{formData.tags.length === 1 ? '' : 's'}
                </span>
              </div>
            </>
          )}

          {error && (
            <div className="wz-error" style={{ marginTop: 18, fontSize: 13 }}>
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}
        </div>

        <div className="wz-actions">
          <div>
            {step > 1 && (
              <button type="button" className="wz-btn wz-btn-ghost" onClick={handleBack} disabled={loading}>
                <i className="fa-solid fa-arrow-left"></i>
                Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="wz-step-count">
              Step {step} of {STEPS.length}
            </span>
            <button
              type="submit"
              className="wz-btn wz-btn-primary"
              disabled={loading || (step === 1 && !formData.name.trim())}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Creating...
                </>
              ) : step === 4 ? (
                <>
                  <i className="fa-solid fa-rocket"></i>
                  Create Agent
                </>
              ) : (
                <>
                  Continue
                  <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
