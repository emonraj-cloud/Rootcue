import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// Nodes and edges hang off a workflow, so every request that names a workflow
// has to confirm the workflow belongs to the caller's workspace first.
// Without this check a caller could read, mutate or delete another workspace's
// graph just by guessing a workflow id.
async function findOwnedWorkflow(req, res) {
  const result = await pool.query(
    'SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2',
    [req.params.id, req.user.workspace_id || null]
  )
  if (result.rows.length === 0) {
    res.status(404).json({ success: false, message: 'Workflow not found' })
    return null
  }
  return result.rows[0]
}

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workflows WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, workflows: result.rows })
  } catch (err) {
    console.error('Get workflows error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch workflows' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const workflow = await findOwnedWorkflow(req, res)
    if (!workflow) return

    const [nodesResult, edgesResult] = await Promise.all([
      pool.query('SELECT * FROM workflow_nodes WHERE workflow_id = $1 ORDER BY created_at', [req.params.id]),
      pool.query('SELECT * FROM workflow_connections WHERE workflow_id = $1 ORDER BY created_at', [req.params.id])
    ])
    res.json({ success: true, workflow, nodes: nodesResult.rows, edges: edgesResult.rows })
  } catch (err) {
    console.error('Get workflow error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch workflow' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { name, description, status, definition, agent_id, is_active } = req.body
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Workflow name is required' })
    }

    const result = await pool.query(
      `INSERT INTO workflows (workspace_id, agent_id, name, description, status, definition, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
      [
        req.user.workspace_id || null,
        agent_id || null,
        String(name).trim(),
        description || null,
        status || 'draft',
        definition || {},
        is_active === undefined ? true : !!is_active,
        req.user.userId
      ]
    )
    res.status(201).json({ success: true, workflow: result.rows[0] })
  } catch (err) {
    console.error('Create workflow error:', err)
    res.status(500).json({ success: false, message: 'Failed to create workflow' })
  }
})

router.put('/:id', protect, async (req, res) => {
  try {
    // Only write the fields the client actually sent. Updating every column
    // turned a partial save into NULLs, which wiped the name and reset status.
    const body = req.body || {}
    const allowed = new Set(['name', 'description', 'status', 'definition', 'agent_id', 'is_active'])

    const sets = []
    const values = []
    for (const [key, value] of Object.entries(body)) {
      if (!allowed.has(key)) continue
      if (key === 'name' && !String(value || '').trim()) continue

      // definition is jsonb: send a JSON string, otherwise node-postgres hands
      // Postgres a bare object it cannot parse as json.
      values.push(key === 'definition' && value != null ? JSON.stringify(value) : value)
      sets.push(`${key} = $${values.length}`)
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' })
    }

    values.push(req.params.id)
    values.push(req.user.workspace_id || null)

    const result = await pool.query(
      `UPDATE workflows SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length - 1} AND workspace_id = $${values.length} RETURNING *`,
      values
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Workflow not found' })
    }
    res.json({ success: true, workflow: result.rows[0] })
  } catch (err) {
    console.error('Update workflow error:', err)
    res.status(500).json({ success: false, message: 'Failed to update workflow' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    // Confirm ownership before removing the graph, otherwise a caller could
    // wipe another workspace's nodes and edges.
    const workflow = await findOwnedWorkflow(req, res)
    if (!workflow) return

    await pool.query('DELETE FROM workflow_connections WHERE workflow_id = $1', [req.params.id])
    await pool.query('DELETE FROM workflow_nodes WHERE workflow_id = $1', [req.params.id])
    await pool.query('DELETE FROM workflows WHERE id = $1', [req.params.id])
    res.json({ success: true, message: 'Workflow deleted' })
  } catch (err) {
    console.error('Delete workflow error:', err)
    res.status(500).json({ success: false, message: 'Failed to delete workflow' })
  }
})

router.post('/:id/nodes', protect, async (req, res) => {
  try {
    const workflow = await findOwnedWorkflow(req, res)
    if (!workflow) return

    const { node_id, node_type, category, name, description, config, position_x, position_y } = req.body
    if (!node_id) {
      return res.status(400).json({ success: false, message: 'node_id is required' })
    }

    const result = await pool.query(
      `INSERT INTO workflow_nodes (workflow_id, node_id, node_type, category, name, description, config, position_x, position_y, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *`,
      [req.params.id, node_id, node_type || 'action', category || null, name || node_id, description || null, config || {}, position_x || 0, position_y || 0]
    )
    res.status(201).json({ success: true, node: result.rows[0] })
  } catch (err) {
    console.error('Create node error:', err)
    res.status(500).json({ success: false, message: 'Failed to create node' })
  }
})

router.delete('/:id/nodes/:rowId', protect, async (req, res) => {
  try {
    const workflow = await findOwnedWorkflow(req, res)
    if (!workflow) return

    const result = await pool.query(
      'DELETE FROM workflow_nodes WHERE id = $1 AND workflow_id = $2 RETURNING id',
      [req.params.rowId, req.params.id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Node not found' })
    }
    res.json({ success: true, message: 'Node deleted' })
  } catch (err) {
    console.error('Delete node error:', err)
    res.status(500).json({ success: false, message: 'Failed to delete node' })
  }
})

router.post('/:id/edges', protect, async (req, res) => {
  try {
    const workflow = await findOwnedWorkflow(req, res)
    if (!workflow) return

    const { source_node_id, source_handle, target_node_id, target_handle, config } = req.body
    if (!source_node_id || !target_node_id) {
      return res.status(400).json({ success: false, message: 'source_node_id and target_node_id are required' })
    }

    const result = await pool.query(
      `INSERT INTO workflow_connections (workflow_id, source_node_id, source_handle, target_node_id, target_handle, config, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [req.params.id, source_node_id, source_handle || null, target_node_id, target_handle || null, config || {}]
    )
    res.status(201).json({ success: true, edge: result.rows[0] })
  } catch (err) {
    console.error('Create connection error:', err)
    res.status(500).json({ success: false, message: 'Failed to create connection' })
  }
})

export default router
