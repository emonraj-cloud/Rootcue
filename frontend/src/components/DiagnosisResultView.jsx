import { cleanList, stripLeadingNumbering } from '../utils/textList.js'

function toPercent(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace('%', '').trim())
    if (Number.isFinite(parsed)) return Math.round(parsed)
  }
  return null
}

function confidenceTone(percent) {
  if (percent === null) return ''
  if (percent >= 80) return 'high'
  if (percent >= 55) return 'medium'
  return 'low'
}

function Section({ title, icon, tone, children }) {
  return (
    <section className={`dx-section ${tone ? `dx-section-${tone}` : ''}`}>
      {title && (
        <h4 className="dx-section-title">
          {icon && <i className={`fa-solid ${icon}`}></i>}
          {title}
        </h4>
      )}
      {children}
    </section>
  )
}

// Shared by VisualDiagnose, Diagnose and DiagnosisDetail.
//
// Every diagnosis agent returns `problem` as a required field (see
// STRICTLY_REQUIRED_FIELDS in baseJsonAgent.js), but this view used to start at
// Root Cause, so the model's description of the problem was fetched and then
// dropped on the floor. `agentUsed` only comes back from the orchestrator, so
// everything optional is rendered conditionally rather than assumed.
export default function DiagnosisResultView({ result }) {
  if (!result) return null

  const evidence = cleanList(result.evidence).map(stripLeadingNumbering)
  const steps = cleanList(result.steps).map(stripLeadingNumbering)
  const verificationSteps = cleanList(result.verification).map(stripLeadingNumbering)
  const warnings = cleanList(result.warnings).map(stripLeadingNumbering)
  const knowledgeUsed = Array.isArray(result.knowledgeUsed) ? result.knowledgeUsed : []
  const confidence = toPercent(result.confidence)
  const hasContent =
    result.problem || result.rootCause || result.solution || evidence.length || steps.length

  if (!hasContent) {
    return (
      <div className="dx-empty">
        <i className="fa-solid fa-circle-info"></i>
        <p>The model did not return a readable diagnosis. Try again with a clearer screenshot.</p>
      </div>
    )
  }

  return (
    <div className="dx-result">
      <div className="dx-header">
        <div className="dx-header-left">
          {result.agentUsed && <span className="dx-tag">{result.agentUsed}</span>}
          <span className="dx-title">Analysis result</span>
        </div>
        {confidence !== null && (
          <span className={`dx-confidence ${confidenceTone(confidence)}`}>
            {confidence}% confidence
          </span>
        )}
      </div>

      {result.userContext && (
        <Section title="Context you supplied" icon="fa-comment" tone="cause">
          <p className="dx-problem-text">{result.userContext}</p>
        </Section>
      )}

      {result.problem && (
        <Section title="Problem" icon="fa-circle-question" tone="problem">
          <p className="dx-problem-text">{result.problem}</p>
        </Section>
      )}

      {result.rootCause && (
        <Section title="Root cause" icon="fa-bug" tone="cause">
          <p>{result.rootCause}</p>
        </Section>
      )}

      {evidence.length > 0 && (
        <Section title="Evidence" icon="fa-magnifying-glass">
          <ul>
            {evidence.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      {result.solution && (
        <Section title="Solution" icon="fa-screwdriver-wrench" tone="solution">
          <p>{result.solution}</p>
        </Section>
      )}

      {steps.length > 0 && (
        <Section title="Steps" icon="fa-list-check">
          <ol className="dx-steps">
            {steps.map((item, i) => (
              <li key={i}>
                <span className="dx-step-index">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {verificationSteps.length > 0 && (
        <Section title="How to verify the fix" icon="fa-circle-check">
          <ul>
            {verificationSteps.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      {warnings.length > 0 && (
        <Section title="Watch out" icon="fa-triangle-exclamation" tone="warning">
          <ul>
            {warnings.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Section>
      )}

      {knowledgeUsed.length > 0 && (
        <Section title={`Knowledge base used (${knowledgeUsed.length})`} icon="fa-book" tone="knowledge">
          <ul>
            {knowledgeUsed.map((item, i) => (
              <li key={i}>
                {item.title}
                {item.category ? <span className="dx-knowledge-category"> — {item.category}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
