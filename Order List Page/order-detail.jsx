/* global React, ReactDOM, NavDrawer, validateItem,
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

const CCY = { GBP: "£", EUR: "€", USD: "$" };
const fmt = (n, c = "EUR") => (CCY[c] || c + " ") + Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ *
 *  Mock lead times & delivery dates                                    *
 * ------------------------------------------------------------------ */
/* Mock based on product line. In production these come from the catalog. */
const LEAD_TIMES_BY_LINE = {
  AERON:        { min: 6, max: 8 },
  COSM:         { min: 4, max: 6 },
  SAYL:         { min: 3, max: 5 },
  EM:           { min: 8, max: 10 },
  LINO:         { min: 4, max: 6 },
  ZEPH:         { min: 5, max: 7 },
  CAPER:        { min: 4, max: 6 },
  PRONTA:       { min: 2, max: 4 },
  CIVIC_TABLES: { min: 6, max: 8 },
  DEFAULT:      { min: 4, max: 8 },
};

/* Hash a string to a number in [0, 1) — deterministic so lead time is stable per line. */
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 1000 / 1000;
}

function mockLeadTime(productLine, articleCode) {
  const spec = LEAD_TIMES_BY_LINE[productLine] || LEAD_TIMES_BY_LINE.DEFAULT;
  // Always use the higher end + 1 week padding for realistic-looking range
  return { min: spec.min, max: spec.max, label: `${spec.min}–${spec.max} wks`, weeks: spec.max };
}

