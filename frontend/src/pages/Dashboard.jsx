import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import Greeting from '../components/Greeting.jsx'
import DashComposer from '../components/DashComposer.jsx'
import RobotIcon from '../components/RobotIcon.jsx'

// Everything on this page is a link or a button. A tile that only shows a
// number is decoration; a tile that shows a number and takes you to the
// place that number comes from is a control.
const TOOLS = [
  {
    key: 'visual',
    label: 'Visual Diagnose',
    hint: 'Upload a screenshot',
    icon: 'fa-image',
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
  },
  {
    key: 'agents',
    label: 'Agents',
    hint: 'Build and tune specialists',
    icon: 'fa-robot',
    color: 'violet',
    path: '/agents'
  },
  {
    key: 'workflows',
    label: 'Workflows',
    hint: 'Chain agents together',
    icon: 'fa-diagram-successor-step',
    color: 'amber',
    path: '/workflows'
  },
  {
    key: 'projects',
    label: 'Projects',
    hint: 'Group your diagnoses',
    icon: 'fa-folder-tree',
    color: 'blue',
    path: '/projects'
  },
  {
    key: 'analytics',
    label: 'Analytics',
    hint: 'Usage and cost trends',
    icon: 'fa-chart-line',
    color: 'rose',
    path: '/analytics'
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
      <div className="dash-loading">
        <div className="dash-loading__orb">
          <RobotIcon />
        </div>
        <p>Waking the crystal engine</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-loading">
        <div className="dash-error dash-error--block">{error}</div>
        <button type="button" className="dash-run" onClick={() => window.location.reload()}>
          <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
          Try again
        </button>
      </div>
    )
  }

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
      icon: 'fa-folder-tree',
      color: 'blue',
      hint: stats.totalProjects > 0 ? 'Open your projects' : 'Create your first project',
      path: '/projects'
    },
    {
      key: 'diagnoses',
      label: 'Diagnoses',
      value: stats.totalDiagnoses ?? 0,
      icon: 'fa-stethoscope',
      color: 'indigo',
      hint: 'See the full history',
      path: '/history'
    },
    {
      key: 'verified',
      label: 'Verified Fixes',
      value: verifiedCount,
      icon: 'fa-check-double',
      color: 'emerald',
      hint: ratedCount > 0 ? `${successRate}% success rate` : 'No fixes rated yet',
      path: '/history'
    },
    {
      key: 'failed',
      label: 'Failed Fixes',
      value: failedCount,
      icon: 'fa-bug',
      color: 'rose',
      hint: failedCount > 0 ? 'Needs your attention' : 'All clear',
      path: '/history'
    }
  ]

  return (
    <div className="dash">
      {/* ---------- hero ---------- */}
      <header className="dash-hero">
        <div className="dash-hero__aura" aria-hidden="true"></div>
        <Greeting />
        <div className="dash-hero__badges">
          <span className="dash-badge">
            <span className="dash-dot"></span>
            Engine active
          </span>
          <span className="dash-badge">
            <i className="fa-solid fa-microchip" aria-hidden="true"></i>
            Ollama local
          </span>
          <button type="button" className="dash-badge dash-badge--btn" onClick={() => navigate('/settings')}>
            <i className="fa-solid fa-sliders" aria-hidden="true"></i>
            Settings
          </button>
        </div>
      </header>

      {/* ---------- the one thing you came here to do ---------- */}
      <DashComposer />

      {/* ---------- numbers, each one a door ---------- */}
      <div className="dash-stats">
        {statCards.map((card) => (
          <StatTile key={card.key} {...card} onOpen={() => navigate(card.path)} />
        ))}
      </div>

      {/* ---------- shortcuts ---------- */}
      <div className="dash-tools">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            type="button"
            className={`dash-tool dash-tool--${tool.color}`}
            onClick={() => navigate(tool.path)}
          >
            <span className="dash-tool__icon">
              <i className={`fa-solid ${tool.icon}`} aria-hidden="true"></i>
            </span>
            <span className="dash-tool__text">
              <strong>{tool.label}</strong>
              <small>{tool.hint}</small>
            </span>
            <i className="fa-solid fa-chevron-right dash-tool__arrow" aria-hidden="true"></i>
          </button>
        ))}
      </div>

      {/* ---------- history ---------- */}
      <div className="dash-grid">
        <section className="dash-panel">
          <div className="dash-panel__head">
            <span className="dash-panel__icon dash-panel__icon--indigo">
              <i className="fa-solid fa-list-check" aria-hidden="true"></i>
            </span>
            <div>
              <h2 className="dash-panel__title">Recent Diagnoses</h2>
              <p className="dash-panel__sub">Click any row to reopen the full report</p>
            </div>
            <button type="button" className="dash-panel__more" onClick={() => navigate('/history')}>
              All <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>

          {recentDiagnoses.length === 0 ? (
            <div className="dash-empty">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <p>No diagnoses yet</p>
              <span>Use the box above and the first result lands here.</span>
            </div>
          ) : (
            <ul className="dash-list">
              {recentDiagnoses.map((d) => (
                <li key={d.id}>
                  <button type="button" className="dash-row" onClick={() => navigate(`/diagnosis/${d.id}`)}>
                    <span className="dash-row__tag">{d.agent_used || 'General'}</span>
                    <span className="dash-row__text">{d.problem}</span>
                    <span className="dash-row__time">{formatTime(d.created_at)}</span>
                    <i className="fa-solid fa-chevron-right dash-row__arrow" aria-hidden="true"></i>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel__head">
            <span className="dash-panel__icon dash-panel__icon--rose">
              <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
            </span>
            <div>
              <h2 className="dash-panel__title">Recent Verifications</h2>
              <p className="dash-panel__sub">Did the suggested fix actually work</p>
            </div>
            <span className="dash-panel__more dash-panel__more--static">
              {ratedCount} rated
            </span>
          </div>

          {recentVerifications.length === 0 ? (
            <div className="dash-empty">
              <i className="fa-solid fa-clipboard-check" aria-hidden="true"></i>
              <p>No verifications yet</p>
              <span>Rate a fix inside its result and it shows up here.</span>
            </div>
          ) : (
            <ul className="dash-list">
              {recentVerifications.map((v) => (
                <li key={v.id}>
                  <VerificationRow status={v.status} content={v.problem} time={v.created_at} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatTile({ label, value, icon, color, hint, onOpen }) {
  return (
    <button type="button" className={`dash-stat dash-stat--${color}`} onClick={onOpen}>
      <span className="dash-stat__icon">
        <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
      </span>
      <span className="dash-stat__label">{label}</span>
      <span className="dash-stat__value">{value}</span>
      <span className="dash-stat__hint">
        {hint}
        <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </span>
      <span className="dash-stat__shine" aria-hidden="true"></span>
    </button>
  )
}

const STATUS = {
  success: { label: 'Verified', icon: 'fa-check', color: 'emerald' },
  failed: { label: 'Failed', icon: 'fa-xmark', color: 'rose' },
  partial: { label: 'Partial', icon: 'fa-circle-half-stroke', color: 'amber' }
}

function VerificationRow({ status, content, time }) {
  const config = STATUS[status] || STATUS.failed

  // Verifications have no detail page of their own, so the row links to the
  // history list rather than pretending to open something.
  return (
    <div className={`dash-row dash-row--static dash-row--${config.color}`}>
      <span className="dash-row__status">
        <i className={`fa-solid ${config.icon}`} aria-hidden="true"></i>
        {config.label}
      </span>
      <span className="dash-row__text">{content}</span>
      <span className="dash-row__time">{formatTime(time)}</span>
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
