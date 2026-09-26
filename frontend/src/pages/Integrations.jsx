import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const FALLBACK_TYPES = [
  { value: 'gmail', label: 'Gmail', icon: 'fa-envelope', brand: '#ea4335' },
  { value: 'slack', label: 'Slack', icon: 'fa-slack', brand: '#4a154b' },
  { value: 'discord', label: 'Discord', icon: 'fa-discord', brand: '#5865f2' },
  { value: 'telegram', label: 'Telegram', icon: 'fa-telegram', brand: '#229ed9' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'fa-whatsapp', brand: '#25d366' },
  { value: 'google-drive', label: 'Google Drive', icon: 'fa-hard-drive', brand: '#1a73e8' },
  { value: 'github', label: 'GitHub', icon: 'fa-github', brand: '#24292f' },
  { value: 'rest-api', label: 'REST API', icon: 'fa-code', brand: '#6366f1' }
]

function typeMeta(types, value) {
  return types.find((t) => t.value === value) || { label: value, icon: 'fa-plug', brand: '#64748b' }
}

function timeAgo(iso) {
  if (!iso) return null
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState([])
  const [types, setTypes] = useState(FALLBACK_TYPES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('slack')
  const [description, setDescription] = useState('')
  const [configText, setConfigText] = useState('{}')
  const [creating, setCreating] = useState(false)

  const [connecting, setConnecting] = useState(null)
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchIntegrations = useCallback(() => {
    setLoading(true)
    return api
      .get('/api/integrations')
      .then((data) => setIntegrations(data.integrations || []))
      // The old page only did console.error, so a failure looked like an
      // empty workspace with no explanation.
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchIntegrations()
    api
      .get('/api/integrations/types')
      .then((data) => data.types && setTypes(data.types))
      .catch(() => {})
  }, [fetchIntegrations])

  useEffect(() => {
    if (!flash) return undefined
    const id = setTimeout(() => setFlash(''), 6000)
    return () => clearTimeout(id)
  }, [flash])

  const stats = useMemo(() => {
    const connected = integrations.filter((i) => i.is_connected && !i.needs_reauth)
    const expired = integrations.filter((i) => i.expires_at && new Date(i.expires_at) < new Date())
    return { total: integrations.length, connected: connected.length, needsAttention: expired.length }
  }, [integrations])

  async function handleCreate(e) {
    e.preventDefault()

    let config
    try {
      config = JSON.parse(configText || '{}')
    } catch {
      setError('Config must be valid JSON.')
      return
    }

    setCreating(true)
    setError('')
    try {
      const data = await api.post('/api/integrations', { name, type, description, config })
      setIntegrations((prev) => [data.integration, ...prev])
      setShowAdd(false)
      setName('')
      setDescription('')
      setConfigText('{}')
      setFlash(`"${data.integration.name}" added. Connect it to store a token.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  function openConnect(int) {
    setConnecting(int)
    setAccessToken('')
    setRefreshToken('')
    setExpiresAt('')
    setShowSecret(false)
    setError('')
  }

  async function handleConnect(e) {
    e.preventDefault()
    if (!accessToken.trim()) {
      setError('An access token is required to connect.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await api.put(`/api/integrations/${connecting.id}/connect`, {
        access_token: accessToken.trim(),
        refresh_token: refreshToken.trim() || undefined,
        expires_at: expiresAt || undefined
      })
      setIntegrations((prev) => prev.map((i) => (i.id === connecting.id ? data.integration : i)))
      setFlash(`"${connecting.name}" connected. The token is encrypted at rest and never sent back to the browser.`)
      setConnecting(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect(int) {
    setError('')
    try {
      const data = await api.put(`/api/integrations/${int.id}/disconnect`)
      setIntegrations((prev) => prev.map((i) => (i.id === int.id ? data.integration : i)))
      setFlash(`"${int.name}" disconnected and its stored token was deleted.`)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(int) {
    setDeleting(true)
    setError('')
    try {
      const data = await api.delete(`/api/integrations/${int.id}`)
      setIntegrations((prev) => prev.filter((i) => i.id !== int.id))
      setConfirmDelete(null)
      setFlash(
        data.tokenRemoved
          ? `"${int.name}" deleted, along with its stored token.`
          : `"${int.name}" deleted.`
      )
    } catch (err) {
      setError(err.message)
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="ig-page">
      <div className="ig-head">
        <div>
          <h1 className="ig-title">Integrations</h1>
          <p className="ig-sub">
            Connect the tools you already use so alerts and reports can reach you. Tokens are
            encrypted with AES-256-GCM before they are stored and are never sent back to the
            browser.
          </p>
        </div>
        <div className="ig-head-actions">
          {stats.total > 0 && (
            <div className="ig-stats">
              <div>
                <strong>{stats.connected}</strong>
                <span>connected</span>
              </div>
              <div>
                <strong>{stats.total}</strong>
                <span>total</span>
              </div>
              {stats.needsAttention > 0 && (
                <div className="ig-stat-warn">
                  <strong>{stats.needsAttention}</strong>
                  <span>expired</span>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="ig-btn-primary"
            onClick={() => {
              setShowAdd((v) => !v)
              setError('')
            }}
          >
            <i className="fa-solid fa-plus"></i>
            Add integration
          </button>
        </div>
      </div>

      {flash && (
        <div className="ig-flash">
          <i className="fa-solid fa-circle-check"></i>
          {flash}
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}

      {showAdd && (
        <form className="ig-add" onSubmit={handleCreate}>
          <div className="ig-row">
            <label className="ig-label">
              <span>Service</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ig-label">
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="IT alerts"
                maxLength={255}
                required
              />
            </label>
          </div>

          <label className="ig-label">
            <span>
              Description <em>optional</em>
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where alerts should be posted"
              maxLength={2000}
            />
          </label>

          <label className="ig-label">
            <span>
              Config <em>JSON, stored as-is</em>
            </span>
            <textarea
              rows={3}
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              placeholder='{"channel": "#it-alerts"}'
              spellCheck="false"
            />
          </label>

          <div className="ig-add-actions">
            <button type="submit" className="ig-btn-primary" disabled={creating}>
              {creating ? (
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              ) : (
                <i className="fa-solid fa-plus"></i>
              )}
              {creating ? 'Creating' : 'Create'}
            </button>
            <button type="button" className="ig-btn-ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="ig-list">
          {[0, 1].map((i) => (
            <div key={i} className="ig-skeleton" />
          ))}
        </div>
      ) : integrations.length === 0 ? (
        <div className="ig-empty">
          <i className="fa-solid fa-plug ig-empty-icon"></i>
          <p>No integrations in this workspace yet.</p>
          <button type="button" className="ig-btn-primary" onClick={() => setShowAdd(true)}>
            Add your first integration
          </button>
        </div>
      ) : (
        <ul className="ig-list">
          {integrations.map((int) => {
            const meta = typeMeta(types, int.type)
            const expired = int.expires_at && new Date(int.expires_at) < new Date()
            const needsReauth = int.needs_reauth
            const isConnected = int.is_connected && !needsReauth
            const configEntries = Object.keys(int.config || {})

            return (
              <li key={int.id} className="ig-card">
                <span className="ig-icon" style={{ background: meta.brand }}>
                  <i className={`fa-solid ${meta.icon}`}></i>
                </span>

                <div className="ig-body">
                  <div className="ig-title-row">
                    <h2 className="ig-name">{int.name}</h2>
                    <span className="ig-type">{meta.label}</span>
                    {isConnected ? (
                      <span className="ig-badge ig-badge--on">
                        <i className="fa-solid fa-link"></i> Connected
                      </span>
                    ) : expired ? (
                      <span className="ig-badge ig-badge--expired">
                        <i className="fa-solid fa-triangle-exclamation"></i> Token expired
                      </span>
                    ) : needsReauth ? (
                      <span className="ig-badge ig-badge--warn">
                        <i className="fa-solid fa-shield-halved"></i> Needs reconnect
                      </span>
                    ) : (
                      <span className="ig-badge ig-badge--off">
                        <i className="fa-solid fa-link-slash"></i> Not connected
                      </span>
                    )}
                  </div>

                  {int.description && <p className="ig-desc">{int.description}</p>}

                  <div className="ig-meta">
                    <span>
                      added {timeAgo(int.created_at) || 'just now'}
                    </span>
                    {int.updated_at !== int.created_at && <span>updated {timeAgo(int.updated_at)}</span>}
                    <span className="ig-meta-sep">·</span>
                    <span title="The API never returns the token itself, only whether one is stored">
                      {int.has_access_token ? 'token stored' : 'no token'}
                    </span>
                    {int.has_refresh_token && <span>refresh token stored</span>}
                    {int.expires_at && (
                      <span className={expired ? 'ig-expired' : ''}>
                        expires {new Date(int.expires_at).toLocaleString()}
                      </span>
                    )}
                    {configEntries.length > 0 && (
                      <span title={JSON.stringify(int.config)}>{configEntries.length} config keys</span>
                    )}
                  </div>

                  {needsReauth && (
                    <p className="ig-note">
                      The stored token predates encrypted storage and cannot be read back, so it has
                      to be entered again.
                    </p>
                  )}
                </div>

                <div className="ig-actions">
                  {isConnected ? (
                    <button type="button" className="ig-btn-ghost" onClick={() => openConnect(int)}>
                      <i className="fa-solid fa-rotate-right"></i>
                      Update token
                    </button>
                  ) : (
                    <button type="button" className="ig-btn-primary ig-btn-sm" onClick={() => openConnect(int)}>
                      <i className="fa-solid fa-link"></i>
                      Connect
                    </button>
                  )}
                  {isConnected && (
                    <button type="button" className="ig-btn-ghost" onClick={() => handleDisconnect(int)}>
                      Disconnect
                    </button>
                  )}
                  {confirmDelete === int.id ? (
                    <span className="ig-confirm">
                      <span>Delete?</span>
                      <button
                        type="button"
                        className="ig-btn-danger"
                        disabled={deleting}
                        onClick={() => handleDelete(int)}
                      >
                        Yes
                      </button>
                      <button type="button" className="ig-btn-ghost" onClick={() => setConfirmDelete(null)}>
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="ig-icon-btn danger"
                      title="Delete"
                      onClick={() => setConfirmDelete(int.id)}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {connecting && (
        <div
          className="ig-backdrop"
          onClick={() => !saving && setConnecting(null)}
        >
          <form
            className="ig-modal"
            onSubmit={handleConnect}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ig-modal-head">
              <div>
                <h2>Connect {connecting.name}</h2>
                <p>
                  The token is encrypted before it is stored and cannot be read back through the
                  API.
                </p>
              </div>
              <button type="button" className="ig-modal-x" onClick={() => setConnecting(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <label className="ig-label">
              <span>Access token</span>
              <div className="ig-secret">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Paste the token"
                  autoFocus
                  spellCheck="false"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  aria-label={showSecret ? 'Hide token' : 'Show token'}
                >
                  <i className={`fa-solid fa-eye${showSecret ? '-slash' : ''}`}></i>
                </button>
              </div>
            </label>

            <label className="ig-label">
              <span>
                Refresh token <em>optional, for long lived access</em>
              </span>
              <div className="ig-secret">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Paste the refresh token"
                  spellCheck="false"
                  autoComplete="off"
                />
                <button type="button" onClick={() => setShowSecret((v) => !v)} aria-label="Toggle">
                  <i className={`fa-solid fa-eye${showSecret ? '-slash' : ''}`}></i>
                </button>
              </div>
            </label>

            <label className="ig-label">
              <span>
                Expires at <em>optional, so an expired token can be flagged</em>
              </span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>

            <div className="ig-modal-actions">
              <button type="button" className="ig-btn-ghost" onClick={() => setConnecting(null)}>
                Cancel
              </button>
              <button type="submit" className="ig-btn-primary" disabled={saving || !accessToken.trim()}>
                {saving ? (
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-lock"></i>
                )}
                {saving ? 'Encrypting' : 'Encrypt and connect'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
