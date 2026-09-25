import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setLoading(true)
    try {
      const res = await api.get('/api/templates')
      setTemplates(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch templates:', err)
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                <i className={`fa-solid ${t.icon || 'fa-copy'}`}></i>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">{t.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">{t.description}</p>
            <button
              onClick={() => {}}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all text-sm"
            >
              Use Template
            </button>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full text-center py-8">
            <i className="fa-solid fa-copy text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No templates available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

