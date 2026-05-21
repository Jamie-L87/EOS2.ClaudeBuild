/* global React, ReactDOM, parseOBX, parseSIF, parseTextInput,
   parseXLSX, applyColumnMapping, autoDetectColumns, validateBasketItems,
   IconMenu, IconPlus, IconChevronDown, IconChevronRight,
   IconMail, IconHelp, IconSearch, IconEye, IconEyeOff,
   IconUpload, IconEllipsis, IconCheck, IconClose,
   IconArrowUp, IconArrowDown, IconSortable,
   IconCopy, IconArchive, IconShare, IconTrash, IconUnshare,
   IconCalendar, IconFilter, IconEdit */

const { useState, useMemo, useEffect, useRef, useCallback } = React;

/* ------------------------------------------------------------------ *
 *  Tokens                                                             *
 * ------------------------------------------------------------------ */
const T = {
  fontBold: { fontWeight: 700, letterSpacing: "0.010em" },
  fontMed:  { fontWeight: 500, letterSpacing: "0.010em" },
  body:     { fontSize: 13.33, lineHeight: 1.2 },
  large:    { fontSize: 16, lineHeight: 1.2 },
  hit: 44, rowH: 50, tabH: 55,
};
const sBody   = { ...T.fontMed,  ...T.body  };
const sBodyB  = { ...T.fontBold, ...T.body  };
const sLargeB = { ...T.fontBold, ...T.large };
const sLargeM = { ...T.fontMed,  ...T.large };

const formatGBP = (n) => "£" + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CURRENCY_SYMBOLS = { GBP: "£", EUR: "€", USD: "$" };
const formatPrice = (n, ccy = "EUR") => (CURRENCY_SYMBOLS[ccy] || ccy + " ") + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ *
 *  TOP NAV (shared)                                                    *
 * ------------------------------------------------------------------ */
function TopNav({ onMenu }) {
  return (
    <header style={navStyles.bar}>
      <div style={navStyles.menuGroup}>
        <button className="om-iconplus" style={navStyles.menuBtn} onClick={onMenu} aria-label="Open menu">
          <span style={navStyles.iconBox}><IconMenu size={20} stroke={1.6} /></span>
          <span style={{ ...sLargeM, color: "#000" }}>Menu</span>
        </button>
      </div>

      <div style={navStyles.rightGroup}>
        <button className="om-account-btn" style={navStyles.accountBtn}>
          <span style={{ ...sLargeB, color: "#000" }}>Tsunami Axis Ltd: UK-DK066080-GBP</span>
          <span style={navStyles.iconBox}><IconChevronDown size={16} /></span>
        </button>
        <span style={navStyles.pinV} />
        <button className="om-iconplus" style={navStyles.iconBtn} aria-label="Mail">
          <IconMail size={20} stroke={1.6} />
          <span style={navStyles.badge}>3</span>
        </button>
        <button className="om-iconplus" style={navStyles.iconBtn} aria-label="Help">
          <IconHelp size={20} stroke={1.6} />
        </button>
        <div style={navStyles.avatar} title="Me">ME</div>
      </div>
    </header>
  );
}

