import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client.js'
import DiagnosisResultView from './DiagnosisResultView.jsx'
import RobotIcon from './RobotIcon.jsx'

// Only the text mode can run in place: the other two need a file picker or
// a second input (code + error), so they hand the question over to their
// own page instead of pretending to work here.
const MODES = [
  {
    key: 'describe',
    label: 'Describe',
    icon: 'fa-stethoscope',
    placeholder: 'Describe the error in words. For example: the login API returns 500 when the password contains a dot.',
    action: 'Run diagnosis'
  },
  {
    key: 'screenshot',
    label: 'Screenshot',
    icon: 'fa-image',
    placeholder: 'Upload a screenshot, a stack trace image or a photo of the broken screen.',
    action: 'Open Visual Diagnose'
  },
  {
    key: 'code',
    label: 'Code',
    icon: 'fa-code',
    placeholder: 'Paste the broken code along with the error message.',
    action: 'Open Code Fix'
  }
]

export default function DashComposer() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('describe')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [diagnosisId, setDiagnosisId] = useState(null)

  const active = MODES.find((m) => m.key === mode) || MODES[0]
  const canRun = text.trim().length > 0 && !loading

  function switchMode(next) {
    setMode(next)
    setError('')
    if (next !== 'describe') {
      setResult(null)
      setDiagnosisId(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canRun) return

    // The other modes need their own page (a file input, or a separate code
    // and error box), so navigate instead of running a half-working form.
    if (mode !== 'describe') {
      navigate(mode === 'screenshot' ? '/visual' : '/code-fix')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await api.post('/api/diagnosis', { problem: text.trim() })
      setResult(data.diagnosis)
      setDiagnosisId(data.diagnosisId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="dash-composer">
      <div className="dash-composer__head">
        <RobotIcon className="dash-composer__bot" />
        <div className="dash-composer__intro">
          <h2 className="dash-composer__title">Ask the crystal engine</h2>
          <p className="dash-composer__sub">
            One box, three tools. Type it, point at a screenshot, or paste the code.
          </p>
        </div>
        <div className="dash-composer__modes" role="tablist" aria-label="Tool">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={mode === m.key}
              className={`dash-chip dash-chip--${m.key}${mode === m.key ? ' is-active' : ''}`}
              onClick={() => switchMode(m.key)}
            >
              <i className={`fa-solid ${m.icon}`} aria-hidden="true"></i>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <form className="dash-composer__form" onSubmit={handleSubmit}>
        <textarea
          className="dash-composer__input"
          rows={3}
          value={text}
          placeholder={active.placeholder}
          aria-label="Describe your problem"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit(e)
          }}
        />

        <div className="dash-composer__actions">
          <span className="dash-composer__hint">
            <i className="fa-solid fa-keyboard" aria-hidden="true"></i>
            Ctrl + Enter to run
          </span>
          <button type="submit" className="dash-run" disabled={!canRun}>
            {loading ? (
              <>
                <span className="dash-spinner" aria-hidden="true"></span>
                Analysing
              </>
            ) : (
              <>
                <i className={`fa-solid ${active.icon}`} aria-hidden="true"></i>
                {active.action}
              </>
            )}
          </button>
        </div>
      </form>

      {error && <div className="dash-error">{error}</div>}

      {loading && (
        <div className="dash-thinking" role="status">
          <span className="dash-thinking__dot"></span>
          <span className="dash-thinking__dot"></span>
          <span className="dash-thinking__dot"></span>
          Reading the problem, picking an agent and drafting a fix
        </div>
      )}

      {result && !loading && (
        <div className="dash-result">
          <div className="dash-result__bar">
            <span className="dash-result__label">
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
              Result
            </span>
            {diagnosisId && (
              <button
                type="button"
                className="dash-result__open"
                onClick={() => navigate(`/diagnosis/${diagnosisId}`)}
              >
                Open full report
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </button>
            )}
          </div>
          <DiagnosisResultView result={result} />
        </div>
      )}
    </section>
  )
}
