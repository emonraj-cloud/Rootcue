import { generateStructuredJson } from '../utils/generateStructuredJson.js'

const STRICTLY_REQUIRED_FIELDS = ['problem', 'explanation', 'correctedCode']
const LIST_FIELDS_WITH_DEFAULTS = ['changes', 'verification']

function buildPrompt(code, error) {
  return `Fix broken code. Respond with ONLY a JSON object, nothing else, no explanation before or after it.

Example:
Code: function add(a, b) { retrun a + b; }
Error: SyntaxError: Unexpected token
JSON: {"problem": "Typo in the return keyword", "explanation": "retrun is misspelled, it should be return", "correctedCode": "function add(a, b) { return a + b; }", "changes": ["Fixed typo: retrun to return"], "verification": ["Call add(2, 3) and check it returns 5"]}

Now fix this one the same way:
Code: ${code}
Error: ${error}
JSON:`
}

export async function runCodeFixAgent(code, error) {
  const { parsed, raw } = await generateStructuredJson(buildPrompt(code, error))

  const missing = STRICTLY_REQUIRED_FIELDS.filter((field) => !(field in parsed))
  if (missing.length > 0) {
    const err = new Error(`AI response is missing required fields: ${missing.join(', ')}`)
    err.rawResponse = raw
    throw err
  }

  for (const field of LIST_FIELDS_WITH_DEFAULTS) {
    if (!(field in parsed) || !Array.isArray(parsed[field])) {
      parsed[field] = []
    }
  }

  return parsed
}
