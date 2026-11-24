import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import { size, t } from '../../tokens';
import { CUSTOMERS, customerSearchText, toDealerCode, uid, wildcardIncludes } from '../../data/catalogueAccess';
import { loadCatalogueAccessState, saveCatalogueAccessState } from '../../services/catalogueAccessStore';
import {
  AddAllBar,
  BulkRemoveBar,
  Checkbox,
  Chip,
  ConfirmDialog,
  DetailBreadcrumb,
  FilterSelect,
  FilterSlot,
  FilterText,
  PrimaryButton,
  SearchInput,
  StrokeButton,
} from '../CatalogueAccessAdmin/shared';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

type CustomerRow = { id: string; code: string; dealerName: string; customerType: string; country: string };

const PAGE_SIZE = 80;

function AccessDenied() {
  return (
    <div style={{ marginTop: 24, border: '2px solid var(--red)', background: 'var(--red-soft)', borderRadius: 'var(--radius)', padding: 24 }}>
      <h2 style={{ ...sLargeB, margin: 0, color: 'var(--red)' }}>Access Denied</h2>
      <p style={{ ...sBody, margin: '10px 0 0', color: 'var(--ink)' }}>
        You do not have permission to access Catalogue Management. This page is restricted to Admin role users.
      </p>
    </div>
  );
}

