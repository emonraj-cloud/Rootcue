import { useEffect, useState } from 'react'
import { api } from '../api/client.js'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  function loadProjects() {
    setLoading(true)
    api
      .get('/api/projects')
      .then((data) => setProjects(data.projects))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProjects()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await api.post('/api/projects', { name, description })
      setName('')
      setDescription('')
      loadProjects()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/projects/${id}`)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h2>Projects</h2>

      {error && <div className="error-banner">{error}</div>}

      <form className="inline-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'New Project'}
        </button>
      </form>

      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="empty-note">No projects yet. Create your first one above.</p>
      ) : (
        <ul className="project-list">
          {projects.map((p) => (
            <li key={p.id} className="project-item">
              <div>
                <strong>{p.name}</strong>
                {p.description && <p className="project-desc">{p.description}</p>}
              </div>
              <button onClick={() => handleDelete(p.id)} className="delete-btn">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

