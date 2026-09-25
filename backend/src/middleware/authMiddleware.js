import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const userResult = await pool.query('SELECT id, name, email, workspace_id FROM users WHERE id = $1', [decoded.id])
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }
    req.user = {
      id: decoded.id,
      userId: decoded.id,
      name: userResult.rows[0].name,
      email: userResult.rows[0].email,
      workspace_id: userResult.rows[0].workspace_id,
      role: 'owner'
    }
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
