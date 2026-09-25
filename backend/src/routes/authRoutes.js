import express from 'express'
import { register, login, getMe, updateProfile, changePassword } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// Only the credential-checking endpoints are rate limited. Session
// endpoints (/me, /password) must stay reachable, otherwise a normal
// page refresh can burn the login quota and lock the user out.
router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.get('/me', protect, getMe)
router.put('/me', protect, updateProfile)
router.put('/password', protect, changePassword)

export default router
