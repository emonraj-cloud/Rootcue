import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'
import { recordAudit } from '../services/auditLogger.js'

const router = express.Router()

// The category is constrained by the schema; anything else is a 400 rather
// than a silently empty list.
const CATEGORIES = [
  'customer_support',
  'marketing',
  'sales',
  'hr',
  'research',
  'development',
  'data',
  'productivity',
  'personal',
  'custom'
]

const TEMPLATE_COLUMNS = `
  id,
  name,
  description,
  category,
  config,
  required_tools AS "requiredTools",
  required_model AS "requiredModel",
  is_system AS "isSystem",
  is_featured AS "isFeatured",
  usage_count AS "usageCount",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

router.get('/', protect, async (req, res) => {
  const { category, search } = req.query
  const filters = []
  const params = []

  if (category) {
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `category must be one of: ${CATEGORIES.join(', ')}` })
    }
    params.push(category)
    filters.push(`category = $${params.length}`)
  }

  if (search) {
    params.push(`%${String(search).trim().toLowerCase()}%`)
    const p = `$${params.length}`
    filters.push(`(LOWER(name) LIKE ${p} OR LOWER(COALESCE(description, '')) LIKE ${p})`)
  }

  try {
    const result = await pool.query(
      `SELECT ${TEMPLATE_COLUMNS}
       FROM templates
       ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
       ORDER BY is_featured DESC, usage_count DESC, created_at DESC`,
      params
    )

    // Category counts come from the table so a filter always offers exactly
    // the categories that still have something behind them.
    const facets = await pool.query(
      `SELECT category, COUNT(*)::int AS count
       FROM templates
       GROUP BY category
       ORDER BY count DESC`
    )

    res.json({
      success: true,
      templates: result.rows,
      categories: CATEGORIES,
      facets: facets.rows
    })
  } catch (err) {
    console.error('Templates list error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch templates' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${TEMPLATE_COLUMNS} FROM templates WHERE id = $1`, [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' })
    }
    res.json({ success: true, template: result.rows[0] })
  } catch (err) {
    console.error('Template detail error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch template' })
  }
})

// This is what the old "Use Template" button should have called. It counts the
// use, records who used it, and hands back the prompt so the client can send
// it to the tool the template was written for.
router.post('/:id/use', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE templates SET usage_count = usage_count + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING ${TEMPLATE_COLUMNS}`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Template not found' })
    }

    const template = result.rows[0]
    const prompt = template.config?.prompt || ''

    recordAudit(req, {
      action: 'use',
      resourceType: 'template',
      resourceId: template.id,
      details: { name: template.name, agentType: template.config?.agentType || null }
    })

    res.json({
      success: true,
      template,
      // The templates in this catalogue are diagnosis prompts, so the target
      // tool is the Diagnose page. agentType is passed through so the client
      // can label which specialist will handle it.
      prompt,
      target: '/diagnose'
    })
  } catch (err) {
    console.error('Template use error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to use the template' })
  }
})

export default router
