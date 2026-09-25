import { useState } from 'react'
import { api } from '../api/client.js'
import CodeFixResultView from '../components/CodeFixResultView.jsx'

export default function CodeFix() {
  const [code, setCode] = useState('')
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim() || !errorText.trim()) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const data = await api.post('/api/agents/code', {
        code,
        error: errorText
      })
      setResult(data.result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Code Fix Agent</h2>
      <p className="visual-hint">
        Paste the broken code and the error message you are seeing.
        The AI will find the bug and return corrected code you can copy.
      </p>

      <form className="diagnose-form" onSubmit={handleSubmit}>
        <label>
          Broken code
          <textarea
            rows={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. function add(a, b) { retrun a + b; }"
            required
            className="code-textarea"
            spellCheck="false"
          />
        </label>

        <label>
          Error message
          <textarea
            rows={3}
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
            placeholder="e.g. SyntaxError: Unexpected token"
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Fixing (this can take a moment)...' : 'Fix My Code'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {result && <CodeFixResultView result={result} />}
    </div>
  )
}

