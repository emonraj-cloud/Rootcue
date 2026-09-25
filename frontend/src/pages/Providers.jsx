import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Providers() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProviders()
  }, [])

  async function fetchProviders() {
    setLoading(true)
    try {
      const res = await api.get('/api/providers')
      setProviders(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch providers:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div><div className="space-y-3"><div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div></div></div></div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Providers</h1>
      </div>

      <div className="space-y-3">
        {providers.map((p) => (
          <div key={p.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{p.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${p.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                {p.active ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
        ))}
        {providers.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-server text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No providers configured.</p>
          </div>
        )}
      </div>
    </div>
  )
}

