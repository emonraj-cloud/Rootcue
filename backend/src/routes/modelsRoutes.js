import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM models WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, models: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch models' })
  }
})

// api_key_encrypted is only base64, so `SELECT *` would hand every caller the
// plaintext key. List and read back a fixed set of columns instead.
const PROVIDER_COLUMNS = `
  id,
  workspace_id AS "workspaceId",
  name,
  type,
  base_url AS "baseUrl",
  is_connected AS "isConnected",
  is_default AS "isDefault",
  config,
  (api_key_encrypted IS NOT NULL AND api_key_encrypted <> '') AS "hasApiKey",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

router.get('/providers', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${PROVIDER_COLUMNS} FROM providers WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [req.user.workspace_id || null]
    )
    res.json({ success: true, providers: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch providers' })
  }
})

router.post('/providers', protect, async (req, res) => {
  try {
    const { name, type, base_url: baseUrl, api_key: apiKey, config } = req.body

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'A name and type are required' })
    }

    const result = await pool.query(
      `INSERT INTO providers (workspace_id, name, type, base_url, is_connected, is_default, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
      [req.user.workspace_id || null, name, type, baseUrl || null, !!apiKey, false, config || {}]
    )

    if (apiKey) {
      await pool.query(
        'UPDATE providers SET api_key_encrypted = $1 WHERE id = $2',
        [Buffer.from(apiKey).toString('base64'), result.rows[0].id]
      )
    }

    const updated = await pool.query(`SELECT ${PROVIDER_COLUMNS} FROM providers WHERE id = $1`, [result.rows[0].id])
    res.status(201).json({ success: true, provider: updated.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create provider' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { provider_id, name, model_identifier, type, max_tokens, context_length, config } = req.body
    const result = await pool.query(
      `INSERT INTO models (workspace_id, provider_id, name, model_identifier, type, max_tokens, context_length, is_enabled, is_default, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
      [req.user.workspace_id || null, provider_id, name, model_identifier, type || 'llm', max_tokens, context_length, true, false, config || {}]
    )
    res.status(201).json({ success: true, model: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create model' })
  }
})

export default router
