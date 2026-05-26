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
}

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
const ARTICLE_KW = ['article', 'item', 'product', 'code', 'sku', 'part no', 'ref', 'material'];
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
    let articleCol = -1, featCol = -1, qtyCol = -1;
    for (let c = 0; c < header.length; c++) {
      const h = String(header[c] ?? '').toLowerCase().trim();
      if (!h) continue;
      if (ARTICLE_KW.some(kw => h.includes(kw))) articleCol = c;
      else if (FEAT_KW.some(kw => h.includes(kw))) featCol = c;
      else if (QTY_KW.some(kw => h.includes(kw))) qtyCol = c;
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

/* ========================== OBX export ========================== */
export function exportOBX(items: BasketItem[]): string {
  const lines: string[] = ['<?xml version="1.0" encoding="utf-8"?>', '<cutBuffer>', '  <items>'];
  for (const item of items) {
    const artNr = item.featureString ? `${item.articleCode} ${item.featureString}` : item.articleCode;
    lines.push('    <bskArticle>');
    lines.push(`      <artNr type="final">${artNr}</artNr>`);
    lines.push(`      <quantity>${item.qty}</quantity>`);
    lines.push('    </bskArticle>');
  }
  lines.push('  </items>', '</cutBuffer>');
  return lines.join('\n');
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
