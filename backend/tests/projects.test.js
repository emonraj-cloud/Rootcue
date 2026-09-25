import request from 'supertest'
import app from '../src/app.js'

const testEmail = `test-projects-${Date.now()}@techpilot.test`
const testPassword = 'test12345'

let token
let createdProjectId

beforeAll(async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Project Tester', email: testEmail, password: testPassword })

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: testEmail, password: testPassword })

  token = loginRes.body.token
})

describe('Project API', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(401)
  })

  it('creates a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Project', description: 'Created by automated test' })

    expect(res.status).toBe(201)
    expect(res.body.project.name).toBe('Test Project')
    createdProjectId = res.body.project.id
  })

  it('lists the created project', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    const found = res.body.projects.some((p) => p.id === createdProjectId)
    expect(found).toBe(true)
  })

  it('updates the project', async () => {
    const res = await request(app)
      .put(`/api/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Test Project' })

    expect(res.status).toBe(200)
    expect(res.body.project.name).toBe('Updated Test Project')
  })

  it('deletes the project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
  })

  it('returns 404 for the deleted project', async () => {
    const res = await request(app)
      .get(`/api/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
