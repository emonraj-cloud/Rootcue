import { generateStructuredJson } from '../utils/generateStructuredJson.js'
import { getKnowledgeContextForProblem } from '../services/rag/retrieve.js'

const STRICTLY_REQUIRED_FIELDS = ['problem', 'rootCause', 'confidence', 'solution']
const LIST_FIELDS_WITH_DEFAULTS = ['evidence', 'steps', 'verification', 'warnings']

// Pure prompt builder (exported so it can be unit tested).
// When knowledgeText is empty the prompt is identical to the
// original non-RAG prompt, so behavior never regresses.
export function buildDiagnosisPrompt(problem, expertiseDescription, knowledgeText = '') {
  const knowledgeSection = knowledgeText
    ? `

Internal knowledge base entries that may be relevant to this problem:
---
${knowledgeText}
---

Use the knowledge above ONLY where it is actually relevant to the problem. If it does not fit, ignore it and rely on your own expertise.
`
    : ''

  return `You are ${expertiseDescription}.

A user reports this problem:
"${problem}"
${knowledgeSection}
Respond with ONLY a single valid JSON object. No markdown, no code fences, no text before or after it. The JSON object must have exactly these fields:

{
  "problem": "restate the problem in one sentence",
  "rootCause": "the most likely root cause",
  "confidence": 0-100 (a number, your confidence in this diagnosis),
  "evidence": ["short evidence point 1", "short evidence point 2"],
  "solution": "a short summary of the fix",
  "steps": ["step 1", "step 2", "step 3"],
  "verification": ["how to confirm the fix worked"],
  "warnings": ["anything the user should be careful about, or an empty array if none"]
}`
}

export async function runJsonDiagnosisAgent(problem, expertiseDescription, userId = null) {
  // RAG step: fetch relevant knowledge base chunks for this problem.
  // Scoped to this user's documents plus shared ones.
  // Fail-safe: on any error (DB down, Ollama down, empty knowledge base)
  // this returns { text: '', sources: [] } and diagnosis continues normally.
  const knowledge = await getKnowledgeContextForProblem(problem, 3, userId)

  const prompt = buildDiagnosisPrompt(problem, expertiseDescription, knowledge.text)

  const { parsed, raw } = await generateStructuredJson(prompt)

  const missing = STRICTLY_REQUIRED_FIELDS.filter((field) => !(field in parsed))
  if (missing.length > 0) {
    const error = new Error(`AI response is missing required fields: ${missing.join(', ')}`)
    error.rawResponse = raw
    throw error
  }

  for (const field of LIST_FIELDS_WITH_DEFAULTS) {
    if (!(field in parsed) || !Array.isArray(parsed[field])) {
      parsed[field] = []
    }
  }

  // Attach which knowledge documents were used so the UI can show them.
  parsed.knowledgeUsed = knowledge.sources

  return parsed
}
