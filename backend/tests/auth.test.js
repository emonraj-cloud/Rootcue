import request from 'supertest'
import app from '../src/app.js'

const testEmail = `test-${Date.now()}@techpilot.test`
const testPassword = 'test12345'

describe('Auth API', () => {
  it('rejects registration with an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: testPassword })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('rejects registration with a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: testEmail, password: '123' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('registers a new user with valid details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: testPassword })
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.token).toBeDefined()
  })

  it('rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: testPassword })
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
  })

  it('rejects login with the wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' })
    expect(res.status).toBe(401)
  })

  it('logs in with correct credentials and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('rejects /me without a token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns the current user with a valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
    const token = loginRes.body.token

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(testEmail)
  })
})
