import { generateStructuredJson } from '../utils/generateStructuredJson.js'

const STRICTLY_REQUIRED_FIELDS = ['problem', 'explanation', 'correctedCode']
const LIST_FIELDS_WITH_DEFAULTS = ['changes', 'verification']

// A pasted stack trace can be enormous. A 0.8B model has a small context
// window, and blowing through it does not degrade gracefully, it returns
// something unusable, so the code is trimmed from the middle and the error
// from the end, keeping the frames that name the failure.
const MAX_CODE_CHARS = 6000
const MAX_ERROR_CHARS = 1500

function truncateCode(code) {
  if (code.length <= MAX_CODE_CHARS) return code
  const head = code.slice(0, Math.floor(MAX_CODE_CHARS * 0.7))
  const tail = code.slice(-Math.floor(MAX_CODE_CHARS * 0.3))
  const dropped = code.length - MAX_CODE_CHARS
  return `${head}\n/* ... ${dropped} characters omitted ... */\n${tail}`
}

function truncateError(error) {
  if (error.length <= MAX_ERROR_CHARS) return error
  return `${error.slice(0, MAX_ERROR_CHARS)}\n... (truncated)`
}

// Without this the model anchored on the JavaScript example and happily
// returned JavaScript for a pasted Python or SQL snippet.
function detectLanguage(code) {
  const c = code
  if (/^\s*(import\s+\w+|from\s+[\w.]+\s+import|def\s+\w+\s*\(|class\s+\w+.*:\s*$)/m.test(c) || /print\(/.test(c))
    return 'Python'
  if (/(^|\n)\s*(package\s+main|func\s+\w+\s*\()/.test(c) || /:=|fmt\./.test(c)) return 'Go'
  if (/(^|\n)\s*(public|private|protected)\s+[\w<>\[\]]+\s+\w+\s*\(/.test(c) || /System\.out\.println/.test(c))
    return 'Java'
  if (/(^|\n)\s*(const|let|var)\s+[\w]+\s*=|=>\s*\(|require\(/.test(c)) return 'JavaScript'
  if (/(^|\n)\s*(def\s|end\b|puts\b)/.test(c) && /#\{/.test(c)) return 'Ruby'
  if (/(^|\n)\s*(<\?php|echo\s)/.test(c) || /\$\w+\s*=/.test(c)) return 'PHP'
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE)\b/im.test(c)) return 'SQL'
  if (/(^|\n)\s*(fn\s+\w+|use\s+std::|let\s+mut\s)/.test(c)) return 'Rust'
  if (/(^|\n)\s*(async\s+def\s+\w+|@app\.route|self\.\w+\s*=)/.test(c)) return 'Python'
  if (/(^|\n)\s*(function|class|def)\s|console\.log\(/.test(c)) return 'JavaScript'
  return 'unknown'
}

function buildPrompt(code, error, language) {
  return `You fix broken code. You reply with a single JSON object and nothing else.

The code is ${language}. Return the corrected code in the same language and keep its original style, comments and formatting where possible. Change only what causes the error.

Respond with ONLY this JSON shape, no markdown and no text around it:
{"problem": "one sentence naming the bug", "explanation": "one or two sentences on why it is wrong", "correctedCode": "the full corrected code", "changes": ["each change you made"], "verification": ["how to confirm it works"]}

Worked example:
Code: function add(a, b) { retrun a + b; }
Error: SyntaxError: Unexpected token
JSON: {"problem": "Typo in the return keyword", "explanation": "retrun is misspelled, it should be return", "correctedCode": "function add(a, b) { return a + b; }", "changes": ["Fixed typo: retrun to return"], "verification": ["Call add(2, 3) and check it returns 5"]}

Now fix this one.

--- CODE ---
${truncateCode(code)}
--- ERROR ---
${truncateError(error)}
--- END ---
JSON:`
}

export async function runCodeFixAgent(code, error, maxAttempts = 3) {
  const language = detectLanguage(code)
  const prompt = buildPrompt(code, error, language)
  let lastError

  // generateStructuredJson already retries on unparsable output, but it
  // returns as soon as the JSON parses. Valid JSON that is missing
  // correctedCode used to fail straight through to a 502 with no second
  // chance, so validation failures are retried here too.
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { parsed, raw } = await generateStructuredJson(prompt, 1)

    const missing = STRICTLY_REQUIRED_FIELDS.filter((field) => !(field in parsed))
    if (missing.length === 0) {
      for (const field of LIST_FIELDS_WITH_DEFAULTS) {
        if (!(field in parsed) || !Array.isArray(parsed[field])) {
          parsed[field] = []
        }
      }
      // The frontend needs this to name the download and to warn when the
      // model answered in a different language than the paste.
      parsed.language = language
      return parsed
    }

    lastError = new Error(`AI response is missing required fields: ${missing.join(', ')}`)
    lastError.rawResponse = raw
    console.warn(
      `Code fix agent response missing ${missing.join(', ')} on attempt ${attempt}/${maxAttempts}, retrying...`
    )
  }

  throw lastError
}
