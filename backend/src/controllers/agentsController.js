import pool from '../config/database.js'
import { runCodeFixAgent } from '../agents/codeFixAgent.js'
import { runDatabaseAgent } from '../agents/databaseAgent.js'
import { runDevopsAgent } from '../agents/devopsAgent.js'
import { runVisualAgent } from '../agents/visualAgent.js'

export async function codeAgentHandler(req, res) {
  try {
    const { code, error } = req.body

    if (!code || !error) {
      return res.status(400).json({ success: false, message: 'code and error are required' })
    }

    const result = await runCodeFixAgent(code, error)
    res.json({ success: true, result })
  } catch (err) {
    console.error('Code agent error:', err.message, '| rawResponse:', JSON.stringify(err.rawResponse))

    if ('rawResponse' in err) {
      return res.status(502).json({ success: false, message: err.message, rawResponse: err.rawResponse })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while analyzing the code' })
  }
}

export async function databaseAgentHandler(req, res) {
  try {
    const { problem } = req.body

    if (!problem) {
      return res.status(400).json({ success: false, message: 'problem is required' })
    }

    const result = await runDatabaseAgent(problem)
    res.json({ success: true, result })
  } catch (err) {
    console.error('Database agent error:', err.message, '| rawResponse:', JSON.stringify(err.rawResponse))

    if ('rawResponse' in err) {
      return res.status(502).json({ success: false, message: err.message, rawResponse: err.rawResponse })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while analyzing the database problem' })
  }
}

export async function devopsAgentHandler(req, res) {
  try {
    const { problem } = req.body

    if (!problem) {
      return res.status(400).json({ success: false, message: 'problem is required' })
    }

    const result = await runDevopsAgent(problem)
    res.json({ success: true, result })
  } catch (err) {
    console.error('DevOps agent error:', err.message, '| rawResponse:', JSON.stringify(err.rawResponse))

    if ('rawResponse' in err) {
      return res.status(502).json({ success: false, message: err.message, rawResponse: err.rawResponse })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while analyzing the DevOps problem' })
  }
}

export async function visualAgentHandler(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'An image file is required (field name: image)' })
    }

    // Sent as a multipart text field alongside the image.
    const context = typeof req.body?.context === 'string' ? req.body.context.trim().slice(0, 2000) : ''

    const base64Image = req.file.buffer.toString('base64')
    const result = await runVisualAgent(base64Image, context)

    // A visual diagnosis used to exist only in the response, so reloading the
    // page threw it away and it never showed up in History or on the
    // dashboard. It is saved the same way a text diagnosis is.
    let diagnosisId = null
    try {
      // The context is kept with the saved report. Without it the stored
      // diagnosis claims to be what the screenshot said, when it was really
      // the screenshot plus whatever the user typed.
      const saved = await pool.query(
        `INSERT INTO diagnoses (user_id, agent_used, problem, result)
         VALUES ($1, 'visual', $2, $3)
         RETURNING id`,
        [
          req.user.id,
          result.problem || req.file.originalname || 'Visual diagnosis',
          JSON.stringify(context ? { ...result, userContext: context } : result)
        ]
      )
      diagnosisId = saved.rows[0].id
    } catch (saveErr) {
      // Never fail the analysis just because the audit copy failed.
      console.error('Could not save visual diagnosis:', saveErr.message)
    }

    res.json({ success: true, result, diagnosisId })
  } catch (err) {
    console.error('Visual agent error:', err.message, '| rawResponse:', JSON.stringify(err.rawResponse))

    if ('rawResponse' in err) {
      return res.status(502).json({ success: false, message: err.message, rawResponse: err.rawResponse })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while analyzing the screenshot' })
  }
}
