import pool from '../config/database.js'

// The runtime model comes from .env (OLLAMA_MODEL), not from this file. Building
// the catalog from that value keeps the Create Agent wizard showing the model an
// agent will actually use instead of a hardcoded name that drifts out of date.
// Read lazily so the values are picked up regardless of module evaluation order.
function buildProviders() {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const ollamaModel = process.env.OLLAMA_MODEL || 'gemma4:31b-cloud'
  const ollamaVision = process.env.OLLAMA_VISION_MODEL || ollamaModel
  const ollamaEmbedding = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'

  return [
    {
      name: 'Ollama (local)',
      type: 'ollama',
      base_url: ollamaBaseUrl,
      is_connected: true,
      is_default: true,
      models: [
        { name: ollamaModel, model_identifier: ollamaModel, type: 'llm', context_length: 131072, is_default: true, supports_functions: true },
        // OLLAMA_VISION_MODEL usually points at the same model as OLLAMA_MODEL.
        // Listing it twice would show the same entry twice in the wizard.
        ...(ollamaVision !== ollamaModel
          ? [{ name: ollamaVision, model_identifier: ollamaVision, type: 'vision', context_length: 131072 }]
          : []),
        { name: ollamaEmbedding, model_identifier: ollamaEmbedding, type: 'embedding', context_length: 8192 }
      ]
    },
    {
      name: 'OpenAI',
      type: 'openai',
      base_url: 'https://api.openai.com/v1',
      is_connected: false,
      is_default: false,
      models: [
        { name: 'gpt-4o', model_identifier: 'gpt-4o', type: 'llm', context_length: 128000, is_default: true, supports_functions: true },
        { name: 'gpt-4o-mini', model_identifier: 'gpt-4o-mini', type: 'llm', context_length: 128000, supports_functions: true }
      ]
    },
    {
      name: 'Anthropic',
      type: 'anthropic',
      base_url: 'https://api.anthropic.com/v1',
      is_connected: false,
      is_default: false,
      models: [
        { name: 'claude-sonnet-4', model_identifier: 'claude-sonnet-4-20250514', type: 'llm', context_length: 200000, is_default: true, supports_functions: true }
      ]
    }
  ]
}

export function defaultRuntimeModel() {
  return process.env.OLLAMA_MODEL || 'gemma4:31b-cloud'
}

// Built-in tools every workspace starts with. These are declarative: the agent
// stores the chosen tool ids, and the Tools page lists them. The runtime does
// not invoke them yet, so `config.implemented` records that honestly instead of
// implying the capability already works.
function buildTools() {
  return [
    { name: 'Web Search', category: 'web', description: 'Search the web and return result snippets for a query.' },
    { name: 'Fetch URL', category: 'web', description: 'Download a URL and return its readable text content.' },
    { name: 'HTTP Request', category: 'web', description: 'Call any HTTP endpoint and return the response body.' },
    { name: 'SQL Query', category: 'database', description: 'Run a read-only SQL query and return the rows.' },
    { name: 'Read File', category: 'files', description: 'Read a file from the workspace and return its contents.' },
    { name: 'Write File', category: 'files', description: 'Write text content to a file in the workspace.' },
    { name: 'Send Email', category: 'communication', description: 'Send an email message through the configured mail account.' },
    { name: 'Slack Message', category: 'communication', description: 'Post a message to a Slack channel.' },
    { name: 'Code Interpreter', category: 'developer', description: 'Run a code snippet in a sandbox and return its output.' },
    { name: 'GitHub Repository', category: 'developer', description: 'Read files, issues and pull requests from a GitHub repository.' },
    { name: 'Calendar Event', category: 'productivity', description: 'Create or update a calendar event.' },
    { name: 'Task Reminder', category: 'productivity', description: 'Create a scheduled reminder for the user.' },
    { name: 'Calculator', category: 'business', description: 'Evaluate a mathematical expression.' },
    { name: 'Text Embedding', category: 'ai', description: 'Convert text into a vector embedding for similarity search.' }
  ].map((tool) => ({ ...tool, implemented: false }))
}

async function ensureDefaultTools(workspaceId) {
  const existing = await pool.query(
    'SELECT COUNT(*)::int AS count FROM tools WHERE workspace_id = $1',
    [workspaceId]
  )
  if (existing.rows[0].count > 0) return 0

  const tools = buildTools()
  for (const tool of tools) {
    // created_by stays NULL on purpose. These ship with the workspace rather
    // than being authored by the person who signed up, and tools.created_by has
    // no ON DELETE clause, so attributing them to that user would later block
    // the account from being deleted.
    await pool.query(
      `INSERT INTO tools (workspace_id, name, description, category, type, config, is_enabled, is_system, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'builtin', $5, true, true, NULL, NOW(), NOW())`,
      [workspaceId, tool.name, tool.description, tool.category, JSON.stringify({ implemented: tool.implemented })]
    )
  }
  return tools.length
}

// Idempotent: a workspace that already has providers is left untouched.
export async function ensureDefaultCatalog(workspaceId) {
  if (!workspaceId) return { providers: 0, models: 0, tools: 0 }

  // Providers and tools are guarded separately. A workspace that already has
  // providers (for example one seeded before tools existed) must still get its
  // tools, so a single early return cannot cover both.
  const existingProviders = await pool.query(
    'SELECT COUNT(*)::int AS count FROM providers WHERE workspace_id = $1',
    [workspaceId]
  )

  let providerCount = 0
  let modelCount = 0

  if (existingProviders.rows[0].count === 0) {
    for (const provider of buildProviders()) {
      const providerResult = await pool.query(
        `INSERT INTO providers (workspace_id, name, type, base_url, is_connected, is_default, config, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
        [workspaceId, provider.name, provider.type, provider.base_url, provider.is_connected, provider.is_default, JSON.stringify({ seeded: true })]
      )
      providerCount += 1
      const providerId = providerResult.rows[0].id

      for (const model of provider.models) {
        await pool.query(
          `INSERT INTO models (workspace_id, provider_id, name, model_identifier, type, max_tokens, context_length, supports_streaming, supports_functions, is_enabled, is_default, config, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, NOW(), NOW())`,
          [
            workspaceId,
            providerId,
            model.name,
            model.model_identifier,
            model.type,
            model.type === 'embedding' ? null : 4096,
            model.context_length,
            model.type !== 'embedding',
            !!model.supports_functions,
            !!model.is_default,
            JSON.stringify({ seeded: true })
          ]
        )
        modelCount += 1
      }
    }
  }

  const toolCount = await ensureDefaultTools(workspaceId)

  return { providers: providerCount, models: modelCount, tools: toolCount }
}
