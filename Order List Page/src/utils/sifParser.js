/**
 * Parses a SIF file (Herman Miller OrderPlace format).
 * Reads PN= (product number), ON= (options/features), and QT= (quantity) pairs.
 * Feature strings are built by concatenating all ON= lines with no delimiter.
 * PL=, CN= and other fields are intentionally ignored.
 *
 * @param {string} text — raw SIF file content
 * @returns {{ items: Array<{articleCode: string, featureString: string, qty: number}>, error?: string }}
 */
export function parseSIF(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  if (!lines.length || !lines[0].startsWith('SF=')) {
    return { items: [], error: 'Invalid SIF file: expected "SF=" on the first line.' }
  }

  const items = []
  let currentCode = null
  let currentFeature = ''
  let currentQty = 1

  function flush() {
    if (currentCode) {
      items.push({ articleCode: currentCode, featureString: currentFeature, qty: currentQty })
      currentCode = null
      currentFeature = ''
      currentQty = 1
    }
  }

  for (const line of lines) {
    if (line.startsWith('SF=') || line.startsWith('SL=')) {
      flush()
      continue
    }

    if (line.startsWith('PN=')) {
      flush()
      // Extract article code (entire value, no feature parsing on this line)
      currentCode = line.slice(3).trim()
      currentFeature = ''
    } else if (line.startsWith('ON=')) {
      // Append ON= value to feature string (concatenate with no delimiter)
      const optionValue = line.slice(3).trim()
      currentFeature += optionValue
    } else if (line.startsWith('QT=')) {
      const v = parseInt(line.slice(3).trim(), 10)
      if (!isNaN(v) && v > 0) currentQty = v
    }
    // PL= price, CN= contract — intentionally ignored
  }

  flush() // capture the last item

  return { items }
}
