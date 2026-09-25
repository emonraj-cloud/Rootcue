import app from './app.js'
import { testConnection } from './config/database.js'

const PORT = process.env.PORT || 5000

// ------------------------------------------------------------
// Security guard: JWT_SECRET must be a real, strong secret.
// If it is missing, too short, or still a placeholder value,
// the server refuses to start (fail fast, fail safe).
// ------------------------------------------------------------
const jwtSecret = process.env.JWT_SECRET || ''
const isWeak =
  jwtSecret.length < 32 ||
  jwtSecret.includes('your_jwt_secret_here') ||
  jwtSecret.includes('techpilot_super_secret')

if (isWeak) {
  console.error('SECURITY ERROR: JWT_SECRET is missing or too weak!')
  console.error('Fix: open backend/.env and set JWT_SECRET to a long random string.')
  console.error('Generate a strong secret with this command (run inside backend folder):')
  console.error(`  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
  process.exit(1)
}

app.listen(PORT, async () => {
  console.log(`NEXORA AI backend listening on port ${PORT}`)
  console.log('JWT_SECRET security check: OK')
  await testConnection()
})
