import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'
import { encryptSecret, isEncrypted } from '../services/tokenVault.js'

const router = express.Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_NAME = 255
const MAX_DESCRIPTION = 2000
const MAX_CONFIG_BYTES = 16_000

// Kept in one place: the create endpoint validates against this list, so an
// unknown type can no longer be stored even though /types advertises a set.
const INTEGRATION_TYPES = [
  { value: 'gmail', label: 'Gmail', icon: 'fa-envelope', brand: '#ea4335' },
  { value: 'slack', label: 'Slack', icon: 'fa-slack', brand: '#4a154b' },
  { value: 'discord', label: 'Discord', icon: 'fa-discord', brand: '#5865f2' },
  { value: 'telegram', label: 'Telegram', icon: 'fa-telegram', brand: '#229ed9' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'fa-whatsapp', brand: '#25d366' },
  { value: 'google-drive', label: 'Google Drive', icon: 'fa-hard-drive', brand: '#1a73e8' },
  { value: 'github', label: 'GitHub', icon: 'fa-github', brand: '#24292f' },
  { value: 'rest-api', label: 'REST API', icon: 'fa-code', brand: '#6366f1' }
]
const VALID_TYPES = new Set(INTEGRATION_TYPES.map((t) => t.value))

function isValidUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v)
}

// integrations.workspace_id is NOT NULL, so a user without a workspace hit an
// opaque 500 on every create. Say what is actually wrong instead.
function requireWorkspace(req, res) {
  if (!req.user.workspace_id) {
    res.status(400).json({
      success: false,
      message: 'Your account is not part of a workspace yet, so integrations cannot be created.'
    })
    return false
  }
  return true
}

// The token columns must never reach the browser. This was returning
// `SELECT *`, which sent both encrypted tokens in every list response.
const SAFE_COLUMNS = `
  id, workspace_id, name, description, icon_url, type, config,
  is_connected, expires_at, created_by, created_at, updated_at
`

// Token presence is useful for the UI, the token itself is not.
function present(row) {
  // Pulled out and dropped. Spreading the row would have carried them straight
  // back into the response, which is exactly the leak this is fixing.
  const {
    access_token_encrypted: accessToken,
    refresh_token_encrypted: refreshToken,
    ...safe
  } = row

  return {
    ...safe,
    has_access_token: !!accessToken,
    has_refresh_token: !!refreshToken,
    // A value written by the old base64 scheme is not real ciphertext. It is
    // still a secret on disk, but it is not something this app can use, so it
    // is surfaced as needing reconnection.
    needs_reauth: !!accessToken && !isEncrypted(accessToken)
  }
}

function validateCreate(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : null
  const type = typeof req.body?.type === 'string' ? req.body.type.trim().toLowerCase() : ''

  if (!name) {
    res.status(400).json({ success: false, message: 'name is required' })
    return null
  }
  if (name.length > MAX_NAME) {
    res.status(400).json({
      success: false,
      message: `Name is ${name.length} characters. The maximum is ${MAX_NAME}.`
    })
    return null
  }
  if (description && description.length > MAX_DESCRIPTION) {
    res.status(400).json({ success: false, message: `Description is limited to ${MAX_DESCRIPTION} characters` })
    return null
  }
  if (!type) {
    res.status(400).json({ success: false, message: 'type is required' })
    return null
  }
  if (!VALID_TYPES.has(type)) {
    res.status(400).json({
      success: false,
      message: `type must be one of: ${[...VALID_TYPES].join(', ')}`
    })
    return null
  }

  const rawConfig = req.body?.config
  let config = {}
  if (rawConfig !== undefined && rawConfig !== null && rawConfig !== '') {
    if (typeof rawConfig === 'string') {
      try {
        config = JSON.parse(rawConfig)
      } catch {
        res.status(400).json({ success: false, message: 'config must be valid JSON' })
        return null
      }
    } else if (typeof rawConfig === 'object') {
      config = rawConfig
    } else {
      res.status(400).json({ success: false, message: 'config must be an object' })
      return null
    }
  }

  const configBytes = Buffer.byteLength(JSON.stringify(config))
  if (configBytes > MAX_CONFIG_BYTES) {
    res.status(400).json({
      success: false,
      message: `Config is ${configBytes} bytes. The maximum is ${MAX_CONFIG_BYTES}.`
    })
    return null
  }

  return { name, description, type, config }
}

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${SAFE_COLUMNS}, access_token_encrypted, refresh_token_encrypted
       FROM integrations WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [req.user.workspace_id || null]
    )
    // Selected the secret columns only to compute the has_/needs_ flags, then
    // stripped them.
    res.json({ success: true, integrations: result.rows.map(present) })
  } catch (err) {
    console.error('List integrations error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch integrations' })
  }
})

