import * as XLSX from 'xlsx';
import { validateItem } from './validation';
import type { ValidationResult } from './validation';
import type { SuperChild } from '../data/superProducts';

export interface ParsedItem {
  articleCode: string;
  featureString: string;
  qty: number;
}

export interface SheetData {
  name: string;
  rows: unknown[][];
}

export interface ParseResult {
  items: ParsedItem[];
  error?: string | null;
  needsMapping?: boolean;
  sheetData?: SheetData[];
}

export interface BasketItem {
  id: string;
  articleCode: string;
  featureString: string;
  qty: number;
  productName: string | null;
  productLine: string | null;
  listPrice: number;
  currency: string;
  validationStatus: 'pending' | 'passed' | 'failed';
  validationError: string | null;
  isSuper?: boolean;
  superChildren?: SuperChild[] | null;
  superExpanded?: boolean;   // set on parent when expanded for export
  superParentCode?: string;  // set on component rows when parent is expanded
  // Optional enriched fields (populated on validation)
  plc?: string;
  discountPct?: number;
  description?: string;
  longDescription?: string;
  unitListPrice?: number;
  unitBuyingPrice?: number;
  leadTime?: string;
  weightKg?: number;
  volumeLtrs?: number;
  countryOfOrigin?: string;
}

export const EXTRA_EXPORT_FIELDS = [
  { key: 'plc'             as const, label: 'PLC (Product Line Code)' },
  { key: 'discountPct'     as const, label: 'Discount %'              },
  { key: 'description'     as const, label: 'Description'             },
  { key: 'longDescription' as const, label: 'Long Description'        },
  { key: 'unitListPrice'   as const, label: 'Unit List Price'         },
  { key: 'unitBuyingPrice' as const, label: 'Unit Buying Price'       },
  { key: 'totalPrice'      as const, label: 'Total Price'             },
  { key: 'leadTime'        as const, label: 'Lead Time'               },
  { key: 'weightKg'        as const, label: 'Weight (KG)'             },
  { key: 'volumeLtrs'      as const, label: 'Volume (Ltrs)'           },
  { key: 'countryOfOrigin' as const, label: 'Country of Origin'       },
] as const;

export type ExtraFieldKey = typeof EXTRA_EXPORT_FIELDS[number]['key'];

/* ========================== OBX ========================== */
export function parseOBX(text: string): ParseResult {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) return { items: [], error: 'Invalid OBX file: could not parse XML.' };
  } catch {
    return { items: [], error: 'Failed to read OBX file.' };
  }

  const items: ParsedItem[] = [];

  function extract(node: Element) {
    const artNr = Array.from(node.children).find(c => c.tagName === 'artNr' && c.getAttribute('type') === 'final');
    if (artNr) {
      const raw = artNr.textContent?.trim() ?? '';
      if (raw) {
        const sp = raw.indexOf(' ');
        const articleCode = sp > 0 ? raw.slice(0, sp) : raw;
        const featureString = sp > 0 ? raw.slice(sp + 1) : '';
        const qtyNode = Array.from(node.children).find(c => c.tagName === 'quantity');
        let qty = 1;
        if (qtyNode) {
          for (const attr of Array.from(qtyNode.attributes)) {
            const v = parseInt(attr.value, 10);
            if (!isNaN(v) && v > 0) { qty = v; break; }
          }
          if (qty === 1) {
            const tv = parseInt(qtyNode.textContent?.trim() ?? '', 10);
            if (!isNaN(tv) && tv > 0) qty = tv;
          }
        }
        if (articleCode) items.push({ articleCode, featureString, qty });
      }
    }
    for (const c of Array.from(node.children)) {
      if (['bskArticle', 'usrArticle', 'setArticle', 'bskFolder'].includes(c.tagName)) extract(c);
    }
  }

  const root = doc.querySelector('cutBuffer > items') || doc.querySelector('items');
  if (!root) return { items: [], error: 'No <items> element found in OBX file.' };
  for (const c of Array.from(root.children)) extract(c);
  return { items };
}