function CustomerRowList({
  rows,
  emptyLabel,
  actionLabel,
  onAction,
  checked,
  onToggle,
  flatTop,
}: {
  rows: CustomerRow[];
  emptyLabel: string;
  actionLabel: string;
  onAction: (id: string) => void;
  /** When provided, each row shows a selection checkbox and the list sits flush under a bulk toolbar. */
  checked?: Set<string>;
  onToggle?: (id: string) => void;
  /** List sits flush under a toolbar (no top radius). Implied when selectable. */
  flatTop?: boolean;
}) {
  const selectable = !!checked && !!onToggle;
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: selectable || flatTop ? '0 0 var(--radius) var(--radius)' : 'var(--radius)', maxHeight: 480, overflow: 'auto' }}>
      {rows.map(row => (
        <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)', background: checked?.has(row.id) ? 'var(--pink-10)' : undefined, boxShadow: checked?.has(row.id) ? 'inset 3px 0 0 var(--brand)' : undefined }}>
          {selectable && <Checkbox checked={checked!.has(row.id)} onChange={() => onToggle!(row.id)} label={`Select ${row.code} ${row.dealerName}`} />}
          <span style={{ ...sBody, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
            {row.code} {'  '}
            <span style={{ color: 'var(--ink-2)' }}>{row.dealerName} - {row.customerType}</span>
            <span style={{ ...sBodyB, fontSize: 11, color: 'var(--ink-2)', background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              Country: {row.country}
            </span>
          </span>
          <button
            className="eos-stroke-btn"
            onClick={() => onAction(row.id)}
            style={{
              ...sBodyB,
              height: 30,
              border: '1px solid var(--strong)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg)',
              color: 'var(--ink)',
              padding: '0 8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {actionLabel}
          </button>
        </div>
      ))}
      {rows.length === 0 && <div style={{ ...sBody, color: 'var(--ink-2)', padding: 14 }}>{emptyLabel}</div>}
    </div>
  );
}

export default function CustomerGroupDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';

  const [navOpen, setNavOpen] = useState(false);
  const [initialState] = useState(loadCatalogueAccessState);
  const existing = useMemo(
    () => (isNew ? null : initialState.customerGroups.find(g => g.id === id) ?? null),
    [initialState.customerGroups, id, isNew],
  );

  const [name, setName] = useState(existing?.name ?? '');
  // Available column filters
  const [siteFilter, setSiteFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(existing?.customerIds ?? []));
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Filters + multi-select for the "Current Customers In Group" list only
  const [curSite, setCurSite] = useState('');
  const [curCountry, setCurCountry] = useState('');
  const [curSearch, setCurSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const role = sessionStorage.getItem('eos-user-role') ?? 'Admin';
  const isAdmin = role === 'Admin';

  const filtered = CUSTOMERS.filter(customer => (
    (!siteFilter || customer.site === siteFilter) &&
    (!typeFilter || customer.customerType === typeFilter) &&
    wildcardIncludes(customerSearchText(customer), search)
  ));

  const toRow = (c: (typeof CUSTOMERS)[number]): CustomerRow => ({ id: c.id, code: toDealerCode(c), dealerName: c.dealerName, customerType: c.customerType, country: c.country });

  const selectedRows: CustomerRow[] = CUSTOMERS.filter(c => selected.has(c.id)).map(toRow);
  const available = filtered.filter(c => !selected.has(c.id));

  const assigned = CUSTOMERS.filter(c => selected.has(c.id));
  const uniq = (values: string[], keep: string) => Array.from(new Set(keep ? [...values, keep] : values)).sort();
  const siteOptions = uniq(assigned.map(c => c.site), curSite);
  const countryOptions = uniq(assigned.map(c => c.country), curCountry);
  const allSiteOptions = uniq(CUSTOMERS.map(c => c.site), '');
  const allTypeOptions = uniq(CUSTOMERS.map(c => c.customerType), '');
  const currentRows: CustomerRow[] = assigned
    .filter(c =>
      (!curSite || c.site === curSite) &&
      (!curCountry || c.country === curCountry) &&
      wildcardIncludes(`${customerSearchText(c)} ${c.country}`, curSearch))
    .map(toRow);
  // Only rows still visible under the current filter count as selected, so a bulk remove never hits hidden rows.
  const visibleChecked = new Set(currentRows.filter(r => checked.has(r.id)).map(r => r.id));
  const toggleChecked = (cid: string) => setChecked(prev => {
    const next = new Set(prev);
    if (next.has(cid)) next.delete(cid); else next.add(cid);
    return next;
  });
  const toggleAllVisible = () => setChecked(
    visibleChecked.size === currentRows.length ? new Set() : new Set(currentRows.map(r => r.id)),
  );
  const bulkRemove = () => {
    const count = visibleChecked.size;
    setSelected(prev => {
      const next = new Set(prev);
      visibleChecked.forEach(cid => next.delete(cid));
      return next;
    });
    setChecked(new Set());
    setConfirmOpen(false);
    setNotice(`${count} customer${count === 1 ? '' : 's'} removed from this group.`);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const totalPages = Math.max(1, Math.ceil(available.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const availableRows: CustomerRow[] = available.slice(start, start + PAGE_SIZE).map(toRow);

  const addCustomer = (cid: string) => setSelected(prev => new Set(prev).add(cid));

  const removeCustomer = (cid: string) => setSelected(prev => {
    const next = new Set(prev);
    next.delete(cid);
    return next;
  });

  const addAllFiltered = () => setSelected(prev => {
    const next = new Set(prev);
    available.forEach(c => next.add(c.id));
    return next;
  });

  const backToList = () => navigate('/admin/catalogue-access', { state: { section: 'customer-groups' } });

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Group name is required.');
      return;
    }

    const customerIds = Array.from(selected);
    const current = loadCatalogueAccessState();
    const nextGroups = existing
      ? current.customerGroups.map(g => (g.id === existing.id ? { ...g, name: trimmed, customerIds } : g))
      : [...current.customerGroups, { id: uid('custg'), name: trimmed, customerIds }];

    saveCatalogueAccessState({ ...current, customerGroups: nextGroups });
    navigate('/admin/catalogue-access', {
      state: { section: 'customer-groups', toast: existing ? 'Customer group updated.' : 'Customer group created.' },
    });
  };

  return (
    <>
      <style>{`
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .eos-primary-btn:not(:disabled):hover { background: var(--brand-dark) !important; border-color: var(--brand-dark) !important; }
        .eos-stroke-btn:hover { background: var(--ink-fill) !important; color: var(--on-ink) !important; border-color: var(--strong) !important; }
      `}</style>

      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="catalogueAccess" />

      <main style={{ maxWidth: size.maxWidth, margin: '0 auto', padding: `0 ${size.pagePad}px 40px` }}>
        <DetailBreadcrumb
          crumbs={[
            { label: 'Catalogue Management', onClick: backToList },
            { label: 'Customer Groups', onClick: backToList },
            { label: existing ? existing.name : 'New Group' },
          ]}
        />

        {!isAdmin ? (
          <AccessDenied />
        ) : (
          <>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ ...sLargeB, fontSize: 28, margin: 0, color: 'var(--ink)' }}>
                {existing ? `Edit Customer Group: ${existing.name}` : 'New Customer Group'}
              </h1>
              <div style={{ display: 'flex', gap: 10 }}>
                <StrokeButton onClick={backToList}>Cancel</StrokeButton>
                <PrimaryButton onClick={handleSave}>Save</PrimaryButton>
              </div>
            </header>

            <section style={{ maxWidth: 480, marginTop: 24 }}>
              <label style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Group Name</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setError(null); }}
                style={{ ...sBody, width: '100%', height: 44, border: '2px solid var(--strong)', borderRadius: 'var(--radius)', padding: '0 12px', marginTop: 8, fontFamily: 'inherit' }}
              />
              {error && <p style={{ ...sBody, color: 'var(--red)', marginTop: 10 }}>{error}</p>}
            </section>

            <section style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
                <Chip label={`Selected: ${selected.size} customers`} />
                <Chip label={`Available: ${available.length}`} />
              </div>

              {notice && (
                <div role="status" style={{ ...sBody, background: 'var(--blue-soft)', color: 'var(--ink)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 12 }}>
                  {notice}
                </div>
              )}

              {/* One shared grid so headers, filters, toolbars and lists line up row-for-row across both columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
                <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                  Current Customers In Group
                </div>
                <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                  Available Customers To Add
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <FilterSelect label="Site" value={curSite} onChange={setCurSite} options={siteOptions} allLabel="All sites" />
                  <FilterSelect label="Country" value={curCountry} onChange={setCurCountry} options={countryOptions} allLabel="All countries" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <FilterSelect label="Site" value={siteFilter} onChange={v => { setPage(1); setSiteFilter(v); }} options={allSiteOptions} allLabel="All sites" />
                  <FilterSelect label="Dealer Type" value={typeFilter} onChange={v => { setPage(1); setTypeFilter(v); }} options={allTypeOptions} allLabel="All types" />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <FilterText label="Search" value={curSearch} onChange={setCurSearch} placeholder="Start typing to search..." />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <FilterSlot label="Search">
                    <SearchInput value={search} onChange={value => { setPage(1); setSearch(value); }} placeholder="Start typing to search..." />
                  </FilterSlot>
                </div>

                <BulkRemoveBar
                  visibleCount={currentRows.length}
                  selectedCount={visibleChecked.size}
                  onToggleAll={toggleAllVisible}
                  onClear={() => setChecked(new Set())}
                  removeLabel="Remove Selected Customers"
                  onRemove={() => setConfirmOpen(true)}
                />
                <AddAllBar count={available.length} noun="Customers" onAddAll={addAllFiltered} />

                <CustomerRowList
                  rows={currentRows}
                  emptyLabel={selectedRows.length === 0 ? 'No customers currently in this group.' : 'No customers match your filters.'}
                  actionLabel="Remove"
                  onAction={removeCustomer}
                  checked={visibleChecked}
                  onToggle={toggleChecked}
                />
                <CustomerRowList rows={availableRows} emptyLabel="No available customers match your filters." actionLabel="Add" onAction={addCustomer} flatTop />

                <div />
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <span style={{ ...sBody, color: 'var(--ink-2)', fontSize: 12, marginRight: 4 }}>Page {currentPage} of {totalPages}</span>
                  <StrokeButton onClick={() => setPage(Math.max(1, currentPage - 1))}>Previous</StrokeButton>
                  <StrokeButton onClick={() => setPage(Math.min(totalPages, currentPage + 1))}>Next</StrokeButton>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove Customers"
        message="Are you sure you want to remove the selected customer(s) from this Customer Group?"
        confirmLabel="Remove"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={bulkRemove}
      />
    </>
  );
}
