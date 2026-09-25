import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function Workflows() {
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchWorkflows()
  }, [])

  async function fetchWorkflows() {
    setLoading(true)
    try {
      const res = await api.get('/api/workflows')
      setWorkflows(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch workflows:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div><div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div></div></div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
        <button
          onClick={() => navigate('/workflows/create')}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-plus"></i> New Workflow
        </button>
      </div>
      <div className="space-y-3">
        {workflows.map((wf) => (
          <div key={wf.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{wf.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{wf.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${wf.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                {wf.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
        {workflows.length === 0 && <p className="text-gray-500 dark:text-gray-400">No workflows yet.</p>}
      </div>
    </div>
  )
}

