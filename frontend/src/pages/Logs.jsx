import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    try {
      const res = await api.get('/api/logs', { params: { level: levelFilter === 'all' ? undefined : levelFilter } })
      setLogs(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div><div className="space-y-2"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div></div></div></div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Logs</h1>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg font-mono text-sm">
            <div className="flex items-start gap-3">
              <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                log.level === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' :
                log.level === 'warn' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
              }`}>{log.level}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(log.created_at).toISOString()}</span>
              <span className="text-gray-700 dark:text-gray-300 flex-1">{log.message}</span>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-terminal text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No logs available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

