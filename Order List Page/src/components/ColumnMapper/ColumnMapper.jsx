import { useState, useMemo } from 'react'
import { autoDetectColumns, applyColumnMapping } from '../../utils/xlsxParser'
import './ColumnMapper.css'

const ROLES = [
  { value: 'ignore',            label: 'Ignore' },
  { value: 'articleAndFeature', label: 'Code + Feature' },
  { value: 'articleCode',       label: 'Article Code' },
  { value: 'featureString',     label: 'Feature String' },
  { value: 'qty',               label: 'Quantity' },
]

const PREVIEW_ROWS = 24
const MAX_COLS = 12

/**
 * Column mapping UI shown when an unrecognised Excel file is uploaded.
 *
 * Props:
 *   sheetData  — [{ name, rows }] from xlsxParser
 *   onConfirm  — (items) => void
 *   onCancel   — () => void
 */
export function ColumnMapper({ sheetData, onConfirm, onCancel }) {
  const initialSuggestion = useMemo(() => autoDetectColumns(sheetData, 0), [sheetData])

  const [sheetIndex, setSheetIndex] = useState(0)
  const [skipRows, setSkipRows]     = useState(initialSuggestion?.skipRows ?? 1)
  const [columnRoles, setColumnRoles] = useState(initialSuggestion?.columnRoles ?? {})

  function handleSheetChange(idx) {
    const suggestion = autoDetectColumns(sheetData, idx)
    setSheetIndex(idx)
    setSkipRows(suggestion?.skipRows ?? 1)
    setColumnRoles(suggestion?.columnRoles ?? {})
  }

  function setRole(colIdx, role) {
    setColumnRoles(prev => ({ ...prev, [colIdx]: role }))
  }

  const sheet = sheetData[sheetIndex]
  const allRows = sheet.rows

  // How many non-empty columns are in the first 20 rows?
  const colCount = Math.min(
    allRows.slice(0, 20).reduce((max, row) => Math.max(max, row.length), 0),
    MAX_COLS
  )

  const previewRows = allRows.slice(0, skipRows + PREVIEW_ROWS)

  const preview = useMemo(
    () => applyColumnMapping(sheetData, sheetIndex, skipRows, columnRoles),
    [sheetData, sheetIndex, skipRows, columnRoles]
  )

  const hasSuggestion = initialSuggestion !== null

  return (
    <div className="col-mapper">
      {/* Header */}
      <div className="col-mapper__header">
        <div className="col-mapper__heading-group">
          <h3 className="col-mapper__title">Map your columns</h3>
          <p className="col-mapper__subtitle">
            {hasSuggestion
              ? "We've detected a likely layout — confirm or adjust below."
              : 'We couldn\'t recognise this file\'s format. Tell us which columns contain your article codes.'}
          </p>
        </div>
        {sheetData.length > 1 && (
          <div className="col-mapper__sheet-select">
            <label htmlFor="cm-sheet">Sheet</label>
            <select
              id="cm-sheet"
              value={sheetIndex}
              onChange={e => handleSheetChange(Number(e.target.value))}
            >
              {sheetData.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Skip rows control */}
      <div className="col-mapper__skip">
        <label htmlFor="cm-skip">
          Skip first
          <input
            id="cm-skip"
            type="number"
            min={0}
            value={skipRows}
            onChange={e => setSkipRows(Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
          row{skipRows !== 1 ? 's' : ''} (header)
        </label>
      </div>

      {/* Preview table */}
      <div className="col-mapper__table-wrap">
        <table className="col-mapper__table">
          <thead>
            <tr>
              {Array.from({ length: colCount }, (_, c) => (
                <th key={c}>
                  <select
                    value={columnRoles[c] ?? 'ignore'}
                    onChange={e => setRole(c, e.target.value)}
                    className={`col-mapper__role-select col-mapper__role-select--${columnRoles[c] ?? 'ignore'}`}
                    title={ROLES.find(r => r.value === (columnRoles[c] ?? 'ignore'))?.label}
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, ri) => (
              <tr key={ri} className={ri < skipRows ? 'col-mapper__row--skip' : ''}>
                {Array.from({ length: colCount }, (_, c) => {
                  const role = columnRoles[c]
                  const active = role && role !== 'ignore'
                  return (
                    <td
                      key={c}
                      className={active ? `col-mapper__cell--${role}` : ''}
                      title={String(row[c] ?? '')}
                    >
                      {String(row[c] ?? '')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="col-mapper__footer">
        <span className="col-mapper__count">
          {preview.length > 0
            ? <><strong>{preview.length}</strong> item{preview.length !== 1 ? 's' : ''} ready to import</>
            : <span className="col-mapper__count--none">Assign an "Article Code" or "Code + Feature" column to continue</span>
          }
        </span>
        <div className="col-mapper__actions">
          <button className="col-mapper__btn col-mapper__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="col-mapper__btn col-mapper__btn--confirm"
            onClick={() => preview.length > 0 && onConfirm(preview)}
            disabled={preview.length === 0}
          >
            Import {preview.length > 0 ? `${preview.length} item${preview.length !== 1 ? 's' : ''}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
