import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// The secret never leaves the server. `secret_encrypted` is only base64, so
// returning it would hand the caller the plaintext key, and even the last four
// characters of that encoding would leak a slice of the real secret. Only a
// "set / not set" flag is exposed, and the client re-enters the value to
// change it.
const LIST_COLUMNS = `
  c.id,
  c.workspace_id AS "workspaceId",
  c.name,
  c.type,
  c.provider_id AS "providerId",
  p.name AS "providerName",
  c.config,
  c.is_active AS "isActive",
  (c.secret_encrypted IS NOT NULL AND c.secret_encrypted <> '') AS "hasSecret",
  c.created_by AS "createdBy",
  c.created_at AS "createdAt",
  c.updated_at AS "updatedAt"
`

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${LIST_COLUMNS}
       FROM credentials c
       LEFT JOIN providers p ON p.id = c.provider_id
       WHERE c.workspace_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.workspace_id || null]
    )
    res.json({ success: true, credentials: result.rows })
  } catch (err) {
    console.error('Credentials list error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch credentials' })
  }
})

router.get('/types', protect, (req, res) => {
  res.json({
    success: true,
    types: [
      { value: 'api_key', label: 'API Key' },
      { value: 'bearer', label: 'Bearer Token' },
      { value: 'basic', label: 'Basic Auth' },
      { value: 'oauth', label: 'OAuth' },
      { value: 'custom', label: 'Custom' }
    ]
  })
})

router.post('/', protect, async (req, res) => {
  const { name, type, provider_id: providerId, secret, config } = req.body || {}

  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, message: 'A name is required' })
  }
  if (!type) {
    return res.status(400).json({ success: false, message: 'A credential type is required' })
  }
  if (!secret || !String(secret).trim()) {
    return res.status(400).json({ success: false, message: 'A secret value is required' })
  }

  try {
    const inserted = await pool.query(
      `INSERT INTO credentials
         (workspace_id, name, type, provider_id, secret_encrypted, config, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
       RETURNING id`,
      [
        req.user.workspace_id || null,
        String(name).trim(),
        type,
        providerId || null,
        Buffer.from(String(secret)).toString('base64'),
        config || {},
        req.user.userId
      ]
    )

    const result = await pool.query(
      `SELECT ${LIST_COLUMNS}
       FROM credentials c
       LEFT JOIN providers p ON p.id = c.provider_id
       WHERE c.id = $1`,
      [inserted.rows[0].id]
    )

    res.status(201).json({ success: true, credential: result.rows[0] })
  } catch (err) {
    console.error('Credential create error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to create credential' })
  }
})

router.patch('/:id', protect, async (req, res) => {
  const { isActive } = req.body || {}

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'isActive must be a boolean' })
  }

  try {
    const result = await pool.query(
      `UPDATE credentials SET is_active = $1, updated_at = NOW()
       WHERE id = $2 AND workspace_id = $3
       RETURNING id`,
      [isActive, req.params.id, req.user.workspace_id || null]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Credential not found' })
    }

    const updated = await pool.query(
      `SELECT ${LIST_COLUMNS}
       FROM credentials c
       LEFT JOIN providers p ON p.id = c.provider_id
       WHERE c.id = $1`,
      [req.params.id]
    )

    res.json({ success: true, credential: updated.rows[0] })
  } catch (err) {
    console.error('Credential update error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to update credential' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM credentials WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [req.params.id, req.user.workspace_id || null]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Credential not found' })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Credential delete error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to delete credential' })
  }
})

export default router