/* ========================== SIF ========================== */
export function parseSIF(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length || !lines[0].startsWith('SF=')) {
    return { items: [], error: 'Invalid SIF file: expected "SF=" on the first line.' };
  }
  const items: ParsedItem[] = [];
  let code: string | null = null, feat = '', qty = 1;
  const flush = () => {
    if (code) { items.push({ articleCode: code, featureString: feat, qty }); code = null; feat = ''; qty = 1; }
  };
  for (const line of lines) {
    if (line.startsWith('SF=') || line.startsWith('SL=')) { flush(); continue; }
    if (line.startsWith('PN=')) { flush(); code = line.slice(3).trim(); feat = ''; }
    else if (line.startsWith('ON=')) { feat += line.slice(3).trim(); }
    else if (line.startsWith('QT=')) { const v = parseInt(line.slice(3).trim(), 10); if (!isNaN(v) && v > 0) qty = v; }
  }
  flush();
  return { items };
}

/* ========================== Text paste ========================== */
export function parseTextInput(text: string): ParsedItem[] {
  const lines = text.split(/[\r\n,]+/).map(l => l.trim()).filter(Boolean);
  const out: ParsedItem[] = [];
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9][A-Za-z0-9\-_.]{2,})(.*)$/);
    if (!m) continue;
    out.push({ articleCode: m[1], featureString: m[2].trim(), qty: 1 });
  }
  return out;
}

/* ========================== XLSX ========================== */
const ARTICLE_CODE_RE = /^[A-Z][A-Z0-9\-_.]{2,}$/i;
// Article-code headers are scored rather than last-match-wins: several of our own
// export columns ("PLC (Product Line Code)", "Product Name") contain article
// keywords and would otherwise be mistaken for the code column on re-import.
const ARTICLE_STRONG  = ['article code', 'article', 'item code', 'item no', 'item', 'sku', 'part no', 'material'];
const ARTICLE_WEAK    = ['product', 'code', 'ref'];
const ARTICLE_EXCLUDE = [
  'plc', 'product line', 'line code', 'product name', 'description',
  'price', 'total', 'discount', 'currency', 'lead time', 'weight', 'volume', 'country',
];
const QTY_KW    = ['qty', 'quantity', 'amount', 'units', 'count'];
const FEAT_KW   = ['feature', 'config', 'option', 'spec', 'string'];

function parseLineItemsSheet(sheet: XLSX.WorkSheet): ParseResult {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  const items: ParsedItem[] = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const articleCode = String(row[0] ?? '').trim();
    if (!articleCode) continue;
    const featureString = String(row[1] ?? '').trim();
    const rawQty = row[2];
    const parsedQty = typeof rawQty === 'number' ? Math.round(rawQty) : parseInt(String(rawQty), 10);
    const qty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;
    items.push({ articleCode, featureString, qty });
  }
  return { items };
}

export function parseXLSX(arrayBuffer: ArrayBuffer): ParseResult {
  let workbook: XLSX.WorkBook;
  try { workbook = XLSX.read(arrayBuffer, { type: 'array' }); }
  catch (_e: unknown) { return { items: [], error: 'Could not read the Excel file. Ensure it is a valid .xlsx file.' }; }

  const lineSheet = workbook.Sheets['LineItems'];
  if (lineSheet) return parseLineItemsSheet(lineSheet);

  if (workbook.Sheets['Customer Details']) {
    return { items: [], error: 'This is a Customer import template. To import customers, use the Customers page.' };
  }

  const sheetData: SheetData[] = workbook.SheetNames.map(name => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }) as unknown[][],
  }));
  return { items: [], needsMapping: true, sheetData };
}

/* ========================== CSV ========================== */
// Excel writes CSVs with a semicolon separator in most European locales, so
// sniff the delimiter from the header line rather than assuming a comma.
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semis  = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs   = (firstLine.match(/\t/g) || []).length;
  if (tabs > semis && tabs > commas) return '\t';
  return semis > commas ? ';' : ',';
}

