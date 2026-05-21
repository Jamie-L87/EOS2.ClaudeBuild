/* global React, ReactDOM, ORDERS, STATUS_COLOR, formatMoney,
   IconMenu, IconPlus, IconChevronDown, IconChevronRight,
   IconMail, IconHelp, IconSearch, IconEye, IconEyeOff,
   IconUpload, IconEllipsis, IconCheck, IconClose,
   IconArrowUp, IconArrowDown, IconSortable,
   IconCopy, IconArchive, IconShare, IconTrash, IconUnshare,
   IconCalendar, IconFilter, IconEdit */

const { useState, useMemo, useEffect, useRef, useCallback } = React;

/* ------------------------------------------------------------------ *
 *  Design tokens — mirror of EOS Cloud Component Library
 * ------------------------------------------------------------------ */
const T = {
  // type
  fontBold: { fontWeight: 700, letterSpacing: "0.010em" },
  fontMed:  { fontWeight: 500, letterSpacing: "0.010em" },
  body:     { fontSize: 13.33, lineHeight: 1.2 },
  large:    { fontSize: 16, lineHeight: 1.2 },
  // colors
  ink: "var(--ink)", ink2: "var(--ink-2)", ink3: "var(--ink-3)",
  line: "var(--line)", pin: "var(--pin)",
  brand: "var(--brand)", yellow: "var(--yellow)",
  // hit areas
  hit: 44,
  rowH: 50, tabH: 55,
};

const sBody  = { ...T.fontMed,  ...T.body  };
const sBodyB = { ...T.fontBold, ...T.body  };
const sLargeB = { ...T.fontBold, ...T.large };
const sLargeM = { ...T.fontMed,  ...T.large };

/* ------------------------------------------------------------------ *
 *  TOP NAV (92px tall, pin-line bottom)                                *
 * ------------------------------------------------------------------ */
function TopNav({ onMenu }) {
  return (
    <header style={topNavStyles.bar}>
      <div style={topNavStyles.menuGroup}>
        <button className="om-iconplus" style={topNavStyles.menuBtn} onClick={onMenu} aria-label="Open menu">
          <span style={topNavStyles.iconBox}><IconMenu size={20} stroke={1.6} /></span>
          <span style={{ ...sLargeM, color: "#000" }}>Menu</span>
        </button>
        <span style={topNavStyles.pinV} />
        <button className="om-create-btn" style={topNavStyles.createBtn}>
          <span style={{ ...sLargeB }}>Create New</span>
          <IconPlus size={18} stroke={2} />
        </button>
      </div>

      <div style={topNavStyles.rightGroup}>
        <button className="om-account-btn" style={topNavStyles.accountBtn}>
          <span style={{ ...sLargeB, color: "#000" }}>Tsunami Axis Ltd: UK-DK066080-GBP</span>
          <span style={topNavStyles.iconBox}><IconChevronDown size={16} /></span>
        </button>
        <span style={topNavStyles.pinV} />
        <button className="om-iconplus" style={topNavStyles.iconBtn} aria-label="Mail">
          <IconMail size={20} stroke={1.6} />
          <span style={topNavStyles.badge}>3</span>
        </button>
        <button className="om-iconplus" style={topNavStyles.iconBtn} aria-label="Help">
          <IconHelp size={20} stroke={1.6} />
        </button>
        <div style={topNavStyles.avatar} title="Me">ME</div>
      </div>
    </header>
  );
}

const topNavStyles = {
  bar: {
    height: 92,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px",
    background: "#fff",
    borderBottom: `1px solid var(--ink-deep)`,
    position: "sticky", top: 0, zIndex: 30,
  },
  menuGroup:  { display: "flex", alignItems: "center", gap: 16 },
  rightGroup: { display: "flex", alignItems: "center", gap: 12 },
  pinV: { width: 1, height: 64, background: "var(--pin)" },
  menuBtn: {
    display: "flex", alignItems: "center", gap: 0,
    border: "none", background: "transparent", cursor: "pointer",
    padding: 0, color: "var(--ink)",
  },
  iconBox: {
    width: T.hit, height: T.hit,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--ink)",
  },
  createBtn: {
    display: "flex", alignItems: "center", gap: 10,
    height: 50, padding: "0 24px",
    border: "2px solid var(--brand)", borderRadius: "var(--radius)",
    background: "var(--brand)", color: "#fff",
    cursor: "pointer",
    transition: "background .15s ease, color .15s ease, border-color .15s ease",
  },
  accountBtn: {
    display: "flex", alignItems: "center", gap: 0,
    border: "none", background: "transparent", cursor: "pointer",
    padding: 0,
  },
  iconBtn: {
    position: "relative",
    width: T.hit, height: T.hit, borderRadius: 22,
    border: "none", background: "transparent", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--ink)",
    transition: "background .15s ease",
  },
  badge: {
    position: "absolute", top: 6, right: 6,
    background: "var(--brand)", color: "#fff",
    fontSize: 10, fontWeight: 700, ...T.fontBold,
    minWidth: 16, height: 16, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 4px", border: "2px solid #fff",
  },
  avatar: {
    width: T.hit, height: T.hit, borderRadius: "50%",
    background: "var(--yellow)", color: "#000",
    ...sLargeB,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
};

