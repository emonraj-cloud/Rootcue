import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client.js'
import DiagnosisResultView from '../components/DiagnosisResultView.jsx'

export default function DiagnosisDetail() {
  const { id } = useParams()
  const [diagnosis, setDiagnosis] = useState(null)
  const [verifications, setVerifications] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .get(`/api/diagnosis/${id}`)
      .then((data) => setDiagnosis(data.diagnosis))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    // Verifications the user linked to this diagnosis ("Worked / Didn't Work")
    api
      .get(`/api/verification?diagnosisId=${encodeURIComponent(id)}`)
      .then((data) => setVerifications(data.verifications || []))
      .catch(() => {})
  }, [id])

  return (
    <div>
      <Link to="/history" className="back-link">&larr; Back to History</Link>
      <h2>Diagnosis Details</h2>

      {loading && <p>Loading...</p>}
      {error && <div className="error-banner">{error}</div>}

      {diagnosis && (
        <>
          <div className="detail-head">
            <span className="tag">{diagnosis.agent_used || 'general'}</span>
            <span className="history-date">
              {new Date(diagnosis.created_at).toLocaleString()}
            </span>
          </div>
          <DiagnosisResultView result={diagnosis.result} />

          <div className="detail-verify-section">
            <h3>Verification History</h3>
            {verifications.length === 0 ? (
              <p className="empty-note">
                No verification recorded yet. Rate the solution from the Diagnose page result.
              </p>
            ) : (
              <ul className="verify-list">
                {verifications.map((v) => (
                  <li key={v.id}>
                    <div className="verify-list-header">
                      <span className={`tag status-${v.status}`}>{v.status}</span>
                      <span className="history-date">
                        {new Date(v.created_at).toLocaleString()}
                      </span>
                    </div>
                    {v.notes && <div className="verify-list-notes">{v.notes}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

