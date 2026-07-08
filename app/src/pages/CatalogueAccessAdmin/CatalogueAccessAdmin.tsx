import { useEffect, useMemo, useState } from 'react';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import {
  IconCheck,
  IconClose,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
} from '../../components/Icons';
import { color, radius, shadow, size, t } from '../../tokens';
import {
  CATALOGUES,
  CUSTOMERS,
  customerSearchText,
  toDealerCode,
  wildcardIncludes,
  type CatalogueGroup,
  type CustomerGroup,
} from '../../data/catalogueAccess';
import {
  loadCatalogueAccessState,
  saveCatalogueAccessState,
} from '../../services/catalogueAccessStore';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

type Section = 'catalogue-groups' | 'customer-groups' | 'assignment';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function Footer() {
  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        height: 72,
        marginTop: 40,
        borderTop: '1px solid var(--line)',
        background: color.bg,
      }}
    >
      <span style={{ ...sLargeB, color: 'var(--brand)', letterSpacing: '0.05em' }}>EOS CLOUD</span>
      <span style={{ ...sBody, color: 'var(--ink-2)' }}>2026 - MillerKnoll</span>
      <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>Tsunami Axis Ltd</span>
    </footer>
  );
}

function AccessDenied() {
  return (
    <div
      style={{
        marginTop: 24,
        border: '2px solid var(--red)',
        background: 'var(--red-soft)',
        borderRadius: 'var(--radius)',
        padding: 24,
      }}
    >
      <h2 style={{ ...sLargeB, margin: 0, color: 'var(--red)' }}>Access Denied</h2>
      <p style={{ ...sBody, margin: '10px 0 0', color: 'var(--ink)' }}>
        You do not have permission to access Catalogue Management. This page is restricted to Admin role users.
      </p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span
      style={{
        ...sBodyB,
        fontSize: 11,
        color: 'var(--ink-2)',
        background: 'var(--bg-soft)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '4px 10px',
      }}
    >
      {label}
    </span>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 44,
        border: '2px solid var(--ink)',
        borderRadius: 'var(--radius)',
        padding: '0 12px',
        background: color.bg,
        minWidth: 260,
      }}
    >
      <IconSearch size={16} stroke={1.8} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...sBody,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          width: '100%',
          color: 'var(--ink)',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}