const navStyles = {
  bar: {
    height: 92,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px",
    background: "#fff",
    borderBottom: "1px solid var(--ink-deep)",
    position: "sticky", top: 0, zIndex: 30,
  },
  menuGroup: { display: "flex", alignItems: "center", gap: 16 },
  rightGroup: { display: "flex", alignItems: "center", gap: 12 },
  pinV: { width: 1, height: 64, background: "var(--pin)" },
  menuBtn: { display: "flex", alignItems: "center", gap: 0, border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "var(--ink)" },
  iconBox: { width: T.hit, height: T.hit, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" },
  createBtn: {
    display: "flex", alignItems: "center", gap: 10,
    height: 50, padding: "0 24px",
    border: "2px solid var(--ink)", borderRadius: "var(--radius)",
    background: "transparent", color: "var(--ink)",
    cursor: "pointer", textDecoration: "none",
    transition: "background .15s ease, color .15s ease",
  },
  accountBtn: { display: "flex", alignItems: "center", gap: 0, border: "none", background: "transparent", cursor: "pointer", padding: 0 },
  iconBtn: { position: "relative", width: T.hit, height: T.hit, borderRadius: 22, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", transition: "background .15s ease" },
  badge: { position: "absolute", top: 6, right: 6, background: "var(--brand)", color: "#fff", fontSize: 10, ...T.fontBold, minWidth: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" },
  avatar: { width: T.hit, height: T.hit, borderRadius: "50%", background: "var(--yellow)", color: "#000", ...sLargeB, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
};

/* ------------------------------------------------------------------ *
 *  PAGE HEADER                                                        *
 * ------------------------------------------------------------------ */
function PageHeader() {
  return (
    <div style={{ padding: "32px 0 8px" }}>
      <nav style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }} aria-label="Breadcrumb">
        <span style={{ ...sBody, color: "var(--ink-2)" }}>Home</span>
        <IconChevronRight size={14} stroke={2} />
        <span style={{ ...sBodyB, color: "var(--ink)" }}>Import Orders</span>
      </nav>
      <h1 style={{ ...T.fontBold, fontSize: 30, lineHeight: 1.2, margin: "0 0 8px", color: "var(--ink)" }}>Import Orders</h1>
      <p style={{ ...sBody, color: "var(--ink-2)", margin: 0, maxWidth: 720 }}>
        Upload a file (OBX, SIF or Excel) or paste article codes to build a basket of items, then create an order.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  FILE DROP ZONE                                                     *
 * ------------------------------------------------------------------ */
const ACCEPT_MAP = {
  ".obx":  "OBX",
  ".sif":  "SIF",
  ".txt":  "SIF",
  ".xlsx": "Excel",
};
const ACCEPTED_EXT = Object.keys(ACCEPT_MAP).join(",");

function FileDropZone({ onParsed, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileNames, setFileNames] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  async function processFiles(files) {
    if (!files?.length) return;
    setLoading(true);
    setFileNames(Array.from(files).map(f => f.name));
    setCurrentIdx(0);
    setSummary(null);

    const all = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentIdx(i);
      const ext = ("." + file.name.split(".").pop()).toLowerCase();
      const format = ACCEPT_MAP[ext];
      if (!format) {
        onParsed({ items: [], fileName: file.name, error: `Unsupported file type: ${ext}` });
        setLoading(false); setFileNames([]); return;
      }
      let result;
      try {
        if (ext === ".xlsx") { const buf = await file.arrayBuffer(); result = parseXLSX(buf); }
        else { const text = await file.text(); result = ext === ".obx" ? parseOBX(text) : parseSIF(text); }
      } catch (err) { result = { items: [], error: err.message }; }

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
      ? "No article codes detected"
      : `${count} article${count !== 1 ? "s" : ""} found from ${files.length} file${files.length !== 1 ? "s" : ""}`);
    onParsed({ items: all, fileName: Array.from(files).map(f => f.name).join(", "), format: "Mixed" });
  }

  const idle = !loading && fileNames.length === 0;

  return (
    <div
      className="om-dropzone"
      data-state={loading ? "loading" : (dragging ? "dragging" : (fileNames.length ? "files" : "idle"))}
      onClick={() => !disabled && !loading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!loading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={loading ? (e) => e.preventDefault() : (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files); }}
      role="button"
      tabIndex={(disabled || loading) ? -1 : 0}
      onKeyDown={(e) => e.key === "Enter" && !loading && inputRef.current?.click()}
      aria-label="Upload file"
      style={dropzoneStyles.zone(dragging, loading)}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED_EXT} multiple style={{ display: "none" }}
             onChange={(e) => { if (e.target.files?.length) processFiles(e.target.files); e.target.value = ""; }} />

      {loading ? (
        <>
          <div style={dropzoneStyles.spinner} />
          <div style={{ ...sBodyB, color: "var(--ink)", marginTop: 12 }}>{fileNames[currentIdx]}</div>
          <div style={{ ...sBody, color: "var(--ink-2)", marginTop: 4 }}>
            {fileNames.length > 1 ? `Processing file ${currentIdx + 1} of ${fileNames.length}…` : "Parsing file…"}
          </div>
        </>
      ) : idle ? (
        <>
          <div style={dropzoneStyles.icon}><IconUpload size={28} stroke={1.7} /></div>
          <div style={{ ...sLargeB, color: "var(--ink)", marginTop: 16 }}>Drop file here</div>
          <div style={{ ...sBody, color: "var(--ink-2)", marginTop: 4 }}>or <span style={{ color: "var(--brand)", textDecoration: "underline", textUnderlineOffset: 3 }}>browse files</span></div>
          <div style={dropzoneStyles.exts}>
            {Object.keys(ACCEPT_MAP).map(e => (
              <span key={e} style={dropzoneStyles.extPill}>{e}</span>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={dropzoneStyles.icon}><IconCheck size={28} stroke={2.4} /></div>
          <div style={{ ...sBodyB, color: "var(--ink)", marginTop: 16, textAlign: "center", padding: "0 12px" }}>
            {fileNames.length > 1 ? `${fileNames.length} files imported` : fileNames[0]}
          </div>
          {summary && <div style={{ ...sBody, color: "var(--ink-2)", marginTop: 4 }}>{summary}</div>}
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
  zone: (dragging, loading) => ({
    height: 260,
    border: `2px ${dragging ? "solid" : "dashed"} var(--ink)`,
    borderColor: dragging ? "var(--brand)" : "var(--ink)",
    borderRadius: "var(--radius)",
    background: dragging ? "var(--brand-soft)" : "#fff",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: loading ? "default" : "pointer",
    transition: "border-color .15s ease, background .15s ease",
    outline: "none",
    padding: 20,
  }),
  icon: {
    width: 64, height: 64, borderRadius: "50%",
    background: "var(--line)", color: "var(--ink)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  exts: {
    marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
  },
  extPill: {
    ...sBodyB, fontSize: 11,
    padding: "4px 10px", borderRadius: 999,
    background: "var(--line)", color: "var(--ink-2)",
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid var(--line)",
    borderTopColor: "var(--brand)",
    animation: "spin .8s linear infinite",
  },
  clearBtn: {
    marginTop: 14,
    ...sBody, color: "var(--ink-2)",
    border: "none", background: "transparent", cursor: "pointer",
    textDecoration: "underline", textUnderlineOffset: 3,
  },
};

/* ------------------------------------------------------------------ *
 *  ARTICLE INPUT (paste codes)                                         *
 * ------------------------------------------------------------------ */
function ArticleInput({ onAdd, disabled }) {
  const [value, setValue] = useState("");
  const parsed = parseTextInput(value);
  const hasInput = value.trim().length > 0;

  const submit = () => {
    if (!parsed.length) return;
    onAdd(parsed);
    setValue("");
  };
  const onKey = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
  };

  return (
    <div style={articleInputStyles.wrap}>
      <label style={{ ...sBodyB, color: "var(--ink)", marginBottom: 10 }} htmlFor="article-textarea">
        Paste article codes
      </label>
      <textarea
        id="article-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        disabled={disabled}
        rows={7}
        spellCheck={false}
        autoComplete="off"
        placeholder={"e.g.\nAER1B23DW ALP G1 G1 G1 BB BK 23103\nMI1E325AA\nBA512LN DB3 CSQ"}
        style={articleInputStyles.textarea}
      />
      <div style={articleInputStyles.footer}>
        <span style={{ ...sBody, color: "var(--ink-2)" }}>
          One code per line{hasInput && parsed.length > 0 && (
            <> · <strong style={{ color: "var(--ink)" }}>{parsed.length} code{parsed.length !== 1 ? "s" : ""} ready</strong></>
          )}
        </span>
        <button
          onClick={submit}
          disabled={disabled || !parsed.length}
          className="om-primary-btn"
          style={{
            ...sLargeB,
            height: 44, padding: "0 20px",
            border: "2px solid var(--brand)", borderRadius: "var(--radius)",
            background: parsed.length ? "var(--brand)" : "var(--line)",
            color: parsed.length ? "#fff" : "var(--ink-3)",
            borderColor: parsed.length ? "var(--brand)" : "var(--line)",
            cursor: parsed.length ? "pointer" : "not-allowed",
            transition: "background .15s ease",
          }}>
          Add to basket
        </button>
      </div>
    </div>
  );
}

const articleInputStyles = {
  wrap: { display: "flex", flexDirection: "column", height: "100%" },
  textarea: {
    flex: 1, minHeight: 180,
    border: "2px solid var(--ink)", borderRadius: "var(--radius)",
    padding: "14px 16px",
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    ...sBody, fontSize: 13.5,
    color: "var(--ink)", background: "#fff",
    outline: "none", resize: "vertical",
    transition: "border-color .15s ease, box-shadow .15s ease",
  },
  footer: {
    marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  },
};

/* ------------------------------------------------------------------ *
 *  COLUMN MAPPER (for unrecognized XLSX)                              *
 * ------------------------------------------------------------------ */
function ColumnMapper({ sheetData, onConfirm, onCancel }) {
  const [sheetIdx, setSheetIdx] = useState(0);
  const [skipRows, setSkipRows] = useState(0);
  const [columnRoles, setColumnRoles] = useState({});

  useEffect(() => {
    const auto = autoDetectColumns(sheetData, sheetIdx);
    if (auto) { setSkipRows(auto.skipRows); setColumnRoles(auto.columnRoles); }
    else { setSkipRows(1); setColumnRoles({}); }
  }, [sheetIdx, sheetData]);

  const sheet = sheetData[sheetIdx];
  const rows = sheet.rows;
  const maxCols = Math.max(...rows.map(r => r.length), 0);
  const preview = rows.slice(0, Math.min(rows.length, 12));

  const setRole = (col, role) => {
    const next = { ...columnRoles };
    // Only one column can hold each role except featureString which can accumulate (but simplify here: one each)
    for (const k of Object.keys(next)) if (next[k] === role) delete next[k];
    if (role === "ignore") delete next[col];
    else next[col] = role;
    setColumnRoles(next);
  };

  const previewItems = useMemo(() => applyColumnMapping(sheetData, sheetIdx, skipRows, columnRoles), [sheetData, sheetIdx, skipRows, columnRoles]);

  const ROLE_OPTIONS = [
    { value: "ignore", label: "Ignore" },
    { value: "articleCode", label: "Article Code" },
    { value: "articleAndFeature", label: "Code + Feature" },
    { value: "featureString", label: "Feature String" },
    { value: "qty", label: "Quantity" },
  ];

  return (
    <div style={mapperStyles.card}>
      <div style={mapperStyles.header}>
        <div>
          <div style={{ ...sLargeB, color: "var(--ink)", marginBottom: 4 }}>Map columns</div>
          <div style={{ ...sBody, color: "var(--ink-2)" }}>
            We couldn't recognise this Excel layout. Pick the columns that contain article codes and quantities.
          </div>
        </div>
        <button onClick={onCancel} aria-label="Cancel mapping"
                style={{ width: 36, height: 36, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconClose size={18} />
        </button>
      </div>

      <div style={mapperStyles.controls}>
        {sheetData.length > 1 && (
          <label style={mapperStyles.field}>
            <span style={mapperStyles.lbl}>SHEET</span>
            <select value={sheetIdx} onChange={(e) => setSheetIdx(Number(e.target.value))} style={mapperStyles.sel}>
              {sheetData.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
            </select>
          </label>
        )}
        <label style={mapperStyles.field}>
          <span style={mapperStyles.lbl}>SKIP ROWS</span>
          <input type="number" min={0} value={skipRows} onChange={(e) => setSkipRows(Number(e.target.value || 0))} style={mapperStyles.sel} />
        </label>
      </div>

      <div style={mapperStyles.tableWrap}>
        <table style={mapperStyles.table}>
          <thead>
            <tr>
              <th style={mapperStyles.colHead}>Row</th>
              {Array.from({ length: maxCols }).map((_, c) => (
                <th key={c} style={mapperStyles.colHead}>
                  <div style={{ ...sBody, color: "#fff", marginBottom: 6 }}>Col {c + 1}</div>
                  <select
                    value={columnRoles[c] || "ignore"}
                    onChange={(e) => setRole(c, e.target.value)}
                    style={mapperStyles.roleSel}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, ri) => (
              <tr key={ri} style={{ background: ri < skipRows ? "var(--line)" : "#fff", opacity: ri < skipRows ? 0.55 : 1 }}>
                <td style={{ ...mapperStyles.cell, ...sBody, color: "var(--ink-2)" }}>{ri + 1}</td>
                {Array.from({ length: maxCols }).map((_, c) => (
                  <td key={c} style={{ ...mapperStyles.cell, background: columnRoles[c] && ri >= skipRows ? "var(--brand-soft)" : undefined }}>
                    <span style={{ ...sBody, color: "var(--ink)" }}>{String(row[c] ?? "")}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={mapperStyles.footer}>
        <span style={{ ...sBody, color: "var(--ink-2)" }}>
          {previewItems.length === 0
            ? "No rows match yet — pick at least an Article Code column."
            : <><strong style={{ color: "var(--ink)" }}>{previewItems.length}</strong> row{previewItems.length !== 1 ? "s" : ""} will be imported</>}
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} style={mapperStyles.btnGhost}>Cancel</button>
          <button
            onClick={() => onConfirm(previewItems)}
            disabled={previewItems.length === 0}
            style={{
              ...mapperStyles.btnPrimary,
              background: previewItems.length ? "var(--brand)" : "var(--line)",
              borderColor: previewItems.length ? "var(--brand)" : "var(--line)",
              color: previewItems.length ? "#fff" : "var(--ink-3)",
              cursor: previewItems.length ? "pointer" : "not-allowed",
            }}>
            Add to basket
          </button>
        </div>
      </div>
    </div>
  );
}

const mapperStyles = {
  card: {
    border: "1px solid var(--line)", borderRadius: "var(--radius)",
    background: "#fff", padding: 24, marginBottom: 20,
    animation: "slideDown .2s ease",
  },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 16 },
  controls: { display: "flex", gap: 18, marginBottom: 18, flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  lbl: { ...sBodyB, color: "var(--ink-2)" },
  sel: {
    height: 40, padding: "0 12px",
    border: "1px solid var(--ink-3)", borderRadius: "var(--radius)",
    background: "#fff", ...sBody, color: "var(--ink)",
    minWidth: 140,
  },
  tableWrap: {
    border: "1px solid var(--line)", borderRadius: "var(--radius)",
    overflow: "auto", maxHeight: 360, marginBottom: 18,
  },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "auto" },
  colHead: {
    background: "var(--ink)", color: "#fff",
    padding: "10px 12px",
    textAlign: "left", verticalAlign: "top",
    borderRight: "1px solid #3a3a3a",
    minWidth: 140,
    position: "sticky", top: 0, zIndex: 1,
  },
  roleSel: {
    width: "100%", height: 32, padding: "0 8px",
    background: "#fff", border: "1px solid var(--ink-3)",
    ...sBody, color: "var(--ink)", borderRadius: 4,
  },
  cell: {
    padding: "8px 12px",
    borderTop: "1px solid var(--line)",
    borderRight: "1px solid var(--line)",
    whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis",
  },
  footer: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  btnGhost: {
    ...sLargeB, height: 44, padding: "0 18px",
    border: "2px solid var(--ink)", borderRadius: "var(--radius)",
    background: "#fff", color: "var(--ink)", cursor: "pointer",
  },
  btnPrimary: {
    ...sLargeB, height: 44, padding: "0 22px",
    border: "2px solid var(--brand)", borderRadius: "var(--radius)",
    transition: "background .15s ease",
  },
};

/* ------------------------------------------------------------------ *
 *  BASKET                                                              *
 * ------------------------------------------------------------------ */
function useBasket() {
  const [items, setItems] = useState([]);

  const addItems = useCallback((incoming) => {
    const newItems = incoming.map(({ articleCode, featureString = "", qty = 1 }) => ({
      id: `i-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`,
      articleCode: articleCode.trim(),
      featureString: (featureString || "").trim(),
      qty: Math.max(1, parseInt(qty, 10) || 1),
      productName: null, productLine: null, listPrice: 0, currency: "EUR",
      validationStatus: "pending", validationError: null,
    })).filter(i => i.articleCode);

    setItems(prev => {
      const next = [...prev, ...newItems];
      setTimeout(() => {
        validateBasketItems(newItems, ({ id, result }) => {
          setItems(cur => cur.map(i => i.id === id ? ({
            ...i,
            validationStatus: result.valid ? "passed" : "failed",
            validationError: result.error,
            productName: result.valid ? result.productName : null,
            productLine: result.productLine || null,
            listPrice: result.price || 0,
            currency: result.currency || "EUR",
            isSuper: !!result.isSuper,
            superChildren: result.superChildren || null,
          }) : i));
        });
      }, 0);
      return next;
    });
  }, []);

  const removeItem = useCallback((id) => setItems(p => p.filter(i => i.id !== id)), []);
  const updateQty  = useCallback((id, qty) => {
    const v = Math.max(1, parseInt(qty, 10) || 1);
    setItems(p => p.map(i => i.id === id ? { ...i, qty: v } : i));
  }, []);
  const copyItem = useCallback((id) => setItems(p => {
    const idx = p.findIndex(i => i.id === id); if (idx < 0) return p;
    const dup = { ...p[idx], id: `i-${Math.random().toString(36).slice(2, 9)}-${Date.now()}` };
    const next = [...p]; next.splice(idx + 1, 0, dup); return next;
  }), []);
  const clear = useCallback(() => setItems([]), []);

  const updateArticleCode = useCallback((id, newCode) => {
    const code = newCode.trim(); if (!code) return;
    setItems(p => {
      const idx = p.findIndex(i => i.id === id);
      if (idx < 0 || p[idx].articleCode === code) return p;
      const updated = p.map(i => i.id === id ? { ...i, articleCode: code, validationStatus: "pending", validationError: null, productName: null, listPrice: 0 } : i);
      const it = updated[idx];
      setTimeout(() => {
        validateBasketItems([it], ({ id: vid, result }) => {
          setItems(cur => cur.map(i => i.id !== vid ? i : ({
            ...i,
            validationStatus: result.valid ? "passed" : "failed",
            validationError: result.error,
            productName: result.valid ? result.productName : null,
            productLine: result.productLine || null,
            listPrice: result.price || 0,
            currency: result.currency || "EUR",
            isSuper: !!result.isSuper,
            superChildren: result.superChildren || null,
          })));
        });
      }, 0);
      return updated;
    });
  }, []);

  const explodeItem = useCallback((id) => {
    setItems(p => {
      const idx = p.findIndex(i => i.id === id);
      if (idx < 0) return p;
      const parent = p[idx];
      if (!parent.isSuper || !parent.superChildren) return p;
      const groupId = `exp-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      const expanded = parent.superChildren.map((c, i) => ({
        id: `i-${Math.random().toString(36).slice(2, 9)}-${Date.now()}-${i}`,
        articleCode: c.articleCode,
        featureString: c.featureString || "",
        qty: (c.qty || 1) * parent.qty,
        productName: c.shortDescription,
        productLine: parent.productLine,
        listPrice: c.listPrice || 0,
        currency: c.currency || parent.currency,
        validationStatus: "passed",
        validationError: null,
        isSuper: false,
        superChildren: null,
        _explodedSuper: {
          groupId,
          parentArticleCode: parent.articleCode,
          parentFeatureString: parent.featureString,
          parentProductName: parent.productName,
          parentProductLine: parent.productLine,
          parentCurrency: parent.currency,
          parentQty: parent.qty,
          childIndex: i,
          totalChildren: parent.superChildren.length,
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

function BasketTable({ items, onRemove, onQtyChange, onCopy, onClear, onUpdateArticleCode, onExplode, onCreateOrder }) {
  if (!items.length) return null;

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const grand = items.reduce((s, i) => s + (i.listPrice * i.qty), 0);
  const passedCount = items.filter(i => i.validationStatus === "passed").length;
  const failedCount = items.filter(i => i.validationStatus === "failed").length;
  const pendingCount = items.filter(i => i.validationStatus === "pending").length;
  const superCount = items.filter(i => i.isSuper).length;
  const canCreate = passedCount > 0;

  return (
    <div style={basketStyles.wrap}>
      <div style={basketStyles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 style={{ ...sLargeB, margin: 0, fontSize: 20 }}>Basket</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Chip label={`${items.length} item${items.length !== 1 ? "s" : ""}`} />
            <Chip label={`${totalQty} unit${totalQty !== 1 ? "s" : ""}`} />
            {superCount > 0 && <Chip label={`${superCount} super product${superCount !== 1 ? "s" : ""}`} color="blue" />}
            {passedCount > 0 && <Chip label={`${passedCount} validated`} color="green" />}
            {failedCount > 0 && <Chip label={`${failedCount} not found`} color="red" />}
            {pendingCount > 0 && <Chip label={`${pendingCount} validating…`} color="amber" />}
          </div>
        </div>
        <button onClick={onClear} className="om-link-btn"
                style={{ ...sBody, color: "var(--ink-2)", border: "none", background: "transparent", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
          Clear basket
        </button>
      </div>

      <div style={basketStyles.tableWrap}>
        <table style={basketStyles.table}>
          <thead>
            <tr>
              <th style={basketStyles.headCellCenter}>#</th>
              <th style={basketStyles.headCell}>Article Code</th>
              <th style={basketStyles.headCell}>Product Name</th>
              <th style={basketStyles.headCellCenter}>Qty</th>
              <th style={{ ...basketStyles.headCell, textAlign: "right" }}>List Price</th>
              <th style={{ ...basketStyles.headCell, textAlign: "right" }}>Total</th>
              <th style={basketStyles.headCellCenter} aria-label="Actions" />
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
              />
            ))}
          </tbody>
        </table>
      </div>

      <div style={basketStyles.footer}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ ...sBody, color: "var(--ink-2)" }}>Subtotal</span>
            <span style={{ ...T.fontBold, fontSize: 24, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{formatPrice(grand, items[0]?.currency || "EUR")}</span>
          </div>
          <div style={{ ...sBody, color: "var(--ink-2)" }}>
            {passedCount === 0 && pendingCount > 0
              ? "Validating items against the catalog…"
              : passedCount === 0
                ? "Add validated items to create an order."
                : failedCount > 0
                  ? `${passedCount} ready · ${failedCount} can be fixed on the order page.`
                  : pendingCount > 0
                    ? `${passedCount} validated · still checking ${pendingCount}…`
                    : "All items validated. Ready to create the order."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onClear} style={mapperStyles.btnGhost}>Cancel</button>
          <button
            disabled={!canCreate}
            onClick={onCreateOrder}
            style={{
              ...mapperStyles.btnPrimary,
              background: canCreate ? "var(--brand)" : "var(--line)",
              borderColor: canCreate ? "var(--brand)" : "var(--line)",
              color: canCreate ? "#fff" : "var(--ink-3)",
              cursor: canCreate ? "pointer" : "not-allowed",
              height: 50, padding: "0 28px",
            }}>
            Create order
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, color }) {
  const colorMap = {
    green: { bg: "var(--green-soft)", fg: "var(--green)" },
    red:   { bg: "var(--red-soft)",   fg: "var(--red)"   },
    amber: { bg: "var(--amber-soft)", fg: "var(--amber)" },
    blue:  { bg: "var(--blue-soft)",  fg: "var(--blue)"  },
  };
  const c = colorMap[color] || { bg: "var(--line)", fg: "var(--ink-2)" };
  return (
    <span style={{ ...sBodyB, color: c.fg, background: c.bg, padding: "4px 10px", borderRadius: 999 }}>
      {label}
    </span>
  );
}

function BasketRow({ item, index, onRemove, onQtyChange, onCopy, onUpdateArticleCode, onExplode }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [expanded, setExpanded] = useState(false);

  const combined = item.articleCode + (item.featureString ? " " + item.featureString : "");
  const startEdit = () => { setEditVal(combined); setEditing(true); };
  const saveEdit = () => {
    const v = editVal.trim();
    if (v) onUpdateArticleCode(v.split(" ")[0]); // simplified: just article code
    setEditing(false);
  };
  const onKey = (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditing(false);
  };

  const status = item.validationStatus;
  const isSuper = !!item.isSuper && Array.isArray(item.superChildren);
  const rowBg =
    status === "failed" ? "var(--red-soft)" :
    isSuper && expanded ? "var(--blue-soft)" :
    "transparent";

  return (
    <>
      <tr style={{ ...basketStyles.row, background: rowBg }} className="om-basket-row">
        <td style={basketStyles.cellCenter}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            {isSuper ? (
              <button
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? "Collapse parts" : "Expand parts"}
                title={expanded ? "Hide parts" : "Show parts"}
                style={basketStyles.expandBtn}
              >
                {expanded ? <IconMinus size={14} stroke={2.4} /> : <IconPlus size={14} stroke={2.4} />}
              </button>
            ) : <span style={{ width: 22 }} />}
            <span style={{ ...sBody, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>{index + 1}</span>
            {status === "pending" && <span style={basketStyles.spinnerSm} />}
            {status === "passed" && !isSuper && <span style={{ ...basketStyles.badgeDot, background: "var(--green)" }}><IconCheck size={10} stroke={3} /></span>}
            {status === "failed" && <span style={{ ...basketStyles.badgeDot, background: "var(--red)"   }}><IconClose size={10} stroke={3} /></span>}
          </div>
        </td>
        <td style={basketStyles.cell}>
          {editing ? (
            <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onBlur={saveEdit} onKeyDown={onKey}
                   style={basketStyles.editInput} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, cursor: "text" }} onClick={startEdit}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...sBodyB, color: "var(--ink)" }}>{item.articleCode}</span>
                  {isSuper && <SuperBadge count={item.superChildren.length} />}
                </div>
                {item.featureString && (
                  <div style={{ ...sBody, color: "var(--ink-2)", marginTop: 2, fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12 }}>{item.featureString}</div>
                )}
                {status === "failed" && item.validationError && (
                  <div style={{ ...sBody, fontSize: 12, color: "var(--red)", marginTop: 4 }}>{item.validationError}</div>
                )}
              </div>
              <button onClick={startEdit} aria-label="Edit code" className="om-row-action"
                      style={basketStyles.rowAction}>
                <IconEdit size={14} stroke={1.7} />
              </button>
            </div>
          )}
        </td>
        <td style={basketStyles.cell}>
          {status === "pending" && <span style={{ ...sBody, color: "var(--ink-3)" }}>Looking up…</span>}
          {status === "passed"  && <span style={{ ...sBody, color: "var(--ink)" }}>{item.productName || "—"}</span>}
          {status === "failed"  && <span style={{ ...sBodyB, color: "var(--red)" }}>Not found</span>}
        </td>
        <td style={basketStyles.cellCenter}>
          <div style={basketStyles.qty}>
            <button onClick={() => onQtyChange(item.qty - 1)} disabled={item.qty <= 1} style={basketStyles.qtyBtn} aria-label="Decrease">−</button>
            <input value={item.qty} type="number" min={1} onChange={(e) => onQtyChange(e.target.value)} style={basketStyles.qtyInput} aria-label="Quantity" />
            <button onClick={() => onQtyChange(item.qty + 1)} style={basketStyles.qtyBtn} aria-label="Increase">+</button>
          </div>
        </td>
        <td style={{ ...basketStyles.cell, textAlign: "right" }}>
          {item.listPrice > 0 ? <span style={{ ...sBody, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.listPrice, item.currency)}</span> : <span style={{ color: "var(--ink-3)" }}>—</span>}
        </td>
        <td style={{ ...basketStyles.cell, textAlign: "right" }}>
          {item.listPrice > 0 ? <span style={{ ...sBodyB, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{formatPrice(item.listPrice * item.qty, item.currency)}</span> : <span style={{ color: "var(--ink-3)" }}>—</span>}
        </td>
        <td style={basketStyles.cellCenter}>
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
            {isSuper && (
              <button onClick={onExplode} aria-label="Explode super product" title="Explode into individual lines" className="om-row-action" style={basketStyles.rowAction}>
                <IconExplode size={15} />
              </button>
            )}
            <button onClick={onCopy} aria-label="Duplicate" className="om-row-action" style={basketStyles.rowAction}>
              <IconCopy size={15} stroke={1.7} />
            </button>
            <button onClick={onRemove} aria-label="Remove" className="om-row-action" style={basketStyles.rowAction}>
              <IconTrash size={15} stroke={1.7} />
            </button>
          </div>
        </td>
      </tr>
      {isSuper && expanded && (
        <tr>
          <td colSpan={7} style={{ padding: 0, background: "var(--blue-soft)" }}>
            <SuperChildrenTable parent={item} />
          </td>
        </tr>
      )}
    </>
  );
}

function SuperBadge({ count }) {
  return (
    <span style={{
      ...sBodyB, fontSize: 10.5, letterSpacing: 0.4,
      background: "var(--blue)", color: "#fff",
      padding: "2px 8px", borderRadius: 999, textTransform: "uppercase",
      flexShrink: 0,
    }}>
      Super · {count} parts
    </span>
  );
}

function IconExplode({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" />
    </svg>
  );
}


function SuperChildrenTable({ parent }) {
  const parentQty = parent.qty || 1;
  return (
    <div style={{ padding: "12px 16px 16px 56px" }}>
      <div style={{ ...sBodyB, color: "var(--ink-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
        Bundle Contents · {parent.superChildren.length} parts
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "var(--bg-soft)" }}>
            <th style={superTableStyles.head}>Component Item</th>
            <th style={superTableStyles.head}>Feature String</th>
            <th style={superTableStyles.head}>Short Description</th>
            <th style={superTableStyles.head}>Product Code</th>
            <th style={{ ...superTableStyles.head, textAlign: "center" }}>Quantity</th>
            <th style={{ ...superTableStyles.head, textAlign: "right" }}>Total Price</th>
          </tr>
        </thead>
        <tbody>
          {parent.superChildren.map((c) => {
            const effQty = (c.qty || 1) * parentQty;
            const total = (c.listPrice || 0) * effQty;
            return (
              <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={superTableStyles.cell}><span style={{ ...sBodyB, color: "var(--ink)" }}>{c.articleCode}</span></td>
                <td style={superTableStyles.cell}><span style={{ ...sBody, color: "var(--ink-2)", fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12 }}>{c.featureString || "—"}</span></td>
                <td style={superTableStyles.cell}><span style={{ ...sBody, color: "var(--ink)" }}>{c.shortDescription}</span></td>
                <td style={superTableStyles.cell}><span style={{ ...sBody, color: "var(--ink-2)" }}>{c.productCode}</span></td>
                <td style={{ ...superTableStyles.cell, textAlign: "center" }}>
                  <span style={{ ...sBodyB, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{effQty}</span>
                  {parentQty > 1 && <span style={{ ...sBody, color: "var(--ink-3)", marginLeft: 6, fontSize: 11 }}>({c.qty} × {parentQty})</span>}
                </td>
                <td style={{ ...superTableStyles.cell, textAlign: "right" }}>
                  <span style={{ ...sBody, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{formatPrice(total, c.currency || parent.currency)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const superTableStyles = {
  head: { ...sBodyB, color: "var(--ink-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap" },
  cell: { padding: "10px 12px", verticalAlign: "middle" },
};

const basketStyles = {
  wrap: {
    border: "1px solid var(--line)", borderRadius: "var(--radius)",
    background: "#fff", overflow: "hidden",
    marginTop: 24,
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid var(--line)",
    flexWrap: "wrap", gap: 12,
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  headCell: {
    background: "var(--ink)", color: "#fff",
    padding: "14px 18px",
    ...sBodyB, fontSize: 12.5,
    textAlign: "left", whiteSpace: "nowrap",
  },
  headCellCenter: {
    background: "var(--ink)", color: "#fff",
    padding: "14px 12px",
    ...sBodyB, fontSize: 12.5,
    textAlign: "center", whiteSpace: "nowrap",
  },
  row: {
    borderTop: "1px solid var(--line)",
    transition: "background .12s ease",
  },
  cell: { padding: "12px 18px", verticalAlign: "middle" },
  cellCenter: { padding: "12px 12px", verticalAlign: "middle", textAlign: "center" },
  editInput: {
    width: "100%", height: 36,
    border: "2px solid var(--brand)", borderRadius: 4,
    padding: "0 10px",
    ...sBody, color: "var(--ink)", outline: "none",
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
  },
  qty: {
    display: "inline-flex", alignItems: "center",
    border: "1px solid var(--line)", borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  qtyBtn: {
    width: 32, height: 32,
    border: "none", background: "#fff", color: "var(--ink)",
    cursor: "pointer", ...sLargeB, fontSize: 18, lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  qtyInput: {
    width: 50, height: 32,
    border: "none", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)",
    textAlign: "center", outline: "none",
    ...sBodyB, color: "var(--ink)", background: "#fff",
    MozAppearance: "textfield",
  },
  rowAction: {
    width: 28, height: 28, borderRadius: 4,
    border: "none", background: "transparent", cursor: "pointer",
    color: "var(--ink-2)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "background .12s ease, color .12s ease",
  },
  badgeDot: {
    width: 16, height: 16, borderRadius: 8,
    color: "#fff",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
  spinnerSm: {
    width: 14, height: 14, borderRadius: "50%",
    border: "2px solid var(--line)",
    borderTopColor: "var(--brand)",
    display: "inline-block",
    animation: "spin .8s linear infinite",
  },
  expandBtn: {
    width: 22, height: 22, borderRadius: 4,
    border: "none", background: "transparent", cursor: "pointer",
    color: "var(--ink-2)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    transition: "background .12s ease, color .12s ease",
  },
  footer: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 24px",
    borderTop: "1px solid var(--line)",
    background: "var(--bg-soft)",
    gap: 16, flexWrap: "wrap",
  },
};

/* ------------------------------------------------------------------ *
 *  FOOTER                                                              *
 * ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px", height: 72, marginTop: 40,
      borderTop: "1px solid var(--line)", background: "#fff",
    }}>
      <span style={{ ...sLargeB, color: "var(--brand)", letterSpacing: "0.05em" }}>EOS CLOUD</span>
      <span style={{ ...sBody, color: "var(--ink-2)" }}>2022 — Herman Miller Ltd</span>
      <span style={{ ...sBodyB, color: "var(--ink-2)" }}>Tsunami Axis Ltd</span>
    </footer>
  );
}

/* ------------------------------------------------------------------ *
 *  ERROR BANNER                                                        *
 * ------------------------------------------------------------------ */
function ErrorBanner({ message, onClose }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 18px",
      background: "var(--red-soft)", color: "var(--red)",
      border: `1px solid var(--red)`, borderRadius: "var(--radius)",
      marginBottom: 20,
    }}>
      <span style={{ ...sBodyB, flex: 1 }}>{message}</span>
      <button onClick={onClose} aria-label="Dismiss"
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--red)", padding: 4 }}>
        <IconClose size={16} stroke={2} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  TOAST                                                              *
 * ------------------------------------------------------------------ */
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "var(--ink)", color: "#fff",
      padding: "14px 22px", borderRadius: "var(--radius)",
      ...sBody, zIndex: 80,
      boxShadow: "var(--shadow-pop)",
      animation: "toastIn .2s cubic-bezier(.4,0,.2,1)",
    }}>{message}</div>
  );
}

/* ------------------------------------------------------------------ *
 *  APP                                                                *
 * ------------------------------------------------------------------ */
function App() {
  const basket = useBasket();
  const [fileError, setFileError] = useState(null);
  const [pendingSheet, setPendingSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  const onParsed = useCallback(({ items, error, needsMapping, sheetData }) => {
    if (needsMapping) { setFileError(null); setPendingSheet(sheetData); return; }
    setFileError(error || null);
    if (items?.length) basket.addItems(items);
  }, [basket]);

  const onMappingConfirm = useCallback((mapped) => {
    setPendingSheet(null);
    basket.addItems(mapped);
  }, [basket]);

  const onCreateOrder = useCallback(() => {
    // Generate a draft HM Order Number and stash the basket for the next page.
    const draftOrderNo = "234" + String(Math.floor(Math.random() * 9999999)).padStart(7, "0");
    const order = {
      orderNo: draftOrderNo,
      status: "Draft",
      currency: basket.items[0]?.currency || "EUR",
      orderPlaced: new Date().toISOString().slice(0, 10),
      lines: basket.items.map((it, idx) => ({
        id: it.id,
        lineNo: idx + 1,
        articleCode: it.articleCode,
        featureString: it.featureString,
        productName: it.productName,
        productLine: it.productLine,
        qty: it.qty,
        listPrice: it.listPrice,
        discount: 0,
        currency: it.currency,
        validationStatus: it.validationStatus,
        isSuper: !!it.isSuper,
        superChildren: it.superChildren || null,
      })),
    };
    try { localStorage.setItem("eos:pendingOrder", JSON.stringify(order)); } catch (e) {}
    setToast(`Creating order ${draftOrderNo}…`);
    setTimeout(() => {
      window.location.href = "Order Detail.html";
    }, 600);
  }, [basket]);

  return (
    <>
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        button:focus-visible, a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

        .om-dropzone[data-state="idle"]:hover { border-color: var(--brand) !important; background: var(--brand-soft) !important; }
        .om-iconplus:hover { background: var(--line); border-radius: var(--radius); }
        .om-create-btn:hover { background: var(--ink); color: #fff !important; }
        .om-account-btn:hover { color: var(--brand); }
        .om-link-btn:hover { color: var(--brand) !important; }
        .om-link:hover { color: var(--brand); }
        .om-primary-btn:not(:disabled):hover { background: #C42700 !important; border-color: #C42700 !important; }
        .om-row-action:hover { background: var(--line); color: var(--ink); }
        .om-basket-row:hover { background: var(--bg-soft); }
        textarea:focus, input:focus { box-shadow: 0 0 0 4px rgba(226,45,0,0.08); }
        textarea:focus { border-color: var(--brand) !important; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="import" />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px 40px" }}>
        <PageHeader />

        <div style={{ marginTop: 24 }}>
          {fileError && <ErrorBanner message={fileError} onClose={() => setFileError(null)} />}

          {!pendingSheet && (
            <div style={inputPanel.grid}>
              <div>
                <div style={inputPanel.colLabel}>UPLOAD FILE</div>
                <FileDropZone onParsed={onParsed} disabled={!!pendingSheet} />
              </div>
              <div style={inputPanel.divider}>
                <span style={inputPanel.dividerLine} />
                <span style={inputPanel.dividerWord}>or</span>
                <span style={inputPanel.dividerLine} />
              </div>
              <div>
                <div style={inputPanel.colLabel}>PASTE CODES</div>
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
          />

          {basket.items.length === 0 && !pendingSheet && (
            <div style={{
              marginTop: 40, padding: "40px 24px",
              background: "var(--bg-soft)", borderRadius: "var(--radius)",
              textAlign: "center",
            }}>
              <div style={{ ...sBodyB, color: "var(--ink)", marginBottom: 4 }}>Your basket is empty</div>
              <div style={{ ...sBody, color: "var(--ink-2)" }}>
                Try <code style={inputPanel.code}>AER1B23DW</code>, <code style={inputPanel.code}>MI1E325AA</code> or <code style={inputPanel.code}>BA512LN</code> — these are real Herman Miller codes that will validate against the catalog.
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

const inputPanel = {
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    gap: 24,
    alignItems: "stretch",
  },
  divider: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 28 },
  dividerLine: { width: 1, flex: 1, background: "var(--line)" },
  dividerWord: { ...sBodyB, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 1, fontSize: 11 },
  colLabel: { ...sBodyB, color: "var(--ink-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  code: {
    background: "var(--line)", padding: "2px 8px", borderRadius: 4,
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12,
    margin: "0 2px",
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
