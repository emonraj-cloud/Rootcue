import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pool from '../src/config/database.js'
import { ensureDefaultCatalog, defaultRuntimeModel } from '../src/services/defaultCatalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function backfillOrphanWorkspaces() {
  // Accounts created before the workspaces feature have users.workspace_id =
  // NULL. Every query filters on workspace_id, and `workspace_id = NULL` never
  // matches, so those users see an empty model/provider/agent list and any
  // INSERT into agents (whose workspace_id is NOT NULL) fails outright. Give
  // each of them their own workspace.
  const orphans = await pool.query(
    'SELECT id, name FROM users WHERE workspace_id IS NULL ORDER BY created_at'
  )

  let fixed = 0
  for (const user of orphans.rows) {
    const slug = `workspace-user-${user.id.slice(0, 8)}`
    const workspace = await pool.query(
      `INSERT INTO workspaces (name, slug, description, plan, created_at, updated_at)
       VALUES ($1, $2, 'Default workspace', 'free', NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [`${user.name}'s Workspace`, slug]
    )
    await pool.query('UPDATE users SET workspace_id = $1 WHERE id = $2', [workspace.rows[0].id, user.id])
    fixed += 1
  }

  if (fixed > 0) {
    console.log(`Backfilled ${fixed} account(s) that had no workspace.`)
  }
  return fixed
}

async function seed() {
  await backfillOrphanWorkspaces()

  const workspaces = await pool.query('SELECT id, name FROM workspaces ORDER BY created_at')

  if (workspaces.rows.length === 0) {
    console.log('No workspaces found. Register a user first, then run this again.')
    await pool.end()
    return
  }

  let providers = 0
  let models = 0
  let tools = 0

  for (const workspace of workspaces.rows) {
    const result = await ensureDefaultCatalog(workspace.id)
    if (result.providers > 0 || result.tools > 0) {
      console.log(`Seeded "${workspace.name}": ${result.providers} providers, ${result.models} models, ${result.tools} tools`)
    }
    providers += result.providers
    models += result.models
    tools += result.tools
  }

  console.log(`\nDone. Added ${providers} provider(s), ${models} model(s) and ${tools} tool(s) across ${workspaces.rows.length} workspace(s).`)
  console.log(`Runtime model from .env: ${defaultRuntimeModel()}`)

  await pool.end()
}

seed().catch(async (err) => {
  console.error('Seed failed:', err.message)
  await pool.end()
  process.exit(1)
})
