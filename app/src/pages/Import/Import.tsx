import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import {
  IconChevronRight, IconUpload, IconCheck, IconClose,
  IconPlus, IconMinus, IconEdit, IconCopy, IconTrash,
} from '../../components/Icons';
import { t } from '../../tokens';
import {
  parseOBX, parseSIF, parseTextInput, parseXLSX,
  applyColumnMapping, autoDetectColumns, validateBasketItems,
  exportOBX, exportCSV, exportJSON, exportXLSXBlob,
} from '../../services/parsers';
import { CONTRACTS, PRODUCT_LINE_PLCS, getContractDiscount } from '../../data/contracts';
import type { Contract } from '../../data/contracts';

type ExportFormat = 'obx' | 'csv' | 'xlsx' | 'json';
import type { ParsedItem, SheetData, BasketItem } from '../../services/parsers';
import type { SuperChild } from '../../data/superProducts';
import { upsert } from '../../services/orderStore';
import type { StoredOrder } from '../../services/orderStore';

/* ------------------------------------------------------------------ */
/*  Token shorthands                                                    */
/* ------------------------------------------------------------------ */
const sBody   = { ...t.body   };
const sBodyB  = { ...t.bodyB  };
const sLargeB = { ...t.largeB };

const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' };
function formatPrice(n: number, ccy = 'EUR') {
  return (CURRENCY_SYMBOLS[ccy] ?? ccy + ' ') + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itemContractPrice(item: BasketItem, contract: Contract): number | null {
  if (!item.productLine || item.listPrice <= 0) return null;
  const plc = PRODUCT_LINE_PLCS[item.productLine]?.plc;
  if (!plc) return null;
  const disc = getContractDiscount(contract, plc);
  if (disc === null) return null;
  return item.listPrice * (1 - disc / 100);
}

/* ------------------------------------------------------------------ */
/*  File drop zone accept map                                           */
/* ------------------------------------------------------------------ */
const ACCEPT_MAP: Record<string, string> = {
  '.obx':  'OBX',
  '.sif':  'SIF',
  '.xlsx': 'Excel',
};
const ACCEPTED_EXT = Object.keys(ACCEPT_MAP).join(',');

interface FileParseEvent {
  items: ParsedItem[];
  error?: string | null;
  needsMapping?: boolean;
  sheetData?: SheetData[];
  fileName?: string | null;
  format?: string;
}

/* ------------------------------------------------------------------ */
/*  PAGE HEADER                                                         */
/* ------------------------------------------------------------------ */
function PageHeader() {
  return (
    <div style={{ padding: '32px 0 8px' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }} aria-label="Breadcrumb">
        <span style={{ ...sBody, color: 'var(--ink-2)' }}>Home</span>
        <IconChevronRight size={14} stroke={2} />
        <span style={{ ...sBodyB, color: 'var(--ink)' }}>Import</span>
      </nav>
      <h1 style={{ fontWeight: 700, fontSize: 30, lineHeight: 1.2, margin: '0 0 8px', color: 'var(--ink)', letterSpacing: '0.01em' }}>Import</h1>
      <p style={{ ...sBody, color: 'var(--ink-2)', margin: 0, maxWidth: 720 }}>
        Upload a file (OBX, SIF or Excel) or paste article codes to build a basket of items, then create an order.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FILE DROP ZONE                                                      */
/* ------------------------------------------------------------------ */
function FileDropZone({ onParsed, disabled }: { onParsed: (e: FileParseEvent) => void; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function processFiles(files: FileList) {
    if (!files?.length) return;
    setLoading(true);
    setFileNames(Array.from(files).map(f => f.name));
    setCurrentIdx(0);
    setSummary(null);

    const all: ParsedItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentIdx(i);
      const ext = ('.' + file.name.split('.').pop()).toLowerCase();
      const format = ACCEPT_MAP[ext];
      if (!format) {
        onParsed({ items: [], fileName: file.name, error: `Unsupported file type: ${ext}` });
        setLoading(false); setFileNames([]); return;
      }
      let result;
      try {
        if (ext === '.xlsx') { const buf = await file.arrayBuffer(); result = parseXLSX(buf); }
        else { const text = await file.text(); result = ext === '.obx' ? parseOBX(text) : parseSIF(text); }
      } catch (err) { result = { items: [], error: (err as Error).message }; }

      if (result.error) {
        onParsed({ items: [], fileName: file.name, error: result.error });
        setLoading(false); setFileNames([]); return;
      }
      if (result.needsMapping) {
        onParsed({ ...result, fileName: file.name, format });
        setLoading(false); setFileNames([]); return;
      }
      if (result.items?.length) all.push(...result.items);
    }

    setLoading(false);
    setFileNames(Array.from(files).map(f => f.name));
    const count = all.length;
    setSummary(count === 0
      ? 'No article codes detected'
      : `${count} article${count !== 1 ? 's' : ''} found from ${files.length} file${files.length !== 1 ? 's' : ''}`);
    onParsed({ items: all, fileName: Array.from(files).map(f => f.name).join(', '), format: 'Mixed' });
  }

  const idle = !loading && fileNames.length === 0;

  return (
    <div
      className="om-dropzone"
      data-state={loading ? 'loading' : (dragging ? 'dragging' : (fileNames.length ? 'files' : 'idle'))}
      onClick={() => !disabled && !loading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!loading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={loading ? (e) => e.preventDefault() : (e) => {
        e.preventDefault(); setDragging(false);
        if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={(disabled || loading) ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && !loading && inputRef.current?.click()}
      aria-label="Upload file"
      style={dropzoneStyles.zone(dragging, loading)}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED_EXT} multiple style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.length) processFiles(e.target.files); e.target.value = ''; }} />

      {loading ? (
        <>
          <div style={dropzoneStyles.spinner} />
          <div style={{ ...sBodyB, color: 'var(--ink)', marginTop: 12 }}>{fileNames[currentIdx]}</div>
          <div style={{ ...sBody, color: 'var(--ink-2)', marginTop: 4 }}>
            {fileNames.length > 1 ? `Processing file ${currentIdx + 1} of ${fileNames.length}…` : 'Parsing file…'}
          </div>
        </>
      ) : idle ? (
        <>
          <div style={dropzoneStyles.icon}><IconUpload size={28} stroke={1.7} /></div>
          <div style={{ ...sLargeB, color: 'var(--ink)', marginTop: 16 }}>Drop file here</div>
          <div style={{ ...sBody, color: 'var(--ink-2)', marginTop: 4 }}>or <span style={{ color: 'var(--brand)', textDecoration: 'underline', textUnderlineOffset: 3 }}>browse files</span></div>
          <div style={dropzoneStyles.exts}>
            {Object.keys(ACCEPT_MAP).map(e => (
              <span key={e} style={dropzoneStyles.extPill}>{e}</span>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={dropzoneStyles.icon}><IconCheck size={28} stroke={2.4} /></div>
          <div style={{ ...sBodyB, color: 'var(--ink)', marginTop: 16, textAlign: 'center', padding: '0 12px' }}>
            {fileNames.length > 1 ? `${fileNames.length} files imported` : fileNames[0]}
          </div>
          {summary && <div style={{ ...sBody, color: 'var(--ink-2)', marginTop: 4 }}>{summary}</div>}
          <button
            onClick={(e) => { e.stopPropagation(); setFileNames([]); setSummary(null); onParsed({ items: [], fileName: null }); }}
            style={dropzoneStyles.clearBtn}>
            Change files
          </button>
        </>
      )}
    </div>
  );
}

const dropzoneStyles = {
  zone: (dragging: boolean, loading: boolean) => ({
    height: 260,
    border: `2px ${dragging ? 'solid' : 'dashed'} var(--ink)`,
    borderColor: dragging ? 'var(--brand)' : 'var(--ink)',
    borderRadius: 'var(--radius)',
    background: dragging ? 'var(--brand-soft)' : '#fff',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    cursor: loading ? 'default' : 'pointer',
    transition: 'border-color .15s ease, background .15s ease',
    outline: 'none',
    padding: 20,
  }),
  icon: {
    width: 64, height: 64, borderRadius: '50%',
    background: 'var(--line)', color: 'var(--ink)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  exts: { marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'center' },
  extPill: {
    ...sBodyB, fontSize: 11,
    padding: '4px 10px', borderRadius: 999,
    background: 'var(--line)', color: 'var(--ink-2)',
    textTransform: 'uppercase' as const, letterSpacing: 0.4,
  },
  spinner: {
    width: 32, height: 32, borderRadius: '50%',
    border: '3px solid var(--line)',
    borderTopColor: 'var(--brand)',
    animation: 'spin .8s linear infinite',
  },
  clearBtn: {
    marginTop: 14, ...sBody, color: 'var(--ink-2)',
    border: 'none', background: 'transparent', cursor: 'pointer',
    textDecoration: 'underline', textUnderlineOffset: 3,
    fontFamily: 'inherit',
  },
};

/* ------------------------------------------------------------------ */
/*  ARTICLE INPUT                                                       */
/* ------------------------------------------------------------------ */
function ArticleInput({ onAdd, disabled }: { onAdd: (items: ParsedItem[]) => void; disabled: boolean }) {
  const [value, setValue] = useState('');
  const parsed = parseTextInput(value);
  const hasInput = value.trim().length > 0;

  const submit = () => {
    if (!parsed.length) return;
    onAdd(parsed);
    setValue('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <label style={{ ...sBodyB, color: 'var(--ink)', marginBottom: 10 }} htmlFor="article-textarea">
        Paste article codes
      </label>
      <textarea
        id="article-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
        disabled={disabled}
        rows={7}
        spellCheck={false}
        autoComplete="off"
        placeholder={'e.g.\nAER1B23DW ALP G1 G1 G1 BB BK 23103\nMI1E325AA\nBA512LN DB3 CSQ'}
        style={{
          flex: 1, minHeight: 180,
          border: '2px solid var(--ink)', borderRadius: 'var(--radius)',
          padding: '14px 16px',
          fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
          ...sBody, fontSize: 13.5,
          color: 'var(--ink)', background: '#fff',
          outline: 'none', resize: 'vertical',
          transition: 'border-color .15s ease, box-shadow .15s ease',
        }}
      />
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ ...sBody, color: 'var(--ink-2)' }}>
          One code per line{hasInput && parsed.length > 0 && (
            <> · <strong style={{ color: 'var(--ink)' }}>{parsed.length} code{parsed.length !== 1 ? 's' : ''} ready</strong></>
          )}
        </span>
        <button
          onClick={submit}
          disabled={disabled || !parsed.length}
          className="om-primary-btn"
          style={{
            ...sLargeB,
            height: 44, padding: '0 20px',
            border: `2px solid ${parsed.length ? 'var(--brand)' : 'var(--line)'}`,
            borderRadius: 'var(--radius)',
            background: parsed.length ? 'var(--brand)' : 'var(--line)',
            color: parsed.length ? '#fff' : 'var(--ink-3)',
            cursor: parsed.length ? 'pointer' : 'not-allowed',
            transition: 'background .15s ease',
            fontFamily: 'inherit',
          }}>
          Add to basket
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COLUMN MAPPER                                                       */
/* ------------------------------------------------------------------ */
function ColumnMapper({ sheetData, onConfirm, onCancel }: {
  sheetData: SheetData[];
  onConfirm: (items: ParsedItem[]) => void;
  onCancel: () => void;
}) {
  const [sheetIdx, setSheetIdx] = useState(0);
  const [skipRows, setSkipRows] = useState(0);
  const [columnRoles, setColumnRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    const auto = autoDetectColumns(sheetData, sheetIdx);
    if (auto) { setSkipRows(auto.skipRows); setColumnRoles(auto.columnRoles); }
    else { setSkipRows(1); setColumnRoles({}); }
  }, [sheetIdx, sheetData]);

  const sheet = sheetData[sheetIdx];
  const rows = sheet.rows as unknown[][];
  const maxCols = Math.max(...rows.map(r => (r as unknown[]).length), 0);
  const preview = rows.slice(0, Math.min(rows.length, 12));

  const setRole = (col: number, role: string) => {
    const next = { ...columnRoles };
    for (const k of Object.keys(next)) if (next[k] === role) delete next[k];
    if (role === 'ignore') delete next[col];
    else next[col] = role;
    setColumnRoles(next);
  };

  const previewItems = useMemo(
    () => applyColumnMapping(sheetData, sheetIdx, skipRows, columnRoles),
    [sheetData, sheetIdx, skipRows, columnRoles]
  );

  const ROLE_OPTIONS = [
    { value: 'ignore',          label: 'Ignore' },
    { value: 'articleCode',     label: 'Article Code' },
    { value: 'articleAndFeature', label: 'Code + Feature' },
    { value: 'featureString',   label: 'Feature String' },
    { value: 'qty',             label: 'Quantity' },
  ];

  const btnBase = { ...sLargeB, height: 44, padding: '0 18px', borderRadius: 'var(--radius)', border: '2px solid var(--ink)', background: '#fff', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit' };

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', background: '#fff', padding: 24, marginBottom: 20, animation: 'slideDown .2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <div>
          <div style={{ ...sLargeB, color: 'var(--ink)', marginBottom: 4 }}>Map columns</div>
          <div style={{ ...sBody, color: 'var(--ink-2)' }}>
            We couldn't recognise this Excel layout. Pick the columns that contain article codes and quantities. This works best when each row represents a single line item.
          </div>
        </div>
        <button onClick={onCancel} aria-label="Cancel mapping"
          style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconClose size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 18, marginBottom: 18, flexWrap: 'wrap' }}>
        {sheetData.length > 1 && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>SHEET</span>
            <select value={sheetIdx} onChange={(e) => setSheetIdx(Number(e.target.value))}
              style={{ height: 40, padding: '0 12px', border: '1px solid var(--ink-3)', borderRadius: 'var(--radius)', background: '#fff', ...sBody, color: 'var(--ink)', minWidth: 140 }}>
              {sheetData.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
          </label>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>SKIP ROWS</span>
          <input type="number" min={0} value={skipRows}
            onChange={(e) => setSkipRows(Number(e.target.value || 0))}
            style={{ height: 40, padding: '0 12px', border: '1px solid var(--ink-3)', borderRadius: 'var(--radius)', background: '#fff', ...sBody, color: 'var(--ink)', minWidth: 140 }} />
        </label>
      </div>

      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'auto', maxHeight: 360, marginBottom: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '10px 12px', textAlign: 'left', verticalAlign: 'top', borderRight: '1px solid #3a3a3a', minWidth: 60, position: 'sticky', top: 0, zIndex: 1 }}>Row</th>
              {Array.from({ length: maxCols }).map((_, c) => (
                <th key={c} style={{ background: 'var(--ink)', color: '#fff', padding: '10px 12px', textAlign: 'left', verticalAlign: 'top', borderRight: '1px solid #3a3a3a', minWidth: 140, position: 'sticky', top: 0, zIndex: 1 }}>
                  <div style={{ ...sBody, color: '#fff', marginBottom: 6 }}>Col {c + 1}</div>
                  <select
                    value={columnRoles[c] || 'ignore'}
                    onChange={(e) => setRole(c, e.target.value)}
                    style={{ width: '100%', height: 32, padding: '0 8px', background: '#fff', border: '1px solid var(--ink-3)', ...sBody, color: 'var(--ink)', borderRadius: 4 }}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, ri) => (
              <tr key={ri} style={{ background: ri < skipRows ? 'var(--line)' : '#fff', opacity: ri < skipRows ? 0.55 : 1 }}>
                <td style={{ padding: '8px 12px', borderTop: '1px solid var(--line)', borderRight: '1px solid var(--line)', ...sBody, color: 'var(--ink-2)' }}>{ri + 1}</td>
                {Array.from({ length: maxCols }).map((_, c) => (
                  <td key={c} style={{ padding: '8px 12px', borderTop: '1px solid var(--line)', borderRight: '1px solid var(--line)', whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', background: columnRoles[c] && ri >= skipRows ? 'var(--brand-soft)' : undefined }}>
                    <span style={{ ...sBody, color: 'var(--ink)' }}>{String((row as unknown[])[c] ?? '')}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ ...sBody, color: 'var(--ink-2)' }}>
          {previewItems.length === 0
            ? 'No rows match yet — pick at least an Article Code column.'
            : <><strong style={{ color: 'var(--ink)' }}>{previewItems.length}</strong> row{previewItems.length !== 1 ? 's' : ''} will be imported</>}
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} className="om-stroke-btn" style={btnBase}>Cancel</button>
          <button
            onClick={() => onConfirm(previewItems)}
            disabled={previewItems.length === 0}
            className="om-primary-btn"
            style={{
              ...sLargeB, height: 44, padding: '0 22px',
              border: `2px solid ${previewItems.length ? 'var(--brand)' : 'var(--line)'}`,
              borderRadius: 'var(--radius)',
              background: previewItems.length ? 'var(--brand)' : 'var(--line)',
              color: previewItems.length ? '#fff' : 'var(--ink-3)',
              cursor: previewItems.length ? 'pointer' : 'not-allowed',
              transition: 'background .15s ease', fontFamily: 'inherit',
            }}>
            Add to basket
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BASKET HOOK                                                         */
/* ------------------------------------------------------------------ */
const BASKET_KEY = 'eos-basket';

function useBasket() {
  const [items, setItems] = useState<BasketItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(BASKET_KEY);
      return saved ? (JSON.parse(saved) as BasketItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (items.length > 0) {
      sessionStorage.setItem(BASKET_KEY, JSON.stringify(items));
    } else {
      sessionStorage.removeItem(BASKET_KEY);
    }
  }, [items]);

  const addItems = useCallback((incoming: ParsedItem[]) => {
    const newItems: BasketItem[] = incoming
      .map(({ articleCode, featureString = '', qty = 1 }) => ({
        id: `i-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`,
        articleCode: articleCode.trim(),
        featureString: (featureString || '').trim(),
        qty: Math.max(1, parseInt(String(qty), 10) || 1),
        productName: null, productLine: null, listPrice: 0, currency: 'EUR',
        validationStatus: 'pending' as const, validationError: null,
      }))
      .filter(i => i.articleCode);

    setItems(prev => {
      const next = [...prev, ...newItems];
      setTimeout(() => {
        validateBasketItems(newItems, ({ id, result }) => {
          setItems(cur => cur.map(i => i.id !== id ? i : {
            ...i,
            validationStatus: result.valid ? 'passed' : 'failed',
            validationError: result.error,
            productName: result.valid ? result.productName : null,
            productLine: result.productLine || null,
            listPrice: result.price || 0,
            currency: result.currency || 'EUR',
            isSuper: !!result.isSuper,
            superChildren: result.superChildren || null,
          }));
        });
      }, 0);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => setItems(p => {
    const next = p.filter(i => i.id !== id);
    if (next.length === 0) sessionStorage.removeItem(BASKET_KEY);
    return next;
  }), []);

  const updateQty = useCallback((id: string, qty: number | string) => {
    const v = Math.max(1, parseInt(String(qty), 10) || 1);
    setItems(p => p.map(i => i.id === id ? { ...i, qty: v } : i));
  }, []);

  const copyItem = useCallback((id: string) => setItems(p => {
    const idx = p.findIndex(i => i.id === id); if (idx < 0) return p;
    const dup = { ...p[idx], id: `i-${Math.random().toString(36).slice(2, 9)}-${Date.now()}` };
    const next = [...p]; next.splice(idx + 1, 0, dup); return next;
  }), []);

  const clear = useCallback(() => {
    sessionStorage.removeItem(BASKET_KEY);
    setItems([]);
  }, []);

  const updateArticleCode = useCallback((id: string, newCode: string) => {
    const combined = newCode.trim(); if (!combined) return;
    const sp = combined.indexOf(' ');
    const code = sp > 0 ? combined.slice(0, sp) : combined;
    const feat = sp > 0 ? combined.slice(sp + 1) : '';
    setItems(p => {
      const idx = p.findIndex(i => i.id === id);
      if (idx < 0 || (p[idx].articleCode === code && p[idx].featureString === feat)) return p;
      const updated = p.map(i => i.id === id
        ? { ...i, articleCode: code, featureString: feat, validationStatus: 'pending' as const, validationError: null, productName: null, listPrice: 0 }
        : i
      );
      const it = updated[idx];
      setTimeout(() => {
        validateBasketItems([it], ({ id: vid, result }) => {
          setItems(cur => cur.map(i => i.id !== vid ? i : {
            ...i,
            validationStatus: result.valid ? 'passed' : 'failed',
            validationError: result.error,
            productName: result.valid ? result.productName : null,
            productLine: result.productLine || null,
            listPrice: result.price || 0,
            currency: result.currency || 'EUR',
            isSuper: !!result.isSuper,
            superChildren: result.superChildren || null,
          }));
        });
      }, 0);
      return updated;
    });
  }, []);

  const explodeItem = useCallback((id: string) => {
    setItems(p => {
      const idx = p.findIndex(i => i.id === id);
      if (idx < 0) return p;
      const parent = p[idx];
      if (!parent.isSuper || !parent.superChildren) return p;
      const groupId = `exp-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      const expanded: BasketItem[] = parent.superChildren.map((c, i) => ({
        id: `i-${Math.random().toString(36).slice(2, 9)}-${Date.now()}-${i}`,
        articleCode: c.articleCode,
        featureString: c.featureString || '',
        qty: (c.qty || 1) * parent.qty,
        productName: c.shortDescription,
        productLine: parent.productLine,
        listPrice: c.listPrice || 0,
        currency: c.currency || parent.currency,
        validationStatus: 'passed' as const,
        validationError: null,
        isSuper: false,
        superChildren: null,
        _explodedSuper: {
          groupId,
          parentArticleCode: parent.articleCode,
          parentQty: parent.qty,
          childIndex: i,
          totalChildren: parent.superChildren!.length,
          childOriginalQty: c.qty || 1,
          productCode: c.productCode,
          shortDescription: c.shortDescription,
          finishOptions: c.finishOptions || null,
          editableFinish: !!c.editableFinish,
        },
      }));
      const next = [...p];
      next.splice(idx, 1, ...expanded);
      return next;
    });
  }, []);

  return { items, addItems, removeItem, updateQty, copyItem, clear, updateArticleCode, explodeItem };
}

/* ------------------------------------------------------------------ */
/*  CHIP                                                                */
/* ------------------------------------------------------------------ */
function Chip({ label, color }: { label: string; color?: 'green' | 'red' | 'amber' | 'blue' }) {
  const colorMap = {
    green: { bg: 'var(--green-soft)', fg: 'var(--green)' },
    red:   { bg: 'var(--red-soft)',   fg: 'var(--red)'   },
    amber: { bg: 'var(--amber-soft)', fg: 'var(--amber)' },
    blue:  { bg: 'var(--blue-soft)',  fg: 'var(--blue)'  },
  };
  const c = color ? colorMap[color] : { bg: 'var(--line)', fg: 'var(--ink-2)' };
  return (
    <span style={{ ...sBodyB, color: c.fg, background: c.bg, padding: '4px 10px', borderRadius: 999 }}>{label}</span>
  );
}

/* ------------------------------------------------------------------ */
/*  SUPER BADGE                                                         */
/* ------------------------------------------------------------------ */
function SuperBadge({ count }: { count: number }) {
  return (
    <span style={{ ...sBodyB, fontSize: 10.5, letterSpacing: 0.4, background: 'var(--blue)', color: '#fff', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', flexShrink: 0 }}>
      Super · {count} parts
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  ICON EXPLODE (inline — only used on Import page)                   */
/* ------------------------------------------------------------------ */
function IconExplode({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  SUPER CHILDREN TABLE                                                */
/* ------------------------------------------------------------------ */
function SuperChildrenTable({ parent }: { parent: BasketItem }) {
  const parentQty = parent.qty || 1;
  return (
    <div style={{ padding: '12px 16px 16px 56px' }}>
      <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
        Bundle Contents · {parent.superChildren!.length} parts
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: 'var(--bg-soft)' }}>
            {['Component Item', 'Feature String', 'Short Description', 'Product Code', 'Quantity', 'Total Price'].map((h, i) => (
              <th key={h} style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, padding: '10px 12px', textAlign: i >= 4 ? 'center' : 'left', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parent.superChildren!.map((c: SuperChild) => {
            const effQty = (c.qty || 1) * parentQty;
            const total = (c.listPrice || 0) * effQty;
            return (
              <tr key={c.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}><span style={{ ...sBodyB, color: 'var(--ink)' }}>{c.articleCode}</span></td>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}><span style={{ ...sBody, color: 'var(--ink-2)', fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12 }}>{c.featureString || '—'}</span></td>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}><span style={{ ...sBody, color: 'var(--ink)' }}>{c.shortDescription}</span></td>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}><span style={{ ...sBody, color: 'var(--ink-2)' }}>{c.productCode}</span></td>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                  <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{effQty}</span>
                  {parentQty > 1 && <span style={{ ...sBody, color: 'var(--ink-3)', marginLeft: 6, fontSize: 11 }}>({c.qty} × {parentQty})</span>}
                </td>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                  <span style={{ ...sBody, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatPrice(total, c.currency || parent.currency)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BASKET ROW                                                          */
/* ------------------------------------------------------------------ */
const rowActionStyle = { width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s ease, color .12s ease' };

function BasketRow({ item, index, onRemove, onQtyChange, onCopy, onUpdateArticleCode, onExplode, contractUnitPrice, contractDiscount }: {
  item: BasketItem; index: number;
  onRemove: () => void; onQtyChange: (q: number | string) => void;
  onCopy: () => void; onUpdateArticleCode: (code: string) => void;
  onExplode: () => void;
  contractUnitPrice: number | null;
  contractDiscount: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [expanded, setExpanded] = useState(false);

  const combined = item.articleCode + (item.featureString ? ' ' + item.featureString : '');
  const startEdit = () => { setEditVal(combined); setEditing(true); };
  const saveEdit = () => {
    const v = editVal.trim();
    if (v) onUpdateArticleCode(v);
    setEditing(false);
  };

  const status = item.validationStatus;
  const isSuper = !!item.isSuper && Array.isArray(item.superChildren);
  const rowBg = status === 'failed' ? 'var(--red-soft)' : (isSuper && expanded ? 'var(--blue-soft)' : 'transparent');

  return (
    <>
      <tr style={{ borderTop: '1px solid var(--line)', transition: 'background .12s ease', background: rowBg }} className="om-basket-row">
        <td style={{ padding: '12px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            {isSuper ? (
              <button onClick={() => setExpanded(!expanded)} aria-label={expanded ? 'Collapse parts' : 'Expand parts'}
                style={{ width: 22, height: 22, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .12s ease' }}>
                {expanded ? <IconMinus size={14} stroke={2.4} /> : <IconPlus size={14} stroke={2.4} />}
              </button>
            ) : <span style={{ width: 22 }} />}
            <span style={{ ...sBody, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{index + 1}</span>
            {status === 'pending' && <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--brand)', display: 'inline-block', animation: 'spin .8s linear infinite', flexShrink: 0 }} />}
            {status === 'passed' && !isSuper && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--green)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IconCheck size={10} stroke={3} /></span>}
            {status === 'failed' && <span style={{ width: 16, height: 16, borderRadius: 8, background: 'var(--red)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IconClose size={10} stroke={3} /></span>}
          </div>
        </td>
        <td style={{ padding: '12px 18px', verticalAlign: 'middle' }}>
          {editing ? (
            <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
              style={{ width: '100%', height: 36, border: '2px solid var(--brand)', borderRadius: 4, padding: '0 10px', ...sBody, color: 'var(--ink)', outline: 'none', fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, cursor: 'text' }} onClick={startEdit}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ ...sBodyB, color: 'var(--ink)' }}>{item.articleCode}</span>
                  {item.featureString && (
                    <span style={{ ...sBody, color: 'var(--ink-2)', fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12 }}>{item.featureString}</span>
                  )}
                  {isSuper && <SuperBadge count={item.superChildren!.length} />}
                </div>
                {status === 'failed' && item.validationError && (
                  <div style={{ ...sBody, fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{item.validationError}</div>
                )}
              </div>
              <button onClick={startEdit} aria-label="Edit code" className="om-row-action" style={rowActionStyle}>
                <IconEdit size={14} stroke={1.7} />
              </button>
            </div>
          )}
        </td>
        <td style={{ padding: '12px 18px', verticalAlign: 'middle' }}>
          {status === 'pending' && <span style={{ ...sBody, color: 'var(--ink-3)' }}>Looking up…</span>}
          {status === 'passed'  && <span style={{ ...sBody, color: 'var(--ink)' }}>{item.productName || '—'}</span>}
          {status === 'failed'  && <span style={{ ...sBodyB, color: 'var(--red)' }}>Not found</span>}
        </td>
        <td style={{ padding: '12px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <button onClick={() => onQtyChange(item.qty - 1)} disabled={item.qty <= 1}
              style={{ width: 32, height: 32, border: 'none', background: '#fff', color: 'var(--ink)', cursor: 'pointer', ...sLargeB, fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <input value={item.qty} type="number" min={1} onChange={(e) => onQtyChange(e.target.value)}
              style={{ width: 50, height: 32, border: 'none', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', textAlign: 'center', outline: 'none', ...sBodyB, color: 'var(--ink)', background: '#fff', MozAppearance: 'textfield' as const }} aria-label="Quantity" />
            <button onClick={() => onQtyChange(item.qty + 1)}
              style={{ width: 32, height: 32, border: 'none', background: '#fff', color: 'var(--ink)', cursor: 'pointer', ...sLargeB, fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
        </td>
        <td style={{ padding: '12px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
          {item.listPrice > 0 ? <span style={{ ...sBody, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatPrice(item.listPrice, item.currency)}</span> : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </td>
        <td style={{ padding: '12px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
          {contractDiscount !== null
            ? <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{contractDiscount}%</span>
            : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </td>
        <td style={{ padding: '12px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
          {item.listPrice > 0
            ? <span style={{ ...sBody, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatPrice(contractUnitPrice ?? item.listPrice, item.currency)}</span>
            : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </td>
        <td style={{ padding: '12px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
          {item.listPrice > 0
            ? <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatPrice((contractUnitPrice ?? item.listPrice) * item.qty, item.currency)}</span>
            : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </td>
        <td style={{ padding: '12px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {isSuper && (
              <button onClick={onExplode} aria-label="Explode super product" title="Explode into individual lines" className="om-row-action" style={rowActionStyle}>
                <IconExplode size={15} />
              </button>
            )}
            <button onClick={onCopy}   aria-label="Duplicate" className="om-row-action" style={rowActionStyle}><IconCopy size={15} stroke={1.7} /></button>
            <button onClick={onRemove} aria-label="Remove"    className="om-row-action" style={rowActionStyle}><IconTrash size={15} stroke={1.7} /></button>
          </div>
        </td>
      </tr>
      {isSuper && expanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0, background: 'var(--blue-soft)' }}>
            <SuperChildrenTable parent={item} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  BASKET TABLE                                                        */
/* ------------------------------------------------------------------ */
const EXPORT_FORMATS: { id: ExportFormat; label: string; desc: string; ext: string }[] = [
  { id: 'obx',  label: 'OBX',   desc: 'pCon / EOS 2 import',  ext: '.obx'  },
  { id: 'xlsx', label: 'Excel', desc: 'Re-importable workbook', ext: '.xlsx' },
  { id: 'csv',  label: 'CSV',   desc: 'Universal spreadsheet',  ext: '.csv'  },
  { id: 'json', label: 'JSON',  desc: 'Structured data / API',  ext: '.json' },
];

function BasketTable({ items, onRemove, onQtyChange, onCopy, onClear, onUpdateArticleCode, onExplode, onCreateOrder, onExport, selectedContract, onContractChange }: {
  items: BasketItem[];
  onRemove: (id: string) => void;
  onQtyChange: (id: string, q: number | string) => void;
  onCopy: (id: string) => void;
  onClear: () => void;
  onUpdateArticleCode: (id: string, code: string) => void;
  onExplode: (id: string) => void;
  onCreateOrder: () => void;
  onExport: (format: ExportFormat) => void;
  selectedContract: Contract | null;
  onContractChange: (id: string) => void;
}) {
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!saveMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) setSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [saveMenuOpen]);

  if (!items.length) return null;

  const totalQty    = items.reduce((s, i) => s + i.qty, 0);
  const grand       = items.reduce((s, i) => s + (i.listPrice * i.qty), 0);
  const passedCount = items.filter(i => i.validationStatus === 'passed').length;
  const failedCount = items.filter(i => i.validationStatus === 'failed').length;
  const pendingCount = items.filter(i => i.validationStatus === 'pending').length;
  const superCount  = items.filter(i => i.isSuper).length;
  const canCreate   = passedCount > 0;
  const btnBase     = { ...sLargeB, height: 50, padding: '0 18px', border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: '#fff', color: 'var(--ink)', cursor: 'pointer', transition: 'background .15s ease, color .15s ease', fontFamily: 'inherit' };

  const hasContract = selectedContract !== null;
  const contractPrices = hasContract
    ? items.map(i => itemContractPrice(i, selectedContract!))
    : items.map(() => null as number | null);
  const contractDiscounts = hasContract
    ? items.map(i => {
        if (!i.productLine || i.listPrice <= 0) return null;
        const plc = PRODUCT_LINE_PLCS[i.productLine]?.plc;
        return plc ? getContractDiscount(selectedContract!, plc) : null;
      })
    : items.map(() => null as number | null);
  const buyingTotal = items.reduce((s, i, idx) => s + (contractPrices[idx] ?? i.listPrice) * i.qty, 0);

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', background: '#fff', overflow: 'hidden', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ ...sLargeB, margin: 0, fontSize: 20 }}>Basket</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Chip label={`${items.length} item${items.length !== 1 ? 's' : ''}`} />
            <Chip label={`${totalQty} unit${totalQty !== 1 ? 's' : ''}`} />
            {superCount   > 0 && <Chip label={`${superCount} super product${superCount !== 1 ? 's' : ''}`}   color="blue" />}
            {passedCount  > 0 && <Chip label={`${passedCount} validated`}                                     color="green" />}
            {failedCount  > 0 && <Chip label={`${failedCount} not found`}                                     color="red" />}
            {pendingCount > 0 && <Chip label={`${pendingCount} validating…`}                                  color="amber" />}
          </div>
        </div>
        <button onClick={onClear} className="om-link-btn"
          style={{ ...sBody, color: 'var(--ink-2)', border: 'none', background: 'transparent', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'inherit' }}>
          Clear basket
        </button>
      </div>

      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <label htmlFor="basket-contract" style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6, whiteSpace: 'nowrap' as const }}>
          Contract
        </label>
        <select
          id="basket-contract"
          value={selectedContract?.id ?? ''}
          onChange={e => onContractChange(e.target.value)}
          style={{ height: 36, padding: '0 12px', border: '1.5px solid var(--ink-3)', borderRadius: 'var(--radius)', ...sBody, color: 'var(--ink)', background: '#fff', minWidth: 260, fontFamily: 'inherit' }}
        >
          <option value="">No contract — list prices only</option>
          {CONTRACTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 12px', ...sBodyB, fontSize: 12.5, textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 18px', ...sBodyB, fontSize: 12.5, textAlign: 'left', whiteSpace: 'nowrap' }}>Article Code</th>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 18px', ...sBodyB, fontSize: 12.5, textAlign: 'left', whiteSpace: 'nowrap' }}>Product Name</th>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 12px', ...sBodyB, fontSize: 12.5, textAlign: 'center', whiteSpace: 'nowrap' }}>Qty</th>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 18px', ...sBodyB, fontSize: 12.5, textAlign: 'right', whiteSpace: 'nowrap' }}>List Price</th>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 12px', ...sBodyB, fontSize: 12.5, textAlign: 'center', whiteSpace: 'nowrap' }}>Discount</th>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 18px', ...sBodyB, fontSize: 12.5, textAlign: 'right', whiteSpace: 'nowrap' }}>Unit Buying Price</th>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 18px', ...sBodyB, fontSize: 12.5, textAlign: 'right', whiteSpace: 'nowrap' }}>Total Buying Price</th>
              <th style={{ background: 'var(--ink)', color: '#fff', padding: '14px 12px', ...sBodyB, fontSize: 12.5, textAlign: 'center', whiteSpace: 'nowrap' }} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <BasketRow key={item.id} item={item} index={i}
                onRemove={() => onRemove(item.id)}
                onQtyChange={(q) => onQtyChange(item.id, q)}
                onCopy={() => onCopy(item.id)}
                onUpdateArticleCode={(c) => onUpdateArticleCode(item.id, c)}
                onExplode={() => onExplode(item.id)}
                contractUnitPrice={contractPrices[i]}
                contractDiscount={contractDiscounts[i]}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderTop: '1px solid var(--line)', background: 'var(--bg-soft)', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ ...sBody, color: 'var(--ink-2)' }}>{hasContract ? 'Contract Total' : 'Subtotal'}</span>
            <span style={{ fontWeight: 700, fontSize: 24, letterSpacing: '0.01em', color: hasContract ? 'var(--brand)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {formatPrice(buyingTotal, items[0]?.currency || 'EUR')}
            </span>
            {hasContract && (
              <span style={{ ...sBody, color: 'var(--ink-3)', fontSize: 13 }}>List: {formatPrice(grand, items[0]?.currency || 'EUR')}</span>
            )}
          </div>
          <div style={{ ...sBody, color: 'var(--ink-2)' }}>
            {passedCount === 0 && pendingCount > 0
              ? 'Validating items against the catalog…'
              : passedCount === 0
                ? 'Add validated items to create an order.'
                : failedCount > 0
                  ? `${passedCount} ready · ${failedCount} can be fixed on the order page.`
                  : pendingCount > 0
                    ? `${passedCount} validated · still checking ${pendingCount}…`
                    : 'All items validated. Ready to create the order.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onClear} className="om-stroke-btn" style={btnBase}>Cancel</button>
          <div ref={saveMenuRef} style={{ position: 'relative' }}>
            {saveMenuOpen && (
              <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, background: '#fff', border: '2px solid var(--black)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-pop)', minWidth: 220, zIndex: 100, overflow: 'hidden', animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)' }}>
                {EXPORT_FORMATS.map(f => (
                  <button key={f.id} onClick={() => { setSaveMenuOpen(false); onExport(f.id); }}
                    className="om-export-option"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', gap: 16, fontFamily: 'inherit' }}>
                    <span style={{ ...sBodyB, color: 'var(--ink)' }}>{f.label}</span>
                    <span style={{ ...sBody, color: 'var(--ink-2)', fontSize: 12 }}>{f.desc}</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setSaveMenuOpen(v => !v)} className="om-stroke-btn"
              style={{ ...btnBase, display: 'flex', alignItems: 'center', gap: 8 }}>
              Export as…
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .15s ease', transform: saveMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
          </div>
          <button disabled={!canCreate} onClick={onCreateOrder} className="om-primary-btn"
            style={{ ...sLargeB, height: 50, padding: '0 28px', border: `2px solid ${canCreate ? 'var(--brand)' : 'var(--line)'}`, borderRadius: 'var(--radius)', background: canCreate ? 'var(--brand)' : 'var(--line)', color: canCreate ? '#fff' : 'var(--ink-3)', cursor: canCreate ? 'pointer' : 'not-allowed', transition: 'background .15s ease', fontFamily: 'inherit' }}>
            Create order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                              */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: 72, marginTop: 40, borderTop: '1px solid var(--line)', background: '#fff' }}>
      <span style={{ ...sLargeB, color: 'var(--brand)', letterSpacing: '0.05em' }}>EOS CLOUD</span>
      <span style={{ ...sBody, color: 'var(--ink-2)' }}>2026 - MillerKnoll</span>
      <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>Tsunami Axis Ltd</span>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  ERROR BANNER                                                        */
/* ------------------------------------------------------------------ */
function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--red-soft)', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', marginBottom: 20 }}>
      <span style={{ ...sBodyB, flex: 1 }}>{message}</span>
      <button onClick={onClose} aria-label="Dismiss" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--red)', padding: 4 }}>
        <IconClose size={16} stroke={2} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TOAST                                                               */
/* ------------------------------------------------------------------ */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const id = setTimeout(onDone, 2400); return () => clearTimeout(id); }, [onDone]);
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', padding: '14px 22px', borderRadius: 'var(--radius)', ...sBody, zIndex: 80, boxShadow: 'var(--shadow-pop)', animation: 'toastIn .2s cubic-bezier(.4,0,.2,1)' }}>{message}</div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
export default function ImportPage() {
  const navigate = useNavigate();
  const basket = useBasket();
  const [fileError, setFileError] = useState<string | null>(null);
  const [pendingSheet, setPendingSheet] = useState<SheetData[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState('');
  const selectedContract = useMemo(() => CONTRACTS.find(c => c.id === selectedContractId) ?? null, [selectedContractId]);

  const onParsed = useCallback(({ items, error, needsMapping, sheetData }: FileParseEvent) => {
    if (needsMapping && sheetData) { setFileError(null); setPendingSheet(sheetData); return; }
    setFileError(error || null);
    if (items?.length) basket.addItems(items);
  }, [basket]);

  const onMappingConfirm = useCallback((mapped: ParsedItem[]) => {
    setPendingSheet(null);
    basket.addItems(mapped);
  }, [basket]);

  const onCreateOrder = useCallback(() => {
    const draftOrderNo = '234' + String(Math.floor(Math.random() * 9999999)).padStart(7, '0');
    const order = {
      orderNo: draftOrderNo,
      status: 'Draft',
      currency: basket.items[0]?.currency || 'EUR',
      orderPlaced: new Date().toISOString().slice(0, 10),
      reference: null, customer: null, purchaseOrder: null, contract: selectedContractId || null,
      lines: basket.items.map((it, idx) => ({
        id: it.id, lineNo: idx + 1,
        articleCode: it.articleCode, featureString: it.featureString,
        productName: it.productName, productLine: it.productLine,
        qty: it.qty, listPrice: it.listPrice, discount: 0,
        currency: it.currency, validationStatus: it.validationStatus,
        isSuper: !!it.isSuper, superChildren: it.superChildren || null,
      })),
    };
    const stored: StoredOrder = { id: draftOrderNo, ...order, lines: order.lines as unknown[] };
    upsert(stored);
    basket.clear();
    setToast(`Creating order ${draftOrderNo}…`);
    setTimeout(() => navigate(`/orders/${draftOrderNo}`, { state: { order } }), 600);
  }, [basket, navigate]);

  const onExport = useCallback(async (format: ExportFormat) => {
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

    const configs: Record<ExportFormat, { blob: Blob; ext: string }> = {
      obx:  { blob: new Blob([exportOBX(basket.items)],  { type: 'application/xml'   }), ext: 'obx'  },
      csv:  { blob: new Blob([exportCSV(basket.items)],  { type: 'text/csv'          }), ext: 'csv'  },
      json: { blob: new Blob([exportJSON(basket.items)], { type: 'application/json'  }), ext: 'json' },
      xlsx: { blob: exportXLSXBlob(basket.items),                                        ext: 'xlsx' },
    };
    const { blob, ext } = configs[format];
    const fileName = `basket-${ts}.${ext}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    basket.clear();
  }, [basket]);

  const inputPanelGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'stretch',
  };

  return (
    <>
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn   { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes spin      { to { transform: rotate(360deg); } }
        button:focus-visible, a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .om-dropzone[data-state="idle"]:hover { border-color: var(--brand) !important; background: var(--brand-soft) !important; }
        .om-iconplus:hover { background: var(--line); border-radius: var(--radius); }
        .om-stroke-btn:hover { background: var(--ink) !important; color: #fff !important; }
        .om-export-option:hover { background: var(--bg-soft) !important; }
        @keyframes menuPop { from { opacity: 0; transform: scale(.97) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .om-primary-btn:not(:disabled):hover { background: #C42700 !important; border-color: #C42700 !important; }
        .om-link-btn:hover { color: var(--brand) !important; }
        .om-row-action:hover { background: var(--line); color: var(--ink); }
        .om-basket-row:hover { background: var(--bg-soft); }
        textarea:focus, input:focus { box-shadow: 0 0 0 4px rgba(226,45,0,0.08); }
        textarea:focus { border-color: var(--brand) !important; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="import" />

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px 40px' }}>
        <PageHeader />

        <div style={{ marginTop: 24 }}>
          {fileError && <ErrorBanner message={fileError} onClose={() => setFileError(null)} />}

          {!pendingSheet && (
            <div style={inputPanelGrid}>
              <div>
                <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>UPLOAD FILE</div>
                <FileDropZone onParsed={onParsed} disabled={!!pendingSheet} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 28 }}>
                <span style={{ width: 1, flex: 1, background: 'var(--line)' }} />
                <span style={{ ...sBodyB, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 }}>or</span>
                <span style={{ width: 1, flex: 1, background: 'var(--line)' }} />
              </div>
              <div>
                <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>PASTE CODES</div>
                <ArticleInput onAdd={basket.addItems} disabled={!!pendingSheet} />
              </div>
            </div>
          )}

          {pendingSheet && (
            <ColumnMapper sheetData={pendingSheet} onConfirm={onMappingConfirm} onCancel={() => setPendingSheet(null)} />
          )}

          <BasketTable
            items={basket.items}
            onRemove={basket.removeItem}
            onQtyChange={basket.updateQty}
            onCopy={basket.copyItem}
            onClear={basket.clear}
            onUpdateArticleCode={basket.updateArticleCode}
            onExplode={basket.explodeItem}
            onCreateOrder={onCreateOrder}
            onExport={onExport}
            selectedContract={selectedContract}
            onContractChange={setSelectedContractId}
          />

          {basket.items.length === 0 && !pendingSheet && (
            <div style={{ marginTop: 40, padding: '40px 24px', background: 'var(--bg-soft)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
              <div style={{ ...sBodyB, color: 'var(--ink)' }}>Your basket is empty</div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
