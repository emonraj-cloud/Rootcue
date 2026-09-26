import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'
import { apiKeyAuth, API_KEY_SCOPES } from '../middleware/apiKeyAuth.js'
import { recordAudit } from '../services/auditLogger.js'
import crypto from 'crypto'

const router = express.Router()

const STATUSES = ['active', 'revoked', 'expired']
const VALID_SCOPES = new Set(API_KEY_SCOPES.map((s) => s.value))

function normaliseScopes(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((v) => VALID_SCOPES.has(v)))]
}

router.get('/scopes', protect, (req, res) => {
  res.json({ success: true, scopes: API_KEY_SCOPES })
})

// Verifies a key supplied in the request body, so the page can prove a key
// works without pasting it into another tool. The plaintext is only ever held
// in memory for this one check.
router.post('/verify', protect, async (req, res) => {
  const { key } = req.body || {}

  if (!key || !String(key).startsWith('sk-')) {
    return res.status(400).json({ success: false, message: 'A key starting with sk- is required' })
  }

  const hash = crypto.createHash('sha256').update(String(key)).digest('hex')

  try {
    const result = await pool.query(
      `SELECT id, name, key_prefix, permissions, status, expires_at, last_used_at
       FROM api_keys WHERE key_hash = $1 AND workspace_id = $2`,
      [hash, req.user.workspace_id || null]
    )

    const row = result.rows[0]
    if (!row) {
      return res.json({ success: false, valid: false, message: 'No key in this workspace matches that value' })
    }

    const expired = row.expires_at && new Date(row.expires_at) <= new Date()
    if (row.status !== 'active') {
      return res.json({ success: true, valid: false, status: row.status, message: `Key is ${row.status}` })
    }
    if (expired) {
      return res.json({ success: true, valid: false, status: 'expired', message: 'Key has expired' })
    }

    res.json({
      success: true,
      valid: true,
      status: 'active',
      name: row.name,
      keyPrefix: row.key_prefix,
      permissions: row.permissions,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at
    })
  } catch (err) {
    console.error('API key verify error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to verify the key' })
  }
})

router.get('/', protect, async (req, res) => {
  const { status } = req.query
  const filters = ['k.workspace_id = $1']
  const params = [req.user.workspace_id || null]

  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${STATUSES.join(', ')}` })
    }
    params.push(status)
    filters.push(`k.status = $${params.length}`)
  }

  try {
    const result = await pool.query(
      `SELECT
         k.id,
         k.name,
         k.key_prefix AS "keyPrefix",
         k.permissions,
         k.status,
         k.last_used_at AS "lastUsedAt",
         k.expires_at AS "expiresAt",
         k.created_by AS "createdBy",
         u.name AS "createdByName",
         k.created_at AS "createdAt",
         k.updated_at AS "updatedAt"
       FROM api_keys k
       LEFT JOIN users u ON u.id = k.created_by
       WHERE ${filters.join(' AND ')}
       ORDER BY k.created_at DESC`,
      params
    )
    res.json({ success: true, apiKeys: result.rows })
  } catch (err) {
    console.error('API keys list error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch API keys' })
  }
})

router.post('/', protect, async (req, res) => {
  const { name, permissions, expires_at: expiresAt } = req.body || {}

  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'A name is required' })
  }
  if (expiresAt) {
    const when = new Date(expiresAt)
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ success: false, message: 'expires_at must be a valid date' })
    }
    if (when <= new Date()) {
      return res.status(400).json({ success: false, message: 'expires_at must be in the future' })
    }
  }

  const scopes = normaliseScopes(permissions)
  if (permissions !== undefined && scopes.length === 0) {
    return res.status(400).json({ success: false, message: 'Pick at least one valid scope' })
  }

  try {
    const apiKey = 'sk-' + crypto.randomBytes(32).toString('hex')
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const keyPrefix = apiKey.substring(0, 10)

    const result = await pool.query(
      `INSERT INTO api_keys (workspace_id, name, key_hash, key_prefix, permissions, status, expires_at, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, NOW(), NOW())
       RETURNING id, name, key_prefix AS "keyPrefix", permissions, status, expires_at AS "expiresAt", created_at AS "createdAt"`,
      [
        req.user.workspace_id || null,
        String(name).trim(),
        keyHash,
        keyPrefix,
        JSON.stringify(scopes),
        expiresAt || null,
        req.user.userId
      ]
    )

    // The plaintext is returned exactly once. It is never stored and never
    // logged, so losing it means creating a new key.
    res.status(201).json({ success: true, apiKey: result.rows[0], key: apiKey })

    recordAudit(req, {
      action: 'create',
      resourceType: 'api_key',
      resourceId: result.rows[0].id,
      details: { name: String(name).trim(), scopes }
    })
  } catch (err) {
    console.error('Create API key error:', err)
    res.status(500).json({ success: false, message: 'Failed to create API key' })
  }
})

router.patch('/:id', protect, async (req, res) => {
  const { name, permissions, status, expires_at: expiresAt } = req.body || {}
  const updates = []
  const params = []

  if (name !== undefined) {
    if (!String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' })
    }
    params.push(String(name).trim())
    updates.push(`name = $${params.length}`)
  }

  if (permissions !== undefined) {
    const scopes = normaliseScopes(permissions)
    if (scopes.length === 0) {
      return res.status(400).json({ success: false, message: 'Pick at least one valid scope' })
    }
    params.push(JSON.stringify(scopes))
    updates.push(`permissions = $${params.length}`)
  }

  if (status !== undefined) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${STATUSES.join(', ')}` })
    }
    params.push(status)
    updates.push(`status = $${params.length}`)
  }

  if (expiresAt !== undefined) {
    if (expiresAt === null || expiresAt === '') {
      params.push(null)
    } else {
      const when = new Date(expiresAt)
      if (Number.isNaN(when.getTime())) {
        return res.status(400).json({ success: false, message: 'expires_at must be a valid date' })
      }
      params.push(when.toISOString())
    }
    updates.push(`expires_at = $${params.length}`)
  }

  if (updates.length === 0) {
    return res.status(400).json({ success: false, message: 'Nothing to update' })
  }

  params.push(req.params.id)
  params.push(req.user.workspace_id || null)

  try {
    const result = await pool.query(
      `UPDATE api_keys SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1} AND workspace_id = $${params.length}
       RETURNING id, name, key_prefix AS "keyPrefix", permissions, status, expires_at AS "expiresAt", updated_at AS "updatedAt"`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'API key not found' })
    }

    res.json({ success: true, apiKey: result.rows[0] })

    recordAudit(req, {
      action: status === 'revoked' ? 'revoke' : 'update',
      resourceType: 'api_key',
      resourceId: req.params.id,
      details: { name: result.rows[0].name, status: result.rows[0].status }
    })
  } catch (err) {
    console.error('Update API key error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to update API key' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE api_keys SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 AND workspace_id = $2
       RETURNING id, name`,
      [req.params.id, req.user.workspace_id || null]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'API key not found' })
    }

    res.json({ success: true, apiKey: result.rows[0] })

    recordAudit(req, {
      action: 'revoke',
      resourceType: 'api_key',
      resourceId: req.params.id,
      details: { name: result.rows[0].name }
    })
  } catch (err) {
    console.error('Revoke API key error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to revoke API key' })
  }
})

export default router
