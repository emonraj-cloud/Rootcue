import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import CodeFixResultView from '../components/CodeFixResultView.jsx'
import { collapseContext, diffLines } from '../utils/codeDiff.js'

const MIN_CODE_CHARS = 10

export default function CodeFix() {
  const [code, setCode] = useState('')
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [rawResponse, setRawResponse] = useState('')
  const [result, setResult] = useState(null)
  const [diagnosisId, setDiagnosisId] = useState(null)
  const [showDiff, setShowDiff] = useState(true)
  const [verifyStatus, setVerifyStatus] = useState(null)
  const [verifyNotes, setVerifyNotes] = useState('')
  const [verifySubmitting, setVerifySubmitting] = useState(false)
  const [verifySaved, setVerifySaved] = useState(false)

  const codeReady = code.trim().length >= MIN_CODE_CHARS
  const errorReady = errorText.trim().length > 0
  const canSubmit = codeReady && errorReady && !loading

  // A vision-free text model still needs a moment; a frozen button reads as a
  // broken page.
  useEffect(() => {
    if (!loading) {
      setElapsed(0)
      return undefined
    }
    const started = Date.now()
    const id = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500)
    return () => clearInterval(id)
  }, [loading])

  const diff = useMemo(() => {
    if (!result?.correctedCode || !code) return null
    try {
      const full = diffLines(code, result.correctedCode)
      return { ...full, rows: collapseContext(full.rows) }
    } catch {
      // A diff failure must never hide the corrected code itself.
      return null
    }
  }, [code, result])

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!canSubmit) {
      setError(
        !codeReady
          ? `Paste at least ${MIN_CODE_CHARS} characters of the code that is failing.`
          : 'Paste the error message too. The model needs to know what went wrong.'
      )
      return
    }

    setLoading(true)
    setError('')
    setRawResponse('')
    setResult(null)
    setVerifySaved(false)
    setVerifyStatus(null)
    setVerifyNotes('')

    try {
      const data = await api.post('/api/agents/code', { code, error: errorText })
      setResult(data.result)
      setDiagnosisId(data.diagnosisId || null)
    } catch (err) {
      setError(err.message)
      setRawResponse(err.data?.rawResponse || '')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(status) {
    setVerifyStatus(status)
    setVerifySubmitting(true)
    setError('')
    try {
      await api.post('/api/verification', {
        problem: result.problem,
        solution: result.explanation,
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

  function handleReset() {
    setCode('')
    setErrorText('')
    setResult(null)
    setError('')
    setRawResponse('')
    setDiagnosisId(null)
    setVerifySaved(false)
    setVerifyStatus(null)
    setVerifyNotes('')
  }

  return (
    <div className="cf-page">
      <div className="cf-header">
        <div className="cf-header-icon">
          <i className="fa-solid fa-code"></i>
        </div>
        <div>
          <h1 className="cf-title">Code Fix</h1>
          <p className="cf-subtitle">
            Paste the code that is failing and the error it produced. The model returns the
            corrected code, what it changed and how to confirm the fix.
          </p>
        </div>
      </div>

      <form className="cf-form" onSubmit={handleSubmit}>
        <label className="cf-label">
          <span>
            Code that is failing
            <em>{code.trim().length > 0 ? `${code.trim().length} characters` : 'required'}</em>
          </span>
          <textarea
            rows={12}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={'def add(a, b):\n    retrun a + b'}
            required
            className="cf-code"
            spellCheck="false"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </label>

        <label className="cf-label">
          <span>
            Error message
            <em>paste the full stack trace if you have one</em>
          </span>
          <textarea
            rows={4}
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
            placeholder="e.g. SyntaxError: unexpected keyword 'retrun'"
            required
            className="cf-code"
            spellCheck="false"
          />
        </label>

        <div className="cf-actions">
          <button type="submit" className="cf-btn-primary" disabled={!canSubmit}>
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Fixing... {elapsed}s
              </>
            ) : (
              <>
                <i className="fa-solid fa-screwdriver-wrench"></i>
                Fix my code
              </>
            )}
          </button>
          <button
            type="button"
            className="cf-btn-ghost"
            onClick={handleReset}
            disabled={loading || (!code && !errorText)}
          >
            <i className="fa-solid fa-rotate-left"></i>
            Clear
          </button>
          {!loading && !codeReady && code.trim().length > 0 && (
            <span className="cf-hint-inline">Needs at least {MIN_CODE_CHARS} characters</span>
          )}
        </div>
      </form>

      {error && (
        <div className="cf-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          <div>
            <div>{error}</div>
            {rawResponse && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium">
                  What the model actually returned
                </summary>
                <pre className="exec-json mt-2">{rawResponse}</pre>
              </details>
            )}
            {canSubmit && (
              <button type="button" className="cf-btn-ghost mt-3" onClick={handleSubmit}>
                <i className="fa-solid fa-rotate-right"></i>
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="cf-result">
          {diff && diff.added + diff.removed > 0 && (
            <div className="cf-diff">
              <div className="cf-diff-head">
                <button
                  type="button"
                  className="cf-diff-toggle"
                  onClick={() => setShowDiff((v) => !v)}
                  aria-expanded={showDiff}
                >
                  <i
                    className={`fa-solid fa-chevron-${showDiff ? 'down' : 'right'} cf-diff-caret`}
                  ></i>
                  What changed
                </button>
                <span className="cf-diff-stats">
                  <span className="cf-stat-add">+{diff.added}</span>
                  <span className="cf-stat-del">-{diff.removed}</span>
                </span>
              </div>

              {showDiff && (
                <div className="cf-diff-body">
                  {diff.rows.map((row, idx) =>
                    row.type === 'gap' ? (
                      <div key={`gap-${idx}`} className="cf-diff-gap">
                        {row.count} unchanged {row.count === 1 ? 'line' : 'lines'}
                      </div>
                    ) : (
                      <div key={idx} className={`cf-diff-row cf-diff-row--${row.type}`}>
                        <span className="cf-diff-no">
                          {row.type === 'del' ? row.oldNo : row.type === 'add' ? row.newNo : ''}
                        </span>
                        <span className="cf-diff-sign">
                          {row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '}
                        </span>
                        <span className="cf-diff-text">{row.text || ' '}</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          <CodeFixResultView result={result} diagnosisId={diagnosisId} />

          <div className="cf-verify">
            <h2>Did this fix work?</h2>
            {verifySaved ? (
              <p className="cf-verify-saved">
                Marked as <strong>{verifyStatus}</strong>
                {diagnosisId ? ' and linked to this fix' : ''}.
              </p>
            ) : (
              <>
                <p className="cf-verify-hint">
                  This is the only signal that says whether the model is actually right.
                </p>
                <textarea
                  rows={2}
                  placeholder="Notes (optional)"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                />
                <div className="cf-verify-buttons">
                  <button disabled={verifySubmitting} onClick={() => handleVerify('success')}>
                    It worked
                  </button>
                  <button disabled={verifySubmitting} onClick={() => handleVerify('partial')}>
                    Partly worked
                  </button>
                  <button disabled={verifySubmitting} onClick={() => handleVerify('failed')}>
                    Still broken
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!code && !result && (
        <div className="cf-tips">
          <h2>What makes a good paste</h2>
          <ul>
            <li>Include the whole function, not just the line the error points at</li>
            <li>Keep the stack trace intact. The top frame is usually the useful one</li>
            <li>Paste the code exactly as it runs. A cleaned-up snippet hides the bug</li>
            <li>One error at a time. Fixing a pile of errors at once gives vague answers</li>
          </ul>
        </div>
      )}
    </div>
  )
}
