import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function AgentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAgent()
  }, [id])

  async function fetchAgent() {
    try {
      const res = await api.get(`/api/agents/${id}`)
      setAgent(res.agent)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch agent')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'fa-solid fa-eye' },
    { key: 'prompts', label: 'Prompts', icon: 'fa-solid fa-message' },
    { key: 'tools', label: 'Tools', icon: 'fa-solid fa-wrench' },
    { key: 'workflow', label: 'Workflow', icon: 'fa-solid fa-diagram-successor-step' },
    { key: 'executions', label: 'Executions', icon: 'fa-solid fa-play-circle' },
    { key: 'logs', label: 'Logs', icon: 'fa-solid fa-terminal' },
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-4"></i>
          <p className="text-gray-500 dark:text-gray-400">{error || 'Agent not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/agents')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{agent.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="agent-detail-container">
        <div className="agent-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`agent-tab ${activeTab === tab.key ? 'active' : ''}`}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="agent-tab-content">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="agent-stat-card">
                  <div className="agent-stat-label">Provider</div>
                  <div className="agent-stat-value">{agent.model_config?.provider || 'N/A'}</div>
                </div>
                <div className="agent-stat-card">
                  <div className="agent-stat-label">Model</div>
                  <div className="agent-stat-value">{agent.model_config?.model || 'default'}</div>
                </div>
                <div className="agent-stat-card">
                  <div className="agent-stat-label">Status</div>
                  <div className="agent-stat-value">
                    <span className={`agent-badge ${agent.is_active ? 'active' : 'inactive'}`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {agent.instructions && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">System Prompt</h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {agent.instructions}
                  </div>
                </div>
              )}

              {agent.model_config?.tags?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.model_config.tags.map((tag) => (
                      <span key={tag} className="agent-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prompt Templates</h3>
              <div className="space-y-3">
                {agent.prompts && agent.prompts.length > 0 ? (
                  agent.prompts.map((prompt, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="font-medium text-gray-900 dark:text-white mb-2">{prompt.name || `Prompt ${idx + 1}`}</div>
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-x-auto">
                        {prompt.content}
                      </pre>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No prompt templates configured.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agent.tool_ids && agent.tool_ids.length > 0 ? (
                  agent.tool_ids.map((toolId) => (
                    <div key={toolId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="font-mono text-sm text-gray-900 dark:text-white break-all">{toolId}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connected tool</div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No tools connected.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'executions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Execution History</h3>
              <p className="text-gray-500 dark:text-gray-400">Execution history will be shown here.</p>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Logs</h3>
              <div className="bg-gray-900 dark:bg-black rounded-lg p-4 text-sm text-gray-300 font-mono h-64 overflow-y-auto">
                <div className="text-green-400 mb-1">● Agent {agent.name} initialized</div>
                <div className="text-blue-400 mb-1">● Model configured: {agent.model_config?.model || 'default'}</div>
                <div className="text-gray-500">No recent logs available.</div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Workflow</h3>
              <p className="text-gray-500 dark:text-gray-400">Workflow configuration will be shown here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

