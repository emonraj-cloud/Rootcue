import pool from '../config/database.js'
import { recordAudit } from '../services/auditLogger.js'

const ALLOWED_STATUSES = ['success', 'failed', 'partial']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

function isMissingColumnError(err) {
  return err && err.code === '42703'
}

export async function createVerification(req, res) {
  try {
    const { problem, solution, status, notes, diagnosisId } = req.body

    if (!problem || !solution || !status) {
      return res.status(400).json({ success: false, message: 'problem, solution and status are required' })
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`
      })
    }

    // Optional link to the diagnosis this verification is about.
    // The diagnosis must exist and belong to the same user.
    let linkedDiagnosisId = null
    if (diagnosisId !== undefined && diagnosisId !== null && diagnosisId !== '') {
      if (!isValidUuid(diagnosisId)) {
        return res.status(400).json({ success: false, message: 'diagnosisId must be a valid diagnosis id' })
      }

      const owned = await pool.query(
        'SELECT id FROM diagnoses WHERE id = $1 AND user_id = $2',
        [diagnosisId, req.user.id]
      )
      if (owned.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Diagnosis not found to link with this verification' })
      }

      linkedDiagnosisId = diagnosisId
    }

    const result = await pool.query(
      'INSERT INTO verifications (user_id, problem, solution, status, notes, diagnosis_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, problem, solution, status, notes || null, linkedDiagnosisId]
    )

    res.status(201).json({ success: true, verification: result.rows[0] })
    recordAudit(req, {
      action: 'verify',
      resourceType: 'verification',
      resourceId: result.rows[0].id,
      details: { status, diagnosisId: linkedDiagnosisId || null }
    })
  } catch (err) {
    console.error('Create verification error:', err.message)

    if (isMissingColumnError(err)) {
      return res.status(500).json({
        success: false,
        message: 'Database is missing a required column. Please run the database migration first: cd backend && npm run migrate'
      })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while saving the verification' })
  }
}

export async function listVerifications(req, res) {
  try {
    const { diagnosisId } = req.query

    // When diagnosisId is given, only return verifications linked to that diagnosis.
    if (diagnosisId) {
      if (!isValidUuid(diagnosisId)) {
        return res.status(400).json({ success: false, message: 'diagnosisId must be a valid diagnosis id' })
      }

      const result = await pool.query(
        `SELECT v.*, d.agent_used AS diagnosis_agent, d.problem AS diagnosis_problem
         FROM verifications v
         LEFT JOIN diagnoses d ON d.id = v.diagnosis_id
         WHERE v.user_id = $1 AND v.diagnosis_id = $2
         ORDER BY v.created_at DESC`,
        [req.user.id, diagnosisId]
      )
      return res.json({ success: true, verifications: result.rows })
    }

    const result = await pool.query(
      `SELECT v.*, d.agent_used AS diagnosis_agent, d.problem AS diagnosis_problem
       FROM verifications v
       LEFT JOIN diagnoses d ON d.id = v.diagnosis_id
       WHERE v.user_id = $1
       ORDER BY v.created_at DESC`,
      [req.user.id]
    )
    res.json({ success: true, verifications: result.rows })
  } catch (err) {
    console.error('List verifications error:', err.message)

    if (isMissingColumnError(err)) {
      return res.status(500).json({
        success: false,
        message: 'Database is missing a required column. Please run the database migration first: cd backend && npm run migrate'
      })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while fetching verifications' })
  }
}

export async function getVerification(req, res) {
  try {
    const result = await pool.query(
      `SELECT v.*, d.agent_used AS diagnosis_agent, d.problem AS diagnosis_problem
       FROM verifications v
       LEFT JOIN diagnoses d ON d.id = v.diagnosis_id
       WHERE v.id = $1 AND v.user_id = $2`,
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Verification not found' })
    }
    res.json({ success: true, verification: result.rows[0] })
  } catch (err) {
    console.error('Get verification error:', err.message)

    if (isMissingColumnError(err)) {
      return res.status(500).json({
        success: false,
        message: 'Database is missing a required column. Please run the database migration first: cd backend && npm run migrate'
      })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while fetching the verification' })
  }
}
