import request from 'supertest'
import app from '../src/app.js'

describe('GET /api/health', () => {
  it('returns success true', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
