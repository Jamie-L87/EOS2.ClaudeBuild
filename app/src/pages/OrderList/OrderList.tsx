import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import {
  IconChevronRight, IconEye, IconEyeOff, IconSearch, IconClose,
  IconEllipsis, IconArrowUp, IconArrowDown, IconSortable,
  IconArchive, IconShare, IconTrash, IconUnshare, IconCopy,
  IconHelp, IconCalendar, IconCheck, IconChevronDown,
} from '../../components/Icons';
import { STATUS_COLOR, formatMoney } from '../../data/orders';
import type { Order, OrderTab } from '../../data/orders';
import { loadForTab, loadDetail, remove, updateStatus } from '../../services/orderStore';
import { t, size } from '../../tokens';

/* ------------------------------------------------------------------ */
/*  Shared style shorthands                                             */
/* ------------------------------------------------------------------ */
const sBody  = { ...t.body  };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

/* ------------------------------------------------------------------ */
/*  BREADCRUMB                                                          */
/* ------------------------------------------------------------------ */
function Breadcrumb({ tab }: { tab: OrderTab }) {
  const label = { active: 'Active Orders', completed: 'Completed Orders', archived: 'Archived Orders' }[tab];
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0 18px' }} aria-label="Breadcrumb">
      <a href="#" style={{ ...sBody, color: 'var(--ink-2)', textDecoration: 'none' }}>Home</a>
      <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ink-3)' }}>
        <IconChevronRight size={14} stroke={2} />
      </span>
      <span style={{ ...sBodyB, color: 'var(--ink)' }}>{label}</span>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  PILL TABS                                                           */
/* ------------------------------------------------------------------ */
const TABS: Array<{ id: OrderTab; label: string }> = [
  { id: 'active',    label: 'Active Orders' },
  { id: 'completed', label: 'Completed Orders' },
  { id: 'archived',  label: 'Archived Orders' },
];