export function parseCSV(text: string): ParseResult {
  if (!text.trim()) return { items: [], error: 'The CSV file is empty.' };

  let workbook: XLSX.WorkBook;
  try { workbook = XLSX.read(text, { type: 'string', FS: detectDelimiter(text) }); }
  catch (_e: unknown) { return { items: [], error: 'Could not read the CSV file. Ensure it is a valid .csv file.' }; }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { items: [], error: 'No data found in the CSV file.' };

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' }) as unknown[][];
  if (!rows.length) return { items: [], error: 'No data found in the CSV file.' };

  // Route through the same column-mapping flow as Excel, so auto-detection and
  // the manual mapper are shared rather than duplicated.
  return { items: [], needsMapping: true, sheetData: [{ name: 'CSV', rows }] };
}

// Exported super products write their components as indented "└ CODE" rows.
// Those are re-fetched from PDM on import, so they must never be read back in.
const SUPER_COMPONENT_RE = /^\s*[└├]/;

export function applyColumnMapping(
  sheetData: SheetData[],
  sheetIndex: number,
  skipRows: number,
  columnRoles: Record<string, string>,
): ParsedItem[] {
  const rows = sheetData[sheetIndex].rows.slice(skipRows);
  const items: ParsedItem[] = [];
  for (const row of rows) {
    const rowArr = row as unknown[];
    if (rowArr.some(c => SUPER_COMPONENT_RE.test(String(c ?? '')))) continue;
    let code = '', feat = '', qty = 1;
    for (const [colStr, role] of Object.entries(columnRoles)) {
      const idx = parseInt(colStr, 10);
      const cell = String(rowArr[idx] ?? '').trim();
      if (!cell) continue;
      if (role === 'articleAndFeature') {
        const sp = cell.indexOf(' ');
        if (sp > 0) { code = cell.slice(0, sp).trim(); feat = cell.slice(sp + 1).trim(); }
        else code = cell;
      } else if (role === 'articleCode') code = cell;
      else if (role === 'featureString') feat = feat ? `${feat} ${cell}` : cell;
      else if (role === 'qty') { const n = parseFloat(cell); if (!isNaN(n) && n > 0) qty = Math.round(n); }
    }
    if (code.length >= 3) items.push({ articleCode: code, featureString: feat, qty });
  }
  return items;
}

export function autoDetectColumns(
  sheetData: SheetData[],
  sheetIndex: number,
): { skipRows: number; columnRoles: Record<string, string> } | null {
  const rows = sheetData[sheetIndex]?.rows ?? [];
  if (rows.length < 1) return null;

  for (let hRow = 0; hRow <= Math.min(2, rows.length - 2); hRow++) {
    const header = rows[hRow] as unknown[];
    let articleCol = -1, featCol = -1, qtyCol = -1, articleScore = 0;
    for (let c = 0; c < header.length; c++) {
      const h = String(header[c] ?? '').toLowerCase().trim();
      if (!h) continue;
      if (QTY_KW.some(kw => h.includes(kw)))  { if (qtyCol  === -1) qtyCol  = c; continue; }
      if (FEAT_KW.some(kw => h.includes(kw))) { if (featCol === -1) featCol = c; continue; }
      if (ARTICLE_EXCLUDE.some(kw => h.includes(kw))) continue;
      const score = ARTICLE_STRONG.some(kw => h.includes(kw)) ? 3
                  : ARTICLE_WEAK.some(kw => h.includes(kw))   ? 1
                  : 0;
      if (score > articleScore) { articleScore = score; articleCol = c; }
    }
    if (articleCol === -1) {
      for (let c = 0; c < Math.min(header.length, 8); c++) {
        const matches = rows.slice(hRow + 1, hRow + 7).filter(r => {
          const cell = String((r as unknown[])[c] ?? '').trim();
          return cell && ARTICLE_CODE_RE.test(cell.split(' ')[0]);
        }).length;
        if (matches >= 2) { articleCol = c; break; }
      }
    }
    if (articleCol === -1) continue;

    const hasCombined = rows.slice(hRow + 1, hRow + 7).some(r => {
      const cell = String((r as unknown[])[articleCol] ?? '').trim();
      return cell.includes(' ') && ARTICLE_CODE_RE.test(cell.split(' ')[0]);
    });
    const columnRoles: Record<string, string> = {};
    if (hasCombined && featCol === -1) columnRoles[articleCol] = 'articleAndFeature';
    else {
      columnRoles[articleCol] = 'articleCode';
      if (featCol !== -1) columnRoles[featCol] = 'featureString';
    }
    if (qtyCol !== -1) columnRoles[qtyCol] = 'qty';

    const got = applyColumnMapping(sheetData, sheetIndex, hRow + 1, columnRoles);
    if (got.length > 0) return { skipRows: hRow + 1, columnRoles };
  }
  return null;
}

