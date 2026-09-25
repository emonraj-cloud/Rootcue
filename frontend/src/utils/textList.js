export function cleanList(arr) {
  return (arr || []).filter((item) => typeof item === 'string' && item.trim().length > 0)
}

export function stripLeadingNumbering(text) {
  return text.replace(/^\s*\d+[.)]\s*/, '')
}
