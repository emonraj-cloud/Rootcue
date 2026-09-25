import request from 'supertest'
import app from '../src/app.js'

const testEmail = `test-agents-${Date.now()}@techpilot.test`
const testPassword = 'test12345'

let token
let createdAgentId

const TOOL_ID = '11111111-1111-4111-8111-111111111111'

beforeAll(async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Agent Tester', email: testEmail, password: testPassword })

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: testEmail, password: testPassword })

  token = loginRes.body.token
})

describe('Agent API', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/agents')
    expect(res.status).toBe(401)
  })

  it('returns an empty list for a new workspace', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.agents)).toBe(true)
  })

  // Regression test. tool_ids / knowledge_base_ids are jsonb columns and
  // node-postgres serialises a plain JS array as a Postgres array literal,
  // which jsonb rejects. Creating an agent with tools used to fail with 500.
  it('creates an agent with tools and a model config', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Agent',
        description: 'Created by automated test',
        agent_type: 'general',
        instructions: 'You are a test agent.',
        tool_ids: [TOOL_ID],
        knowledge_base_ids: [],
        model_config: { provider: 'ollama', model: 'gemma4:31b-cloud', tags: ['test'] },
        guardrails: {}
      })

    expect(res.status).toBe(201)
    expect(res.body.agent.name).toBe('Test Agent')
    createdAgentId = res.body.agent.id
  })

  it('stores tool_ids as a real jsonb array', async () => {
    const res = await request(app)
      .get(`/api/agents/${createdAgentId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.agent.tool_ids).toEqual([TOOL_ID])
  })

  it('stores model_config and instructions', async () => {
    const res = await request(app)
      .get(`/api/agents/${createdAgentId}`)
      .set('Authorization', `Bearer ${token}`)

    const agent = res.body.agent
    expect(agent.instructions).toBe('You are a test agent.')
    expect(agent.model_config.provider).toBe('ollama')
    expect(agent.model_config.model).toBe('gemma4:31b-cloud')
    expect(agent.model_config.tags).toEqual(['test'])
  })

  it('lists the created agent', async () => {
    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.agents.some((a) => a.id === createdAgentId)).toBe(true)
  })

  it('updates the agent without losing its tool ids', async () => {
    const res = await request(app)
      .put(`/api/agents/${createdAgentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed Test Agent', tool_ids: [TOOL_ID] })

    expect(res.status).toBe(200)
    expect(res.body.agent.name).toBe('Renamed Test Agent')
    expect(res.body.agent.tool_ids).toEqual([TOOL_ID])
  })

  it('deletes the agent', async () => {
    const res = await request(app)
      .delete(`/api/agents/${createdAgentId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
  })

  it('returns 404 for the deleted agent', async () => {
    const res = await request(app)
      .get(`/api/agents/${createdAgentId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

afterAll(async () => {
  const pg = (await import('pg')).default
  const pool = new pg.Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME
  })
  await pool.query("DELETE FROM users WHERE email = $1", [testEmail])
  await pool.end()
})
