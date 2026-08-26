import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import { size, t } from '../../tokens';
import { CUSTOMERS, customerSearchText, toDealerCode, uid, wildcardIncludes } from '../../data/catalogueAccess';
import { loadCatalogueAccessState, saveCatalogueAccessState } from '../../services/catalogueAccessStore';
import {
  Chip,
  DetailBreadcrumb,
  DetailTabStrip,
  PrimaryButton,
  SearchInput,
  StrokeButton,
} from '../CatalogueAccessAdmin/shared';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

type Tab = 'details' | 'assign';
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
}: {
  rows: CustomerRow[];
  emptyLabel: string;
  actionLabel: string;
  onAction: (id: string) => void;
}) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 480, overflow: 'auto' }}>
      {rows.map(row => (
        <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
          <span style={{ ...sBody, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
              border: '1px solid var(--ink)',
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
  const [tab, setTab] = useState<Tab>('details');
  const [initialState] = useState(loadCatalogueAccessState);
  const existing = useMemo(
    () => (isNew ? null : initialState.customerGroups.find(g => g.id === id) ?? null),
    [initialState.customerGroups, id, isNew],
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [siteQuery, setSiteQuery] = useState('');
  const [typeQuery, setTypeQuery] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(existing?.customerIds ?? []));
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const role = sessionStorage.getItem('eos-user-role') ?? 'Admin';
  const isAdmin = role === 'Admin';

  const filtered = CUSTOMERS.filter(customer => {
    const bySite = wildcardIncludes(customer.site, siteQuery);
    const byType = wildcardIncludes(customer.customerType, typeQuery);
    const byText = wildcardIncludes(customerSearchText(customer), search);
    return bySite && byType && byText;
  });

  const toRow = (c: (typeof CUSTOMERS)[number]): CustomerRow => ({ id: c.id, code: toDealerCode(c), dealerName: c.dealerName, customerType: c.customerType, country: c.country });

  const selectedRows: CustomerRow[] = CUSTOMERS.filter(c => selected.has(c.id)).map(toRow);
  const available = filtered.filter(c => !selected.has(c.id));

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

  const backToList = () => navigate('/admin/catalogue-access', { state: { section: 'customer-groups' } });

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Group name is required.');
      setTab('details');
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
        .eos-stroke-btn:hover { background: var(--ink) !important; color: var(--bg) !important; border-color: var(--ink) !important; }
        .eos-detail-tab:hover[data-active="false"] { color: var(--ink); }
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

            <DetailTabStrip
              tabs={[
                { id: 'details', label: 'Details' },
                { id: 'assign', label: 'Assign Customers' },
              ]}
              active={tab}
              onChange={setTab}
            />

            {tab === 'details' && (
              <section style={{ maxWidth: 480 }}>
                <label style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Group Name</label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setError(null); }}
                  style={{ ...sBody, width: '100%', height: 44, border: '2px solid var(--ink)', borderRadius: 'var(--radius)', padding: '0 12px', marginTop: 8, fontFamily: 'inherit' }}
                />
                {error && <p style={{ ...sBody, color: 'var(--red)', marginTop: 10 }}>{error}</p>}
              </section>
            )}

            {tab === 'assign' && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <SearchInput value={siteQuery} onChange={value => { setPage(1); setSiteQuery(value); }} placeholder="Search Site (* wildcard)" />
                    <SearchInput value={typeQuery} onChange={value => { setPage(1); setTypeQuery(value); }} placeholder="Search dealer type" />
                    <SearchInput value={search} onChange={value => { setPage(1); setSearch(value); }} placeholder="Search customers..." />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Chip label={`Selected: ${selected.size} customers`} />
                    <Chip label={`Available: ${available.length}`} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                      Current Customers In Group
                    </div>
                    <CustomerRowList rows={selectedRows} emptyLabel="No customers currently in this group." actionLabel="Remove" onAction={removeCustomer} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        Available Customers To Add
                      </div>
                      <span style={{ ...sBody, color: 'var(--ink-2)', fontSize: 12 }}>Page {currentPage} of {totalPages}</span>
                    </div>
                    <CustomerRowList rows={availableRows} emptyLabel="No available customers match your filters." actionLabel="Add" onAction={addCustomer} />
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <StrokeButton onClick={() => setPage(Math.max(1, currentPage - 1))}>Previous</StrokeButton>
                      <StrokeButton onClick={() => setPage(Math.min(totalPages, currentPage + 1))}>Next</StrokeButton>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
