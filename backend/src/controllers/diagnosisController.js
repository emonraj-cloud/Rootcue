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

export async function getDiagnosisHistory(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, agent_used, problem, created_at FROM diagnoses WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ success: true, history: result.rows })
  } catch (err) {
    console.error('Get diagnosis history error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while fetching history' })
  }
}

export async function getDiagnosisById(req, res) {
  try {
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
