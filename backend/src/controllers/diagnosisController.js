import pool from '../config/database.js'
import { runOrchestrator } from '../agents/orchestrator.js'
import { recordAudit } from '../services/auditLogger.js'

export async function createDiagnosis(req, res) {
  try {
    const { problem, projectId } = req.body

    // `if (!problem)` let a whitespace-only string through: the model was
    // asked to diagnose nothing, answered "No problem description was
    // provided by the user", and that was stored as a real diagnosis.
    const text = typeof problem === 'string' ? problem.trim() : ''

    if (!text) {
      return res.status(400).json({ success: false, message: 'problem is required' })
    }

    const diagnosis = await runOrchestrator(text, req.user.id)

    const saveResult = await pool.query(
      'INSERT INTO diagnoses (user_id, project_id, agent_used, problem, result) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
      [req.user.id, projectId || null, diagnosis.agentUsed, text, JSON.stringify(diagnosis)]
    )

    res.json({
      success: true,
      diagnosisId: saveResult.rows[0].id,
      createdAt: saveResult.rows[0].created_at,
      diagnosis
    })

    recordAudit(req, {
      action: 'diagnose',
      resourceType: 'diagnosis',
      resourceId: saveResult.rows[0].id,
      details: { agentUsed: diagnosis.agentUsed, projectId: projectId || null, characters: text.length }
    })
  } catch (err) {
    console.error('Diagnosis error:', err.message)

    if ('rawResponse' in err) {
      return res.status(502).json({
        success: false,
        message: err.message,
        rawResponse: err.rawResponse
      })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while generating the diagnosis' })
  }
}

const HISTORY_PAGE_SIZE = 25
const HISTORY_MAX_PAGE_SIZE = 100

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export async function getDiagnosisHistory(req, res) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const agent = typeof req.query.agent === 'string' ? req.query.agent.trim() : ''
    const outcome = typeof req.query.outcome === 'string' ? req.query.outcome : ''
    const limit = Math.min(
      parsePositiveInt(req.query.limit, HISTORY_PAGE_SIZE),
      HISTORY_MAX_PAGE_SIZE
    )
    const page = parsePositiveInt(req.query.page, 1)
    const offset = (page - 1) * limit

    const where = ['d.user_id = $1']
    const params = [req.user.id]

    if (search) {
      params.push(`%${search}%`)
      where.push(`d.problem ILIKE $${params.length}`)
    }
    if (agent && agent !== 'all') {
      params.push(agent)
      where.push(`d.agent_used = $${params.length}`)
    }

    // The outcome filter depends on the join, so it is applied in the wrapper
    // rather than in WHERE, which would drop the very rows being asked about.
    const outcomeClause =
      outcome === 'unrated'
        ? 'v.status IS NULL'
        : outcome === 'rated'
          ? 'v.status IS NOT NULL'
          : ''

    const whereSql = `WHERE ${where.join(' AND ')}${
      outcomeClause ? ` AND ${outcomeClause}` : ''
    }`

    // This used to load every diagnosis the user had ever made in one
    // unbounded query, which is fine at ten rows and unusable at a few
    // thousand. The latest verification per diagnosis is joined in so the list
    // can show whether an answer was ever rated.
    const base = `
      FROM diagnoses d
      LEFT JOIN LATERAL (
        SELECT status FROM verifications vv
        WHERE vv.diagnosis_id = d.id
        ORDER BY vv.created_at DESC
        LIMIT 1
      ) v ON TRUE
      ${whereSql}`

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total ${base}`, params)

    params.push(limit, offset)
    const rowsResult = await pool.query(
      `SELECT d.id, d.agent_used, d.problem, d.created_at, v.status AS outcome
       ${base}
       ORDER BY d.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    // Populates the filter dropdown from what actually exists rather than a
    // hardcoded list, so a new agent type shows up without a frontend change.
    const agentResult = await pool.query(
      'SELECT DISTINCT agent_used FROM diagnoses WHERE user_id = $1 ORDER BY agent_used',
      [req.user.id]
    )

    res.json({
      success: true,
      history: rowsResult.rows,
      total: countResult.rows[0].total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(countResult.rows[0].total / limit)),
      agents: agentResult.rows.map((r) => r.agent_used)
    })
  } catch (err) {
    console.error('Get diagnosis history error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while fetching history' })
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Postgres raises 22P02 on a malformed uuid, which surfaced as a generic
// 500 for any bad bookmark or hand-edited URL. Reject it as a 400 instead.
function isValidUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

export async function deleteDiagnosis(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Diagnosis id is not a valid id' })
    }

    // Scoped to the owner, so one user cannot delete another's history by
    // guessing an id.
    const deleted = await pool.query(
      'DELETE FROM diagnoses WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )

    if (deleted.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Diagnosis not found' })
    }

    recordAudit(req, {
      action: 'delete',
      resourceType: 'diagnosis',
      resourceId: req.params.id
    })

    res.json({ success: true, id: req.params.id })
  } catch (err) {
    console.error('Delete diagnosis error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while deleting the diagnosis' })
  }
}

export async function getDiagnosisById(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Diagnosis id is not a valid id' })
    }

    const result = await pool.query(
      'SELECT * FROM diagnoses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Diagnosis not found' })
    }
    res.json({ success: true, diagnosis: result.rows[0] })
  } catch (err) {
    console.error('Get diagnosis by id error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while fetching the diagnosis' })
  }
}
