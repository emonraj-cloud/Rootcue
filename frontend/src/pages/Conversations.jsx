import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../api/client'

const ROLE_STYLE = {
  user: { label: 'You', cls: 'conv-bubble--user' },
  assistant: { label: 'Assistant', cls: 'conv-bubble--assistant' },
  system: { label: 'System', cls: 'conv-bubble--system' },
  tool: { label: 'Tool', cls: 'conv-bubble--tool' }
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function timeAgo(value) {
  if (!value) return '—'
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

export default function Conversations() {
  const [conversations, setConversations] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeId, setActiveId] = useState('')
  const [messages, setMessages] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAgent, setNewAgent] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmId, setConfirmId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const endRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/conversations')
      setConversations(res.conversations || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api
      .get('/api/agents')
      .then((res) => setAgents(res.agents || []))
      .catch(() => {})
  }, [load])

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ block: 'end' })
  }, [messages, sending])

  async function openThread(id) {
    if (!id) {
      setActiveId('')
      setMessages([])
      return
    }
    setActiveId(id)
    setThreadLoading(true)
    setError('')
    try {
      const res = await api.get(`/api/conversations/${id}`)
      setMessages(res.messages || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setThreadLoading(false)
    }
  }

  async function createConversation(e) {
    e.preventDefault()
    if (!newAgent || creating) return

    setCreating(true)
    setError('')
    try {
      const res = await api.post('/api/conversations', {
        agent_id: newAgent,
        name: newName.trim() || undefined
      })
      setNewName('')
      await load()
      openThread(res.conversation.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function send(e) {
    e.preventDefault()
    if (!draft.trim() || !activeId || sending) return

    const text = draft.trim()
    setDraft('')
    setSending(true)
    setError('')

    // Show the user's turn immediately; the server echoes the same row back
    // with its real id once it is stored.
    setMessages((prev) => [
      ...prev,
      { id: `pending-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString(), pending: true }
    ])

    try {
      const res = await api.post(`/api/conversations/${activeId}/messages`, { content: text })
      setMessages((prev) => [
        ...prev.filter((m) => !m.pending),
        res.message,
        res.reply
      ])
      load()
    } catch (err) {
      setError(err.message)
      setMessages((prev) => prev.filter((m) => !m.pending))
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  async function toggleArchive(conv) {
    setBusyId(conv.id)
    setError('')
    try {
      const next = conv.status === 'archived' ? 'active' : 'archived'
      await api.patch(`/api/conversations/${conv.id}`, { status: next })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function remove(id) {
    setBusyId(id)
    setError('')
    try {
      await api.delete(`/api/conversations/${id}`)
      setConfirmId('')
      if (activeId === id) openThread('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const active = conversations.find((c) => c.id === activeId)
  const visible = showArchived
    ? conversations
    : conversations.filter((c) => c.status !== 'archived')
  const archivedCount = conversations.filter((c) => c.status === 'archived').length

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conversations</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {conversations.length} total
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Pick an agent, ask a question, and the whole thread is kept for later.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ---------- left: list + create ---------- */}
        <div className="space-y-4">
          <form
            onSubmit={createConversation}
            className="grid gap-3 rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40"
          >
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Start a conversation</h2>

            {agents.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No agents yet. Create one on the Agents page first.
              </p>
            ) : (
              <>
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Agent
                  <select
                    value={newAgent}
                    onChange={(e) => setNewAgent(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">Choose an agent</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Name
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <button
                  type="submit"
                  disabled={!newAgent || creating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </>
            )}
          </form>

          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400"
            >
              {showArchived ? 'Hide archived' : `Show ${archivedCount} archived`}
            </button>
          )}

          <div className="space-y-2">
            {visible.map((c) => {
              const isActive = c.id === activeId
              return (
                <div
                  key={c.id}
                  className={
                    isActive
                      ? 'rounded-xl border border-indigo-400 bg-indigo-50 p-3 dark:border-indigo-400/50 dark:bg-indigo-950/30'
                      : 'rounded-xl border border-gray-200 bg-white/60 p-3 hover:border-indigo-300 dark:border-gray-700 dark:bg-slate-900/40'
                  }
                >
                  <button type="button" onClick={() => openThread(c.id)} className="w-full text-left">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {c.name || 'Untitled conversation'}
                      </span>
                      {c.status === 'archived' && (
                        <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      {c.agentName || 'No agent'} · {c.messageCount || 0} message
                      {c.messageCount === 1 ? '' : 's'} · {timeAgo(c.lastMessageAt || c.updatedAt)}
                    </p>
                  </button>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => toggleArchive(c)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                    >
                      {c.status === 'archived' ? 'Restore' : 'Archive'}
                    </button>

                    {confirmId === c.id ? (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => remove(c.id)}
                          className="rounded-md bg-red-600 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId('')}
                          className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-600 dark:border-gray-600 dark:text-gray-300"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => setConfirmId(c.id)}
                        title="Delete conversation"
                        className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-500 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {conversations.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                <i className="fa-solid fa-comments text-2xl text-gray-300 dark:text-gray-600"></i>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No conversations yet.</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Start one above and the transcript shows up here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---------- right: transcript ---------- */}
        <div className="rounded-xl border border-gray-200 bg-white/60 dark:border-gray-700 dark:bg-slate-900/40 flex flex-col min-h-[520px]">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <i className="fa-solid fa-comments text-3xl text-gray-300 dark:text-gray-600"></i>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Select a conversation to read it, or create a new one.
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {active.name || 'Untitled conversation'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {active.agentName || 'No agent'} · started {formatTime(active.createdAt)}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {threadLoading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading thread...</p>
                )}

                {!threadLoading && messages.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No messages yet. Ask the first question below.
                  </p>
                )}

                {messages.map((m) => {
                  const style = ROLE_STYLE[m.role] || ROLE_STYLE.assistant
                  return (
                    <div key={m.id} className={`conv-bubble ${style.cls}`}>
                      <div className="conv-bubble__meta">
                        <span className="conv-bubble__role">{style.label}</span>
                        {m.createdAt && <span>{formatTime(m.createdAt)}</span>}
                      </div>
                      <pre className="conv-bubble__body">{m.content}</pre>
                    </div>
                  )
                })}

                {sending && (
                  <div className="conv-bubble conv-bubble--assistant">
                    <div className="conv-bubble__meta">
                      <span className="conv-bubble__role">Assistant</span>
                    </div>
                    <div className="conv-typing">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}

                <div ref={endRef} />
              </div>

              <form onSubmit={send} className="border-t border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) send(e)
                    }}
                    rows={2}
                    placeholder="Ask something. Enter sends, Shift+Enter adds a line."
                    className="flex-1 resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
