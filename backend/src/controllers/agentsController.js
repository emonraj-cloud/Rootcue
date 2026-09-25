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

    const base64Image = req.file.buffer.toString('base64')
    const result = await runVisualAgent(base64Image)
    res.json({ success: true, result })
  } catch (err) {
    console.error('Visual agent error:', err.message, '| rawResponse:', JSON.stringify(err.rawResponse))

    if ('rawResponse' in err) {
      return res.status(502).json({ success: false, message: err.message, rawResponse: err.rawResponse })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while analyzing the screenshot' })
  }
}