router.get('/types', protect, (req, res) => {
  res.json({ success: true, types: INTEGRATION_TYPES })
})

router.post('/', protect, async (req, res) => {
  try {
    if (!requireWorkspace(req, res)) return

    const clean = validateCreate(req, res)
    if (!clean) return

    const duplicate = await pool.query(
      'SELECT id FROM integrations WHERE workspace_id = $1 AND lower(btrim(name)) = lower($2) AND type = $3 LIMIT 1',
      [req.user.workspace_id, clean.name, clean.type]
    )
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A ${clean.type} integration called "${clean.name}" already exists here.`
      })
    }

    const result = await pool.query(
      `INSERT INTO integrations (workspace_id, name, description, type, config, is_connected, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, false, $6, NOW(), NOW()) RETURNING ${SAFE_COLUMNS}`,
      [req.user.workspace_id, clean.name, clean.description, clean.type, clean.config, req.user.userId]
    )
    res.status(201).json({ success: true, integration: present(result.rows[0]) })
  } catch (err) {
    console.error('Create integration error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to create integration' })
  }
})

router.put('/:id', protect, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Integration id is not a valid id' })
    }
    if (!requireWorkspace(req, res)) return

    const existing = await pool.query(
      `SELECT ${SAFE_COLUMNS} FROM integrations WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, req.user.workspace_id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Integration not found' })
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : existing.rows[0].name
    if (!name) {
      return res.status(400).json({ success: false, message: 'name cannot be empty' })
    }
    if (name.length > MAX_NAME) {
      return res.status(400).json({
        success: false,
        message: `Name is ${name.length} characters. The maximum is ${MAX_NAME}.`
      })
    }

    const description =
      typeof req.body?.description === 'string'
        ? req.body.description.trim() || null
        : existing.rows[0].description

    // Type is deliberately immutable: the stored config and any stored token
    // were captured for one provider, so silently swapping the type would
    // leave a mismatched credential behind.
    const result = await pool.query(
      `UPDATE integrations SET name = $1, description = $2, updated_at = NOW()
       WHERE id = $3 AND workspace_id = $4 RETURNING ${SAFE_COLUMNS}`,
      [name, description, req.params.id, req.user.workspace_id]
    )
    res.json({ success: true, integration: present(result.rows[0]) })
  } catch (err) {
    console.error('Update integration error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to update integration' })
  }
})

router.put('/:id/connect', protect, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Integration id is not a valid id' })
    }
    if (!requireWorkspace(req, res)) return

    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : ''
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'access_token is required to connect' })
    }
    const refreshToken =
      typeof req.body?.refresh_token === 'string' ? req.body.refresh_token.trim() : ''

    // A malformed date would otherwise be rejected by Postgres with 22007.
    let expiresAt = null
    if (req.body?.expires_at) {
      const parsed = new Date(req.body.expires_at)
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, message: 'expires_at is not a valid date' })
      }
      expiresAt = parsed.toISOString()
    }

    const result = await pool.query(
      `UPDATE integrations
       SET is_connected = true,
           access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           expires_at = $3,
           updated_at = NOW()
       WHERE id = $4 AND workspace_id = $5
       RETURNING ${SAFE_COLUMNS}, access_token_encrypted, refresh_token_encrypted`,
      [
        encryptSecret(accessToken),
        encryptSecret(refreshToken),
        expiresAt,
        req.params.id,
        req.user.workspace_id
      ]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Integration not found' })
    }
    res.json({ success: true, integration: present(result.rows[0]) })
  } catch (err) {
    console.error('Connect integration error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to connect integration' })
  }
})

// Without this a connected integration could never be turned off, and the
// only way to drop its stored token was to delete the whole row.
router.put('/:id/disconnect', protect, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Integration id is not a valid id' })
    }
    if (!requireWorkspace(req, res)) return

    const result = await pool.query(
      `UPDATE integrations
       SET is_connected = false,
           access_token_encrypted = NULL,
           refresh_token_encrypted = NULL,
           expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2
       RETURNING ${SAFE_COLUMNS}`,
      [req.params.id, req.user.workspace_id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Integration not found' })
    }
    res.json({ success: true, integration: present(result.rows[0]) })
  } catch (err) {
    console.error('Disconnect integration error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to disconnect integration' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Integration id is not a valid id' })
    }
    if (!requireWorkspace(req, res)) return

    const result = await pool.query(
      'DELETE FROM integrations WHERE id = $1 AND workspace_id = $2 RETURNING id, name, is_connected',
      [req.params.id, req.user.workspace_id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Integration not found' })
    }
    res.json({
      success: true,
      id: result.rows[0].id,
      // Reported so the UI can say the token is gone, not just the row.
      tokenRemoved: result.rows[0].is_connected === true
    })
  } catch (err) {
    console.error('Delete integration error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to delete integration' })
  }
})

export default router