function TableCard({ title, toolbar, children }: { title: string; toolbar?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        background: color.bg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ ...sLargeB, margin: 0, color: 'var(--ink)' }}>{title}</h2>
        {toolbar}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </section>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="eos-primary-btn"
      style={{
        ...sLargeB,
        height: 50,
        border: '2px solid var(--brand)',
        borderRadius: radius,
        background: 'var(--brand)',
        color: color.bg,
        padding: '0 18px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function StrokeButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="eos-stroke-btn"
      style={{
        ...sLargeB,
        height: 50,
        border: '2px solid var(--ink)',
        borderRadius: radius,
        background: color.bg,
        color: 'var(--ink)',
        padding: '0 18px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function IconActionButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="eos-stroke-btn"
      style={{
        ...sBodyB,
        height: 36,
        border: '1px solid var(--ink)',
        borderRadius: radius,
        background: color.bg,
        color: 'var(--ink)',
        padding: '0 10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function CatalogueGroupModal({
  open,
  title,
  initialName,
  initialCatalogueIds,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initialName: string;
  initialCatalogueIds: number[];
  onClose: () => void;
  onSave: (name: string, catalogueIds: number[]) => void;
}) {
  const [name, setName] = useState(initialName);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set(initialCatalogueIds));

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setSearch('');
    setSelected(new Set(initialCatalogueIds));
  }, [open, initialName, initialCatalogueIds]);

  if (!open) return null;

  const filtered = CATALOGUES.filter(c => wildcardIncludes(`${c.id} ${c.name}`, search));
  const selectedRows = CATALOGUES.filter(c => selected.has(c.id));
  const rows = filtered.filter(c => !selected.has(c.id));

  const addCatalogue = (id: number) => {
    const next = new Set(selected);
    next.add(id);
    setSelected(next);
  };

  const removeCatalogue = (id: number) => {
    const next = new Set(selected);
    next.delete(id);
    setSelected(next);
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,9,0.32)', zIndex: 120 }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          zIndex: 121,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 720,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          background: color.bg,
          border: '2px solid var(--black)',
          borderRadius: radius,
          boxShadow: shadow.pop,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ ...sLargeB, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflow: 'auto' }}>
          <label style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Group Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...sBody, width: '100%', height: 44, border: '2px solid var(--ink)', borderRadius: 'var(--radius)', padding: '0 12px', marginTop: 8, marginBottom: 18, fontFamily: 'inherit' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Assign Catalogues</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Chip label={`Selected: ${selected.size} catalogues`} />
              <Chip label={`Available: ${rows.length}`} />
            </div>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search catalogues... (* wildcard supported)" />

          <div style={{ marginTop: 12 }}>
            <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              Current Catalogues In Group
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 190, overflow: 'auto' }}>
              {selectedRows.map(row => (
                <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ ...sBody, color: 'var(--ink)' }}>{row.id} - {row.name}</span>
                  <button
                    className="eos-stroke-btn"
                    onClick={() => removeCatalogue(row.id)}
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
                    Remove
                  </button>
                </div>
              ))}
              {selectedRows.length === 0 && (
                <div style={{ ...sBody, color: 'var(--ink-2)', padding: 14 }}>No catalogues currently in this group.</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              Available Catalogues To Add
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 220, overflow: 'auto' }}>
            {rows.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
                <span style={{ ...sBody, color: 'var(--ink)' }}>{row.id} - {row.name}</span>
                <button
                  className="eos-stroke-btn"
                  onClick={() => addCatalogue(row.id)}
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
                  Add
                </button>
              </div>
            ))}
            {rows.length === 0 && (
              <div style={{ ...sBody, color: 'var(--ink-2)', padding: 14 }}>No available catalogues match your search.</div>
            )}
          </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <StrokeButton onClick={onClose}>Cancel</StrokeButton>
          <PrimaryButton onClick={() => onSave(name.trim(), Array.from(selected))}>Save</PrimaryButton>
        </div>
      </div>
    </>
  );
}

