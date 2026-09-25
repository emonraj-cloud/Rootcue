import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workflows WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, workflows: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch workflows' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.user.workspace_id || null]
    )
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Workflow not found' })
    const nodesResult = await pool.query('SELECT * FROM workflow_nodes WHERE workflow_id = $1', [req.params.id])
    const edgesResult = await pool.query('SELECT * FROM workflow_connections WHERE workflow_id = $1', [req.params.id])
    res.json({ success: true, workflow: result.rows[0], nodes: nodesResult.rows, edges: edgesResult.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch workflow' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { name, description, status, definition, agent_id } = req.body
    const result = await pool.query(
      `INSERT INTO workflows (workspace_id, agent_id, name, description, status, definition, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
      [req.user.workspace_id || null, agent_id || null, name, description, status || 'draft', definition || {}, true, req.user.userId]
    )
    res.status(201).json({ success: true, workflow: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create workflow' })
  }
})

router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, status, definition, agent_id, is_active } = req.body
    const result = await pool.query(
      `UPDATE workflows SET name=$1, description=$2, status=$3, definition=$4, agent_id=$5, is_active=$6, updated_at=NOW()
       WHERE id=$7 AND workspace_id=$8 RETURNING *`,
      [name, description, status, definition, agent_id, is_active, req.params.id, req.user.workspace_id || null]
    )
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Workflow not found' })
    res.json({ success: true, workflow: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update workflow' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    await pool.query('DELETE FROM workflow_nodes WHERE workflow_id = $1', [req.params.id])
    await pool.query('DELETE FROM workflow_connections WHERE workflow_id = $1', [req.params.id])
    const result = await pool.query(
      'DELETE FROM workflows WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [req.params.id, req.user.workspace_id || null]
    )
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Workflow not found' })
    res.json({ success: true, message: 'Workflow deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete workflow' })
  }
})

router.post('/:id/nodes', protect, async (req, res) => {
  try {
    const { node_id, node_type, category, name, description, config, position_x, position_y } = req.body
    const result = await pool.query(
      `INSERT INTO workflow_nodes (workflow_id, node_id, node_type, category, name, description, config, position_x, position_y, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *`,
      [req.params.id, node_id, node_type, category, name, description, config || {}, position_x || 0, position_y || 0]
    )
    res.status(201).json({ success: true, node: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create node' })
  }
})

router.post('/:id/edges', protect, async (req, res) => {
  try {
    const { source_node_id, source_handle, target_node_id, target_handle, config } = req.body
    const result = await pool.query(
      `INSERT INTO workflow_connections (workflow_id, source_node_id, source_handle, target_node_id, target_handle, config, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [req.params.id, source_node_id, source_handle, target_node_id, target_handle, config || {}]
    )
    res.status(201).json({ success: true, edge: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create connection' })
  }
})

export default router
