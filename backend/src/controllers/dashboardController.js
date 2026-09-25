import pool from '../config/database.js'

export async function getDashboardStats(req, res) {
  try {
    const userId = req.user.id

    const [projectsCount, diagnosesCount, verificationStats, recentDiagnoses, recentVerifications] =
      await Promise.all([
        pool.query('SELECT COUNT(*) FROM projects WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM diagnoses WHERE user_id = $1', [userId]),
        pool.query('SELECT status, COUNT(*) FROM verifications WHERE user_id = $1 GROUP BY status', [userId]),
        pool.query(
          'SELECT id, agent_used, problem, created_at FROM diagnoses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
          [userId]
        ),
        pool.query(
          'SELECT id, problem, status, created_at FROM verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
          [userId]
        )
      ])

    const verificationBreakdown = { success: 0, failed: 0, partial: 0 }
    for (const row of verificationStats.rows) {
      verificationBreakdown[row.status] = parseInt(row.count, 10)
    }

    res.json({
      success: true,
      stats: {
        totalProjects: parseInt(projectsCount.rows[0].count, 10),
        totalDiagnoses: parseInt(diagnosesCount.rows[0].count, 10),
        verifications: verificationBreakdown,
        recentDiagnoses: recentDiagnoses.rows,
        recentVerifications: recentVerifications.rows
      }
    })
  } catch (err) {
    console.error('Dashboard error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while loading the dashboard' })
  }
}