function computeDeliveryDate(fromDate, lead) {
  const d = new Date(fromDate);
  if (isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() + (lead.weeks || 6) * 7);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ------------------------------------------------------------------ *
 *  Line status pill                                                    *
 * ------------------------------------------------------------------ */
function LineStatusPill({ status }) {
  const map = {
    "confirmed":   { fg: "var(--green)", bg: "var(--green-soft)", dot: "var(--green)", label: "Confirmed" },
    "pending":     { fg: "var(--amber)", bg: "var(--amber-soft)", dot: "var(--amber)", label: "Pending"   },
    "backorder":   { fg: "var(--blue)",  bg: "var(--blue-soft)",  dot: "var(--blue)",  label: "Backorder" },
    "not-found":   { fg: "var(--red)",   bg: "var(--red-soft)",   dot: "var(--red)",   label: "Not found" },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c.dot, flexShrink: 0 }} />
      <span style={{ ...sBody, color: c.fg }}>{c.label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 *  TOP NAV                                                            *
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
          <IconMail size={20} stroke={1.6} /><span style={navStyles.badge}>3</span>
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
  bar: { height: 92, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "#fff", borderBottom: "1px solid var(--ink-deep)", position: "sticky", top: 0, zIndex: 30 },
  menuGroup: { display: "flex", alignItems: "center", gap: 16 },
  rightGroup: { display: "flex", alignItems: "center", gap: 12 },
  pinV: { width: 1, height: 64, background: "var(--pin)" },
  menuBtn: { display: "flex", alignItems: "center", gap: 0, border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "var(--ink)" },
  iconBox: { width: T.hit, height: T.hit, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)" },
  accountBtn: { display: "flex", alignItems: "center", gap: 0, border: "none", background: "transparent", cursor: "pointer", padding: 0 },
  iconBtn: { position: "relative", width: T.hit, height: T.hit, borderRadius: 22, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink)", transition: "background .15s ease" },
  badge: { position: "absolute", top: 6, right: 6, background: "var(--brand)", color: "#fff", fontSize: 10, ...T.fontBold, minWidth: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" },
  avatar: { width: T.hit, height: T.hit, borderRadius: "50%", background: "var(--yellow)", color: "#000", ...sLargeB, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
};

/* ------------------------------------------------------------------ *
 *  BREADCRUMB                                                         *
 * ------------------------------------------------------------------ */
function Breadcrumb({ orderNo }) {
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0 16px" }}>
      <a href="Import.html" style={{ ...sBody, color: "var(--ink-2)", textDecoration: "none" }} className="om-link">Home</a>
      <IconChevronRight size={14} stroke={2} />
      <a href="Order List Page.html" style={{ ...sBody, color: "var(--ink-2)", textDecoration: "none" }} className="om-link">Active Orders</a>
      <IconChevronRight size={14} stroke={2} />
      <span style={{ ...sBodyB, color: "var(--ink)" }}>Order: {orderNo}</span>
    </nav>
  );
}

/* ------------------------------------------------------------------ *
 *  ORDER HEADER                                                       *
 * ------------------------------------------------------------------ */
function OrderHeader({ order, total, onUpdateMeta }) {
  const fields = [
    { key: "reference",    label: "Reference",    placeholder: "Set on Order Details" },
    { key: "customer",     label: "Customer",     placeholder: "Set on Order Details" },
    { key: "purchaseOrder",label: "Purchase Order", placeholder: "Not set" },
    { key: "orderPlaced",  label: "Order Placed", readonly: true },
    { key: "orderNo",      label: "HM Order Number", readonly: true },
    { key: "status",       label: "Status",       readonly: true, badge: true },
  ];
  return (
    <div style={headerStyles.wrap}>
      <div style={headerStyles.fields}>
        {fields.map((f) => (
          <HeaderField key={f.key} {...f} value={order[f.key]} onChange={(v) => onUpdateMeta(f.key, v)} />
        ))}
      </div>
      <div style={headerStyles.summary}>
        <div style={{ ...sBody, color: "var(--ink-2)", marginBottom: 4 }}>Total Order Value</div>
        <div style={{ ...T.fontBold, fontSize: 32, color: "var(--ink)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmt(total, order.currency)}</div>
        <div style={{ ...sBody, color: "var(--ink-3)", marginTop: 6 }}>{order.lines.length} line{order.lines.length !== 1 ? "s" : ""} · {order.lines.reduce((s, l) => s + l.qty, 0)} unit{order.lines.reduce((s, l) => s + l.qty, 0) !== 1 ? "s" : ""}</div>
      </div>
    </div>
  );
}

function HeaderField({ label, value, placeholder, readonly, badge, onChange }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);

  const display = value || placeholder || "—";
  const isMissing = !value && !readonly;

  if (readonly) {
    return (
      <div style={headerStyles.field}>
        <div style={headerStyles.label}>{label}</div>
        {badge
          ? <StatusBadge status={value} />
          : <div style={{ ...sBodyB, color: "var(--ink)" }}>{display}</div>}
      </div>
    );
  }

  return (
    <div style={headerStyles.field}>
      <div style={headerStyles.label}>{label}</div>
      {editing ? (
        <input
          autoFocus value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => { onChange(v.trim() || null); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setV(value || ""); setEditing(false); } }}
          style={headerStyles.input}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="om-header-edit"
          style={{
            ...sBodyB, color: isMissing ? "var(--ink-3)" : "var(--ink)",
            border: "none", background: "transparent", padding: 0,
            textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
          <span>{display}</span>
          <IconEdit size={12} stroke={1.7} style={{ opacity: 0.5 }} />
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    "Draft":     { bg: "var(--line)", fg: "var(--ink)" },
    "Confirmed": { bg: "var(--green-soft)", fg: "var(--green)" },
    "Submitted": { bg: "var(--blue-soft)", fg: "var(--blue)" },
    "Cancelled": { bg: "var(--red-soft)", fg: "var(--red)" },
  };
  const c = map[status] || { bg: "var(--line)", fg: "var(--ink-2)" };
  return (
    <span style={{ ...sBodyB, color: c.fg, background: c.bg, padding: "4px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: c.fg }} />
      {status}
    </span>
  );
}

const headerStyles = {
  wrap: { display: "grid", gridTemplateColumns: "1fr auto", gap: 32, padding: "20px 0 24px", borderBottom: "1px solid var(--line)" },
  fields: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px 32px" },
  field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  label: { ...sBodyB, color: "var(--ink-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 },
  input: { ...sBodyB, color: "var(--ink)", border: "2px solid var(--brand)", borderRadius: 4, padding: "6px 8px", margin: "-6px -8px", outline: "none", background: "#fff", maxWidth: 240 },
  summary: { padding: "16px 24px", borderLeft: "1px solid var(--line)", minWidth: 240, display: "flex", flexDirection: "column", justifyContent: "center" },
};

/* ------------------------------------------------------------------ *
 *  TAB STRIP                                                          *
 * ------------------------------------------------------------------ */
function TabStrip({ active, onChange }) {
  const tabs = [
    { id: "details",   label: "Order Details" },
    { id: "lines",     label: "Order Lines" },
    { id: "documents", label: "Documents" },
    { id: "history",   label: "History" },
    { id: "margins",   label: "Margins" },
  ];
  return (
    <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 24, marginTop: 8 }}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="om-tab-strip"
            data-active={isActive}
            style={{
              ...sLargeB,
              border: "none", background: "transparent", cursor: "pointer",
              padding: "14px 24px",
              color: isActive ? "var(--brand)" : "var(--ink-2)",
              borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color .15s ease, border-color .15s ease",
            }}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  EMPTY-TAB PLACEHOLDERS                                              *
 * ------------------------------------------------------------------ */
function ComingSoon({ tab }) {
  const titles = {
    details: "Order Details",
    documents: "Documents",
    history: "History",
    margins: "Margins",
  };
  return (
    <div style={{ padding: "80px 24px", textAlign: "center", border: "1px dashed var(--line)", borderRadius: "var(--radius)", background: "var(--bg-soft)" }}>
      <div style={{ ...sLargeB, color: "var(--ink)", marginBottom: 6 }}>{titles[tab]} — coming soon</div>
      <div style={{ ...sBody, color: "var(--ink-2)" }}>This tab is not built yet. Switch to <strong>Order Lines</strong> to manage line items.</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  ORDER LINES TABLE                                                  *
 * ------------------------------------------------------------------ */
const LINE_COLS = "40px 48px minmax(160px, 1.2fr) minmax(140px, 1.4fr) 80px 100px 80px 110px 120px 100px 120px 110px 76px";

function OrderLinesTable({ lines, currency, orderPlaced, query, setQuery, onUpdateLine, onUpdateChild, onDuplicate, onDelete, onExplode, onReorder, onAddLine }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return lines;
    const q = query.toLowerCase();
    return lines.filter(l => [l.articleCode, l.featureString, l.productName].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [lines, query]);

  return (
    <div>
      {/* Tools row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div className="om-search-wrap" style={{
          display: "flex", alignItems: "center",
          width: 380, height: 50,
          border: "2px solid var(--ink)", borderRadius: "var(--radius)",
          background: "#fff",
          transition: "box-shadow .15s ease",
        }}>
          <span style={{ width: T.hit, height: T.hit, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <IconSearch size={18} stroke={1.7} />
          </span>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, feature or product"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", ...sBody, color: "var(--ink)", paddingRight: 12 }}
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search"
                    style={{ width: 36, height: 36, marginRight: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 18 }}>
              <IconClose size={14} />
            </button>
          )}
        </div>
        <button
          onClick={onAddLine}
          className="om-primary-btn"
          style={{
            ...sLargeB,
            height: 50, padding: "0 20px",
            border: "2px solid var(--brand)", borderRadius: "var(--radius)",
            background: "var(--brand)", color: "#fff",
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 10,
            transition: "background .15s ease",
          }}>
          <IconPlus size={18} stroke={2} />
          <span style={{ whiteSpace: "nowrap" }}>Add Line</span>
        </button>
      </div>

      {/* Table */}
      <div style={lineStyles.tableWrap}>
        <div style={{ ...lineStyles.header, gridTemplateColumns: LINE_COLS }}>
          <div /> {/* drag handle */}
          <div style={lineStyles.headCell}>#</div>
          <div style={lineStyles.headCell}>Article Code</div>
          <div style={lineStyles.headCell}>Short Description</div>
          <div style={{ ...lineStyles.headCell, textAlign: "center" }}>Qty</div>
          <div style={{ ...lineStyles.headCell, textAlign: "right" }}>List Price</div>
          <div style={{ ...lineStyles.headCell, textAlign: "right" }}>Discount</div>
          <div style={{ ...lineStyles.headCell, textAlign: "right" }}>Unit Buying</div>
          <div style={{ ...lineStyles.headCell, textAlign: "right" }}>Total Buying</div>
          <div style={{ ...lineStyles.headCell, textAlign: "center" }}>Lead Time</div>
          <div style={lineStyles.headCell}>Delivery Date</div>
          <div style={lineStyles.headCell}>Status</div>
          <div style={{ ...lineStyles.headCell, textAlign: "center" }}>Actions</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center" }}>
            <div style={{ ...sBodyB, color: "var(--ink)", marginBottom: 4 }}>{query ? "No lines match your search" : "No order lines yet"}</div>
            <div style={{ ...sBody, color: "var(--ink-2)" }}>{query ? "Clear the search to see all lines." : "Click \"Add Line\" to add one manually."}</div>
          </div>
        ) : (
          filtered.map((line, idx) => (
            <LineBlock
              key={line.id}
              line={line}
              idx={idx}
              currency={currency}
              orderPlaced={orderPlaced}
              isDragging={dragIdx === idx}
              isOver={overIdx === idx && dragIdx !== null && dragIdx !== idx}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
              onDragLeave={() => setOverIdx(o => o === idx ? null : o)}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) onReorder(dragIdx, idx); setDragIdx(null); setOverIdx(null); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              onUpdate={(patch) => onUpdateLine(line.id, patch)}
              onUpdateChild={(childId, patch) => onUpdateChild(line.id, childId, patch)}
              onDuplicate={() => onDuplicate(line.id)}
              onDelete={() => onDelete(line.id)}
              onExplode={() => onExplode(line.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LineBlock(props) {
  const { line } = props;
  const [expanded, setExpanded] = useState(false);
  const isSuper = !!line.isSuper && Array.isArray(line.superChildren);

  return (
    <>
      <LineRow {...props} expanded={expanded} onToggleExpand={() => setExpanded(e => !e)} isSuper={isSuper} />
      {isSuper && expanded && (
        <SuperChildren parent={line} onUpdateChild={props.onUpdateChild} currency={props.currency} />
      )}
    </>
  );
}

function LineRow({ line, idx, currency, orderPlaced, isDragging, isOver, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onUpdate, onDuplicate, onDelete, onExplode, isSuper, expanded, onToggleExpand }) {
  const [editingCode, setEditingCode] = useState(false);
  const [codeVal, setCodeVal] = useState("");
  const combined = line.articleCode + (line.featureString ? " " + line.featureString : "");

  const startEdit = () => { setCodeVal(combined); setEditingCode(true); };
  const saveEdit = () => {
    const v = codeVal.trim();
    if (v && v !== combined) {
      const sp = v.indexOf(" ");
      const articleCode = sp > 0 ? v.slice(0, sp) : v;
      const featureString = sp > 0 ? v.slice(sp + 1) : "";
      // Re-validate
      const result = validateItem(articleCode, featureString);
      onUpdate({
        articleCode, featureString,
        productName: result.valid ? result.productName : null,
        listPrice: result.valid ? result.price : 0,
        currency: result.currency || currency,
        validationStatus: result.valid ? "passed" : "failed",
        validationError: result.error,
        isSuper: !!result.isSuper,
        superChildren: result.superChildren || null,
      });
    }
    setEditingCode(false);
  };

  // For super: roll up child prices so parent reflects current children state
  const effectiveListPrice = isSuper
    ? line.superChildren.reduce((s, c) => s + (c.listPrice || 0) * (c.qty || 1), 0)
    : line.listPrice;
  const unitBuying = effectiveListPrice * (1 - (line.discount || 0) / 100);
  const totalBuying = unitBuying * line.qty;
  const ccy = line.currency || currency;
  const isInvalid = line.validationStatus === "failed";
  const lead = line.leadTime || mockLeadTime(line.productLine, line.articleCode);
  const deliveryDate = computeDeliveryDate(orderPlaced || new Date(), lead);

  return (
    <div
      className="om-line-row"
      data-dragging={isDragging}
      data-over={isOver}
      data-super={isSuper}
      data-expanded={expanded}
      style={{
        display: "grid", gridTemplateColumns: LINE_COLS,
        alignItems: "center", minHeight: 64,
        borderTop: "1px solid var(--line)",
        background: isOver
          ? "var(--brand-soft)"
          : (isInvalid ? "var(--red-soft)" : (isSuper && expanded ? "var(--blue-soft)" : "#fff")),
        opacity: isDragging ? 0.4 : 1,
        transition: "background .12s ease, opacity .12s ease",
      }}
      draggable={!editingCode}
      onDragStart={!editingCode ? onDragStart : undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div style={{ display: "flex", justifyContent: "center", color: "var(--ink-3)", cursor: editingCode ? "default" : "grab" }} title="Drag to reorder">
        <DragHandle />
      </div>
      <div style={{ padding: "0 6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        {isSuper && (
          <button onClick={onToggleExpand} aria-label={expanded ? "Collapse parts" : "Expand parts"}
                  style={lineStyles.expandBtn}>
            {expanded ? <IconMinus size={14} stroke={2.4} /> : <IconPlus size={14} stroke={2.4} />}
          </button>
        )}
        <span style={{ ...sBody, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>{idx + 1}</span>
        {isInvalid && <span style={{ width: 14, height: 14, borderRadius: 7, background: "var(--red)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><IconClose size={9} stroke={3} /></span>}
      </div>

      {/* Article code + feature */}
      <div style={{ padding: "10px 16px", minWidth: 0 }}>
        {editingCode ? (
          <input
            autoFocus value={codeVal}
            onChange={(e) => setCodeVal(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingCode(false); }}
            style={lineStyles.codeInput}
          />
        ) : (
          <button onClick={startEdit} className="om-code-edit" style={{
            display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
            width: "100%", border: "none", background: "transparent", cursor: "text", padding: 0, textAlign: "left",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...sBodyB, color: "var(--ink)" }}>{line.articleCode}</span>
              {isSuper && <SuperBadge count={line.superChildren.length} />}
            </span>
            {line.featureString && (
              <span style={{ ...sBody, color: "var(--ink-2)", fontSize: 12, fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" }}>{line.featureString}</span>
            )}
          </button>
        )}
      </div>

      {/* Short description (product name) */}
      <div style={{ padding: "0 16px", minWidth: 0 }}>
        {line.productName
          ? <span style={{ ...sBody, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{line.productName}</span>
          : <span style={{ ...sBody, color: isInvalid ? "var(--red)" : "var(--ink-3)" }}>{isInvalid ? line.validationError || "Not found" : "—"}</span>}
      </div>

      {/* Qty */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <QtyStepper qty={line.qty} onChange={(q) => onUpdate({ qty: Math.max(1, q) })} />
      </div>

      {/* List price */}
      <div style={{ padding: "0 12px", textAlign: "right" }}>
        <span style={{ ...sBody, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{effectiveListPrice > 0 ? fmt(effectiveListPrice, ccy) : <span style={{ color: "var(--ink-3)" }}>—</span>}</span>
      </div>

      {/* Discount */}
      <div style={{ padding: "0 8px", textAlign: "right" }}>
        <DiscountInput value={line.discount || 0} onChange={(v) => onUpdate({ discount: v })} />
      </div>

      {/* Unit Buying Price */}
      <div style={{ padding: "0 12px", textAlign: "right" }}>
        <span style={{ ...sBodyB, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{effectiveListPrice > 0 ? fmt(unitBuying, ccy) : <span style={{ color: "var(--ink-3)" }}>—</span>}</span>
      </div>

      {/* Total Buying Price */}
      <div style={{ padding: "0 12px", textAlign: "right" }}>
        <span style={{ ...sBodyB, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{effectiveListPrice > 0 ? fmt(totalBuying, ccy) : <span style={{ color: "var(--ink-3)" }}>—</span>}</span>
      </div>

      {/* Lead Time */}
      <div style={{ padding: "0 8px", textAlign: "center" }}>
        <span style={{ ...sBody, color: "var(--ink-2)" }}>{lead.label}</span>
      </div>

      {/* Delivery Date */}
      <div style={{ padding: "0 12px" }}>
        <span style={{ ...sBody, color: "var(--ink)" }}>{deliveryDate}</span>
      </div>

      {/* Status */}
      <div style={{ padding: "0 12px" }}>
        <LineStatusPill status={isInvalid ? "not-found" : (line.lineStatus || "confirmed")} />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
        {isSuper && (
          <button onClick={onExplode} aria-label="Explode super product" title="Explode into individual lines" className="om-row-action" style={lineStyles.actBtn}>
            <IconExplode size={15} />
          </button>
        )}
        <button onClick={onDuplicate} aria-label="Duplicate" title="Duplicate" className="om-row-action" style={lineStyles.actBtn}>
          <IconCopy size={15} stroke={1.7} />
        </button>
        <button onClick={onDelete} aria-label="Delete" title="Delete" className="om-row-action" style={lineStyles.actBtn}>
          <IconTrash size={15} stroke={1.7} />
        </button>
      </div>
    </div>
  );
}

function SuperBadge({ count }) {
  return (
    <span style={{
      fontWeight: 700, letterSpacing: 0.4, fontSize: 10.5,
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

function SuperChildren({ parent, currency, onUpdateChild }) {
  const parentQty = parent.qty || 1;
  return (
    <div style={superStyles.wrap}>
      <div style={{ ...sBodyB, color: "var(--ink-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, padding: "12px 16px 6px 60px" }}>
        Bundle Contents · {parent.superChildren.length} parts
      </div>
      <div style={superStyles.tableWrap}>
        <div style={{ ...superStyles.header, gridTemplateColumns: superStyles.cols }}>
          <div style={superStyles.headCell}>Component Item</div>
          <div style={superStyles.headCell}>Feature String</div>
          <div style={superStyles.headCell}>Short Description</div>
          <div style={superStyles.headCell}>Product Code</div>
          <div style={{ ...superStyles.headCell, textAlign: "center" }}>Quantity</div>
          <div style={{ ...superStyles.headCell, textAlign: "center" }}>Qty Shipped</div>
          <div style={{ ...superStyles.headCell, textAlign: "right" }}>Total Price</div>
        </div>
        {parent.superChildren.map((c) => {
          const effQty = (c.qty || 1) * parentQty;
          const total = (c.listPrice || 0) * effQty;
          const ccy = c.currency || parent.currency || currency;
          return (
            <div key={c.id} style={{ ...superStyles.row, gridTemplateColumns: superStyles.cols }}>
              <div style={superStyles.cell}>
                <span style={{ ...sBodyB, color: "var(--ink)" }}>{c.articleCode}</span>
              </div>
              <div style={superStyles.cell}>
                {c.editableFinish && Array.isArray(c.finishOptions) ? (
                  <FinishSelect
                    value={c.featureString}
                    options={c.finishOptions}
                    onChange={(v) => onUpdateChild(c.id, { featureString: v })}
                  />
                ) : (
                  <span style={{ ...sBody, color: "var(--ink-2)", fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12 }}>{c.featureString || "—"}</span>
                )}
              </div>
              <div style={superStyles.cell}>
                <span style={{ ...sBody, color: "var(--ink)" }}>{c.shortDescription}</span>
              </div>
              <div style={superStyles.cell}>
                <span style={{ ...sBody, color: "var(--ink-2)" }}>{c.productCode}</span>
              </div>
              <div style={{ ...superStyles.cell, justifyContent: "center" }}>
                <span style={{ ...sBodyB, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{effQty}</span>
                {parentQty > 1 && <span style={{ ...sBody, color: "var(--ink-3)", marginLeft: 6, fontSize: 11 }}>({c.qty} × {parentQty})</span>}
              </div>
              <div style={{ ...superStyles.cell, justifyContent: "center" }}>
                <ShippedInput
                  value={c.qtyShipped || 0}
                  max={effQty}
                  onChange={(v) => onUpdateChild(c.id, { qtyShipped: v })}
                />
              </div>
              <div style={{ ...superStyles.cell, justifyContent: "flex-end" }}>
                <span style={{ ...sBody, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{fmt(total, ccy)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinishSelect({ value, options, onChange }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--line)", borderRadius: 4, padding: "0 8px 0 10px", height: 30, background: "#fff", maxWidth: "100%" }}>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", ...sBodyB, fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", fontSize: 12, color: "var(--ink)", appearance: "none", WebkitAppearance: "none", paddingRight: 4 }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <IconChevronDown size={12} stroke={2} />
    </div>
  );
}

function ShippedInput({ value, max, onChange }) {
  return (
    <input
      type="number" min={0} max={max} value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(0, parseInt(e.target.value, 10) || 0)))}
      style={{ width: 60, height: 30, border: "1px solid var(--line)", borderRadius: 4, textAlign: "center", outline: "none", ...sBodyB, color: "var(--ink)", background: "#fff", MozAppearance: "textfield" }}
      aria-label="Quantity shipped"
    />
  );
}

const superStyles = {
  wrap: { background: "var(--blue-soft)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" },
  tableWrap: { margin: "0 16px 16px 60px", background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" },
  cols: "minmax(140px, 1fr) 100px minmax(180px, 1.6fr) 110px 90px 90px 110px",
  header: { display: "grid", background: "var(--bg-soft)", minHeight: 38, alignItems: "stretch" },
  headCell: { padding: "0 14px", display: "flex", alignItems: "center", color: "var(--ink-2)", ...sBodyB, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" },
  row: { display: "grid", alignItems: "center", minHeight: 48, borderTop: "1px solid var(--line)" },
  cell: { padding: "8px 14px", display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" },
};

function DragHandle() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
      {[5, 11].map(x => [4, 10, 16].map(y => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />
      )))}
    </svg>
  );
}

function QtyStepper({ qty, onChange }) {
  return (
    <div style={lineStyles.qty}>
      <button onClick={() => onChange(qty - 1)} disabled={qty <= 1} style={lineStyles.qtyBtn} aria-label="Decrease">−</button>
      <input value={qty} type="number" min={1}
             onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
             style={lineStyles.qtyInput} aria-label="Quantity" />
      <button onClick={() => onChange(qty + 1)} style={lineStyles.qtyBtn} aria-label="Increase">+</button>
    </div>
  );
}

function DiscountInput({ value, onChange }) {
  return (
    <div style={lineStyles.discWrap}>
      <input
        type="number" min={0} max={100} step={0.01}
        value={value}
        onChange={(e) => onChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        style={lineStyles.discInput}
        aria-label="Discount percentage"
      />
      <span style={{ ...sBody, color: "var(--ink-2)" }}>%</span>
    </div>
  );
}

const lineStyles = {
  tableWrap: { border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", background: "#fff" },
  header: { display: "grid", background: "var(--ink)", minHeight: T.rowH, alignItems: "stretch" },
  headCell: { padding: "0 16px", display: "flex", alignItems: "center", color: "#fff", ...sBodyB, fontSize: 12.5, whiteSpace: "nowrap" },
  codeInput: { width: "100%", height: 36, border: "2px solid var(--brand)", borderRadius: 4, padding: "0 10px", ...sBody, color: "var(--ink)", outline: "none", fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" },
  qty: { display: "inline-flex", alignItems: "center", border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", height: 32 },
  qtyBtn: { width: 28, height: 30, border: "none", background: "#fff", color: "var(--ink)", cursor: "pointer", ...sLargeB, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  qtyInput: { width: 40, height: 30, border: "none", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)", textAlign: "center", outline: "none", ...sBodyB, color: "var(--ink)", background: "#fff", MozAppearance: "textfield" },
  discWrap: { display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "0 8px", height: 32, background: "#fff" },
  discInput: { width: 50, height: 30, border: "none", outline: "none", background: "transparent", textAlign: "right", ...sBodyB, color: "var(--ink)", fontVariantNumeric: "tabular-nums", MozAppearance: "textfield" },
  actBtn: { width: 30, height: 30, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "background .12s ease, color .12s ease" },
  expandBtn: { width: 20, height: 20, borderRadius: 3, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .12s ease, color .12s ease" },
};

/* ------------------------------------------------------------------ *
 *  BOTTOM ACTION BAR (sticky)                                          *
 * ------------------------------------------------------------------ */
function ActionBar({ canSubmit, missingMeta, onSaveDraft, onSubmit, onCancel, total, currency }) {
  return (
    <div style={actionBarStyles.bar}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ ...sBody, color: "var(--ink-2)" }}>Total Order Value</div>
        <div style={{ ...T.fontBold, fontSize: 20, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{fmt(total, currency)}</div>
      </div>
      <div style={{ flex: 1, paddingLeft: 32, ...sBody, color: missingMeta.length ? "var(--amber)" : "var(--ink-2)" }}>
        {missingMeta.length === 0
          ? canSubmit ? "Ready to submit." : "Resolve invalid lines before submitting."
          : `Missing for submission: ${missingMeta.join(", ")}. Complete on Order Details.`}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onCancel} className="om-stroke-btn" style={actionBarStyles.ghost}>Cancel</button>
        <button onClick={onSaveDraft} className="om-stroke-btn" style={actionBarStyles.ghost}>Save Draft</button>
        <button onClick={onSubmit} disabled={!canSubmit || missingMeta.length > 0}
                className="om-primary-btn"
                style={{
                  ...actionBarStyles.primary,
                  background: (canSubmit && !missingMeta.length) ? "var(--brand)" : "var(--line)",
                  borderColor: (canSubmit && !missingMeta.length) ? "var(--brand)" : "var(--line)",
                  color: (canSubmit && !missingMeta.length) ? "#fff" : "var(--ink-3)",
                  cursor: (canSubmit && !missingMeta.length) ? "pointer" : "not-allowed",
                }}>
          Submit Order
        </button>
      </div>
    </div>
  );
}

const actionBarStyles = {
  bar: {
    position: "sticky", bottom: 0, left: 0, right: 0,
    background: "#fff",
    borderTop: "1px solid var(--line)",
    padding: "16px 40px",
    display: "flex", alignItems: "center", gap: 24,
    boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
    zIndex: 20,
  },
  ghost: { ...sLargeB, height: 50, padding: "0 18px", border: "2px solid var(--ink)", borderRadius: "var(--radius)", background: "#fff", color: "var(--ink)", cursor: "pointer", transition: "background .15s ease, color .15s ease" },
  primary: { ...sLargeB, height: 50, padding: "0 28px", border: "2px solid var(--brand)", borderRadius: "var(--radius)", transition: "background .15s ease" },
};

/* ------------------------------------------------------------------ *
 *  TOAST                                                              *
 * ------------------------------------------------------------------ */
function Toast({ message, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
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
  const [order, setOrder] = useState(null);
  const [tab, setTab] = useState("lines");
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem("eos:pendingOrder") || "null"); } catch (e) {}
    if (stored) {
      setOrder(stored);
    } else {
      // Stand up a fallback order so the page is browsable directly
      const draftNo = "234" + String(Math.floor(Math.random() * 9999999)).padStart(7, "0");
      setOrder({
        orderNo: draftNo,
        status: "Draft",
        currency: "EUR",
        orderPlaced: new Date().toISOString().slice(0, 10),
        reference: null, customer: null, purchaseOrder: null, project: null, description: null,
        lines: [
          // A couple of sample lines so the page isn't empty when opened directly
          { id: "demo-1", articleCode: "AER1B23DW", featureString: "ALP G1 G1 G1 BB BK 23103", productName: "AERON", productLine: "AERON", qty: 2, listPrice: 2283, discount: 10, currency: "EUR", validationStatus: "passed" },
          { id: "demo-2", articleCode: "AS1EA33AA", featureString: "N2 BK BB BK BK 7O005", productName: "SAYL", productLine: "SAYL", qty: 4, listPrice: 901, discount: 0, currency: "EUR", validationStatus: "passed" },
          // Atlas Sit-to-Stand Desk — a SUPER product, expanded into children
          {
            id: "demo-3",
            articleCode: "UPXSGA4NN22PPNU.0814RAM",
            featureString: "X1 G1 G1",
            productName: "Atlas Sit-to-Stand Desk",
            productLine: "ATLAS",
            qty: 1, listPrice: 1265.40, discount: 0, currency: "GBP",
            validationStatus: "passed",
            isSuper: true,
            superChildren: (window.lookupSuper && window.lookupSuper("UPXSGA4NN22PPNU.0814RAM")?.children) || [],
          },
        ],
      });
    }
  }, []);

  const updateMeta = useCallback((key, value) => {
    setOrder(o => ({ ...o, [key]: value }));
  }, []);

  const updateLine = useCallback((id, patch) => {
    setOrder(o => ({ ...o, lines: o.lines.map(l => l.id === id ? { ...l, ...patch } : l) }));
  }, []);

  const updateChild = useCallback((lineId, childId, patch) => {
    setOrder(o => ({
      ...o,
      lines: o.lines.map(l => {
        if (l.id !== lineId || !l.superChildren) return l;
        return { ...l, superChildren: l.superChildren.map(c => c.id === childId ? { ...c, ...patch } : c) };
      }),
    }));
  }, []);

  const explodeLine = useCallback((id) => {
    setOrder(o => {
      const idx = o.lines.findIndex(l => l.id === id);
      if (idx < 0) return o;
      const parent = o.lines[idx];
      if (!parent.isSuper || !parent.superChildren) return o;
      const groupId = `exp-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`;
      const expanded = parent.superChildren.map((c, i) => ({
        id: `l-${Math.random().toString(36).slice(2, 9)}-${Date.now()}-${i}`,
        articleCode: c.articleCode,
        featureString: c.featureString || "",
        productName: c.shortDescription,
        productLine: parent.productLine,
        qty: (c.qty || 1) * parent.qty,
        listPrice: c.listPrice || 0,
        discount: parent.discount || 0,
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
          parentDiscount: parent.discount || 0,
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
      const next = [...o.lines];
      next.splice(idx, 1, ...expanded);
      return { ...o, lines: next };
    });
    setToast("Super product exploded into individual lines");
  }, []);

  const duplicateLine = useCallback((id) => {
    setOrder(o => {
      const idx = o.lines.findIndex(l => l.id === id);
      if (idx < 0) return o;
      const dup = { ...o.lines[idx], id: `l-${Math.random().toString(36).slice(2, 9)}-${Date.now()}` };
      const next = [...o.lines]; next.splice(idx + 1, 0, dup);
      return { ...o, lines: next };
    });
    setToast("Line duplicated");
  }, []);

  const deleteLine = useCallback((id) => {
    setOrder(o => ({ ...o, lines: o.lines.filter(l => l.id !== id) }));
  }, []);

  const reorderLines = useCallback((from, to) => {
    setOrder(o => {
      const next = [...o.lines];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...o, lines: next };
    });
  }, []);

  const addLine = useCallback(() => {
    setOrder(o => ({
      ...o,
      lines: [...o.lines, {
        id: `l-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`,
        articleCode: "NEW-LINE", featureString: "", productName: null, productLine: null,
        qty: 1, listPrice: 0, discount: 0, currency: o.currency,
        validationStatus: "failed", validationError: 'Article code "NEW-LINE" does not exist in the product catalog',
      }],
    }));
    setToast("Line added — click the code to edit");
  }, []);

  const total = useMemo(() => {
    if (!order) return 0;
    return order.lines.reduce((s, l) => {
      const effectiveList = l.isSuper && Array.isArray(l.superChildren)
        ? l.superChildren.reduce((cs, c) => cs + (c.listPrice || 0) * (c.qty || 1), 0)
        : l.listPrice;
      return s + effectiveList * (1 - (l.discount || 0) / 100) * l.qty;
    }, 0);
  }, [order]);

  const allPassed = order && order.lines.length > 0 && order.lines.every(l => l.validationStatus === "passed");
  const missingMeta = useMemo(() => {
    if (!order) return [];
    const out = [];
    if (!order.reference)     out.push("Reference");
    if (!order.customer)      out.push("Customer");
    if (!order.purchaseOrder) out.push("Purchase Order");
    return out;
  }, [order]);

  const onSaveDraft = () => {
    try { localStorage.setItem("eos:pendingOrder", JSON.stringify(order)); } catch (e) {}
    setToast(`Order ${order.orderNo} saved as draft`);
  };
  const onSubmit = () => {
    setOrder(o => ({ ...o, status: "Submitted" }));
    setToast(`Order ${order.orderNo} submitted`);
    setTimeout(() => {
      try { localStorage.removeItem("eos:pendingOrder"); } catch (e) {}
      window.location.href = "Order List Page.html";
    }, 1200);
  };
  const onCancel = () => {
    if (confirm("Cancel this order? Unsaved changes will be lost.")) {
      try { localStorage.removeItem("eos:pendingOrder"); } catch (e) {}
      window.location.href = "Import.html";
    }
  };

  if (!order) {
    return <div style={{ padding: 80, textAlign: "center", ...sBody, color: "var(--ink-2)" }}>Loading…</div>;
  }

  return (
    <>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        button:focus-visible, a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .om-iconplus:hover { background: var(--line); border-radius: var(--radius); }
        .om-account-btn:hover { color: var(--brand); }
        .om-link:hover { color: var(--brand); }
        .om-tab-strip:hover[data-active="false"] { color: var(--ink); }
        .om-header-edit:hover { color: var(--brand) !important; }
        .om-stroke-btn:hover { background: var(--ink); color: #fff; }
        .om-primary-btn:not(:disabled):hover { background: #C42700 !important; border-color: #C42700 !important; }
        .om-line-row:hover { background: var(--bg-soft); }
        .om-line-row[data-over="true"] { background: var(--brand-soft) !important; }
        .om-row-action:hover { background: var(--line); color: var(--ink); }
        .om-code-edit:hover span:first-child { color: var(--brand); }
        .om-search-wrap:focus-within { box-shadow: 0 0 0 4px rgba(226,45,0,0.08); }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="orders" />

      <main style={{ maxWidth: 1408, margin: "0 auto", padding: "0 40px 24px" }}>
        <Breadcrumb orderNo={order.orderNo} />
        <OrderHeader order={order} total={total} onUpdateMeta={updateMeta} />
        <TabStrip active={tab} onChange={setTab} />

        {tab === "lines" ? (
          <OrderLinesTable
            lines={order.lines}
            currency={order.currency}
            orderPlaced={order.orderPlaced}
            query={query} setQuery={setQuery}
            onUpdateLine={updateLine}
            onUpdateChild={updateChild}
            onDuplicate={duplicateLine}
            onDelete={deleteLine}
            onExplode={explodeLine}
            onReorder={reorderLines}
            onAddLine={addLine}
          />
        ) : (
          <ComingSoon tab={tab} />
        )}
      </main>

      <ActionBar
        canSubmit={allPassed}
        missingMeta={missingMeta}
        total={total}
        currency={order.currency}
        onSaveDraft={onSaveDraft}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
