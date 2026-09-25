import { cleanList, stripLeadingNumbering } from '../utils/textList.js'

export default function DiagnosisResultView({ result }) {
  const evidence = cleanList(result.evidence).map(stripLeadingNumbering)
  const steps = cleanList(result.steps).map(stripLeadingNumbering)
  const verificationSteps = cleanList(result.verification).map(stripLeadingNumbering)
  const warnings = cleanList(result.warnings).map(stripLeadingNumbering)
  const knowledgeUsed = Array.isArray(result.knowledgeUsed) ? result.knowledgeUsed : []

  return (
    <div className="diagnosis-result">
      <div className="diagnosis-header">
        <span className="tag">{result.agentUsed}</span>
        {typeof result.confidence === 'number' && (
          <span className="confidence">{result.confidence}% confidence</span>
        )}
      </div>

      <h3>Root Cause</h3>
      <p>{result.rootCause}</p>

      {evidence.length > 0 && (
        <>
          <h4>Evidence</h4>
          <ul>{evidence.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </>
      )}

      <h3>Solution</h3>
      <p>{result.solution}</p>

      {steps.length > 0 && (
        <>
          <h4>Steps</h4>
          <ol>{steps.map((item, i) => <li key={i}>{item}</li>)}</ol>
        </>
      )}

      {verificationSteps.length > 0 && (
        <>
          <h4>Verification</h4>
          <ul>{verificationSteps.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </>
      )}

      {warnings.length > 0 && (
        <div className="warnings-box">
          <h4>Warnings</h4>
          <ul>{warnings.map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      )}

      {knowledgeUsed.length > 0 && (
        <div className="knowledge-box">
          <h4>Knowledge Base Used ({knowledgeUsed.length})</h4>
          <ul>
            {knowledgeUsed.map((item, i) => (
              <li key={i}>
                {item.title}
                {item.category ? <span className="knowledge-category"> — {item.category}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