/* ------------------------------------------------------------------ *
 *  BREADCRUMB                                                          *
 * ------------------------------------------------------------------ */
function Breadcrumb({ tab }) {
  const label = { active: "Active Orders", completed: "Completed Orders", archived: "Archived Orders" }[tab];
  return (
    <nav style={crumbStyles.bar} aria-label="Breadcrumb">
      <a href="#" className="om-link" style={{ ...sBody, color: "var(--ink-2)", textDecoration: "none" }}>Home</a>
      <span style={{ display: "inline-flex", alignItems: "center", color: "var(--ink-3)" }}>
        <IconChevronRight size={14} stroke={2} />
      </span>
      <span style={{ ...sBodyB, color: "var(--ink)" }}>{label}</span>
    </nav>
  );
}
const crumbStyles = {
  bar: { display: "flex", alignItems: "center", gap: 10, padding: "20px 0 18px" },
};

/* ------------------------------------------------------------------ *
 *  PILL TRIO TABS — 55px, 5px radius, 2px border, joined                *
 * ------------------------------------------------------------------ */
function TabsPill({ tab, setTab }) {
  const tabs = [
    { id: "active",    label: "Active Orders" },
    { id: "completed", label: "Completed Orders" },
    { id: "archived",  label: "Archived Orders" },
  ];
  return (
    <div style={tabsStyles.row} role="tablist">
      {tabs.map((t, i) => {
        const active = tab === t.id;
        const isFirst = i === 0;
        const isLast  = i === tabs.length - 1;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            className="om-tab"
            onClick={() => setTab(t.id)}
            style={{
              ...sLargeB,
              height: T.tabH,
              padding: "0 30px",
              border: "2px solid var(--ink)",
              borderRadius: 0,
              borderTopLeftRadius:     isFirst ? "var(--radius)" : 0,
              borderBottomLeftRadius:  isFirst ? "var(--radius)" : 0,
              borderTopRightRadius:    isLast  ? "var(--radius)" : 0,
              borderBottomRightRadius: isLast  ? "var(--radius)" : 0,
              borderRightWidth: isLast ? 2 : 1,
              borderLeftWidth:  isFirst ? 2 : 1,
              background: active ? "var(--brand)" : "#fff",
              color: active ? "#fff" : "var(--ink)",
              borderColor: active ? "var(--brand)" : "var(--ink)",
              cursor: "pointer",
              transition: "background .15s ease, color .15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
const tabsStyles = {
  row: { display: "inline-flex", marginRight: 24 },
};

/* ------------------------------------------------------------------ *
 *  SWITCH — 40×20, red ON, dark OFF                                    *
 * ------------------------------------------------------------------ */
function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        display: "inline-flex", alignItems: "center", gap: 12,
        border: "none", background: "transparent", cursor: "pointer",
        padding: 0, height: T.hit,
      }}
    >
      <span style={{
        width: T.hit, height: T.hit,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{
          width: 40, height: 20, borderRadius: 39,
          background: on ? "var(--brand)" : "var(--ink)",
          position: "relative", display: "inline-block",
          transition: "background .2s ease",
        }}>
          <span style={{
            position: "absolute", top: 2, left: on ? 22 : 4,
            width: 16, height: 16, borderRadius: "50%",
            background: "#fff",
            transition: "left .2s cubic-bezier(.4,0,.2,1)",
          }} />
        </span>
      </span>
      <span style={{ ...sBody, color: "var(--ink)" }}>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 *  UTILITY ROW — toggles + import + SIF links                          *
 * ------------------------------------------------------------------ */
function UtilityRow({ myOnly, setMyOnly, upcoming, setUpcoming }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40, height: T.hit, flexWrap: "wrap" }}>
      <Switch on={myOnly} onChange={setMyOnly} label="View only my orders" />
      <Switch on={upcoming} onChange={setUpcoming} label="View upcoming deliveries" />
      <button className="om-textlink" style={{ display: "inline-flex", alignItems: "center", gap: 12, border: "none", background: "transparent", cursor: "pointer", padding: 0, color: "var(--ink)" }}>
        <span style={{ ...sBody }}>Raise Service Issue Form (SIF)</span>
        <span style={{ width: T.hit, height: T.hit, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <IconHelp size={20} stroke={1.6} />
        </span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  SEARCH BAR — 5px radius, 2px black border, 55px tall                 *
 * ------------------------------------------------------------------ */
function SearchBar({ query, setQuery }) {
  return (
    <div className="om-search-wrap" style={searchStyles.wrap}>
      <span style={{ width: T.hit, height: T.hit, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <IconSearch size={18} stroke={1.7} />
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by"
        style={searchStyles.input}
      />
      {query && (
        <button onClick={() => setQuery("")} aria-label="Clear search"
          style={{ width: 36, height: 36, marginRight: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 18 }}>
          <IconClose size={16} />
        </button>
      )}
    </div>
  );
}
const searchStyles = {
  wrap: {
    display: "flex", alignItems: "center",
    width: 339, height: T.tabH,
    border: "2px solid var(--ink)", borderRadius: "var(--radius)",
    background: "#fff",
    transition: "box-shadow .15s ease",
  },
  input: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    ...sBody, color: "var(--ink)",
    paddingRight: 12,
  },
};

/* ------------------------------------------------------------------ *
 *  FILTER + ELLIPSIS BUTTONS (right side)                              *
 * ------------------------------------------------------------------ */
function FilterButtons({ filtersOpen, setFiltersOpen, activeFilterCount, onEllipsis }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        className="om-stroke-btn"
        onClick={() => setFiltersOpen(!filtersOpen)}
        style={{
          ...sLargeB,
          height: 50, padding: "0 18px",
          border: "2px solid var(--ink)", borderRadius: "var(--radius)",
          background: filtersOpen ? "var(--brand)" : "#fff",
          color: filtersOpen ? "#fff" : "var(--ink)",
          borderColor: filtersOpen ? "var(--brand)" : "var(--ink)",
          cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 10,
          transition: "background .15s ease, color .15s ease, border-color .15s ease",
        }}
      >
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span style={{
            background: "var(--brand)", color: "#fff",
            fontSize: 11, ...T.fontBold,
            minWidth: 20, height: 20, borderRadius: 10,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            padding: "0 6px",
          }}>{activeFilterCount}</span>
        )}
        <span style={{ width: 16, height: 16, display: "inline-flex" }}>
          {filtersOpen ? <IconEyeOff size={16} stroke={1.7} /> : <IconEye size={16} stroke={1.7} />}
        </span>
      </button>
      <button
        className="om-stroke-icon-btn"
        onClick={onEllipsis}
        aria-label="More"
        style={{
          width: 50, height: 50,
          border: "2px solid var(--ink)", borderRadius: "var(--radius)",
          background: "#fff", color: "var(--ink)",
          cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          transition: "background .15s ease, color .15s ease",
        }}
      >
        <IconEllipsis size={20} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  FILTERS PANEL                                                       *
 * ------------------------------------------------------------------ */
function FiltersPanel({ filters, setFilters, statusOptions, customerOptions, typeOptions }) {
  const set = (k, v) => setFilters({ ...filters, [k]: v });
  return (
    <div style={filterStyles.panel}>
      <div style={filterStyles.grid}>
        <FilterSelect label="CUSTOMER" value={filters.customer} options={customerOptions} onChange={(v) => set("customer", v)} />
        <FilterSelect label="STATUS" value={filters.status} options={statusOptions} onChange={(v) => set("status", v)} />
        <FilterSelect label="ORDER TYPE" value={filters.type} options={typeOptions} onChange={(v) => set("type", v)} />
        <FilterDate   label="ORDER PLACED (FROM)" value={filters.dateFrom} onChange={(v) => set("dateFrom", v)} />
        <FilterDate   label="ORDER PLACED (TO)"   value={filters.dateTo}   onChange={(v) => set("dateTo", v)} />
        <FilterRange  label="ORDER VALUE (£)" min={filters.valueMin} max={filters.valueMax}
                      onChange={(min, max) => setFilters({ ...filters, valueMin: min, valueMax: max })} />
      </div>
      <div style={filterStyles.footer}>
        <button onClick={() => setFilters({})} className="om-link"
                style={{ ...sBody, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-2)", textDecoration: "underline", textUnderlineOffset: 3 }}>
          Clear all filters
        </button>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label style={filterStyles.field}>
      <span style={filterStyles.label}>{label}</span>
      <div style={filterStyles.fieldWrap}>
        <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} style={filterStyles.select}>
          <option value="">All</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <IconChevronDown size={16} stroke={1.7} />
      </div>
    </label>
  );
}
function FilterDate({ label, value, onChange }) {
  return (
    <label style={filterStyles.field}>
      <span style={filterStyles.label}>{label}</span>
      <div style={filterStyles.fieldWrap}>
        <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value || null)} style={filterStyles.input} />
        <IconCalendar size={16} stroke={1.7} />
      </div>
    </label>
  );
}
function FilterRange({ label, min, max, onChange }) {
  return (
    <label style={filterStyles.field}>
      <span style={filterStyles.label}>{label}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ ...filterStyles.fieldWrap, flex: 1 }}>
          <input type="number" placeholder="Min" value={min || ""} onChange={(e) => onChange(e.target.value || null, max)} style={filterStyles.input} />
        </div>
        <div style={{ ...filterStyles.fieldWrap, flex: 1 }}>
          <input type="number" placeholder="Max" value={max || ""} onChange={(e) => onChange(min, e.target.value || null)} style={filterStyles.input} />
        </div>
      </div>
    </label>
  );
}

const filterStyles = {
  panel: {
    border: `1px solid var(--line)`,
    borderRadius: "var(--radius)",
    padding: 24,
    marginBottom: 20,
    background: "var(--bg-soft)",
    animation: "slideDown .2s ease",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 20,
  },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  label: { ...sBodyB, color: "var(--ink-2)" },
  fieldWrap: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#fff", border: `1px solid var(--ink-3)`,
    borderRadius: "var(--radius)", padding: "0 14px", height: 44,
    transition: "border-color .15s ease",
  },
  select: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    ...sBody, color: "var(--ink)",
    appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
  },
  input: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    ...sBody, color: "var(--ink)",
  },
  footer: { display: "flex", justifyContent: "flex-end", marginTop: 18 },
};

