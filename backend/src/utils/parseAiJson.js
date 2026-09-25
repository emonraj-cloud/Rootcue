export function parseAiJson(rawText) {
  let cleaned = rawText.trim()

  cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '').trim()

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')

  if (start === -1 || end === -1) {
    const error = new Error('AI response did not contain a JSON object')
    error.rawResponse = rawText
    throw error
  }

  const jsonSlice = cleaned.slice(start, end + 1)

  try {
    return JSON.parse(jsonSlice)
  } catch (err) {
    const error = new Error('AI response was not valid JSON')
    error.rawResponse = rawText
    throw error
  }
}
