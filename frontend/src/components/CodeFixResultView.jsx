import { useState } from 'react'
import { cleanList, stripLeadingNumbering } from '../utils/textList.js'

const EXTENSION = {
  Python: 'py',
  JavaScript: 'js',
  TypeScript: 'ts',
  Go: 'go',
  Rust: 'rs',
  Java: 'java',
  Ruby: 'rb',
  PHP: 'php',
  SQL: 'sql'
}

// Cheap shape check per language. Catches the common failure where a 0.8B
// model answers a Python paste with JavaScript, which the user would otherwise
// only discover by pasting it back into their editor.
const SHAPE = [
  [/^\s*def\s+\w+\s*\(|^\s*import\s+\w+|^\s*print\(/m, 'Python'],
  [/^\s*(function|const|let|var)\s+[\w$]+|^=>|;\s*$/m, 'JavaScript'],
  [/^\s*(package|import)\s+"|func\s+\w+\s*\(/m, 'Go'],
  [/^\s*(public|private|protected)\s+[\w<>\[\]]+\s+\w+\s*\(/m, 'Java'],
  [/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/im, 'SQL']
]

function looksLike(correctedCode, language) {
  for (const [re, lang] of SHAPE) {
    if (re.test(correctedCode) && lang !== language) return lang
  }
  return null
}

export default function CodeFixResultView({ result, diagnosisId }) {
  const changes = cleanList(result.changes).map(stripLeadingNumbering)
  const verificationSteps = cleanList(result.verification).map(stripLeadingNumbering)
  const [copied, setCopied] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const language = result.language
  const wrongLanguage = language ? looksLike(result.correctedCode || '', language) : null

  // Models often wrap code in a markdown fence despite being told not to.
  // Showing that back to the user verbatim is a real usability bug.
  const raw = result.correctedCode || ''
  const fenced = raw.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/)
  const corrected = fenced ? fenced[1] : raw

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(corrected)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function handleDownload() {
    const ext = EXTENSION[language] || 'txt'
    const url = URL.createObjectURL(new Blob([corrected], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `fixed.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="cf-out">
      <div className="cf-out-head">
        <span className="cf-out-label">
          {language && language !== 'unknown' && <span className="cf-lang">{language}</span>}
        </span>
        <span className="cf-out-actions">
          <button type="button" className="cf-btn-ghost" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button type="button" className="cf-btn-ghost" onClick={handleDownload}>
            <i className="fa-solid fa-download"></i>
            Download
          </button>
          {diagnosisId && (
            <a className="cf-btn-ghost" href={`/diagnosis/${diagnosisId}`}>
              Open full report
            </a>
          )}
        </span>
      </div>

      {wrongLanguage && (
        <div className="cf-warn">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            You pasted <strong>{language}</strong> but the returned code looks like{' '}
            <strong>{wrongLanguage}</strong>. Do not paste this straight back in, and treat the
            answer with suspicion.
          </div>
        </div>
      )}

      {fenced && (
        <div className="cf-warn cf-warn--info">
          <i className="fa-solid fa-circle-info"></i>
          <div>
            The model wrapped the answer in a markdown code fence. It has been unwrapped below.{' '}
            <button type="button" className="cf-link" onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? 'Hide the original' : 'See the original'}
            </button>
          </div>
        </div>
      )}

      {fenced && showRaw && <pre className="cf-raw">{raw}</pre>}

      <div className="cf-block">
        <h3>Problem</h3>
        <p>{result.problem}</p>
      </div>

      <div className="cf-block">
        <h3>Why it broke</h3>
        <p>{result.explanation}</p>
      </div>

      <div className="cf-block">
        <h3>Corrected code</h3>
        <pre className="cf-code-block"><code>{corrected}</code></pre>
      </div>

      {changes.length > 0 && (
        <div className="cf-block">
          <h3>Changes made</h3>
          <ul>{changes.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}

      {verificationSteps.length > 0 && (
        <div className="cf-block">
          <h3>How to confirm it works</h3>
          <ul>{verificationSteps.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