/* ========================== Exports ========================== */
function resolveExtraField(item: BasketItem, key: ExtraFieldKey): string | number {
  if (key === 'totalPrice') {
    const buying = item.unitBuyingPrice ?? item.listPrice;
    return parseFloat((buying * item.qty).toFixed(2));
  }
  const val = (item as unknown as Record<string, unknown>)[key];
  return val !== undefined && val !== null ? (val as string | number) : '';
}

export function exportOBX(items: BasketItem[]): string {
  const lines: string[] = ['<?xml version="1.0" encoding="utf-8"?>', '<cutBuffer>', '  <items>'];
  for (const item of items) {
    if (item.superParentCode) continue; // OBX uses parent article code only
    const artNr = item.featureString ? `${item.articleCode} ${item.featureString}` : item.articleCode;
    lines.push('    <bskArticle>');
    lines.push(`      <artNr type="final">${artNr}</artNr>`);
    lines.push(`      <quantity>${item.qty}</quantity>`);
    lines.push(`      <listPrice currency="${item.currency || 'GBP'}">${item.listPrice}</listPrice>`);
    lines.push('    </bskArticle>');
  }
  lines.push('  </items>', '</cutBuffer>');
  return lines.join('\n');
}

function csvCell(val: string | number): string {
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCSV(items: BasketItem[], extraFields: ExtraFieldKey[] = []): string {
  const extraLabels = extraFields.map(k => EXTRA_EXPORT_FIELDS.find(f => f.key === k)!.label);
  const header = ['Article Code', 'Qty', ...extraLabels];
  const rows = items.map(i => [
    i.superParentCode ? `  └ ${i.articleCode}` : i.articleCode,
    i.qty,
    ...extraFields.map(k => resolveExtraField(i, k)),
  ]);
  return [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

export function exportJSON(items: BasketItem[], extraFields: ExtraFieldKey[] = []): string {
  return JSON.stringify(
    items.map(i => {
      const base: Record<string, unknown> = { articleCode: i.articleCode, qty: i.qty };
      if (i.superExpanded) base.type = 'super-product';
      else if (i.superParentCode) { base.type = 'component'; base.superParentCode = i.superParentCode; }
      for (const k of extraFields) base[k] = resolveExtraField(i, k);
      return base;
    }),
    null, 2,
  );
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Column metadata for extra fields: width (chars) + optional numFmt + alignment
const EXTRA_COL_META: Partial<Record<ExtraFieldKey, { width: number; numFmt?: string; align?: 'left' | 'right' | 'center' }>> = {
  plc:             { width: 16 },
  discountPct:     { width: 12, numFmt: '0"%"',     align: 'right' },
  description:     { width: 26 },
  longDescription: { width: 42 },
  unitListPrice:   { width: 18, numFmt: '#,##0.00', align: 'right' },
  unitBuyingPrice: { width: 18, numFmt: '#,##0.00', align: 'right' },
  totalPrice:      { width: 18, numFmt: '#,##0.00', align: 'right' },
  leadTime:        { width: 14 },
  weightKg:        { width: 12, numFmt: '0.0',      align: 'right' },
  volumeLtrs:      { width: 12, numFmt: '0.0',      align: 'right' },
  countryOfOrigin: { width: 20 },
};

export async function exportXLSXBlob(items: BasketItem[], extraFields: ExtraFieldKey[] = []): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EOS Cloud';
  const ws = wb.addWorksheet('Line_Details');

  // ── Column widths ──────────────────────────────────────────────────
  const stdColWidths = [5, 42, 8];
  const extraColWidths = extraFields.map(k => EXTRA_COL_META[k]?.width ?? 18);
  ws.columns = [...stdColWidths, ...extraColWidths].map((width, i) => ({ key: `c${i}`, width }));

  // ── Freeze header row ──────────────────────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2' }];

  const INK      = 'FF252525';
  const INK2     = 'FF616161';
  const WHITE    = 'FFFFFFFF';
  const LINE     = 'FFEBEBEB';
  const SUPER_BG = 'FFDCE7EF'; // Blue-10 — expanded super product parent rows
  const COMP_BG  = 'FFF3F5F5'; // Blue-5  — component rows

  type HAlign = 'left' | 'right' | 'center';
  const stdAligns: HAlign[] = ['center', 'left', 'center'];
  const extraAligns: HAlign[] = extraFields.map(k => EXTRA_COL_META[k]?.align ?? 'left');
  const colAligns = [...stdAligns, ...extraAligns];

  const extraLabels = extraFields.map(k => EXTRA_EXPORT_FIELDS.find(f => f.key === k)!.label);
  const headers = ['#', 'Article Code', 'Qty', ...extraLabels];

  // ── Header row ─────────────────────────────────────────────────────
  const hRow = ws.addRow(headers);
  hRow.height = 22;
  hRow.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
    cell.font   = { bold: true, color: { argb: WHITE }, size: 10.5, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: colAligns[col - 1] ?? 'left' };
  });

  // ── Data rows ──────────────────────────────────────────────────────
  const thinLine = { style: 'thin' as const, color: { argb: LINE } };
  const dataBorder = { top: thinLine, left: thinLine, bottom: thinLine, right: thinLine };

  items.forEach((item, i) => {
    const isParent = !!item.superExpanded;
    const isComp   = !!item.superParentCode;
    const articleCodeDisplay = isComp ? `  └ ${item.articleCode}` : item.articleCode;
    const values: (string | number)[] = [
      i + 1, articleCodeDisplay, item.qty,
      ...extraFields.map(k => resolveExtraField(item, k)),
    ];
    const row = ws.addRow(values);
    row.height = isParent ? 20 : 18;
    const rowBg = isParent ? SUPER_BG : isComp ? COMP_BG : null;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font      = { size: 10.5, name: 'Calibri', bold: isParent, color: { argb: isComp ? INK2 : INK } };
      cell.alignment = { vertical: 'middle', horizontal: colAligns[col - 1] ?? 'left' };
      cell.border    = dataBorder;
      if (rowBg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      const extraIdx = col - 4; // 0-based index into extraFields
      if (col === 3) cell.numFmt = '0'; // Qty
      else if (extraIdx >= 0 && extraFields[extraIdx]) {
        const fmt = EXTRA_COL_META[extraFields[extraIdx]]?.numFmt;
        if (fmt) cell.numFmt = fmt;
      }
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf as ArrayBuffer], { type: XLSX_MIME });
}

export function expandSuperItems(items: BasketItem[]): BasketItem[] {
  const out: BasketItem[] = [];
  for (const item of items) {
    if (item.isSuper && item.superChildren?.length) {
      const parentCode = item.featureString
        ? `${item.articleCode} ${item.featureString}`
        : item.articleCode;
      out.push({ ...item, superExpanded: true });
      for (const child of item.superChildren) {
        out.push({
          id: `${item.id}-${child.articleCode}`,
          articleCode: child.articleCode,
          featureString: child.featureString,
          qty: child.qty * item.qty,
          productName: child.shortDescription,
          productLine: item.productLine,
          listPrice: child.listPrice,
          currency: child.currency ?? item.currency,
          validationStatus: 'passed',
          validationError: null,
          superParentCode: parentCode,
        });
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

/* ========================== Basket validation ========================== */
export async function validateBasketItems(
  items: BasketItem[],
  onResult: (r: { id: string; result: ValidationResult }) => void,
): Promise<void> {
  for (const it of items) {
    await new Promise<void>(resolve => setTimeout(resolve, 80));
    onResult({ id: it.id, result: validateItem(it.articleCode, it.featureString) });
  }
}