function CustomerGroupModal({
  open,
  title,
  initialName,
  initialCustomerIds,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  initialName: string;
  initialCustomerIds: string[];
  onClose: () => void;
  onSave: (name: string, customerIds: string[]) => void;
}) {
  const [name, setName] = useState(initialName);
  const [siteQuery, setSiteQuery] = useState('');
  const [typeQuery, setTypeQuery] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(initialCustomerIds));
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setSiteQuery('');
    setTypeQuery('');
    setSearch('');
    setPage(1);
    setSelected(new Set(initialCustomerIds));
  }, [open, initialName, initialCustomerIds]);

  const PAGE_SIZE = 80;
  const filtered = CUSTOMERS.filter(customer => {
    const bySite = wildcardIncludes(customer.site, siteQuery);
    const byType = wildcardIncludes(customer.customerType, typeQuery);
    const byText = wildcardIncludes(customerSearchText(customer), search);
    return bySite && byType && byText;
  });

  const selectedRows = CUSTOMERS.filter(customer => selected.has(customer.id));
  const available = filtered.filter(customer => !selected.has(customer.id));

  const start = (page - 1) * PAGE_SIZE;
  const rows = available.slice(start, start + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(available.length / PAGE_SIZE));

  useEffect(() => {
    setPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  if (!open) return null;

  const addCustomer = (id: string) => {
    const next = new Set(selected);
    next.add(id);
    setSelected(next);
  };

  const removeCustomer = (id: string) => {
    const next = new Set(selected);
    next.delete(id);
    setSelected(next);
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,9,0.32)', zIndex: 120 }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          zIndex: 121,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 900,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          background: color.bg,
          border: '2px solid var(--black)',
          borderRadius: radius,
          boxShadow: shadow.pop,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ ...sLargeB, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflow: 'auto' }}>
          <label style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Group Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...sBody, width: '100%', height: 44, border: '2px solid var(--ink)', borderRadius: 'var(--radius)', padding: '0 12px', marginTop: 8, marginBottom: 18, fontFamily: 'inherit' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <label style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Assign Customers</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Chip label={`Selected: ${selected.size} customers`} />
              <Chip label={`Available: ${available.length}`} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 8 }}>
            <SearchInput value={siteQuery} onChange={value => { setPage(1); setSiteQuery(value); }} placeholder="Search Site (* wildcard)" />
            <SearchInput value={typeQuery} onChange={value => { setPage(1); setTypeQuery(value); }} placeholder="Search dealer type" />
            <SearchInput value={search} onChange={value => { setPage(1); setSearch(value); }} placeholder="Search customers..." />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              Current Customers In Group
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 190, overflow: 'auto' }}>
              {selectedRows.map(row => (
                <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
                  <span style={{ ...sBody, color: 'var(--ink)' }}>
                    {toDealerCode(row)} {'  '}
                    <span style={{ color: 'var(--ink-2)' }}>{row.dealerName} - {row.customerType}</span>
                  </span>
                  <button
                    className="eos-stroke-btn"
                    onClick={() => removeCustomer(row.id)}
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
                    Remove
                  </button>
                </div>
              ))}
              {selectedRows.length === 0 && (
                <div style={{ ...sBody, color: 'var(--ink-2)', padding: 14 }}>No customers currently in this group.</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              Available Customers To Add
            </div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 220, overflow: 'auto' }}>
            {rows.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
                <span style={{ ...sBody, color: 'var(--ink)' }}>
                  {toDealerCode(row)} {'  '}
                  <span style={{ color: 'var(--ink-2)' }}>{row.dealerName} - {row.customerType}</span>
                </span>
                <button
                  className="eos-stroke-btn"
                  onClick={() => addCustomer(row.id)}
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
                  Add
                </button>
              </div>
            ))}
            {rows.length === 0 && (
              <div style={{ ...sBody, color: 'var(--ink-2)', padding: 14 }}>No available customers match your filters.</div>
            )}
          </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...sBody, color: 'var(--ink-2)' }}>Supports large datasets via filtering + paging</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <StrokeButton onClick={() => setPage(Math.max(1, page - 1))}>Previous</StrokeButton>
              <span style={{ ...sBody, alignSelf: 'center', color: 'var(--ink)' }}>Page {page} of {totalPages}</span>
              <StrokeButton onClick={() => setPage(Math.min(totalPages, page + 1))}>Next</StrokeButton>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <StrokeButton onClick={onClose}>Cancel</StrokeButton>
          <PrimaryButton onClick={() => onSave(name.trim(), Array.from(selected))}>Save</PrimaryButton>
        </div>
      </div>
    </>
  );
}

