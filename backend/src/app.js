import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/authRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import diagnosisRoutes from './routes/diagnosisRoutes.js'
import knowledgeRoutes from './routes/knowledgeRoutes.js'
import agentsRoutes from './routes/agentsRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import verificationRoutes from './routes/verificationRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import workflowRoutes from './routes/workflowRoutes.js'
import toolsRoutes from './routes/toolsRoutes.js'
import modelsRoutes from './routes/modelsRoutes.js'
import credentialsRoutes from './routes/credentialsRoutes.js'
import integrationsRoutes from './routes/integrationsRoutes.js'
import conversationsRoutes from './routes/conversationsRoutes.js'
import executionsRoutes from './routes/executionsRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import logsRoutes from './routes/logsRoutes.js'
import apiKeysRoutes from './routes/apiKeysRoutes.js'
import templatesRoutes from './routes/templatesRoutes.js'
import { protect } from './middleware/authMiddleware.js'
import { apiKeyAuth } from './middleware/apiKeyAuth.js'
import { apiLimiter } from './middleware/rateLimiter.js'

dotenv.config()

const app = express()

// ------------------------------------------------------------
// CORS: only allow known frontend origins.
//   - No Origin header (curl / Postman / same-origin)  -> allowed
//   - Listed in CORS_ORIGIN env var                    -> allowed
//   - Any http://localhost or 127.0.0.1 port           -> allowed (local dev)
//   - Any other website                                -> blocked by browser
// This keeps the API safe from other websites calling it from
// a user's browser, while making local development painless.
// ------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true)
      return callback(null, false)
    }
  })
)

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'NEXORA AI backend is running'
  })
})

// Key-authenticated self check. This is the only route that uses apiKeyAuth
// so far: it exists so a key created in the UI can be proven to work over the
// real authentication path, and it stamps last_used_at the way any future
// key-authenticated route will.
app.get('/api/whoami', apiKeyAuth, (req, res) => {
  res.json({
    success: true,
    authenticatedBy: 'api_key',
    key: { id: req.apiKey.id, name: req.apiKey.name, permissions: req.apiKey.permissions },
    workspaceId: req.apiKey.workspaceId
  })
})

// NOTE: the login rate limiter is attached per-route in authRoutes.js,
// not here. Mounting authLimiter on the whole '/api/auth' router also
// throttled GET /auth/me, which the frontend calls on every page load,
// so a handful of refreshes locked the user out entirely.
app.use('/api/auth', authRoutes)
app.use('/api/projects', protect, projectRoutes)
app.use('/api/diagnosis', protect, apiLimiter, diagnosisRoutes)
app.use('/api/knowledge', protect, knowledgeRoutes)
app.use('/api/agents', protect, apiLimiter, agentsRoutes)
app.use('/api/workflows', protect, workflowRoutes)
app.use('/api/tools', protect, toolsRoutes)
app.use('/api/models', protect, modelsRoutes)
app.use('/api/credentials', protect, credentialsRoutes)
app.use('/api/integrations', protect, integrationsRoutes)
app.use('/api/conversations', protect, conversationsRoutes)
app.use('/api/executions', protect, executionsRoutes)
app.use('/api/analytics', protect, analyticsRoutes)
app.use('/api/logs', protect, logsRoutes)
app.use('/api/api-keys', protect, apiKeysRoutes)
app.use('/api/templates', protect, templatesRoutes)
app.use('/api/upload', protect, uploadRoutes)
app.use('/api/verification', protect, verificationRoutes)
app.use('/api/dashboard', protect, dashboardRoutes)

export default app
