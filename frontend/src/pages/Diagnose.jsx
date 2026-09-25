import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client.js'
import DiagnosisResultView from '../components/DiagnosisResultView.jsx'

export default function Diagnose() {
  const [searchParams] = useSearchParams()
  const [problem, setProblem] = useState(searchParams.get('problem') || '')
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [diagnosisId, setDiagnosisId] = useState(null)

  useEffect(() => {
    const p = searchParams.get('problem')
    if (p) setProblem(p)
  }, [searchParams])

  const [verifyStatus, setVerifyStatus] = useState(null)
  const [verifyNotes, setVerifyNotes] = useState('')
  const [verifySubmitting, setVerifySubmitting] = useState(false)
  const [verifySaved, setVerifySaved] = useState(false)

  useEffect(() => {
    api.get('/api/projects').then((data) => setProjects(data.projects)).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!problem.trim()) return

    setLoading(true)
    setError('')
    setResult(null)
    setVerifySaved(false)
    setVerifyStatus(null)
    setVerifyNotes('')

    try {
      const data = await api.post('/api/diagnosis', {
        problem,
        projectId: projectId || undefined
      })
      setResult(data.diagnosis)
      setDiagnosisId(data.diagnosisId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(status) {
    setVerifyStatus(status)
    setVerifySubmitting(true)
    try {
      await api.post('/api/verification', {
        problem: result.problem,
        solution: result.solution,
        status,
        notes: verifyNotes || undefined,
        diagnosisId: diagnosisId || undefined
      })
      setVerifySaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setVerifySubmitting(false)
    }
  }

  return (
    <div>
      <h2>Diagnose a Problem</h2>

      <form className="diagnose-form" onSubmit={handleSubmit}>
        <label>
          Describe your problem
          <textarea
            rows={4}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="e.g. PostgreSQL connection refused on port 5432"
            required
          />
        </label>

        <label>
          Project (optional)
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing (this can take a moment)...' : 'Analyze Problem'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <>
          <DiagnosisResultView result={result} />

          <div className="verify-box">
            <h4>Did this solution work?</h4>
            {verifySaved ? (
              <p className="verify-saved">
                Marked as <strong>{verifyStatus}</strong>
                {diagnosisId ? ' and linked to this diagnosis' : ''}. Thanks!
              </p>
            ) : (
              <>
                <textarea
                  rows={2}
                  placeholder="Notes (optional)"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                />
                <div className="verify-buttons">
                  <button
                    className="verify-success"
                    disabled={verifySubmitting}
                    onClick={() => handleVerify('success')}
                  >
                    Worked
                  </button>
                  <button
                    className="verify-partial"
                    disabled={verifySubmitting}
                    onClick={() => handleVerify('partial')}
                  >
                    Partially Worked
                  </button>
                  <button
                    className="verify-failed"
                    disabled={verifySubmitting}
                    onClick={() => handleVerify('failed')}
                  >
                    Didn't Work
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

