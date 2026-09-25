import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function CreateAgent() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [providers, setProviders] = useState([])
  const [models, setModels] = useState([])
  const [tools, setTools] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider: '',
    model: '',
    system_prompt: '',
    tags: [],
    active: true,
    tools: [],
    config: {}
  })

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Model & Provider' },
    { number: 3, title: 'Configuration' },
    { number: 4, title: 'Review & Create' },
  ]

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
  }

  function handleToolToggle(toolId) {
    const current = formData.tools || []
    const updated = current.includes(toolId)
      ? current.filter((t) => t !== toolId)
      : [...current, toolId]
    setFormData((prev) => ({ ...prev, tools: updated }))
  }

  function handleTagAdd(tag) {
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
    }
  }

  function handleTagRemove(tag) {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (step !== 4) {
      setStep(step + 1)
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/api/agents', formData)
      const newAgent = res.agent
      navigate(`/agents/${newAgent.id}`)
    } catch (err) {
      alert(err.message || 'Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    setStep(Math.max(1, step - 1))
  }

  const availableModels = model.filter(m => !formData.provider || m.provider === formData.provider)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Agent</h1>
        <button
          onClick={() => navigate('/agents')}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <i className="fa-solid fa-x"></i>
        </button>
      </div>

      <div className="agent-wizard-steps mb-8">
        {steps.map((s) => (
          <div
            key={s.number}
            className={`agent-wizard-step ${step === s.number ? 'active' : ''} ${step > s.number ? 'completed' : ''}`}
          >
            <div className="agent-wizard-step-number">{s.number}</div>
            <div className="agent-wizard-step-title">{s.title}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="agent-wizard-form">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Agent Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g. Customer Support Assistant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={3}
                placeholder="What does this agent do?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag) => (
                  <span key={tag} className="agent-tag flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => handleTagRemove(tag)} className="hover:text-red-500">
                      <i className="fa-solid fa-x text-xs"></i>
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add a tag and press Enter..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleTagAdd(e.target.value.trim())
                    e.target.value = ''
                  }
                }}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => {
                  handleChange('provider', e.target.value)
                  handleChange('model', '')
                }}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select a provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Model</label>
              <select
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select a model</option>
                {availableModels.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">System Prompt</label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => handleChange('system_prompt', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                rows={6}
                placeholder="Enter the system prompt for this agent..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connected Tools</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tools.map((tool) => (
                  <label key={tool.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={formData.tools.includes(tool.id)}
                      onChange={() => handleToolToggle(tool.id)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{tool.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{tool.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review Agent Configuration</h2>
            <div className="space-y-4">
              <div className="agent-review-item">
                <span className="agent-review-label">Name:</span>
                <span className="agent-review-value">{formData.name}</span>
              </div>
              <div className="agent-review-item">
                <span className="agent-review-label">Description:</span>
                <span className="agent-review-value">{formData.description || 'Not provided'}</span>
              </div>
              <div className="agent-review-item">
                <span className="agent-review-label">Provider / Model:</span>
                <span className="agent-review-value">{formData.provider || 'N/A'} / {formData.model || 'Default'}</span>
              </div>
              <div className="agent-review-item">
                <span className="agent-review-label">Tools:</span>
                <span className="agent-review-value">
                  {formData.tools.length > 0
                    ? tools.filter((t) => formData.tools.includes(t.id)).map((t) => t.name).join(', ')
                    : 'None selected'}
                </span>
              </div>
              <div className="agent-review-item">
                <span className="agent-review-label">Tags:</span>
                <span className="agent-review-value">{formData.tags.join(', ') || 'None'}</span>
              </div>
            </div>
          </div>
        )}

        <div className="agent-wizard-nav mt-8 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || (step === 1 && !formData.name)}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Creating...
              </>
            ) : step === 4 ? (
              <>
                <i className="fa-solid fa-rocket"></i>
                Create Agent
              </>
            ) : (
              'Next Step'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

