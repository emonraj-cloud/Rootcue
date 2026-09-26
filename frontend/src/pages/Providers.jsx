import { useState, useEffect } from 'react'
import { api } from '../api/client'

const TYPES = [
  { value: 'ollama', label: 'Ollama (local)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'custom', label: 'Custom' }
]

const EMPTY_FORM = { name: '', type: 'ollama', baseUrl: '', apiKey: '' }

export default function Providers() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    fetchProviders()
  }, [])

  async function fetchProviders() {
    setLoading(true)
    try {
      const res = await api.get('/api/models/providers')
      setProviders(res.providers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || saving) return

    setSaving(true)
    setError('')
    try {
      await api.post('/api/models/providers', {
        name: form.name.trim(),
        type: form.type,
        base_url: form.baseUrl.trim() || undefined,
        api_key: form.apiKey.trim() || undefined
      })
      setForm(EMPTY_FORM)
      await fetchProviders()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Providers</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {providers.length} configured
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Add a model provider, then hand its key to a credential so agents can use it.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-6 grid gap-3 rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40 sm:grid-cols-2"
      >
        <label className="text-sm text-gray-700 dark:text-gray-300">
          Name
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Local Ollama"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="text-sm text-gray-700 dark:text-gray-300">
          Type
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-700 dark:text-gray-300">
          Base URL
          <input
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            placeholder="http://localhost:11434"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <label className="text-sm text-gray-700 dark:text-gray-300">
          API key
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            placeholder="Optional for local models"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!form.name.trim() || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add provider'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {providers.map((p) => {
          // The column is is_connected; there is no `active` field, which is
          // why every provider used to read "Not connected".
          const connected = p.isConnected ?? p.active ?? false
          return (
            <div
              key={p.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white/60 dark:bg-slate-900/40"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {TYPES.find((t) => t.value === p.type)?.label || p.type}
                    {p.baseUrl ? ` · ${p.baseUrl}` : ''}
                  </p>
                  {p.hasApiKey && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      API key stored
                    </p>
                  )}
                </div>
                <span
                  className={
                    connected
                      ? 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }
                >
                  {connected ? 'Connected' : 'No API key'}
                </span>
              </div>
            </div>
          )
        })}

        {providers.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-server text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No providers configured.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add one above to start routing requests.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
