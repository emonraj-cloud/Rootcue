import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import Greeting from '../components/Greeting.jsx'

// The three things a user actually comes here to do. Each one hands the
// typed question straight to the matching tool.
const TOOLS = [
  {
    key: 'diagnose',
    label: 'Diagnose',
    hint: 'Describe an error in words',
    icon: 'fa-stethoscope',
    color: 'indigo',
    path: '/diagnose'
  },
  {
    key: 'visual',
    label: 'Visual Diagnose',
    hint: 'Upload a screenshot',
    icon: 'fa-eye',
    color: 'cyan',
    path: '/visual'
  },
  {
    key: 'code',
    label: 'Code Fix',
    hint: 'Paste code plus the error',
    icon: 'fa-code',
    color: 'emerald',
    path: '/code-fix'
  }
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/dashboard')
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-orb">
          <div className="orb-ring"></div>
          <div className="orb-core">
            <i className="fa-solid fa-brain"></i>
          </div>
        </div>
        <p className="loading-text">Initializing Crystal Neural Engine...</p>
      </div>
    )
  }

  if (error) return <div className="error-banner">{error}</div>
  if (!stats) return null

  const verificationStats = stats.verifications || {}
  const recentDiagnoses = Array.isArray(stats.recentDiagnoses) ? stats.recentDiagnoses : []
  const recentVerifications = Array.isArray(stats.recentVerifications) ? stats.recentVerifications : []

  const verifiedCount = verificationStats.success || 0
  const failedCount = verificationStats.failed || 0
  const partialCount = verificationStats.partial || 0
  const ratedCount = verifiedCount + failedCount + partialCount
  const successRate = ratedCount > 0 ? Math.round((verifiedCount / ratedCount) * 100) : null

  // Every value below comes from the API. There are no hardcoded trends.
  const statCards = [
    {
      key: 'projects',
      label: 'Projects',
      value: stats.totalProjects ?? 0,
      icon: 'fa-folder',
      color: 'blue',
      trend: stats.totalProjects > 0 ? 'Tracked in your workspace' : 'Create your first project',
      trendColor: stats.totalProjects > 0 ? 'emerald' : 'slate'
    },
    {
      key: 'diagnoses',
      label: 'Diagnoses',
      value: stats.totalDiagnoses ?? 0,
      icon: 'fa-stethoscope',
      color: 'indigo',
      trend: 'AI analyses run',
      trendColor: 'indigo'
    },
    {
      key: 'verified',
      label: 'Verified Fixes',
      value: verifiedCount,
      icon: 'fa-check-double',
      color: 'emerald',
      trend: ratedCount > 0 ? `${successRate}% success rate` : 'No fixes rated yet',
      trendColor: 'emerald'
    },
    {
      key: 'failed',
      label: 'Failed Fixes',
      value: failedCount,
      icon: 'fa-bug',
      color: 'rose',
      trend: failedCount > 0 ? 'Action required' : 'All clear',
      trendColor: failedCount > 0 ? 'rose' : 'emerald'
    }
  ]

  return (
    <div className="dashboard-container">
      <Greeting />

      <div className="dashboard-header dashboard-header--slim">
        <div className="header-status">
          <span className="status-indicator">
            <i className="fa-solid fa-robot ai-symbol"></i>
            <span className="status-dot"></span>
            AI Engine Active
          </span>
        </div>
      </div>


      <div className="stat-grid">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            {...card}
          />
        ))}
      </div>

      <div className="tool-tiles">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            type="button"
            className={`tool-tile tool-tile--${tool.color}`}
            onClick={() => navigate(tool.path)}
          >
            <span className="tool-tile__icon">
              <i className={`fa-solid ${tool.icon}`}></i>
            </span>
            <span className="tool-tile__text">
              <strong>{tool.label}</strong>
              <small>{tool.hint}</small>
            </span>
            <i className="fa-solid fa-chevron-right tool-tile__arrow" aria-hidden="true"></i>
          </button>
        ))}
      </div>


      <div className="sections-grid">
        <section className="glass-panel section-card">
          <div className="section-header">
            <div className="section-icon indigo">
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div>
              <h2 className="section-title">Recent Diagnoses</h2>
              <p className="section-desc">Latest AI diagnostic queries</p>
            </div>
          </div>
          <div className="activity-list">
            {stats.recentDiagnoses.length === 0 ? (
              <div className="empty-state">
                <i className="fa-solid fa-magnifying-glass"></i>
                <p>No diagnoses yet</p>
                <span>Run your first diagnosis to see results here</span>
              </div>
            ) : (
              stats.recentDiagnoses.map((d) => (
                <ActivityItem
                  key={d.id}
                  category={d.agent_used}
                  content={d.problem}
                  time={d.created_at}
                />
              ))
            )}
          </div>
        </section>

        <section className="glass-panel section-card">
          <div className="section-header">
            <div className="section-icon rose">
              <i className="fa-solid fa-shield-cat"></i>
            </div>
            <div>
              <h2 className="section-title">Recent Verifications</h2>
              <p className="section-desc">Automated AI health audit results</p>
            </div>
          </div>
          <div className="activity-list">
            {stats.recentVerifications.length === 0 ? (
              <div className="empty-state">
                <i className="fa-solid fa-clipboard-check"></i>
                <p>No verifications yet</p>
                <span>Verify a diagnosis fix to see results</span>
              </div>
            ) : (
              stats.recentVerifications.map((v) => (
                <VerificationItem
                  key={v.id}
                  status={v.status}
                  content={v.problem}
                  time={v.created_at}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, trend, trendColor }) {
  const colorStyles = {
    blue: { bg: 'blue-500', border: 'blue-400', text: 'blue-300', glow: 'rgba(59, 130, 246, 0.3)' },
    indigo: { bg: 'indigo-500', border: 'indigo-400', text: 'indigo-300', glow: 'rgba(99, 102, 241, 0.3)' },
    emerald: { bg: 'emerald-500', border: 'emerald-400', text: 'emerald-300', glow: 'rgba(16, 185, 129, 0.3)' },
    rose: { bg: 'rose-500', border: 'rose-400', text: 'rose-300', glow: 'rgba(251, 113, 133, 0.3)' }
  }

  const c = colorStyles[color]
  const trendStyles = {
    emerald: 'text-emerald-300',
    indigo: 'text-indigo-300',
    rose: 'text-rose-300',
    slate: 'text-slate-300'
  }

  return (
    <div className="stat-card glass-panel tilt-card">
      <div className="card-header">
        <span className="card-label">{label}</span>
        <div className={`card-icon card-icon-${color}`}>
          <i className={`fa-solid ${icon} icon-${color}`}></i>
        </div>
      </div>
      <div className="card-body">
        <span className="card-value font-mono">{value}</span>
        <span className={`card-trend ${trendStyles[trendColor]}`}>
          <i className={`fa-solid ${trendColor === 'rose' && trendColor !== 'emerald' ? 'fa-triangle-exclamation' : 'fa-arrow-up'}`}></i>
          {trend}
        </span>
      </div>
      <div className={`card-glow card-glow-${color}`} />
    </div>
  )
}

function ActivityItem({ category, content, time }) {
  const categoryColors = {
    'General': 'indigo',
    'Database': 'purple',
    'Code Fix': 'cyan',
    'DevOps': 'orange',
    'Troubleshooting': 'blue'
  }
  const catColor = categoryColors[category] || 'indigo'

  return (
    <div className="activity-item glass-item">
      <span className={`activity-tag ${catColor}`}>{category}</span>
      <p className="activity-content">{content}</p>
      <span className="activity-time">{formatTime(time)}</span>
    </div>
  )
}

function VerificationItem({ status, content, time }) {
  const statusConfig = {
    success: { color: 'emerald', icon: 'fa-check-circle', label: 'Verified' },
    failed: { color: 'rose', icon: 'fa-xmark-circle', label: 'Failed' },
    partial: { color: 'amber', icon: 'fa-circle-half-stroke', label: 'Partial' }
  }
  const config = statusConfig[status] || statusConfig.failed

  return (
    <div className="verification-item glass-item">
      <span className={`verification-badge ${config.color}`}>
        <i className={`fa-solid ${config.icon}`}></i>
        {config.label}
      </span>
      <p className="verification-content">{content}</p>
      <span className="verification-time">{formatTime(time)}</span>
    </div>
  )
}

function formatTime(dateString) {
  if (!dateString) return 'Just now'
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}
