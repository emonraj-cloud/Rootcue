import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Executions() {
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExecutions()
  }, [])

  async function fetchExecutions() {
    setLoading(true)
    try {
      const res = await api.get('/api/executions')
      setExecutions(res.executions || [])
    } catch (err) {
      console.error('Failed to fetch executions:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div><div className="space-y-3"><div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div></div></div></div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executions</h1>
      </div>

      <div className="space-y-3">
        {executions.map((exec) => (
          <div key={exec.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{exec.name || `Execution ${exec.id.slice(0, 8)}`}</h3>
                {exec.agent_name && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Agent: {exec.agent_name}</p>}
                {exec.workflow_name && <p className="text-sm text-gray-500 dark:text-gray-400">Workflow: {exec.workflow_name}</p>}
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                exec.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                exec.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                exec.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
              }`}>
                {exec.status}
              </span>
            </div>
          </div>
        ))}
        {executions.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-play-circle text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No executions yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

