import pool from '../config/database.js'

export async function createProject(req, res) {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ success: false, message: 'name is required' })
    }

    const result = await pool.query(
      'INSERT INTO projects (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, name, description || null]
    )

    res.status(201).json({ success: true, project: result.rows[0] })
  } catch (err) {
    console.error('Create project error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while creating the project' })
  }
}

export async function listProjects(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ success: true, projects: result.rows })
  } catch (err) {
    console.error('List projects error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while fetching projects' })
  }
}

export async function getProject(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' })
    }
    res.json({ success: true, project: result.rows[0] })
  } catch (err) {
    console.error('Get project error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while fetching the project' })
  }
}

export async function updateProject(req, res) {
  try {
    const { name, description } = req.body

    const existing = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' })
    }

    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name || existing.rows[0].name, description ?? existing.rows[0].description, req.params.id]
    )

    res.json({ success: true, project: result.rows[0] })
  } catch (err) {
    console.error('Update project error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while updating the project' })
  }
}

export async function deleteProject(req, res) {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' })
    }
    res.json({ success: true, message: 'Project deleted' })
  } catch (err) {
    console.error('Delete project error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while deleting the project' })
  }
}
