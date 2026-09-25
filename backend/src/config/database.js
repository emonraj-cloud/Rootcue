import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME
})

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('Database connection successful:', result.rows[0].now)
  } catch (err) {
    console.error('Database connection FAILED:', err.message)
  }
}

export default pool