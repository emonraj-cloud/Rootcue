import pool from '../config/database.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_NAME = 255
const MAX_DESCRIPTION = 2000

function isValidUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

// Postgres raises a cryptic error for a malformed uuid and a 22001 for an
// oversized varchar, both of which surfaced as a generic 500. Validate up
// front so the user gets a message they can act on.
function validate(req, res) {
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const rawDescription =
    typeof req.body?.description === 'string' ? req.body.description.trim() : null

  if (!rawName) {
    res.status(400).json({ success: false, message: 'Project name cannot be empty' })
    return null
  }
  if (rawName.length > MAX_NAME) {
    res.status(400).json({
      success: false,
      message: `Project name is ${rawName.length} characters. The maximum is ${MAX_NAME}.`
    })
    return null
  }
  if (rawDescription && rawDescription.length > MAX_DESCRIPTION) {
    res.status(400).json({
      success: false,
      message: `Description is ${rawDescription.length} characters. The maximum is ${MAX_DESCRIPTION}.`
    })
    return null
  }

  return { name: rawName, description: rawDescription || null }
}

export async function createProject(req, res) {
  try {
    const clean = validate(req, res)
    if (!clean) return

    // Nothing stopped the same project being created twenty times, which makes
    // the list useless to scan.
    const duplicate = await pool.query(
      'SELECT id FROM projects WHERE user_id = $1 AND lower(btrim(name)) = lower($2) LIMIT 1',
      [req.user.id, clean.name]
    )
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `You already have a project called "${clean.name}".`,
        existingId: duplicate.rows[0].id
      })
    }

    const result = await pool.query(
      'INSERT INTO projects (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, clean.name, clean.description]
    )

    res.status(201).json({ success: true, project: result.rows[0] })
  } catch (err) {
    console.error('Create project error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while creating the project' })
  }
}

export async function listProjects(req, res) {
  try {
    // A bare project row is just a name. These counts are what make the list
    // worth reading: how much work happened under each one, how recently, and
    // whether the answers were actually any good.
    const result = await pool.query(
      `SELECT p.*,
              COUNT(d.id)::int AS diagnosis_count,
              MAX(d.created_at) AS last_activity,
              COUNT(v.status) FILTER (WHERE v.status = 'success')::int AS verified_success,
              COUNT(v.status) FILTER (WHERE v.status = 'failed')::int AS verified_failed,
              COUNT(v.status) FILTER (WHERE v.status = 'partial')::int AS verified_partial
       FROM projects p
       LEFT JOIN diagnoses d ON d.project_id = p.id
       LEFT JOIN LATERAL (
         SELECT vv.status FROM verifications vv
         WHERE vv.diagnosis_id = d.id
         ORDER BY vv.created_at DESC
         LIMIT 1
       ) v ON TRUE
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY COALESCE(MAX(d.created_at), p.created_at) DESC`,
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
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Project id is not a valid id' })
    }

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
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Project id is not a valid id' })
    }

    const existing = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' })
    }

    const clean = validate(req, res)
    if (!clean) return

    const duplicate = await pool.query(
      `SELECT id FROM projects
       WHERE user_id = $1 AND lower(btrim(name)) = lower($2) AND id <> $3 LIMIT 1`,
      [req.user.id, clean.name, req.params.id]
    )
    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `You already have a project called "${clean.name}".`
      })
    }

    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [clean.name, clean.description, req.params.id]
    )

    res.json({ success: true, project: result.rows[0] })
  } catch (err) {
    console.error('Update project error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while updating the project' })
  }
}

export async function deleteProject(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Project id is not a valid id' })
    }

    const owned = await pool.query(
      'SELECT id, name FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (owned.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' })
    }

    // diagnoses.project_id is ON DELETE SET NULL, so the diagnoses survive and
    // simply lose their project tag. The UI has to say that, because "delete
    // my project" reads like it deletes the work.
    const affected = await pool.query(
      'SELECT COUNT(*)::int AS count FROM diagnoses WHERE project_id = $1',
      [req.params.id]
    )
    const diagnosisCount = affected.rows[0].count

    await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ])

    res.json({
      success: true,
      message: 'Project deleted',
      // Kept, not deleted. Named explicitly so the client cannot misreport it.
      diagnosesKept: diagnosisCount
    })
  } catch (err) {
    console.error('Delete project error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while deleting the project' })
  }
}
