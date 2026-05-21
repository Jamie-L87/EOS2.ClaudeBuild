/**
 * Parses an OBX file (pCon.planner XML export).
 * Extracts article codes, feature strings, and quantities from all bskArticle/usrArticle nodes,
 * including nested children. Feature strings are preserved for the import.
 *
 * @param {string} text — raw OBX file content
 * @returns {{ items: Array<{articleCode: string, featureString: string, qty: number}>, error?: string }}
 */
export function parseOBX(text) {
  let doc
  try {
    doc = new DOMParser().parseFromString(text, 'application/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) return { items: [], error: 'Invalid OBX file: could not parse XML.' }
  } catch {
    return { items: [], error: 'Failed to read OBX file.' }
  }

  const items = []

  function extractArticle(node) {
    // Look for a direct artNr child with type="final"
    const artNrNode = Array.from(node.children).find(
      (c) => c.tagName === 'artNr' && c.getAttribute('type') === 'final'
    )

    if (artNrNode) {
      const raw = artNrNode.textContent.trim()
      if (raw) {
        // Format is "ARTICLECODE FEATURESTRING" — preserve both parts
        const spaceIdx = raw.indexOf(' ')
        const articleCode = spaceIdx > 0 ? raw.slice(0, spaceIdx) : raw
        const featureString = spaceIdx > 0 ? raw.slice(spaceIdx + 1) : ''

        // Quantity is a sibling element — check attributes and text content
        const qtyNode = Array.from(node.children).find((c) => c.tagName === 'quantity')
        let qty = 1
        if (qtyNode) {
          for (const attr of qtyNode.attributes) {
            const v = parseInt(attr.value, 10)
            if (!isNaN(v) && v > 0) { qty = v; break }
          }
          if (qty === 1) {
            const textVal = parseInt(qtyNode.textContent.trim(), 10)
            if (!isNaN(textVal) && textVal > 0) qty = textVal
          }
        }

        if (articleCode) items.push({ articleCode, featureString, qty })
      }
    }

    // Recurse into nested article/set/folder nodes
    for (const child of node.children) {
      const tag = child.tagName
      if (tag === 'bskArticle' || tag === 'usrArticle' || tag === 'setArticle' || tag === 'bskFolder') {
        extractArticle(child)
      }
    }
  }

  const itemsNode = doc.querySelector('cutBuffer > items') ?? doc.querySelector('items')
  if (!itemsNode) return { items: [], error: 'No <items> element found in OBX file.' }

  for (const child of itemsNode.children) {
    extractArticle(child)
  }

  return { items }
}
