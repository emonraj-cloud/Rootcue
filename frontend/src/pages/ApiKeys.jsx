import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client'

const FALLBACK_SCOPES = [
  { value: 'diagnose:read', label: 'Read diagnoses' },
  { value: 'diagnose:write', label: 'Create diagnoses' },
  { value: 'visual', label: 'Visual diagnose' },
  { value: 'code', label: 'Code fix' },
  { value: 'workflows:read', label: 'Read workflows' },
  { value: 'workflows:run', label: 'Run workflows' },
  { value: 'keys:manage', label: 'Manage API keys' }
]

// The column is status: 'active' | 'revoked' | 'expired'. There is no `active`
// boolean, so the old check showed every key as Revoked.
const STATUS = {
  active: { label: 'Active', chip: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  revoked: { label: 'Revoked', chip: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  expired: { label: 'Expired', chip: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function expiryState(key) {
  if (key.status === 'revoked') return 'revoked'
  if (key.status === 'expired') return 'expired'
  if (key.expiresAt && new Date(key.expiresAt) <= new Date()) return 'expired'
  return 'active'
}

export default function ApiKeys() {
  const [keys, setKeys] = useState([])
  const [scopes, setScopes] = useState(FALLBACK_SCOPES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', permissions: ['diagnose:read'], expiresAt: '' })

  // The plaintext is shown exactly once, right after creation.
  const [revealed, setRevealed] = useState('')
  const [copied, setCopied] = useState(false)

  const [editingId, setEditingId] = useState('')
  const [editDraft, setEditDraft] = useState({ name: '', permissions: [] })
  const [confirmId, setConfirmId] = useState('')
  const [busyId, setBusyId] = useState('')

  const [verifyInput, setVerifyInput] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const nameRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/api-keys')
      setKeys(res.apiKeys || res.api_keys || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api
      .get('/api/api-keys/scopes')
      .then((res) => {
        if (Array.isArray(res.scopes) && res.scopes.length) setScopes(res.scopes)
      })
      .catch(() => {})
  }, [load])

  useEffect(() => {
    if (showCreate) nameRef.current?.focus()
  }, [showCreate])

  useEffect(() => {
    if (!showCreate) return
    function onKey(e) {
      if (e.key === 'Escape') setShowCreate(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCreate])

  function toggleScope(list, value) {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim() || saving) return

    setSaving(true)
    setError('')
    try {
      const res = await api.post('/api/api-keys', {
        name: form.name.trim(),
        permissions: form.permissions,
        expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined
      })
      setRevealed(res.key || '')
      setCopied(false)
      setShowCreate(false)
      setForm({ name: '', permissions: ['diagnose:read'], expiresAt: '' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(k) {
    setEditingId(k.id)
    setEditDraft({ name: k.name, permissions: Array.isArray(k.permissions) ? k.permissions : [] })
  }

  async function saveEdit(id) {
    setBusyId(id)
    setError('')
    try {
      await api.patch(`/api/api-keys/${id}`, {
        name: editDraft.name.trim(),
        permissions: editDraft.permissions
      })
      setEditingId('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function revoke(id) {
    setBusyId(id)
    setError('')
    try {
      await api.delete(`/api/api-keys/${id}`)
      setConfirmId('')
      if (editingId === id) setEditingId('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function restore(id) {
    setBusyId(id)
    setError('')
    try {
      await api.patch(`/api/api-keys/${id}`, { status: 'active' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  async function verify(e) {
    e.preventDefault()
    if (!verifyInput.trim() || verifying) return

    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await api.post('/api/api-keys/verify', { key: verifyInput.trim() })
      setVerifyResult(res)
    } catch (err) {
      setVerifyResult({ success: false, valid: false, message: err.message })
    } finally {
      setVerifying(false)
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(revealed)
      setCopied(true)
    } catch {
      setCopied(false)
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

  const activeCount = keys.filter((k) => expiryState(k) === 'active').length

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          <i className="fa-solid fa-key"></i> New API Key
        </button>
      </div>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        {keys.length} key{keys.length === 1 ? '' : 's'} · {activeCount} active. A key is shown once at
        creation and cannot be read again.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ---------- the one-time reveal ---------- */}
      {revealed && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Copy this key now. It is stored only as a hash and cannot be shown again.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-amber-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 dark:border-amber-600/50 dark:bg-slate-900 dark:text-amber-100">
              {revealed}
            </code>
            <button
              type="button"
              onClick={copyKey}
              className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => setRevealed('')}
              className="rounded-lg border border-amber-400 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200"
            >
              Hide
            </button>
          </div>
        </div>
      )}

      {/* ---------- create ---------- */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false)
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-slate-800">
            <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Create API Key</h2>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Send it as an <code className="font-mono">x-api-key</code> header or a{' '}
              <code className="font-mono">Bearer</code> token.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
                <input
                  ref={nameRef}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Production Service"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Scopes</p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {scopes.map((s) => (
                    <label
                      key={s.value}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(s.value)}
                        onChange={() =>
                          setForm({
                            ...form,
                            permissions: toggleScope(form.permissions, s.value)
                          })
                        }
                        className="accent-indigo-600"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Expires
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                />
                <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                  Leave empty for a key that never expires.
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!form.name.trim() || form.permissions.length === 0 || saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- list ---------- */}
      <div className="space-y-3">
        {keys.map((k) => {
          const state = expiryState(k)
          const chip = STATUS[state] || STATUS.expired
          const isEditing = editingId === k.id
          const permissions = Array.isArray(k.permissions) ? k.permissions : []

          return (
            <div
              key={k.id}
              className="rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {isEditing ? (
                    <input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
                    />
                  ) : (
                    <h3 className="font-semibold text-gray-900 dark:text-white">{k.name}</h3>
                  )}

                  <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {k.keyPrefix}••••••••
                  </p>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Created {formatDate(k.createdAt)}
                    {k.createdByName ? ` by ${k.createdByName}` : ''}
                    {' · '}
                    Last used {k.lastUsedAt ? formatDate(k.lastUsedAt) : 'never'}
                    {k.expiresAt ? ` · Expires ${formatDate(k.expiresAt)}` : ' · Never expires'}
                  </p>
                </div>

                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${chip.chip}`}>
                  {chip.label}
                </span>
              </div>

              {isEditing ? (
                <div className="mt-3">
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {scopes.map((s) => (
                      <label
                        key={s.value}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 dark:border-gray-600 dark:text-gray-300"
                      >
                        <input
                          type="checkbox"
                          checked={editDraft.permissions.includes(s.value)}
                          onChange={() =>
                            setEditDraft({
                              ...editDraft,
                              permissions: toggleScope(editDraft.permissions, s.value)
                            })
                          }
                          className="accent-indigo-600"
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === k.id}
                      onClick={() => saveEdit(k.id)}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId('')}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {permissions.length === 0 ? (
                      <span className="text-xs text-gray-400 dark:text-gray-500">No scopes</span>
                    ) : (
                      permissions.map((p) => (
                        <span
                          key={p}
                          className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        >
                          {p}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {state !== 'active' ? (
                      <button
                        type="button"
                        disabled={busyId === k.id}
                        onClick={() => restore(k.id)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(k)}
                          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-300"
                        >
                          Edit
                        </button>

                        {confirmId === k.id ? (
                          <span className="flex gap-1">
                            <button
                              type="button"
                              disabled={busyId === k.id}
                              onClick={() => revoke(k.id)}
                              className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Revoke
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId('')}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === k.id}
                            onClick={() => setConfirmId(k.id)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400"
                          >
                            Revoke
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}

        {keys.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
            <i className="fa-solid fa-key text-3xl text-gray-300 dark:text-gray-600"></i>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No API keys created yet.</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Create one to call this API from another service.
            </p>
          </div>
        )}
      </div>

      {/* ---------- verify ---------- */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-slate-900/40">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Verify a key</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Paste a key to check whether it is still valid. The value is compared against its hash and is
          not stored.
        </p>

        <form onSubmit={verify} className="mt-3 flex flex-wrap gap-2">
          <input
            type="password"
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            className="min-w-[240px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!verifyInput.trim() || verifying}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {verifying ? 'Checking...' : 'Verify'}
          </button>
        </form>

        {verifyResult && (
          <div
            className={
              verifyResult.valid
                ? 'mt-3 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/40 dark:bg-green-950/40 dark:text-green-300'
                : 'mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300'
            }
          >
            {verifyResult.valid
              ? `Valid. ${verifyResult.name} · ${(verifyResult.permissions || []).join(', ') || 'no scopes'}`
              : verifyResult.message || 'Not valid'}
          </div>
        )}
      </div>
    </div>
  )
}
