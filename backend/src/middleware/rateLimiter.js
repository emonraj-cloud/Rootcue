import rateLimit from 'express-rate-limit'

// Only failed login/register attempts count against the quota, so a
// user who signs in successfully (or retries until it works) does not
// get locked out by their own correct password.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many failed login/register attempts. Please try again in 15 minutes.' }
})

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down and try again shortly.' }
})
