import * as XLSX from 'xlsx'

const ARTICLE_CODE_RE = /^[A-Z][A-Z0-9\-_.]{2,}$/i
const ARTICLE_KW = ['article', 'item', 'product', 'code', 'sku', 'part no', 'ref', 'material']
const QTY_KW    = ['qty', 'quantity', 'amount', 'units', 'count']
const FEAT_KW   = ['feature', 'config', 'option', 'spec', 'string']

/**
 * Main entry point.
 * Returns one of:
 *   { items }                           — successfully parsed known template
 *   { items: [], needsMapping, sheetData } — unknown format, needs column mapping UI
 *   { items: [], error }                — unrecoverable error
 */
export function parseXLSX(arrayBuffer) {
  let workbook
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array' })
  } catch {
    return { items: [], error: 'Could not read the Excel file. Ensure it is a valid .xlsx file.' }
  }

  const lineSheet = workbook.Sheets['LineItems']
  if (lineSheet) return parseLineItemsSheet(lineSheet)

  if (workbook.Sheets['Customer Details']) {
    return {
      items: [],
      error: 'This is a Customer import template. To import customers, use the Customers page.',
    }
  }

  // Unknown format — extract raw sheet data and surface the column mapper
  const sheetData = workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }),
  }))

  return { items: [], needsMapping: true, sheetData }
}

/**
 * Apply a user-defined column mapping to raw sheet data.
 *
 * @param {{ name: string, rows: any[][] }[]} sheetData
 * @param {number} sheetIndex
 * @param {number} skipRows  — number of leading rows to skip as headers
 * @param {Object<string, string>} columnRoles — { colIndex: role }
 *   roles: 'articleAndFeature' | 'articleCode' | 'featureString' | 'qty' | 'ignore'
 * @returns {Array<{articleCode: string, featureString: string, qty: number}>}
 */
export function applyColumnMapping(sheetData, sheetIndex, skipRows, columnRoles) {
  const rows = sheetData[sheetIndex].rows.slice(skipRows)
  const items = []

  for (const row of rows) {
    let articleCode = ''
    let featureString = ''
    let qty = 1

    for (const [colStr, role] of Object.entries(columnRoles)) {
      const colIdx = parseInt(colStr, 10)
      const cell = String(row[colIdx] ?? '').trim()
      if (!cell) continue

      if (role === 'articleAndFeature') {
        const spaceIdx = cell.indexOf(' ')
        if (spaceIdx > 0) {
          articleCode = cell.slice(0, spaceIdx).trim()
          featureString = cell.slice(spaceIdx + 1).trim()
        } else {
          articleCode = cell
        }
      } else if (role === 'articleCode') {
        articleCode = cell
      } else if (role === 'featureString') {
        featureString = featureString ? `${featureString} ${cell}` : cell
      } else if (role === 'qty') {
        const n = parseFloat(cell)
        if (!isNaN(n) && n > 0) qty = Math.round(n)
      }
    }

    if (articleCode.length >= 3) {
      items.push({ articleCode, featureString, qty })
    }
  }

  return items
}

/**
 * Try to auto-detect which columns contain article codes and quantities.
 * Returns { skipRows, columnRoles } suggestion, or null if detection fails.
 */
export function autoDetectColumns(sheetData, sheetIndex) {
  const rows = sheetData[sheetIndex]?.rows ?? []
  if (rows.length < 1) return null

  for (let hRow = 0; hRow <= Math.min(2, rows.length - 2); hRow++) {
    const header = rows[hRow]
    let articleCol = -1, featCol = -1, qtyCol = -1

    for (let c = 0; c < header.length; c++) {
      const h = String(header[c] ?? '').toLowerCase().trim()
      if (!h) continue
      if (ARTICLE_KW.some(kw => h.includes(kw))) articleCol = c
      else if (FEAT_KW.some(kw => h.includes(kw))) featCol = c
      else if (QTY_KW.some(kw => h.includes(kw))) qtyCol = c
    }

    // Fallback: find columns where data looks like article codes
    if (articleCol === -1) {
      for (let c = 0; c < Math.min(header.length, 8); c++) {
        const matches = rows.slice(hRow + 1, hRow + 7)
          .filter(r => {
            const cell = String(r[c] ?? '').trim()
            return cell && ARTICLE_CODE_RE.test(cell.split(' ')[0])
          }).length
        if (matches >= 2) { articleCol = c; break }
      }
    }

    if (articleCol === -1) continue

    // Detect if article column has combined code + feature string
    const hasCombined = rows.slice(hRow + 1, hRow + 7).some(r => {
      const cell = String(r[articleCol] ?? '').trim()
      return cell.includes(' ') && ARTICLE_CODE_RE.test(cell.split(' ')[0])
    })

    const columnRoles = {}
    if (hasCombined && featCol === -1) {
      columnRoles[articleCol] = 'articleAndFeature'
    } else {
      columnRoles[articleCol] = 'articleCode'
      if (featCol !== -1) columnRoles[featCol] = 'featureString'
    }
    if (qtyCol !== -1) columnRoles[qtyCol] = 'qty'

    // Verify we actually get items
    const got = applyColumnMapping(sheetData, sheetIndex, hRow + 1, columnRoles)
    if (got.length > 0) return { skipRows: hRow + 1, columnRoles }
  }

  return null
}

// --- Internal ---

function parseLineItemsSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const items = []

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i]
    const articleCode = String(row[0] ?? '').trim()
    if (!articleCode) continue

    const featureString = String(row[1] ?? '').trim()
    const rawQty = row[2]
    const parsedQty = typeof rawQty === 'number' ? Math.round(rawQty) : parseInt(String(rawQty), 10)
    const qty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1

    items.push({ articleCode, featureString, qty })
  }

  return { items }
}
