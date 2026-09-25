import { useState } from 'react'
import { cleanList, stripLeadingNumbering } from '../utils/textList.js'

export default function CodeFixResultView({ result }) {
  const changes = cleanList(result.changes).map(stripLeadingNumbering)
  const verificationSteps = cleanList(result.verification).map(stripLeadingNumbering)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.correctedCode || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="diagnosis-result">
      <h3>Problem</h3>
      <p>{result.problem}</p>

      <h3>Explanation</h3>
      <p>{result.explanation}</p>

      <div className="code-header-row">
        <h3>Corrected Code</h3>
        <button type="button" className="copy-btn" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>
      <pre className="code-result-block"><code>{result.correctedCode}</code></pre>

      {changes.length > 0 && (
        <>
          <h4>Changes Made</h4>
          <ul>{changes.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </>
      )}

      {verificationSteps.length > 0 && (
        <>
          <h4>Verification</h4>
          <ul>{verificationSteps.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </>
      )}
    </div>
  )
}