export default function CatalogueAccessAdminPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [section, setSection] = useState<Section>('catalogue-groups');
  const [state, setState] = useState(loadCatalogueAccessState);
  const [toast, setToast] = useState<string | null>(null);

  const [catalogueQuery, setCatalogueQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [assignmentGroupQuery, setAssignmentGroupQuery] = useState('');
  const [assignmentCustomerGroupSearch, setAssignmentCustomerGroupSearch] = useState('');

  const [catalogueModal, setCatalogueModal] = useState<{ open: boolean; mode: 'create' | 'edit'; group: CatalogueGroup | null }>({
    open: false,
    mode: 'create',
    group: null,
  });
  const [customerModal, setCustomerModal] = useState<{ open: boolean; mode: 'create' | 'edit'; group: CustomerGroup | null }>({
    open: false,
    mode: 'create',
    group: null,
  });

  const role = sessionStorage.getItem('eos-user-role') ?? 'Admin';
  const isAdmin = role === 'Admin';

  const catalogueRows = useMemo(() => {
    return state.catalogueGroups.filter(group => wildcardIncludes(group.name, catalogueQuery));
  }, [state.catalogueGroups, catalogueQuery]);

  const customerRows = useMemo(() => {
    return state.customerGroups.filter(group => wildcardIncludes(group.name, customerQuery));
  }, [state.customerGroups, customerQuery]);

  const assignmentCustomerGroups = useMemo(() => {
    return state.customerGroups.filter(group => wildcardIncludes(group.name, assignmentCustomerGroupSearch));
  }, [state.customerGroups, assignmentCustomerGroupSearch]);

  const [selectedCustomerGroupId, setSelectedCustomerGroupId] = useState<string>('');

  const selectedAssignment = useMemo(() => {
    return state.assignments.find(a => a.customerGroupId === selectedCustomerGroupId) ?? null;
  }, [state.assignments, selectedCustomerGroupId]);

  const [pendingAssignedCatalogueGroupIds, setPendingAssignedCatalogueGroupIds] = useState<Set<string>>(new Set());

  const filteredCatalogueGroupRowsForAssignment = useMemo(() => {
    return state.catalogueGroups.filter(group => wildcardIncludes(group.name, assignmentGroupQuery));
  }, [state.catalogueGroups, assignmentGroupQuery]);

  const saveState = (next: typeof state) => {
    setState(next);
    saveCatalogueAccessState(next);
  };

  const openCreateCatalogueGroup = () => {
    setCatalogueModal({ open: true, mode: 'create', group: null });
  };

  const openEditCatalogueGroup = (group: CatalogueGroup) => {
    setCatalogueModal({ open: true, mode: 'edit', group });
  };

  const openCreateCustomerGroup = () => {
    setCustomerModal({ open: true, mode: 'create', group: null });
  };

  const openEditCustomerGroup = (group: CustomerGroup) => {
    setCustomerModal({ open: true, mode: 'edit', group });
  };

  const deleteCatalogueGroup = (id: string) => {
    const next = {
      ...state,
      catalogueGroups: state.catalogueGroups.filter(g => g.id !== id),
      assignments: state.assignments.map(a => ({
        ...a,
        catalogueGroupIds: a.catalogueGroupIds.filter(groupId => groupId !== id),
      })),
    };
    saveState(next);
    setToast('Catalogue group deleted.');
  };

  const deleteCustomerGroup = (id: string) => {
    const next = {
      ...state,
      customerGroups: state.customerGroups.filter(g => g.id !== id),
      assignments: state.assignments.filter(a => a.customerGroupId !== id),
    };
    saveState(next);
    if (selectedCustomerGroupId === id) {
      setSelectedCustomerGroupId('');
      setPendingAssignedCatalogueGroupIds(new Set());
    }
    setToast('Customer group deleted.');
  };

  const saveCatalogueGroup = (name: string, catalogueIds: number[]) => {
    if (!name) {
      setToast('Group name is required.');
      return;
    }
    const deduped = Array.from(new Set(catalogueIds));
    const editing = catalogueModal.mode === 'edit' && catalogueModal.group;
    const nextGroups = editing
      ? state.catalogueGroups.map(group => (group.id === catalogueModal.group!.id
        ? { ...group, name, catalogueIds: deduped }
        : group))
      : [...state.catalogueGroups, { id: uid('cg'), name, catalogueIds: deduped }];

    saveState({ ...state, catalogueGroups: nextGroups });
    setCatalogueModal({ open: false, mode: 'create', group: null });
    setToast(editing ? 'Catalogue group updated.' : 'Catalogue group created.');
  };

  const saveCustomerGroup = (name: string, customerIds: string[]) => {
    if (!name) {
      setToast('Group name is required.');
      return;
    }

    const deduped = Array.from(new Set(customerIds));
    const editing = customerModal.mode === 'edit' && customerModal.group;
    const nextGroups = editing
      ? state.customerGroups.map(group => (group.id === customerModal.group!.id
        ? { ...group, name, customerIds: deduped }
        : group))
      : [...state.customerGroups, { id: uid('custg'), name, customerIds: deduped }];

    saveState({ ...state, customerGroups: nextGroups });
    setCustomerModal({ open: false, mode: 'create', group: null });
    setToast(editing ? 'Customer group updated.' : 'Customer group created.');
  };

  const onSelectCustomerGroupForAssignment = (groupId: string) => {
    setSelectedCustomerGroupId(groupId);
    const existing = state.assignments.find(a => a.customerGroupId === groupId);
    setPendingAssignedCatalogueGroupIds(new Set(existing?.catalogueGroupIds ?? []));
  };

  const toggleAssignedCatalogueGroup = (catalogueGroupId: string) => {
    if (!selectedCustomerGroupId) {
      setToast('Select a customer group first.');
      return;
    }

    const next = new Set(pendingAssignedCatalogueGroupIds);
    if (next.has(catalogueGroupId)) next.delete(catalogueGroupId);
    else next.add(catalogueGroupId);
    setPendingAssignedCatalogueGroupIds(next);
  };

  const allVisibleAssigned =
    filteredCatalogueGroupRowsForAssignment.length > 0
    && filteredCatalogueGroupRowsForAssignment.every(group => pendingAssignedCatalogueGroupIds.has(group.id));

  const toggleAllVisibleAssigned = () => {
    if (!selectedCustomerGroupId) {
      setToast('Select a customer group first.');
      return;
    }

    const next = new Set(pendingAssignedCatalogueGroupIds);
    if (allVisibleAssigned) {
      filteredCatalogueGroupRowsForAssignment.forEach(group => next.delete(group.id));
    } else {
      filteredCatalogueGroupRowsForAssignment.forEach(group => next.add(group.id));
    }
    setPendingAssignedCatalogueGroupIds(next);
  };

  const saveAssignment = () => {
    if (!selectedCustomerGroupId) {
      setToast('Select a customer group first.');
      return;
    }

    const list = Array.from(pendingAssignedCatalogueGroupIds);
    const existing = state.assignments.find(a => a.customerGroupId === selectedCustomerGroupId);
    const nextAssignments = existing
      ? state.assignments.map(a => (a.customerGroupId === selectedCustomerGroupId ? { ...a, catalogueGroupIds: list } : a))
      : [...state.assignments, { customerGroupId: selectedCustomerGroupId, catalogueGroupIds: list }];

    saveState({ ...state, assignments: nextAssignments });
    setToast('Catalogue group assignments saved.');
  };

  const selectedCustomerGroupName = state.customerGroups.find(g => g.id === selectedCustomerGroupId)?.name ?? '';

  return (
    <>
      <style>{`
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .eos-primary-btn:not(:disabled):hover { background: var(--brand-dark) !important; border-color: var(--brand-dark) !important; }
        .eos-stroke-btn:hover { background: var(--ink) !important; color: var(--bg) !important; border-color: var(--ink) !important; }
        .eos-row:hover { background: var(--bg-soft); }
        .eos-tab-btn[data-active="true"] { background: var(--brand); color: var(--bg); border-color: var(--brand); }
      `}</style>

      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="catalogueAccess" />

      <main style={{ maxWidth: size.maxWidth, margin: '0 auto', padding: `0 ${size.pagePad}px 40px` }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ ...sLargeB, fontSize: 33.18, lineHeight: 1.2, margin: 0, color: 'var(--ink)' }}>Catalogue Management</h1>
            <p style={{ ...sBody, margin: '8px 0 0', color: 'var(--ink-2)' }}>Manage catalogue groups, customer groups, and assignments.</p>
          </div>
          <Chip label={`Role: ${role}`} />
        </header>

        {!isAdmin ? (
          <AccessDenied />
        ) : (
          <>
            <div style={{ display: 'inline-flex', marginTop: 20 }}>
              {[
                { id: 'catalogue-groups', label: 'Catalogue Groups' },
                { id: 'customer-groups', label: 'Customer Groups' },
                { id: 'assignment', label: 'Assignments' },
              ].map((item, idx, arr) => (
                <button
                  key={item.id}
                  data-active={section === item.id}
                  className="eos-tab-btn"
                  onClick={() => setSection(item.id as Section)}
                  style={{
                    ...sLargeB,
                    height: size.tabH,
                    border: '2px solid var(--ink)',
                    borderLeftWidth: idx === 0 ? 2 : 1,
                    borderRightWidth: idx === arr.length - 1 ? 2 : 1,
                    borderRadius: 0,
                    borderTopLeftRadius: idx === 0 ? 'var(--radius)' : 0,
                    borderBottomLeftRadius: idx === 0 ? 'var(--radius)' : 0,
                    borderTopRightRadius: idx === arr.length - 1 ? 'var(--radius)' : 0,
                    borderBottomRightRadius: idx === arr.length - 1 ? 'var(--radius)' : 0,
                    background: section === item.id ? 'var(--brand)' : color.bg,
                    color: section === item.id ? color.bg : 'var(--ink)',
                    cursor: 'pointer',
                    padding: '0 20px',
                    fontFamily: 'inherit',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 20, display: 'grid', gap: 20 }}>
              {section === 'catalogue-groups' && (
                <TableCard
                  title="Catalogue Groups"
                  toolbar={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <SearchInput value={catalogueQuery} onChange={setCatalogueQuery} placeholder="Search groups... (* wildcard)" />
                      <PrimaryButton onClick={openCreateCatalogueGroup}>
                        <IconPlus size={16} />
                        Create Catalogue Group
                      </PrimaryButton>
                    </div>
                  }
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Group Name</th>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}># Catalogues</th>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogueRows.map(group => (
                        <tr className="eos-row" key={group.id}>
                          <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)' }}>{group.name}</td>
                          <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)' }}>{group.catalogueIds.length}</td>
                          <td style={{ padding: '12px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8 }}>
                            <IconActionButton label="Edit" onClick={() => openEditCatalogueGroup(group)} icon={<IconEdit size={14} />} />
                            <IconActionButton label="Delete" onClick={() => deleteCatalogueGroup(group.id)} icon={<IconTrash size={14} />} />
                          </td>
                        </tr>
                      ))}
                      {catalogueRows.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ ...sBody, color: 'var(--ink-2)', padding: '18px 12px' }}>No groups found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </TableCard>
              )}

              {section === 'customer-groups' && (
                <TableCard
                  title="Customer Groups"
                  toolbar={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <SearchInput value={customerQuery} onChange={setCustomerQuery} placeholder="Search groups... (* wildcard)" />
                      <PrimaryButton onClick={openCreateCustomerGroup}>
                        <IconPlus size={16} />
                        Create Customer Group
                      </PrimaryButton>
                    </div>
                  }
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Group Name</th>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}># Customers</th>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerRows.map(group => (
                        <tr className="eos-row" key={group.id}>
                          <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)' }}>{group.name}</td>
                          <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)' }}>{group.customerIds.length}</td>
                          <td style={{ padding: '12px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8 }}>
                            <IconActionButton label="Edit" onClick={() => openEditCustomerGroup(group)} icon={<IconEdit size={14} />} />
                            <IconActionButton label="Delete" onClick={() => deleteCustomerGroup(group.id)} icon={<IconTrash size={14} />} />
                          </td>
                        </tr>
                      ))}
                      {customerRows.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ ...sBody, color: 'var(--ink-2)', padding: '18px 12px' }}>No groups found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </TableCard>
              )}

              {section === 'assignment' && (
                <TableCard
                  title="Catalogue Group Assignment to Customer Group"
                  toolbar={
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <SearchInput value={assignmentCustomerGroupSearch} onChange={setAssignmentCustomerGroupSearch} placeholder="Search customer groups... (* wildcard)" />
                      <select
                        value={selectedCustomerGroupId}
                        onChange={e => onSelectCustomerGroupForAssignment(e.target.value)}
                        style={{
                          ...sBody,
                          height: 44,
                          border: '2px solid var(--ink)',
                          borderRadius: 'var(--radius)',
                          padding: '0 12px',
                          minWidth: 320,
                          fontFamily: 'inherit',
                        }}
                      >
                        <option value="">Select customer group</option>
                        {assignmentCustomerGroups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>Customer Group:</span>
                      <span style={{ ...sBody, color: 'var(--ink)' }}>{selectedCustomerGroupName || 'None selected'}</span>
                    </div>
                    <SearchInput value={assignmentGroupQuery} onChange={setAssignmentGroupQuery} placeholder="Search catalogue groups... (* wildcard)" />
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Catalogue Group</th>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}># Catalogues</th>
                        <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={allVisibleAssigned}
                              disabled={filteredCatalogueGroupRowsForAssignment.length === 0}
                              onChange={toggleAllVisibleAssigned}
                            />
                            <span>Assigned</span>
                          </label>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCatalogueGroupRowsForAssignment.map(group => {
                        const assigned = pendingAssignedCatalogueGroupIds.has(group.id);
                        return (
                          <tr className="eos-row" key={group.id}>
                            <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)' }}>{group.name}</td>
                            <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)' }}>{group.catalogueIds.length}</td>
                            <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)' }}>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={assigned}
                                  onChange={() => toggleAssignedCatalogueGroup(group.id)}
                                />
                                <span style={{ color: assigned ? 'var(--green)' : 'var(--ink-2)' }}>{assigned ? 'Assigned' : 'Not assigned'}</span>
                                {assigned && <IconCheck size={14} stroke={2} style={{ color: 'var(--green)' }} />}
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCatalogueGroupRowsForAssignment.length === 0 && (
                        <tr>
                          <td colSpan={3} style={{ ...sBody, color: 'var(--ink-2)', padding: '18px 12px' }}>No catalogue groups found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <PrimaryButton onClick={saveAssignment}>Save Changes</PrimaryButton>
                  </div>

                  {selectedAssignment && (
                    <div style={{ marginTop: 12 }}>
                      <Chip label={`Currently stored assignments: ${selectedAssignment.catalogueGroupIds.length}`} />
                    </div>
                  )}
                </TableCard>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />

      <CatalogueGroupModal
        open={catalogueModal.open}
        title={catalogueModal.mode === 'create' ? 'Create Catalogue Group' : 'Edit Catalogue Group'}
        initialName={catalogueModal.group?.name ?? ''}
        initialCatalogueIds={catalogueModal.group?.catalogueIds ?? []}
        onClose={() => setCatalogueModal({ open: false, mode: 'create', group: null })}
        onSave={saveCatalogueGroup}
      />

      <CustomerGroupModal
        open={customerModal.open}
        title={customerModal.mode === 'create' ? 'Create Customer Group' : 'Edit Customer Group'}
        initialName={customerModal.group?.name ?? ''}
        initialCustomerIds={customerModal.group?.customerIds ?? []}
        onClose={() => setCustomerModal({ open: false, mode: 'create', group: null })}
        onSave={saveCustomerGroup}
      />

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--ink)',
            color: color.bg,
            padding: '12px 18px',
            borderRadius: radius,
            ...sBody,
            zIndex: 200,
          }}
        >
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            style={{ marginLeft: 10, border: 'none', background: 'transparent', color: color.bg, cursor: 'pointer' }}
          >
            <IconClose size={13} />
          </button>
        </div>
      )}
    </>
  );
}
