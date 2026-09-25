import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_agents: 0,
    total_executions: 0,
    total_conversations: 0,
    total_tokens: 0,
    success_rate: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      const res = await api.get('/api/analytics')
      const summary = res.summary || {}
      const counts = res.counts || {}
      const total = Number(summary.total_executions) || 0
      const success = Number(summary.success_count) || 0
      setStats({
        total_agents: Number(counts.total_agents) || 0,
        total_executions: total,
        total_conversations: Number(counts.total_conversations) || 0,
        total_tokens: Number(counts.total_tokens) || 0,
        success_rate: total > 0 ? Math.round((success / total) * 100) : 0
      })
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div></div></div></div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <i className="fa-solid fa-robot text-2xl text-blue-500 mb-2"></i>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_agents}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Agents</div>
        </div>
        <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
          <i className="fa-solid fa-play-circle text-2xl text-purple-500 mb-2"></i>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_executions}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Executions</div>
        </div>
        <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <i className="fa-solid fa-comments text-2xl text-green-500 mb-2"></i>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_conversations}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Conversations</div>
        </div>
        <div className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
          <i className="fa-solid fa-coins text-2xl text-yellow-500 mb-2"></i>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_tokens?.toLocaleString() || 0}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Tokens</div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Success Rate</h2>
        <div className="text-center py-8">
          <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">{stats.success_rate}%</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">of executions completed successfully</div>
        </div>
      </div>
    </div>
  )
}

