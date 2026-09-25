import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../src/config/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '..', 'migrations')

async function rollbackLast() {
  const result = await pool.query(
    'SELECT name FROM migration_history ORDER BY executed_at DESC LIMIT 1'
  )

  if (result.rows.length === 0) {
    console.log('No migrations have been run. Nothing to roll back.')
    await pool.end()
    return
  }

  const name = result.rows[0].name
  const downFile = path.join(migrationsDir, name, 'down.sql')
  const sql = fs.readFileSync(downFile, 'utf8')

  console.log(`Rolling back migration: ${name}`)
  try {
    await pool.query(sql)
    await pool.query('DELETE FROM migration_history WHERE name = $1', [name])
    console.log(`  Success: rolled back ${name}`)
  } catch (err) {
    console.error(`  FAILED to roll back: ${name}`)
    console.error(`  ${err.message}`)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

rollbackLast()
