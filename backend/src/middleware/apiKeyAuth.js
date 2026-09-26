import crypto from 'crypto'
import pool from '../config/database.js'
import { recordAuditEntry } from '../services/auditLogger.js'

// Scopes a key can carry. Kept here so the create form, the editor and the
// verifier all agree on one list instead of each inventing their own.
export const API_KEY_SCOPES = [
  { value: 'diagnose:read', label: 'Read diagnoses' },
  { value: 'diagnose:write', label: 'Create diagnoses' },
  { value: 'visual', label: 'Visual diagnose' },
  { value: 'code', label: 'Code fix' },
  { value: 'workflows:read', label: 'Read workflows' },
  { value: 'workflows:run', label: 'Run workflows' },
  { value: 'keys:manage', label: 'Manage API keys' }
]

// Authenticates a request carrying `x-api-key: sk-...`.
//
// Only the SHA-256 hash is stored, so the lookup is by hash and the plaintext
// never exists in the database. A revoked or expired key is rejected here
// rather than at each route, and every accepted use stamps last_used_at.
export async function apiKeyAuth(req, res, next) {
  const header = req.headers['x-api-key'] || req.headers.authorization
  const provided =
    typeof header === 'string' && header.toLowerCase().startsWith('bearer ')
      ? header.slice(7).trim()
      : header

  if (!provided || !String(provided).startsWith('sk-')) {
    return res.status(401).json({ success: false, message: 'An API key is required' })
  }

  const hash = crypto.createHash('sha256').update(String(provided)).digest('hex')

  try {
    const result = await pool.query(
      `SELECT
         k.id,
         k.workspace_id AS "workspaceId",
         k.name,
         k.permissions,
         k.status,
         k.expires_at AS "expiresAt",
         k.last_used_at AS "lastUsedAt",
         u.id AS "userId",
         u.name AS "userName",
         u.email AS "userEmail"
       FROM api_keys k
       LEFT JOIN users u ON u.id = k.created_by
       WHERE k.key_hash = $1`,
      [hash]
    )

    const key = result.rows[0]
    if (!key) {
      return res.status(401).json({ success: false, message: 'Invalid API key' })
    }

    if (key.status !== 'active') {
      return res.status(403).json({ success: false, message: `This API key is ${key.status}` })
    }

    if (key.expiresAt && new Date(key.expiresAt) <= new Date()) {
      return res.status(403).json({ success: false, message: 'This API key has expired' })
    }

    // Fire-and-forget: a failure to stamp the timestamp must not fail the
    // request the caller actually made.
    pool.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [key.id]).catch(() => {})

    recordAuditEntry({
      workspaceId: key.workspaceId,
      userId: key.userId,
      action: 'authenticate',
      resourceType: 'api_key',
      resourceId: key.id,
      details: { name: key.name }
    })

    req.apiKey = {
      id: key.id,
      name: key.name,
      permissions: Array.isArray(key.permissions) ? key.permissions : Object.keys(key.permissions || {}),
      workspaceId: key.workspaceId,
      // A key inherits the workspace of the user who created it, which is what
      // downstream queries scope against.
      user: {
        id: key.userId,
        userId: key.userId,
        name: key.userName,
        email: key.userEmail,
        workspace_id: key.workspaceId,
        role: 'api_key'
      }
    }
    req.user = req.apiKey.user

    next()
  } catch (err) {
    console.error('API key auth error:', err.message)
    res.status(500).json({ success: false, message: 'Could not verify the API key' })
  }
}

// Route guard for a single scope.
export function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({ success: false, message: 'An API key is required' })
    }
    if (!req.apiKey.permissions.includes(scope)) {
      return res.status(403).json({ success: false, message: `This API key is missing the ${scope} scope` })
    }
    next()
  }
}
