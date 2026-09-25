import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/database.js'
import { ensureDefaultCatalog } from '../services/defaultCatalog.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email and password are required' })
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' })
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' })
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const workspaceResult = await pool.query(
      'INSERT INTO workspaces (name, slug, description, plan, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
      [`${name}'s Workspace`, `workspace-${Date.now()}`, 'Default workspace', 'free']
    )
    const workspaceId = workspaceResult.rows[0].id

    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, workspace_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, created_at',
      [name, email, passwordHash, workspaceId]
    )

    const user = result.rows[0]

    // Give the new workspace the default provider/model/tool catalog. Without
    // it the Create Agent wizard has nothing to offer, because providers,
    // models and tools are all scoped to the workspace.
    try {
      await ensureDefaultCatalog(workspaceId)
    } catch (catalogErr) {
      console.error('Default catalog setup failed:', catalogErr.message)
    }

    const token = generateToken(user.id)

    res.status(201).json({ success: true, user, token })
  } catch (err) {
    console.error('Register error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while registering' })
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' })
    }

    const result = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const user = result.rows[0]
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const token = generateToken(user.id)

    res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
      token
    })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while logging in' })
  }
}

export async function getMe(req, res) {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    res.json({ success: true, user: result.rows[0] })
  } catch (err) {
    console.error('GetMe error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong' })
  }
}

export async function updateProfile(req, res) {
  try {
    const { name } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' })
    }

    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, created_at',
      [name.trim(), req.user.id]
    )

    res.json({ success: true, user: result.rows[0] })
  } catch (err) {
    console.error('Update profile error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while updating your profile' })
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' })
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash)
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id])

    res.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    console.error('Change password error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while changing your password' })
  }
}
