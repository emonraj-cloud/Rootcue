import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client.js'

export default function History() {
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/api/diagnosis/history')
      .then((data) => setHistory(data.history))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading history...</p>

  return (
    <div>
      <h2>Diagnosis History</h2>

      {error && <div className="error-banner">{error}</div>}

      {history.length === 0 ? (
        <p className="empty-note">No diagnoses yet. Try the Diagnose page to create one.</p>
      ) : (
        <ul className="history-list">
          {history.map((item) => (
            <li key={item.id}>
              <Link to={`/diagnosis/${item.id}`} className="history-item">
                <div className="history-item-header">
                  <span className="tag">{item.agent_used}</span>
                  <span className="history-date">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <div>{item.problem}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

