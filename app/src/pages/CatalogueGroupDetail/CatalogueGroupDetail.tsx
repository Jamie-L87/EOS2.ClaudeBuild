import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import { size, t } from '../../tokens';
import { CATALOGUES, uid, wildcardIncludes } from '../../data/catalogueAccess';
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

function RowList({
  rows,
  emptyLabel,
  actionLabel,
  onAction,
}: {
  rows: Array<{ id: number; name: string }>;
  emptyLabel: string;
  actionLabel: string;
  onAction: (id: number) => void;
}) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 480, overflow: 'auto' }}>
      {rows.map(row => (
        <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
          <span style={{ ...sBody, color: 'var(--ink)' }}>{row.id} - {row.name}</span>
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

export default function CatalogueGroupDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';

  const [navOpen, setNavOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('details');
  const [initialState] = useState(loadCatalogueAccessState);
  const existing = useMemo(
    () => (isNew ? null : initialState.catalogueGroups.find(g => g.id === id) ?? null),
    [initialState.catalogueGroups, id, isNew],
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set(existing?.catalogueIds ?? []));
  const [error, setError] = useState<string | null>(null);

  const role = sessionStorage.getItem('eos-user-role') ?? 'Admin';
  const isAdmin = role === 'Admin';

  const filtered = CATALOGUES.filter(c => wildcardIncludes(`${c.id} ${c.name}`, search));
  const selectedRows = CATALOGUES.filter(c => selected.has(c.id));
  const availableRows = filtered.filter(c => !selected.has(c.id));

  const addCatalogue = (cid: number) => setSelected(prev => new Set(prev).add(cid));
  const removeCatalogue = (cid: number) => setSelected(prev => {
    const next = new Set(prev);
    next.delete(cid);
    return next;
  });

  const backToList = () => navigate('/admin/catalogue-access', { state: { section: 'catalogue-groups' } });

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Group name is required.');
      setTab('details');
      return;
    }

    const catalogueIds = Array.from(selected);
    const current = loadCatalogueAccessState();
    const nextGroups = existing
      ? current.catalogueGroups.map(g => (g.id === existing.id ? { ...g, name: trimmed, catalogueIds } : g))
      : [...current.catalogueGroups, { id: uid('cg'), name: trimmed, catalogueIds }];

    saveCatalogueAccessState({ ...current, catalogueGroups: nextGroups });
    navigate('/admin/catalogue-access', {
      state: { section: 'catalogue-groups', toast: existing ? 'Catalogue group updated.' : 'Catalogue group created.' },
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
            { label: 'Catalogue Groups', onClick: backToList },
            { label: existing ? existing.name : 'New Group' },
          ]}
        />

        {!isAdmin ? (
          <AccessDenied />
        ) : (
          <>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={{ ...sLargeB, fontSize: 28, margin: 0, color: 'var(--ink)' }}>
                {existing ? `Edit Catalogue Group: ${existing.name}` : 'New Catalogue Group'}
              </h1>
              <div style={{ display: 'flex', gap: 10 }}>
                <StrokeButton onClick={backToList}>Cancel</StrokeButton>
                <PrimaryButton onClick={handleSave}>Save</PrimaryButton>
              </div>
            </header>

            <DetailTabStrip
              tabs={[
                { id: 'details', label: 'Details' },
                { id: 'assign', label: 'Assign Catalogues' },
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                  <SearchInput value={search} onChange={setSearch} placeholder="Search catalogues... (* wildcard supported)" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Chip label={`Selected: ${selected.size} catalogues`} />
                    <Chip label={`Available: ${availableRows.length}`} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <div>
                    <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                      Current Catalogues In Group
                    </div>
                    <RowList rows={selectedRows} emptyLabel="No catalogues currently in this group." actionLabel="Remove" onAction={removeCatalogue} />
                  </div>
                  <div>
                    <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                      Available Catalogues To Add
                    </div>
                    <RowList rows={availableRows} emptyLabel="No available catalogues match your search." actionLabel="Add" onAction={addCatalogue} />
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
