import pool from '../config/database.js'

// Writes one audit_logs row. Never throws: a failure to record an audit entry
// must not roll back or break the action the user actually asked for, so the
// error is logged and swallowed.
export async function recordAudit(req, { action, resourceType, resourceId = null, details = {} }) {
  if (!action || !resourceType) return

  try {
    await pool.query(
      `INSERT INTO audit_logs
         (workspace_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        req.user?.workspace_id || null,
        req.user?.userId || null,
        String(action).slice(0, 100),
        String(resourceType).slice(0, 50),
        resourceId,
        details || {},
        clientIp(req),
        typeof req.get === 'function' ? req.get('user-agent') : null
      ]
    )
  } catch (err) {
    console.error('Audit log write failed:', err.message)
  }
}

export async function recordAuditEntry({ workspaceId, userId, action, resourceType, resourceId = null, details = {} }) {
  if (!action || !resourceType) return

  try {
    await pool.query(
      `INSERT INTO audit_logs
         (workspace_id, user_id, action, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [workspaceId || null, userId || null, action, resourceType, resourceId, details || {}]
    )
  } catch (err) {
    console.error('Audit log write failed:', err.message)
  }
}

function clientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for']
  const raw = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.ip
  if (!raw) return null
  // postgres INET rejects the IPv6-mapped IPv4 form some proxies send.
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw
}
