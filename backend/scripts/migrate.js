import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../src/config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '..', 'migrations')

async function ensureHistoryTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migration_history (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function getExecuted() {
  const result = await pool.query('SELECT name FROM migration_history')
  return new Set(result.rows.map((r) => r.name))
}

async function runMigrations() {
  await ensureHistoryTable()
  const executed = await getExecuted()

  const allMigrations = fs
    .readdirSync(migrationsDir)
    .filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory())
    .sort()

  const pending = allMigrations.filter((name) => !executed.has(name))

  if (pending.length === 0) {
    console.log('No pending migrations. Database is up to date.')
    await pool.end()
    return
  }

  for (const name of pending) {
    const upFile = path.join(migrationsDir, name, 'up.sql')
    const sql = fs.readFileSync(upFile, 'utf8')

    console.log(`Running migration: ${name}`)
    try {
      await pool.query(sql)
      await pool.query('INSERT INTO migration_history (name) VALUES ($1)', [name])
      console.log(`  Success: ${name}`)
    } catch (err) {
      console.error(`  FAILED: ${name}`)
      console.error(`  ${err.message}`)
      await pool.end()
      process.exit(1)
    }
  }

  console.log('All pending migrations completed.')
  await pool.end()
}

runMigrations()
