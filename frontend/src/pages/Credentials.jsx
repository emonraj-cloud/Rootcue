import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Credentials() {
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCredentials()
  }, [])

  async function fetchCredentials() {
    setLoading(true)
    try {
      const res = await api.get('/api/credentials')
      setCredentials(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch credentials:', err)
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credentials</h1>
      </div>

      <div className="space-y-3">
        {credentials.map((c) => (
          <div key={c.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Provider: {c.provider}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                •••• •••• •••• {c.key?.slice(-4) || '••'}
              </span>
            </div>
          </div>
        ))}
        {credentials.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-key text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No credentials configured.</p>
          </div>
        )}
      </div>
    </div>
  )
}

