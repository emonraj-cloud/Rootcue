import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../src/config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '..', 'migrations')

async function showStatus() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migration_history (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  const result = await pool.query('SELECT name, executed_at FROM migration_history')
  const executedMap = new Map(result.rows.map((r) => [r.name, r.executed_at]))

  const allMigrations = fs
    .readdirSync(migrationsDir)
    .filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory())
    .sort()

  console.log('Migration Status')
  console.log('=================')
  for (const name of allMigrations) {
    if (executedMap.has(name)) {
      console.log(`[DONE]    ${name}  (ran at ${executedMap.get(name).toISOString()})`)
    } else {
      console.log(`[PENDING] ${name}`)
    }
  }

  await pool.end()
}

showStatus()
