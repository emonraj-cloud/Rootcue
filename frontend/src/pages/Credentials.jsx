import { useState, useEffect } from 'react'
import { api } from '../api/client'

// Mirrors GET /api/credentials/types. Kept client-side as well so the form
// still labels the field if that call ever fails.
const FALLBACK_TYPES = [
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'oauth', label: 'OAuth' },
  { value: 'custom', label: 'Custom' }
]

const TYPE_HINT = {
  api_key: 'A raw provider key, for example sk-...',
  bearer: 'A bearer access token',
  basic: 'username:password',
  oauth: 'An OAuth client secret or refresh token',
  custom: 'Whatever the target service expects'
}

const EMPTY_FORM = { name: '', type: 'api_key', providerId: '', secret: '' }

export default function Credentials() {
  const [credentials, setCredentials] = useState([])
  const [types, setTypes] = useState(FALLBACK_TYPES)
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [showSecret, setShowSecret] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [confirmId, setConfirmId] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [creds, providerRes, typeRes] = await Promise.all([
        api.get('/api/credentials'),
        api.get('/api/models/providers').catch(() => ({ providers: [] })),
        api.get('/api/credentials/types').catch(() => ({ types: FALLBACK_TYPES }))
      ])
      setCredentials(creds.credentials || [])
      setProviders(providerRes.providers || [])
      if (Array.isArray(typeRes.types) && typeRes.types.length) setTypes(typeRes.types)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function typeLabel(value) {
    return types.find((t) => t.value === value)?.label || value
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.secret.trim() || saving) return

    setSaving(true)
    setError('')
    setNotice('')
    try {
      await api.post('/api/credentials', {
        name: form.name.trim(),
        type: form.type,
        provider_id: form.providerId || undefined,
        secret: form.secret
      })
      setForm(EMPTY_FORM)
      setShowSecret(false)
      setNotice('Credential saved. The secret stays on the server.')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(c) {
    setBusyId(c.id)
    setError('')
    try {
      await api.patch(`/api/credentials/${c.id}`, { isActive: !c.isActive })
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
      await api.delete('/api/credentials/' + id)
      setConfirmId('')
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
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credentials</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {credentials.length} saved
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Secrets are sent once, stored server-side, and never returned to this page.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/40 dark:bg-green-950/40 dark:text-green-300">
          {notice}
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
            placeholder="OpenAI production"
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
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-700 dark:text-gray-300">
          Provider
          <select
            value={form.providerId}
            onChange={(e) => setForm({ ...form, providerId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="">Not linked to a provider</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-700 dark:text-gray-300">
          Secret
          <span className="relative mt-1 block">
            <input
              type={showSecret ? 'text' : 'password'}
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              placeholder={TYPE_HINT[form.type]}
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-16 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400"
            >
              {showSecret ? 'Hide' : 'Show'}
            </button>
          </span>
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={!form.name.trim() || !form.secret.trim() || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save credential'}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {credentials.map((c) => (
          <div
            key={c.id}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white/60 dark:bg-slate-900/40"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {typeLabel(c.type)}
                  {c.providerName ? ` · ${c.providerName}` : ''}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                  •••••••• {c.hasSecret ? 'stored' : 'missing'}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => toggle(c)}
                  title={c.isActive ? 'Disable this credential' : 'Enable this credential'}
                  className={
                    c.isActive
                      ? 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:opacity-80'
                      : 'px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:opacity-80'
                  }
                >
                  {c.isActive ? 'Active' : 'Disabled'}
                </button>

                {confirmId === c.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => remove(c.id)}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId('')}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => setConfirmId(c.id)}
                    title="Delete credential"
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {credentials.length === 0 && (
          <div className="text-center py-8">
            <i className="fa-solid fa-key text-3xl text-gray-300 dark:text-gray-600 mb-3"></i>
            <p className="text-gray-500 dark:text-gray-400">No credentials configured.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add one above and agents can use it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