/* ------------------------------------------------------------------ *
 *  BULK ACTION BAR                                                     *
 * ------------------------------------------------------------------ */
function BulkActionBar({ count, onClear, onAction }) {
  return (
    <div style={bulkStyles.bar}>
      <div style={bulkStyles.left}>
        <span style={bulkStyles.count}>{count}</span>
        <span style={{ ...sBody }}>selected</span>
      </div>
      <div style={bulkStyles.actions}>
        <button className="om-bulk-btn" style={bulkStyles.btn} onClick={() => onAction("share")}>
          <IconShare size={16} stroke={1.7} /><span style={{ ...sBody }}>Share with Dealer</span>
        </button>
        <button className="om-bulk-btn" style={bulkStyles.btn} onClick={() => onAction("archive")}>
          <IconArchive size={16} stroke={1.7} /><span style={{ ...sBody }}>Archive</span>
        </button>
        <button className="om-bulk-btn" style={bulkStyles.btn} onClick={() => onAction("delete")}>
          <IconTrash size={16} stroke={1.7} /><span style={{ ...sBody }}>Delete</span>
        </button>
        <button className="om-bulk-btn" style={bulkStyles.btnClear} onClick={onClear} aria-label="Clear selection">
          <IconClose size={16} stroke={2} />
        </button>
      </div>
    </div>
  );
}
const bulkStyles = {
  bar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "var(--brand)", color: "#fff",
    borderRadius: "var(--radius)", padding: "8px 12px 8px 18px",
    marginBottom: 12, height: 50,
    animation: "slideDown .18s ease",
  },
  left: { display: "flex", alignItems: "center", gap: 10 },
  count: {
    background: "rgba(255,255,255,0.16)", padding: "3px 10px",
    borderRadius: 12, ...T.fontBold, fontSize: 12,
  },
  actions: { display: "flex", alignItems: "center", gap: 2 },
  btn: {
    display: "flex", alignItems: "center", gap: 6,
    border: "none", background: "transparent", color: "#fff",
    cursor: "pointer", padding: "8px 14px", borderRadius: "var(--radius)",
    transition: "background .15s ease",
  },
  btnClear: {
    border: "none", background: "transparent", color: "#fff",
    cursor: "pointer", width: 36, height: 36, borderRadius: 18,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginLeft: 6,
  },
};

