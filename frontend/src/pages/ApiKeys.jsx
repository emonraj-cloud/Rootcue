import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function ApiKeys() {
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({ name: '', permissions: ['read'] })

  useEffect(() => {
    fetchApiKeys()
  }, [])

  async function fetchApiKeys() {
    setLoading(true)
    try {
      const res = await api.get('/api/api-keys')
      setApiKeys(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch API keys:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await api.post('/api/api-keys', formData)
      setShowCreate(false)
      setFormData({ name: '', permissions: ['read'] })
      fetchApiKeys()
    } catch (err) {
      alert('Failed to create API key')
    }
  }

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div><div className="space-y-3"><div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div></div></div></div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center gap-2"
        >
          <i className="fa-solid fa-key"></i> New API Key
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create API Key</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g. Production Service"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {apiKeys.map((key) => (
          <div key={key.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{key.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Created: {new Date(key.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${key.active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                {key.active ? 'Active' : 'Revoked'}
              </span>
            </div>
          </div>
        ))}
        {apiKeys.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-key text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No API keys created yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

