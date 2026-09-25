import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Agents() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAgents()
  }, [])

  async function fetchAgents() {
    try {
      const res = await api.get('/api/agents')
      setAgents(res.agents || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch agents')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agents</h1>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="agent-card animate-pulse">
              <div className="p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agents</h1>
        <button
          onClick={() => navigate('/agents/create')}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i>
          Create Agent
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => navigate(`/agents/${agent.id}`)}
            className="agent-card cursor-pointer group"
          >
            <div className="agent-card-header">
              <div className="agent-icon">
                <i className="fa-solid fa-robot"></i>
              </div>
                <div className="agent-status-dot" style={{ backgroundColor: agent.is_active ? '#10b981' : '#ef4444' }}></div>
              </div>
              <div className="agent-card-body">
                <h3 className="agent-card-title">{agent.name}</h3>
                <p className="agent-card-description">{agent.description || 'No description provided.'}</p>
                <div className="agent-tags">
                  {(agent.model_config?.tags || []).map((tag) => (
                    <span key={tag} className="agent-tag">{tag}</span>
                  ))}
                </div>
                <div className="agent-meta">
                  <span className="agent-model">{agent.model_config?.provider || 'No provider'} / {agent.model_config?.model || 'default'}</span>
                  <span className={`agent-badge ${agent.is_active ? 'active' : 'inactive'}`}>{agent.is_active ? 'Active' : 'Inactive'}</span>
                </div>
            </div>
            <div className="agent-card-footer">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/agents/${agent.id}`)
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                Open <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {(!loading && agents.length === 0) && (
        <div className="text-center py-12">
          <i className="fa-solid fa-robot text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No agents yet</p>
          <button
            onClick={() => navigate('/agents/create')}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
          >
            Create your first agent
          </button>
        </div>
      )}
    </div>
  )
}