/* ------------------------------------------------------------------ *
 *  ORDERS TABLE                                                       *
 * ------------------------------------------------------------------ */
const COLUMNS = [
  { id: "reference",     label: "Reference",       width: "minmax(140px, 1.2fr)", sortable: true },
  { id: "orderNo",       label: "HM Order Number", width: "minmax(140px, 1fr)",   sortable: true },
  { id: "description",   label: "Description",     width: "minmax(160px, 1.4fr)", sortable: true },
  { id: "customer",      label: "Customer",        width: "minmax(140px, 1.2fr)", sortable: true },
  { id: "purchaseOrder", label: "Purchase Order",  width: "minmax(140px, 1fr)",   sortable: true },
  { id: "orderPlaced",   label: "Order Placed",    width: "minmax(120px, 0.9fr)", sortable: true },
  { id: "orderValue",    label: "Order Value",     width: "minmax(120px, 0.9fr)", sortable: true, align: "right" },
  { id: "status",        label: "Status",          width: "minmax(130px, 0.9fr)", sortable: true },
  { id: "action",        label: "Action",          width: "64px", sortable: false, align: "center" },
];

function OrdersTable({
  rows, sort, setSort, selected, setSelected, query, onRowOpen, openMenu, setOpenMenu, onAction,
}) {
  const gridTemplate = `50px ${COLUMNS.map(c => c.width).join(" ")}`;
  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const someSelected = rows.some(r => selected.has(r.id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const clickSort = (col) => {
    if (!col.sortable) return;
    setSort(s => s.col === col.id ? { col: col.id, dir: s.dir === "asc" ? "desc" : "asc" } : { col: col.id, dir: "asc" });
  };

  return (
    <div style={tableStyles.wrap}>
      <div style={{ ...tableStyles.headerRow, gridTemplateColumns: gridTemplate }}>
        <div style={{ ...tableStyles.headerCell, justifyContent: "center" }}>
          <Checkbox light checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
        </div>
        {COLUMNS.map(col => (
          <button
            key={col.id}
            onClick={() => clickSort(col)}
            className="om-header-sort"
            style={{
              ...tableStyles.headerCell,
              cursor: col.sortable ? "pointer" : "default",
              justifyContent: col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start",
              border: "none", background: "transparent", color: "#fff",
              fontFamily: "inherit", ...sBodyB,
            }}
          >
            <span>{col.label}</span>
            {col.sortable && (
              <span style={{ opacity: sort.col === col.id ? 1 : 0.55, display: "inline-flex" }}>
                {sort.col === col.id
                  ? (sort.dir === "asc" ? <IconArrowUp size={12} stroke={2} /> : <IconArrowDown size={12} stroke={2} />)
                  : <IconSortable size={12} stroke={1.6} />}
              </span>
            )}
          </button>
        ))}
      </div>

      <div>
        {rows.length === 0
          ? <EmptyState query={query} />
          : rows.map(row => (
              <Row key={row.id}
                   row={row} gridTemplate={gridTemplate}
                   checked={selected.has(row.id)} onToggle={() => toggleOne(row.id)}
                   query={query}
                   openMenu={openMenu === row.id} setOpenMenu={setOpenMenu}
                   onAction={onAction} onOpen={() => onRowOpen(row)} />
            ))}
      </div>
    </div>
  );
}

function Row({ row, gridTemplate, checked, onToggle, query, openMenu, setOpenMenu, onAction, onOpen }) {
  const menuRef = useRef(null);
  useEffect(() => {
    if (!openMenu) return;
    const off = (e) => { if (!menuRef.current?.contains(e.target)) setOpenMenu(null); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [openMenu, setOpenMenu]);

  const status = STATUS_COLOR[row.status] || { fg: "var(--ink)", dot: "#999" };

  return (
    <div
      className="om-row"
      style={{
        ...tableStyles.row,
        gridTemplateColumns: gridTemplate,
        background: checked ? "var(--brand-soft)" : "transparent",
      }}
      data-checked={checked}
      onClick={(e) => {
        if (e.target.closest("button, input, label, a")) return;
        onOpen();
      }}
    >
      <div style={{ ...tableStyles.cell, justifyContent: "center" }} onClick={e => e.stopPropagation()}>
        <Checkbox checked={checked} onChange={onToggle} />
      </div>
      <div style={tableStyles.cell}>
        <span style={{ ...sBodyB, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Highlight text={row.reference} q={query} />
        </span>
      </div>
      <div style={tableStyles.cell}>
        <span style={{ ...sBody, color: "var(--ink)" }}><Highlight text={row.orderNo} q={query} /></span>
      </div>
      <div style={tableStyles.cell}>
        <Truncate text={row.description} q={query} max={24} />
      </div>
      <div style={tableStyles.cell}>
        <Truncate text={row.customer} q={query} max={20} />
      </div>
      <div style={tableStyles.cell}>
        <span style={{ ...sBody, color: "var(--ink)" }}><Highlight text={row.purchaseOrder} q={query} /></span>
      </div>
      <div style={tableStyles.cell}>
        <span style={{ ...sBody, color: "var(--ink-2)" }}>{row.orderPlaced}</span>
      </div>
      <div style={{ ...tableStyles.cell, justifyContent: "flex-end" }}>
        <span style={{ ...sBodyB, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{formatMoney(row.orderValue)}</span>
      </div>
      <div style={tableStyles.cell}>
        <StatusInline status={row.status} color={status} />
      </div>
      <div style={{ ...tableStyles.cell, justifyContent: "center", position: "relative" }} ref={menuRef}>
        <button
          className="om-action-btn"
          aria-label="Row actions"
          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu ? null : row.id); }}
          style={{
            width: T.hit, height: T.hit, borderRadius: "var(--radius)",
            border: "none", background: openMenu ? "var(--line)" : "transparent",
            cursor: "pointer", color: "var(--ink)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: openMenu ? 1 : undefined,
            transition: "background .15s ease, opacity .15s ease",
          }}
        >
          <IconEllipsis size={18} />
        </button>
        {openMenu && <RowMenu row={row} onAction={(a) => { onAction(a, row); setOpenMenu(null); }} />}
      </div>
    </div>
  );
}

function StatusInline({ status, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color.dot, flexShrink: 0 }} />
      <span style={{ ...sBody, color: color.fg }}>{status}</span>
    </span>
  );
}

function SharedAvatars() {
  return (
    <span style={{ display: "inline-flex" }}>
      <span style={{ ...avatarPill, background: "#F8DE84", color: "#000" }}>A</span>
      <span style={{ ...avatarPill, background: "#B0CED8", color: "#000", marginLeft: -8 }}>J</span>
      <span style={{ ...avatarPill, background: "#CADFD4", color: "#000", marginLeft: -8 }}>+</span>
    </span>
  );
}
const avatarPill = {
  width: 24, height: 24, borderRadius: 12,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
  border: "2px solid #fff",
};

function RowMenu({ row, onAction }) {
  const items = [
    { id: "open",    label: "Open order",       icon: IconChevronRight },
    { id: "copy",    label: "Copy",             icon: IconCopy },
    { id: "archive", label: "Archive",          icon: IconArchive },
    row.shared
      ? { id: "unshare", label: "Unshare",         icon: IconUnshare }
      : { id: "share",   label: "Share with Dealer", icon: IconShare },
    { id: "delete",  label: "Delete",           icon: IconTrash, danger: true },
  ];
  return (
    <div style={menuStyles.menu} role="menu">
      {items.map(it => {
        const Ic = it.icon;
        return (
          <button
            key={it.id}
            role="menuitem"
            className="om-menu-item"
            data-danger={it.danger ? "true" : undefined}
            onClick={() => onAction(it.id)}
            style={{
              ...menuStyles.item,
              color: it.danger ? "var(--red)" : "var(--ink)",
            }}
          >
            <Ic size={16} stroke={1.7} />
            <span style={{ ...sBody }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
const menuStyles = {
  menu: {
    position: "absolute", top: "100%", right: 8,
    minWidth: 220, background: "#fff",
    border: `2px solid #000`,
    borderRadius: "var(--radius)",
    padding: "6px 4px",
    boxShadow: "var(--shadow-pop)",
    zIndex: 20,
    animation: "menuPop .14s cubic-bezier(.4,0,.2,1)",
  },
  item: {
    width: "100%", display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px",
    border: "none", background: "transparent",
    cursor: "pointer", textAlign: "left",
    transition: "background .12s ease",
  },
};

function Checkbox({ checked, indeterminate, onChange, light }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label
      className="om-checkbox"
      style={{
        position: "relative",
        width: T.hit, height: T.hit,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "pointer" }}
      />
      <span style={{
        width: 18, height: 18, borderRadius: 2,
        background: checked ? "var(--brand)" : "transparent",
        border: checked
          ? "1px solid var(--brand)"
          : `1px solid ${light ? "#fff" : "var(--ink-2)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff",
        transition: "background .12s ease, border-color .12s ease",
      }}>
        {checked && <IconCheck size={12} stroke={2.6} />}
        {indeterminate && !checked && <span style={{ width: 8, height: 2, background: light ? "#fff" : "var(--ink)" }} />}
      </span>
    </label>
  );
}

function Highlight({ text, q }) {
  if (!q) return text;
  const i = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  const s = String(text);
  return (
    <>
      {s.slice(0, i)}
      <mark style={{ background: "var(--brand-soft)", color: "var(--brand)", padding: "0 2px" }}>{s.slice(i, i + q.length)}</mark>
      {s.slice(i + q.length)}
    </>
  );
}
function Truncate({ text, q, max = 20 }) {
  const t = String(text);
  const trunc = t.length > max ? t.slice(0, max) + "…" : t;
  return (
    <span title={t.length > max ? t : undefined} style={{ ...sBody, color: "var(--ink)" }}>
      <Highlight text={trunc} q={q} />
    </span>
  );
}

function EmptyState({ query }) {
  return (
    <div style={{ padding: "80px 24px", textAlign: "center" }}>
      <div style={{ ...sLargeB, color: "var(--ink)", marginBottom: 8 }}>
        {query ? "No orders match your search" : "Looks like your Order list is empty"}
      </div>
      <div style={{ ...sBody, color: "var(--ink-2)" }}>
        {query ? "Try a different keyword or clear filters." : "Click \"Create New\" to add your first order."}
      </div>
    </div>
  );
}

const tableStyles = {
  wrap: {
    border: `1px solid var(--line)`,
    borderRadius: "var(--radius)",
    overflow: "hidden",
    background: "#fff",
  },
  headerRow: {
    display: "grid",
    background: "var(--ink)",
    minHeight: T.rowH,
    alignItems: "stretch",
  },
  headerCell: {
    padding: "0 20px",
    display: "flex", alignItems: "center", gap: 8,
    color: "#fff",
    textAlign: "left",
    whiteSpace: "nowrap",
  },
  row: {
    display: "grid", alignItems: "center",
    minHeight: T.rowH,
    borderTop: `1px solid var(--line)`,
    cursor: "pointer",
    transition: "background .12s ease",
  },
  cell: {
    padding: "0 20px",
    display: "flex", alignItems: "center", gap: 6,
    minWidth: 0, overflow: "hidden",
    height: T.rowH,
  },
};

/* ------------------------------------------------------------------ *
 *  FOOTER — 72px tall, pin-line top                                    *
 * ------------------------------------------------------------------ */
function Footer({ resultsCount }) {
  return (
    <footer style={footerStyles.bar}>
      <span style={{ ...sLargeB, color: "var(--brand)", letterSpacing: "0.05em" }}>EOS CLOUD</span>
      <span style={{ ...sBody, color: "var(--ink-2)" }}>2022 — Herman Miller Ltd</span>
      <span style={{ ...sBodyB, color: "var(--ink)", textTransform: "uppercase" }}>
        Results: <strong style={{ marginLeft: 4 }}>{resultsCount}</strong> {resultsCount === 1 ? "entry" : "entries"}
      </span>
    </footer>
  );
}
const footerStyles = {
  bar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 32px", height: 72,
    borderTop: `1px solid var(--line)`,
    background: "#fff",
  },
};

/* ------------------------------------------------------------------ *
 *  TOAST                                                              *
 * ------------------------------------------------------------------ */
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: "var(--ink)", color: "#fff",
      padding: "14px 22px", borderRadius: "var(--radius)",
      ...sBody,
      boxShadow: "var(--shadow-pop)", zIndex: 80,
      animation: "toastIn .2s cubic-bezier(.4,0,.2,1)",
    }}>{message}</div>
  );
}

/* ------------------------------------------------------------------ *
 *  APP                                                                *
 * ------------------------------------------------------------------ */
function App() {
  const [tab, setTab] = useState("active");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({ col: "orderPlaced", dir: "desc" });
  const [selected, setSelected] = useState(new Set());
  const [openMenu, setOpenMenu] = useState(null);
  const [myOnly, setMyOnly] = useState(false);
  const [upcoming, setUpcoming] = useState(false);
  const [toast, setToast] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => { setSelected(new Set()); setOpenMenu(null); }, [tab]);

  const base = ORDERS[tab];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter(r => {
      if (myOnly && !r.mine) return false;
      if (filters.customer && r.customer !== filters.customer) return false;
      if (filters.status && r.status !== filters.status) return false;
      if (filters.type && r.type !== filters.type) return false;
      if (filters.valueMin && r.orderValue < Number(filters.valueMin)) return false;
      if (filters.valueMax && r.orderValue > Number(filters.valueMax)) return false;
      if (q) {
        const hay = [r.reference, r.description, r.orderNo, r.purchaseOrder, r.customer, r.status, r.type].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [base, query, filters, myOnly]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sort.dir === "asc" ? 1 : -1;
    const col = sort.col;
    copy.sort((a, b) => {
      let av = a[col], bv = b[col];
      if (col === "orderPlaced") { av = a.orderPlacedSort; bv = b.orderPlacedSort; }
      if (col === "shared") { av = a.shared ? 1 : 0; bv = b.shared ? 1 : 0; }
      if (typeof av === "string") { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return copy;
  }, [filtered, sort]);

  const customerOptions = useMemo(() => [...new Set(base.map(r => r.customer))].sort(), [base]);
  const statusOptions   = useMemo(() => [...new Set(base.map(r => r.status))].sort(),   [base]);
  const typeOptions     = useMemo(() => [...new Set(base.map(r => r.type))].sort(),     [base]);
  const activeFilterCount = Object.values(filters).filter(v => v !== null && v !== undefined && v !== "").length;

  const onRowOpen = useCallback((row) => setToast(`Opening order ${row.orderNo}…`), []);
  const onAction = useCallback((action, row) => {
    const label = {
      open:    `Opening order ${row.orderNo}`,
      copy:    `Copied order ${row.orderNo}`,
      archive: `Archived order ${row.orderNo}`,
      share:   `Shared ${row.orderNo} with Dealer`,
      unshare: `Unshared ${row.orderNo}`,
      delete:  `Deleted order ${row.orderNo}`,
    }[action];
    setToast(label);
  }, []);
  const onBulkAction = useCallback((action) => {
    const labels = {
      share:   `Shared ${selected.size} orders with Dealer`,
      archive: `Archived ${selected.size} orders`,
      delete:  `Deleted ${selected.size} orders`,
    };
    setToast(labels[action] || `Action: ${action}`);
    setSelected(new Set());
  }, [selected]);

  return (
    <>
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes menuPop   { from { opacity: 0; transform: translateY(-4px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastIn   { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }

        button:focus-visible, a:focus-visible {
          outline: 2px solid var(--brand); outline-offset: 2px;
        }
        .om-row:hover { background: var(--line) !important; }
        .om-row[data-checked="true"]:hover { background: #FFEEE6 !important; }
        .om-menu-item:hover { background: var(--line); }
        .om-menu-item[data-danger="true"]:hover { background: #FCEAEA; }
        .om-link:hover { color: var(--brand); }
        .om-textlink:hover { color: var(--brand); }
        .om-iconplus:hover { background: var(--line); border-radius: var(--radius); }
        .om-create-btn:hover { background: #C42700; border-color: #C42700; }
        .om-account-btn:hover { color: var(--brand); }
        .om-stroke-btn:hover { background: var(--brand); color: #fff; border-color: var(--brand); }
        .om-stroke-icon-btn:hover { background: var(--brand); color: #fff; border-color: var(--brand); }
        .om-tab[aria-selected="false"]:hover { background: var(--line); }
        .om-search-wrap:focus-within { box-shadow: 0 0 0 4px rgba(37,37,37,0.08); }
        .om-action-btn { opacity: .5; }
        .om-row:hover .om-action-btn { opacity: 1; }
        .om-action-btn:hover { background: #fff !important; opacity: 1 !important; }
        .om-header-sort:hover { color: #fff; }
        .om-bulk-btn:hover { background: rgba(255,255,255,0.12); }
      `}</style>

      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="orders" />

      <main style={{ maxWidth: 1408, margin: "0 auto", padding: "0 40px 40px" }}>
        <Breadcrumb tab={tab} />

        {/* Sub-navigation: tabs + search on top row; toggles + filter buttons on lower row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 24, borderBottom: `1px solid var(--pin)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <TabsPill tab={tab} setTab={setTab} />
            <SearchBar query={query} setQuery={setQuery} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <UtilityRow
              myOnly={myOnly} setMyOnly={setMyOnly}
              upcoming={upcoming} setUpcoming={setUpcoming}
            />
            <FilterButtons
              filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen}
              activeFilterCount={activeFilterCount}
            />
          </div>
        </div>

        <div style={{ paddingTop: 20 }}>
          {filtersOpen && (
            <FiltersPanel
              filters={filters} setFilters={setFilters}
              statusOptions={statusOptions}
              customerOptions={customerOptions}
              typeOptions={typeOptions}
            />
          )}

          {selected.size > 0 && (
            <BulkActionBar
              count={selected.size}
              onClear={() => setSelected(new Set())}
              onAction={onBulkAction}
            />
          )}

          <OrdersTable
            rows={sorted}
            sort={sort} setSort={setSort}
            selected={selected} setSelected={setSelected}
            query={query}
            onRowOpen={onRowOpen}
            openMenu={openMenu} setOpenMenu={setOpenMenu}
            onAction={onAction}
          />
        </div>
      </main>

      <Footer resultsCount={sorted.length} />
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
