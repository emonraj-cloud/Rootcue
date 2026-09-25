import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Conversations() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    setLoading(true)
    try {
      const res = await api.get('/api/conversations')
      setConversations(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversations</h1>
      </div>

      <div className="space-y-3">
        {conversations.map((conv) => (
          <div key={conv.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{conv.title || 'Untitled Conversation'}</h3>
                {conv.agent_name && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Agent: {conv.agent_name}</p>}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(conv.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-comments text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No conversations yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