function TabsPill({ tab, setTab }: { tab: OrderTab; setTab: (t: OrderTab) => void }) {
  return (
    <div style={{ display: 'inline-flex', marginRight: 24 }} role="tablist">
      {TABS.map((tItem, i) => {
        const active   = tab === tItem.id;
        const isFirst  = i === 0;
        const isLast   = i === TABS.length - 1;
        return (
          <button
            key={tItem.id}
            role="tab"
            aria-selected={active}
            className="om-tab"
            onClick={() => setTab(tItem.id)}
            style={{
              ...sLargeB,
              height: size.tabH,
              padding: '0 30px',
              border: '2px solid var(--ink)',
              borderRadius: 0,
              borderTopLeftRadius:     isFirst ? 'var(--radius)' : 0,
              borderBottomLeftRadius:  isFirst ? 'var(--radius)' : 0,
              borderTopRightRadius:    isLast  ? 'var(--radius)' : 0,
              borderBottomRightRadius: isLast  ? 'var(--radius)' : 0,
              borderRightWidth: isLast  ? 2 : 1,
              borderLeftWidth:  isFirst ? 2 : 1,
              background:   active ? 'var(--brand)' : '#fff',
              color:        active ? '#fff' : 'var(--ink)',
              borderColor:  active ? 'var(--brand)' : 'var(--ink)',
              cursor: 'pointer',
              transition: 'background .15s ease, color .15s ease',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
          >
            {tItem.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SWITCH                                                              */
/* ------------------------------------------------------------------ */
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        border: 'none', background: 'transparent', cursor: 'pointer',
        padding: 0, height: size.hit,
        fontFamily: 'inherit',
      }}
    >
      <span style={{ width: size.hit, height: size.hit, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          width: 40, height: 20, borderRadius: 39,
          background: on ? 'var(--brand)' : 'var(--ink)',
          position: 'relative', display: 'inline-block',
          transition: 'background .2s ease',
        }}>
          <span style={{
            position: 'absolute', top: 2, left: on ? 22 : 4,
            width: 16, height: 16, borderRadius: '50%',
            background: '#fff',
            transition: 'left .2s cubic-bezier(.4,0,.2,1)',
          }} />
        </span>
      </span>
      <span style={{ ...sBody, color: 'var(--ink)' }}>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  UTILITY ROW                                                         */
/* ------------------------------------------------------------------ */
function UtilityRow({ myOnly, setMyOnly, upcoming, setUpcoming }: {
  myOnly: boolean; setMyOnly: (v: boolean) => void;
  upcoming: boolean; setUpcoming: (v: boolean) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40, height: size.hit, flexWrap: 'wrap' }}>
      <Switch on={myOnly}   onChange={setMyOnly}   label="View only my orders" />
      <Switch on={upcoming} onChange={setUpcoming} label="View upcoming deliveries" />
      <button className="om-textlink" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--ink)', fontFamily: 'inherit' }}>
        <span style={sBody}>Raise Service Issue Form (SIF)</span>
        <span style={{ width: size.hit, height: size.hit, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconHelp size={20} stroke={1.6} />
        </span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SEARCH BAR                                                          */
/* ------------------------------------------------------------------ */
function SearchBar({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  return (
    <div className="om-search-wrap" style={{
      display: 'flex', alignItems: 'center',
      width: 339, height: size.tabH,
      border: '2px solid var(--ink)', borderRadius: 'var(--radius)',
      background: '#fff',
      transition: 'box-shadow .15s ease',
    }}>
      <span style={{ width: size.hit, height: size.hit, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IconSearch size={18} stroke={1.7} />
      </span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by"
        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: 'var(--ink)', paddingRight: 12, fontFamily: 'inherit' }}
      />
      {query && (
        <button onClick={() => setQuery('')} aria-label="Clear search"
          style={{ width: 36, height: 36, marginRight: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 18 }}>
          <IconClose size={16} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FILTER BUTTONS                                                      */
/* ------------------------------------------------------------------ */
function FilterButtons({ filtersOpen, setFiltersOpen, activeFilterCount }: {
  filtersOpen: boolean; setFiltersOpen: (v: boolean) => void; activeFilterCount: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        className="om-stroke-btn"
        onClick={() => setFiltersOpen(!filtersOpen)}
        style={{
          ...sLargeB,
          height: 50, padding: '0 18px',
          border: '2px solid var(--ink)', borderRadius: 'var(--radius)',
          background: filtersOpen ? 'var(--brand)' : '#fff',
          color: filtersOpen ? '#fff' : 'var(--ink)',
          borderColor: filtersOpen ? 'var(--brand)' : 'var(--ink)',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 10,
          transition: 'background .15s ease, color .15s ease, border-color .15s ease',
          fontFamily: 'inherit',
        }}
      >
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span style={{
            background: 'var(--brand)', color: '#fff',
            fontSize: 11, fontWeight: 700,
            minWidth: 20, height: 20, borderRadius: 10,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 6px',
          }}>{activeFilterCount}</span>
        )}
        <span style={{ width: 16, height: 16, display: 'inline-flex' }}>
          {filtersOpen ? <IconEyeOff size={16} stroke={1.7} /> : <IconEye size={16} stroke={1.7} />}
        </span>
      </button>
      <button
        className="om-stroke-icon-btn"
        aria-label="More"
        style={{
          width: 50, height: 50,
          border: '2px solid var(--ink)', borderRadius: 'var(--radius)',
          background: '#fff', color: 'var(--ink)',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .15s ease, color .15s ease',
        }}
      >
        <IconEllipsis size={20} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FILTERS PANEL                                                       */
/* ------------------------------------------------------------------ */
type Filters = {
  customer?: string | null;
  status?: string | null;
  type?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  valueMin?: string | null;
  valueMax?: string | null;
};

const fieldWrap = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: '#fff', border: '1px solid var(--ink-3)',
  borderRadius: 'var(--radius)', padding: '0 14px', height: 44,
  transition: 'border-color .15s ease',
};

function FilterSelect({ label, value, options, onChange }: { label: string; value?: string | null; options: string[]; onChange: (v: string | null) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>{label}</span>
      <div style={fieldWrap}>
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: 'var(--ink)', appearance: 'none', fontFamily: 'inherit' }}>
          <option value="">All</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <IconChevronDown size={16} stroke={1.7} />
      </div>
    </label>
  );
}

function FilterDate({ label, value, onChange }: { label: string; value?: string | null; onChange: (v: string | null) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>{label}</span>
      <div style={fieldWrap}>
        <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: 'var(--ink)', fontFamily: 'inherit' }} />
        <IconCalendar size={16} stroke={1.7} />
      </div>
    </label>
  );
}

function FilterRange({ label, min, max, onChange }: { label: string; min?: string | null; max?: string | null; onChange: (min: string | null, max: string | null) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...fieldWrap, flex: 1 }}>
          <input type="number" placeholder="Min" value={min ?? ''} onChange={(e) => onChange(e.target.value || null, max ?? null)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: 'var(--ink)', fontFamily: 'inherit' }} />
        </div>
        <div style={{ ...fieldWrap, flex: 1 }}>
          <input type="number" placeholder="Max" value={max ?? ''} onChange={(e) => onChange(min ?? null, e.target.value || null)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: 'var(--ink)', fontFamily: 'inherit' }} />
        </div>
      </div>
    </label>
  );
}

function FiltersPanel({ filters, setFilters, statusOptions, customerOptions, typeOptions }: {
  filters: Filters; setFilters: (f: Filters) => void;
  statusOptions: string[]; customerOptions: string[]; typeOptions: string[];
}) {
  const set = (k: keyof Filters, v: string | null) => setFilters({ ...filters, [k]: v });
  return (
    <div style={{
      border: '1px solid var(--line)', borderRadius: 'var(--radius)',
      padding: 24, marginBottom: 20, background: 'var(--bg-soft)',
      animation: 'slideDown .2s ease',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
        <FilterSelect label="CUSTOMER"           value={filters.customer} options={customerOptions} onChange={(v) => set('customer', v)} />
        <FilterSelect label="STATUS"             value={filters.status}   options={statusOptions}   onChange={(v) => set('status', v)} />
        <FilterSelect label="ORDER TYPE"         value={filters.type}     options={typeOptions}     onChange={(v) => set('type', v)} />
        <FilterDate   label="ORDER PLACED (FROM)" value={filters.dateFrom} onChange={(v) => set('dateFrom', v)} />
        <FilterDate   label="ORDER PLACED (TO)"   value={filters.dateTo}   onChange={(v) => set('dateTo', v)} />
        <FilterRange  label="ORDER VALUE (£)"
          min={filters.valueMin} max={filters.valueMax}
          onChange={(min, max) => setFilters({ ...filters, valueMin: min, valueMax: max })} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={() => setFilters({})} className="om-link"
          style={{ ...sBody, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'inherit' }}>
          Clear all filters
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BULK ACTION BAR                                                     */
/* ------------------------------------------------------------------ */
function BulkActionBar({ count, onClear, onAction }: {
  count: number; onClear: () => void; onAction: (a: string) => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--brand)', color: '#fff',
      borderRadius: 'var(--radius)', padding: '8px 12px 8px 18px',
      marginBottom: 12, height: 50,
      animation: 'slideDown .18s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ background: 'rgba(255,255,255,0.16)', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>{count}</span>
        <span style={sBody}>selected</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {(['share', 'archive', 'delete'] as const).map(action => (
          <button key={action} className="om-bulk-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', padding: '8px 14px', borderRadius: 'var(--radius)', transition: 'background .15s ease', fontFamily: 'inherit' }}
            onClick={() => onAction(action)}>
            {action === 'share'   && <><IconShare   size={16} stroke={1.7} /><span style={sBody}>Share with Dealer</span></>}
            {action === 'archive' && <><IconArchive size={16} stroke={1.7} /><span style={sBody}>Archive</span></>}
            {action === 'delete'  && <><IconTrash   size={16} stroke={1.7} /><span style={sBody}>Delete</span></>}
          </button>
        ))}
        <button className="om-bulk-btn" style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', width: 36, height: 36, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }} onClick={onClear} aria-label="Clear selection">
          <IconClose size={16} stroke={2} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ORDERS TABLE                                                        */
/* ------------------------------------------------------------------ */
type SortDir = 'asc' | 'desc';
interface Sort { col: string; dir: SortDir; }

const COLUMNS = [
  { id: 'reference',     label: 'Reference',       width: 'minmax(140px, 1.2fr)', sortable: true },
  { id: 'orderNo',       label: 'HM Order Number', width: 'minmax(140px, 1fr)',   sortable: true },
  { id: 'description',   label: 'Description',     width: 'minmax(160px, 1.4fr)', sortable: true },
  { id: 'customer',      label: 'Customer',        width: 'minmax(140px, 1.2fr)', sortable: true },
  { id: 'purchaseOrder', label: 'Purchase Order',  width: 'minmax(140px, 1fr)',   sortable: true },
  { id: 'orderPlaced',   label: 'Order Placed',    width: 'minmax(120px, 0.9fr)', sortable: true },
  { id: 'orderValue',    label: 'Order Value',     width: 'minmax(120px, 0.9fr)', sortable: true, align: 'right' as const },
  { id: 'status',        label: 'Status',          width: 'minmax(130px, 0.9fr)', sortable: true },
  { id: 'action',        label: 'Action',          width: '64px',                 sortable: false, align: 'center' as const },
];

const cellBase = { padding: '0 20px', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden', height: size.rowH };

function Checkbox({ checked, indeterminate, onChange, light }: {
  checked?: boolean; indeterminate?: boolean; onChange: () => void; light?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);
  return (
    <label className="om-checkbox"
      style={{ position: 'relative', width: size.hit, height: size.hit, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
      onClick={(e) => e.stopPropagation()}>
      <input ref={ref} type="checkbox" checked={!!checked} onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', margin: 0, cursor: 'pointer' }} />
      <span style={{
        width: 18, height: 18, borderRadius: 2,
        background: checked ? 'var(--brand)' : 'transparent',
        border: checked ? '1px solid var(--brand)' : `1px solid ${light ? '#fff' : 'var(--ink-2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        transition: 'background .12s ease, border-color .12s ease',
      }}>
        {checked && <IconCheck size={12} stroke={2.6} />}
        {indeterminate && !checked && <span style={{ width: 8, height: 2, background: light ? '#fff' : 'var(--ink)' }} />}
      </span>
    </label>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const s = String(text);
  const i = s.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {s.slice(0, i)}
      <mark style={{ background: 'var(--brand-soft)', color: 'var(--brand)', padding: '0 2px' }}>{s.slice(i, i + q.length)}</mark>
      {s.slice(i + q.length)}
    </>
  );
}

function Truncate({ text, q, max = 20 }: { text: string; q: string; max?: number }) {
  const s = String(text);
  const trunc = s.length > max ? s.slice(0, max) + '…' : s;
  return (
    <span title={s.length > max ? s : undefined} style={{ ...sBody, color: 'var(--ink)' }}>
      <Highlight text={trunc} q={q} />
    </span>
  );
}

function StatusInline({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? { fg: 'var(--ink)', dot: '#999' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color.dot, flexShrink: 0 }} />
      <span style={{ ...sBody, color: color.fg }}>{status}</span>
    </span>
  );
}

type RowAction = 'open' | 'copy' | 'archive' | 'share' | 'unshare' | 'delete';

function RowMenu({ row, onAction }: { row: Order; onAction: (a: RowAction) => void }) {
  const items: Array<{ id: RowAction; label: string; Icon: React.ComponentType<{ size?: number; stroke?: number }>; danger?: boolean }> = [
    { id: 'open',    label: 'Open order',          Icon: IconChevronRight },
    { id: 'copy',    label: 'Copy',                Icon: IconCopy },
    { id: 'archive', label: 'Archive',             Icon: IconArchive },
    row.shared
      ? { id: 'unshare', label: 'Unshare',         Icon: IconUnshare }
      : { id: 'share',   label: 'Share with Dealer', Icon: IconShare },
    { id: 'delete',  label: 'Delete',              Icon: IconTrash, danger: true },
  ];
  return (
    <div style={{
      position: 'absolute', top: '100%', right: 8,
      minWidth: 220, background: '#fff',
      border: '2px solid #000', borderRadius: 'var(--radius)',
      padding: '6px 4px',
      boxShadow: 'var(--shadow-pop)', zIndex: 20,
      animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
    }} role="menu">
      {items.map(it => (
        <button key={it.id} role="menuitem" className="om-menu-item"
          data-danger={it.danger ? 'true' : undefined}
          onClick={() => onAction(it.id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', border: 'none', background: 'transparent',
            cursor: 'pointer', textAlign: 'left',
            color: it.danger ? 'var(--red)' : 'var(--ink)',
            transition: 'background .12s ease',
            fontFamily: 'inherit',
          }}>
          <it.Icon size={16} stroke={1.7} />
          <span style={sBody}>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function Row({ row, gridTemplate, checked, onToggle, query, openMenu, setOpenMenu, onAction, onOpen }: {
  row: Order; gridTemplate: string; checked: boolean; onToggle: () => void;
  query: string; openMenu: boolean; setOpenMenu: (id: string | null) => void;
  onAction: (a: RowAction, row: Order) => void; onOpen: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openMenu) return;
    const off = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setOpenMenu(null); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [openMenu, setOpenMenu]);

  return (
    <div
      className="om-row"
      style={{
        display: 'grid', alignItems: 'center',
        minHeight: size.rowH, gridTemplateColumns: gridTemplate,
        borderTop: '1px solid var(--line)',
        cursor: 'pointer',
        transition: 'background .12s ease',
        background: checked ? 'var(--brand-soft)' : 'transparent',
      }}
      data-checked={checked}
      onClick={(e) => { if ((e.target as HTMLElement).closest('button, input, label, a')) return; onOpen(); }}
    >
      <div style={{ ...cellBase, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
        <Checkbox checked={checked} onChange={onToggle} />
      </div>
      <div style={cellBase}><span style={{ ...sBodyB, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Highlight text={row.reference} q={query} /></span></div>
      <div style={cellBase}><span style={{ ...sBody, color: 'var(--ink)' }}><Highlight text={row.orderNo} q={query} /></span></div>
      <div style={cellBase}><Truncate text={row.description} q={query} max={24} /></div>
      <div style={cellBase}><Truncate text={row.customer} q={query} max={20} /></div>
      <div style={cellBase}><span style={{ ...sBody, color: 'var(--ink)' }}><Highlight text={row.purchaseOrder} q={query} /></span></div>
      <div style={cellBase}><span style={{ ...sBody, color: 'var(--ink-2)' }}>{row.orderPlaced}</span></div>
      <div style={{ ...cellBase, justifyContent: 'flex-end' }}>
        <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(row.orderValue)}</span>
      </div>
      <div style={cellBase}><StatusInline status={row.status} /></div>
      <div style={{ ...cellBase, justifyContent: 'center', position: 'relative' }} ref={menuRef}>
        <button
          className="om-action-btn"
          aria-label="Row actions"
          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu ? null : row.id); }}
          style={{
            width: size.hit, height: size.hit, borderRadius: 'var(--radius)',
            border: 'none', background: openMenu ? 'var(--line)' : 'transparent',
            cursor: 'pointer', color: 'var(--ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .15s ease',
          }}
        >
          <IconEllipsis size={18} />
        </button>
        {openMenu && <RowMenu row={row} onAction={(a) => { onAction(a, row); setOpenMenu(null); }} />}
      </div>
    </div>
  );
}

function OrdersTable({ rows, sort, setSort, selected, setSelected, query, onRowOpen, openMenu, setOpenMenu, onAction }: {
  rows: Order[]; sort: Sort; setSort: (fn: (s: Sort) => Sort) => void;
  selected: Set<string>; setSelected: (s: Set<string>) => void;
  query: string; onRowOpen: (row: Order) => void;
  openMenu: string | null; setOpenMenu: (id: string | null) => void;
  onAction: (a: RowAction, row: Order) => void;
}) {
  const gridTemplate = `50px ${COLUMNS.map(c => c.width).join(' ')}`;
  const allSelected  = rows.length > 0 && rows.every(r => selected.has(r.id));
  const someSelected = rows.some(r => selected.has(r.id)) && !allSelected;

  const toggleAll = () => { allSelected ? setSelected(new Set()) : setSelected(new Set(rows.map(r => r.id))); };
  const toggleOne = (id: string) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };
  const clickSort = (col: typeof COLUMNS[0]) => {
    if (!col.sortable) return;
    setSort(s => s.col === col.id ? { col: col.id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col: col.id, dir: 'asc' });
  };

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, background: 'var(--ink)', minHeight: size.rowH, alignItems: 'stretch' }}>
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Checkbox light checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
        </div>
        {COLUMNS.map(col => (
          <button key={col.id} onClick={() => clickSort(col)} className="om-header-sort"
            style={{
              padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8,
              cursor: col.sortable ? 'pointer' : 'default',
              justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
              border: 'none', background: 'transparent', color: '#fff',
              fontFamily: 'inherit', ...sBodyB, whiteSpace: 'nowrap',
            }}>
            <span>{col.label}</span>
            {col.sortable && (
              <span style={{ opacity: sort.col === col.id ? 1 : 0.55, display: 'inline-flex' }}>
                {sort.col === col.id
                  ? (sort.dir === 'asc' ? <IconArrowUp size={12} stroke={2} /> : <IconArrowDown size={12} stroke={2} />)
                  : <IconSortable size={12} stroke={1.6} />}
              </span>
            )}
          </button>
        ))}
      </div>

      <div>
        {rows.length === 0
          ? (
            <div style={{ padding: '80px 24px', textAlign: 'center' }}>
              <div style={{ ...sLargeB, color: 'var(--ink)', marginBottom: 8 }}>
                {query ? 'No orders match your search' : 'No orders yet'}
              </div>
              <div style={{ ...sBody, color: 'var(--ink-2)' }}>
                {query ? 'Try a different keyword or clear filters.' : 'Import an order to get started.'}
              </div>
            </div>
          )
          : rows.map(row => (
            <Row key={row.id} row={row} gridTemplate={gridTemplate}
              checked={selected.has(row.id)} onToggle={() => toggleOne(row.id)}
              query={query}
              openMenu={openMenu === row.id} setOpenMenu={setOpenMenu}
              onAction={onAction} onOpen={() => onRowOpen(row)} />
          ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FOOTER                                                              */
/* ------------------------------------------------------------------ */
function Footer({ resultsCount }: { resultsCount: number }) {
  return (
    <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: size.footerH, borderTop: '1px solid var(--line)', background: '#fff' }}>
      <span style={{ ...sLargeB, color: 'var(--brand)', letterSpacing: '0.05em' }}>EOS CLOUD</span>
      <span style={{ ...sBody, color: 'var(--ink-2)' }}>2026 - MillerKnoll</span>
      <span style={{ ...sBodyB, color: 'var(--ink)', textTransform: 'uppercase' }}>
        Results: <strong style={{ marginLeft: 4 }}>{resultsCount}</strong> {resultsCount === 1 ? 'entry' : 'entries'}
      </span>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  TOAST                                                               */
/* ------------------------------------------------------------------ */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: '#fff',
      padding: '14px 22px', borderRadius: 'var(--radius)',
      ...sBody,
      boxShadow: 'var(--shadow-pop)', zIndex: 80,
      animation: 'toastIn .2s cubic-bezier(.4,0,.2,1)',
    }}>{message}</div>
  );
}

/* ------------------------------------------------------------------ */
/*  GLOBAL HOVER STYLES                                                 */
/* ------------------------------------------------------------------ */
const CSS = `
  .om-row:hover { background: var(--line) !important; }
  .om-row[data-checked="true"]:hover { background: #FFEEE6 !important; }
  .om-menu-item:hover { background: var(--line); }
  .om-menu-item[data-danger="true"]:hover { background: #FCEAEA; }
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
  .om-nav-item:hover { background: var(--bg-soft) !important; }
`;

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
export default function OrderListPage() {
  const navigate = useNavigate();

  const [tab,         setTab]         = useState<OrderTab>('active');
  const [query,       setQuery]       = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters,     setFilters]     = useState<Filters>({});
  const [sort,        setSort]        = useState<Sort>({ col: 'orderPlaced', dir: 'desc' });
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [openMenu,    setOpenMenu]    = useState<string | null>(null);
  const [myOnly,      setMyOnly]      = useState(false);
  const [upcoming,    setUpcoming]    = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const [navOpen,     setNavOpen]     = useState(false);

  const [base, setBase] = useState<Order[]>(() => loadForTab(tab));

  useEffect(() => {
    setBase(loadForTab(tab));
    setSelected(new Set());
    setOpenMenu(null);
  }, [tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter(r => {
      if (myOnly && !r.mine) return false;
      if (filters.customer && r.customer !== filters.customer) return false;
      if (filters.status   && r.status   !== filters.status)   return false;
      if (filters.type     && r.type     !== filters.type)     return false;
      if (filters.valueMin && r.orderValue < Number(filters.valueMin)) return false;
      if (filters.valueMax && r.orderValue > Number(filters.valueMax)) return false;
      if (q) {
        const hay = [r.reference, r.description, r.orderNo, r.purchaseOrder, r.customer, r.status, r.type].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [base, query, filters, myOnly]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir  = sort.dir === 'asc' ? 1 : -1;
    const col  = sort.col;
    copy.sort((a, b) => {
      let av = a[col as keyof Order] as string | number | boolean | null;
      let bv = b[col as keyof Order] as string | number | boolean | null;
      if (col === 'orderPlaced') { av = a.orderPlacedSort; bv = b.orderPlacedSort; }
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv as string).toLowerCase(); }
      if (av! < bv!) return -1 * dir;
      if (av! > bv!) return  1 * dir;
      return 0;
    });
    return copy;
  }, [filtered, sort]);

  const customerOptions = useMemo(() => [...new Set(base.map(r => r.customer))].sort(), [base]);
  const statusOptions   = useMemo(() => [...new Set(base.map(r => r.status))].sort(),   [base]);
  const typeOptions     = useMemo(() => [...new Set(base.map(r => r.type))].sort(),     [base]);
  const activeFilterCount = Object.values(filters).filter(v => v != null && v !== '').length;

  const onRowOpen = useCallback((row: Order) => {
    const detail = loadDetail(row.id);
    navigate(`/orders/${row.id}`, { state: detail ? { order: detail } : undefined });
  }, [navigate]);

  const onAction = useCallback((action: RowAction, row: Order) => {
    if (action === 'open') { onRowOpen(row); return; }
    if (action === 'delete') {
      remove(row.id);
      setBase(loadForTab(tab));
      setToast(`Deleted order ${row.reference}`);
      return;
    }
    if (action === 'archive') {
      updateStatus(row.id, 'Archived');
      setBase(loadForTab(tab));
      setToast(`Archived order ${row.reference}`);
      return;
    }
    const label: Record<string, string> = {
      copy:    `Copied order ${row.reference}`,
      share:   `Shared ${row.reference} with Dealer`,
      unshare: `Unshared ${row.reference}`,
    };
    setToast(label[action] ?? `Action: ${action}`);
  }, [onRowOpen, tab]);

  const onBulkAction = useCallback((action: string) => {
    if (action === 'delete') {
      selected.forEach(id => remove(id));
      setToast(`Deleted ${selected.size} order${selected.size !== 1 ? 's' : ''}`);
    } else if (action === 'archive') {
      selected.forEach(id => updateStatus(id, 'Archived'));
      setToast(`Archived ${selected.size} order${selected.size !== 1 ? 's' : ''}`);
    } else {
      setToast(`Shared ${selected.size} orders with Dealer`);
    }
    setSelected(new Set());
    setBase(loadForTab(tab));
  }, [selected, tab]);

  return (
    <>
      <style>{CSS}</style>
      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="orders" />

      <main style={{ maxWidth: size.maxWidth, margin: '0 auto', padding: `0 ${size.pagePad}px 40px` }}>
        <Breadcrumb tab={tab} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24, borderBottom: '1px solid var(--pin)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <TabsPill tab={tab} setTab={setTab} />
            <SearchBar query={query} setQuery={setQuery} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <UtilityRow myOnly={myOnly} setMyOnly={setMyOnly} upcoming={upcoming} setUpcoming={setUpcoming} />
            <FilterButtons filtersOpen={filtersOpen} setFiltersOpen={setFiltersOpen} activeFilterCount={activeFilterCount} />
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
            <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())} onAction={onBulkAction} />
          )}

          <OrdersTable
            rows={sorted} sort={sort} setSort={setSort}
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
