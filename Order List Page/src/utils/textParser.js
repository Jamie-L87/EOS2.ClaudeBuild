/**
 * Parses free-form text input where each line is an article code
 * with an optional feature string and optional quantity.
 *
 * Supported formats:
 *   AER1B33DW ALP G1 G1 BB BK     → code + featureString, qty 1
 *   E25FNFK-10                     → code, qty 1
 *
 * Lines shorter than 3 characters or whose first token doesn't match
 * an article code pattern are silently skipped.
 *
 * @param {string} text
 * @returns {Array<{articleCode: string, featureString: string, qty: number}>}
 */
export function parseTextInput(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const items = []

  for (const line of lines) {
    // First token = article code (alphanumeric + - _ .)
    const codeMatch = line.match(/^([A-Za-z0-9][A-Za-z0-9\-_.]{2,})(.*)$/)
    if (!codeMatch) continue

    const articleCode = codeMatch[1]
    const featureString = codeMatch[2].trim()

    items.push({ articleCode, featureString, qty: 1 })
  }

  return items
}
