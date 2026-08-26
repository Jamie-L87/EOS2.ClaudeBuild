import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import {
  IconCheck,
  IconClose,
  IconCopy,
  IconEdit,
  IconEye,
  IconPlus,
  IconTrash,
} from '../../components/Icons';
import { color, radius, size, t } from '../../tokens';
import {
  CATALOGUES,
  CUSTOMERS,
  type CatalogueGroup,
  type CustomerGroup,
  customerSearchText,
  isCatalogueLive,
  toDealerCode,
  uid,
  wildcardIncludes,
} from '../../data/catalogueAccess';
import {
  loadCatalogueAccessState,
  saveCatalogueAccessState,
} from '../../services/catalogueAccessStore';
import {
  Chip,
  ConfirmDialog,
  IconActionButton,
  PrimaryButton,
  SearchInput,
  StrokeButton,
} from './shared';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

type Section = 'catalogue-groups' | 'customer-groups' | 'assignment' | 'dealer-view';

const DEALER_PAGE_SIZE = 20;

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

export default function CatalogueAccessAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { section?: Section; toast?: string } | null;

  const [navOpen, setNavOpen] = useState(false);
  const [section, setSection] = useState<Section>(locationState?.section ?? 'catalogue-groups');
  const [state, setState] = useState(loadCatalogueAccessState);
  const [toast, setToast] = useState<string | null>(locationState?.toast ?? null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'catalogue' | 'customer'; id: string; name: string } | null>(null);

  useEffect(() => {
    if (!locationState?.toast) return;
    navigate(location.pathname, { replace: true, state: { section: locationState.section } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to scrub the one-shot toast out of history state
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const [catalogueQuery, setCatalogueQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [assignmentGroupQuery, setAssignmentGroupQuery] = useState('');
  const [assignmentCustomerGroupSearch, setAssignmentCustomerGroupSearch] = useState('');

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

  const [dealerSiteQuery, setDealerSiteQuery] = useState('');
  const [dealerTypeQuery, setDealerTypeQuery] = useState('');
  const [dealerSearch, setDealerSearch] = useState('');
  const [dealerPage, setDealerPage] = useState(1);
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [dealerAsOfDate, setDealerAsOfDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const dealerMatches = useMemo(() => {
    return CUSTOMERS.filter(customer => {
      const bySite = wildcardIncludes(customer.site, dealerSiteQuery);
      const byType = wildcardIncludes(customer.customerType, dealerTypeQuery);
      const byText = wildcardIncludes(customerSearchText(customer), dealerSearch);
      return bySite && byType && byText;
    });
  }, [dealerSiteQuery, dealerTypeQuery, dealerSearch]);

  const dealerTotalPages = Math.max(1, Math.ceil(dealerMatches.length / DEALER_PAGE_SIZE));
  const dealerCurrentPage = Math.min(dealerPage, dealerTotalPages);
  const dealerPageRows = dealerMatches.slice(
    (dealerCurrentPage - 1) * DEALER_PAGE_SIZE,
    (dealerCurrentPage - 1) * DEALER_PAGE_SIZE + DEALER_PAGE_SIZE,
  );

  const selectedDealer = useMemo(
    () => CUSTOMERS.find(c => c.id === selectedDealerId) ?? null,
    [selectedDealerId],
  );

  const dealerCustomerGroups = useMemo(() => {
    if (!selectedDealerId) return [];
    return state.customerGroups.filter(group => group.customerIds.includes(selectedDealerId));
  }, [state.customerGroups, selectedDealerId]);

  const dealerCatalogueGroups = useMemo(() => {
    const customerGroupIds = new Set(dealerCustomerGroups.map(g => g.id));
    const catalogueGroupIds = new Set(
      state.assignments
        .filter(a => customerGroupIds.has(a.customerGroupId))
        .flatMap(a => a.catalogueGroupIds),
    );
    return state.catalogueGroups.filter(group => catalogueGroupIds.has(group.id));
  }, [dealerCustomerGroups, state.assignments, state.catalogueGroups]);

  const dealerCatalogueIdsFromGroups = useMemo(() => {
    return new Set(dealerCatalogueGroups.flatMap(group => group.catalogueIds));
  }, [dealerCatalogueGroups]);

  const dealerExcludedCatalogueIds = useMemo(() => {
    const entry = state.dealerCatalogueExclusions.find(e => e.dealerId === selectedDealerId);
    return new Set(entry?.catalogueIds ?? []);
  }, [state.dealerCatalogueExclusions, selectedDealerId]);

  const dealerAsOf = useMemo(() => {
    const parsed = new Date(dealerAsOfDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [dealerAsOfDate]);

  const catalogueGoLiveById = useMemo(() => {
    return new Map(state.catalogueGoLiveDates.map(g => [g.catalogueId, g.goLiveDate]));
  }, [state.catalogueGoLiveDates]);

  const dealerCatalogues = useMemo(() => {
    return CATALOGUES.filter(c => dealerCatalogueIdsFromGroups.has(c.id)
      && isCatalogueLive(catalogueGoLiveById.get(c.id), dealerAsOf)
      && !dealerExcludedCatalogueIds.has(c.id));
  }, [dealerCatalogueIdsFromGroups, catalogueGoLiveById, dealerAsOf, dealerExcludedCatalogueIds]);

  const dealerExcludedCatalogues = useMemo(() => {
    return CATALOGUES.filter(c => dealerCatalogueIdsFromGroups.has(c.id)
      && isCatalogueLive(catalogueGoLiveById.get(c.id), dealerAsOf)
      && dealerExcludedCatalogueIds.has(c.id));
  }, [dealerCatalogueIdsFromGroups, catalogueGoLiveById, dealerAsOf, dealerExcludedCatalogueIds]);

  const dealerPendingCatalogues = useMemo(() => {
    return CATALOGUES.filter(c => dealerCatalogueIdsFromGroups.has(c.id) && !isCatalogueLive(catalogueGoLiveById.get(c.id), dealerAsOf));
  }, [dealerCatalogueIdsFromGroups, catalogueGoLiveById, dealerAsOf]);

  const selectDealer = (dealerId: string) => {
    setSelectedDealerId(dealerId);
  };

  const excludeDealerCatalogue = (catalogueId: number) => {
    if (!selectedDealerId) return;
    const existing = state.dealerCatalogueExclusions.find(e => e.dealerId === selectedDealerId);
    const nextExclusions = existing
      ? state.dealerCatalogueExclusions.map(e => (e.dealerId === selectedDealerId
        ? { ...e, catalogueIds: Array.from(new Set([...e.catalogueIds, catalogueId])) }
        : e))
      : [...state.dealerCatalogueExclusions, { dealerId: selectedDealerId, catalogueIds: [catalogueId] }];

    saveState({ ...state, dealerCatalogueExclusions: nextExclusions });
    setToast('Catalogue removed for this dealer only — the catalogue group is unchanged.');
  };

  const restoreDealerCatalogue = (catalogueId: number) => {
    if (!selectedDealerId) return;
    const nextExclusions = state.dealerCatalogueExclusions
      .map(e => (e.dealerId === selectedDealerId
        ? { ...e, catalogueIds: e.catalogueIds.filter(id => id !== catalogueId) }
        : e))
      .filter(e => e.catalogueIds.length > 0);

    saveState({ ...state, dealerCatalogueExclusions: nextExclusions });
    setToast('Catalogue restored for this dealer.');
  };

  const saveState = (next: typeof state) => {
    setState(next);
    saveCatalogueAccessState(next);
  };

  const openCreateCatalogueGroup = () => {
    navigate('/admin/catalogue-access/catalogue-groups/new', { state: { section: 'catalogue-groups' } });
  };

  const openEditCatalogueGroup = (group: CatalogueGroup) => {
    navigate(`/admin/catalogue-access/catalogue-groups/${group.id}`, { state: { section: 'catalogue-groups' } });
  };

  const openCreateCustomerGroup = () => {
    navigate('/admin/catalogue-access/customer-groups/new', { state: { section: 'customer-groups' } });
  };

  const openEditCustomerGroup = (group: CustomerGroup) => {
    navigate(`/admin/catalogue-access/customer-groups/${group.id}`, { state: { section: 'customer-groups' } });
  };

  const copyCatalogueGroup = (group: CatalogueGroup) => {
    const existingNames = new Set(state.catalogueGroups.map(g => g.name));
    let copyName = `${group.name} (Copy)`;
    let n = 2;
    while (existingNames.has(copyName)) {
      copyName = `${group.name} (Copy ${n})`;
      n += 1;
    }

    const newGroup: CatalogueGroup = { id: uid('cg'), name: copyName, catalogueIds: [...group.catalogueIds] };
    saveState({ ...state, catalogueGroups: [...state.catalogueGroups, newGroup] });
    setToast(`Copied "${group.name}" to "${copyName}".`);
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

  const confirmDeleteGroup = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === 'catalogue') {
      deleteCatalogueGroup(confirmDelete.id);
    } else {
      deleteCustomerGroup(confirmDelete.id);
    }
    setConfirmDelete(null);
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
                { id: 'dealer-view', label: 'Dealer View' },
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
                            <IconActionButton label="Copy" onClick={() => copyCatalogueGroup(group)} icon={<IconCopy size={14} />} />
                            <IconActionButton label="Delete" onClick={() => setConfirmDelete({ kind: 'catalogue', id: group.id, name: group.name })} icon={<IconTrash size={14} />} />
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
                            <IconActionButton label="Delete" onClick={() => setConfirmDelete({ kind: 'customer', id: group.id, name: group.name })} icon={<IconTrash size={14} />} />
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

              {section === 'dealer-view' && (
                <TableCard
                  title="Dealer View"
                  toolbar={selectedDealer ? (
                    <StrokeButton onClick={() => setSelectedDealerId('')}>Change Dealer</StrokeButton>
                  ) : undefined}
                >
                  {!selectedDealer ? (
                    <>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        <SearchInput value={dealerSiteQuery} onChange={value => { setDealerPage(1); setDealerSiteQuery(value); }} placeholder="Search Site (* wildcard)" />
                        <SearchInput value={dealerTypeQuery} onChange={value => { setDealerPage(1); setDealerTypeQuery(value); }} placeholder="Search dealer type" />
                        <SearchInput value={dealerSearch} onChange={value => { setDealerPage(1); setDealerSearch(value); }} placeholder="Search dealer name or code..." />
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Dealer Code</th>
                            <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Dealer Name</th>
                            <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Type</th>
                            <th style={{ ...sBodyB, textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dealerPageRows.map(c => (
                            <tr className="eos-row" key={c.id}>
                              <td style={{ ...sBodyB, padding: '12px', borderBottom: '1px solid var(--line)' }}>{toDealerCode(c)}</td>
                              <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)' }}>{c.dealerName}</td>
                              <td style={{ ...sBody, padding: '12px', borderBottom: '1px solid var(--line)', color: 'var(--ink-2)' }}>{c.customerType}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid var(--line)' }}>
                                <IconActionButton label="View" onClick={() => selectDealer(c.id)} icon={<IconEye size={14} />} />
                              </td>
                            </tr>
                          ))}
                          {dealerPageRows.length === 0 && (
                            <tr>
                              <td colSpan={4} style={{ ...sBody, color: 'var(--ink-2)', padding: '18px 12px' }}>No dealers match your search.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ ...sBody, color: 'var(--ink-2)' }}>{dealerMatches.length} dealers match</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StrokeButton onClick={() => setDealerPage(p => Math.max(1, p - 1))}>Previous</StrokeButton>
                          <span style={{ ...sBody, color: 'var(--ink)' }}>Page {dealerCurrentPage} of {dealerTotalPages}</span>
                          <StrokeButton onClick={() => setDealerPage(p => Math.min(dealerTotalPages, p + 1))}>Next</StrokeButton>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                          <div>
                            <h3 style={{ ...sLargeB, margin: 0, color: 'var(--ink)' }}>{selectedDealer.dealerName}</h3>
                            <p style={{ ...sBody, margin: '6px 0 0', color: 'var(--ink-2)' }}>{toDealerCode(selectedDealer)} · {selectedDealer.customerType}</p>
                          </div>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>Preview As Of</span>
                            <input
                              type="date"
                              value={dealerAsOfDate}
                              onChange={e => setDealerAsOfDate(e.target.value)}
                              style={{ ...sBody, height: 38, border: '2px solid var(--ink)', borderRadius: 'var(--radius)', padding: '0 10px', fontFamily: 'inherit' }}
                            />
                          </label>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {dealerCustomerGroups.length === 0 ? (
                            <Chip label="Not in any customer group" />
                          ) : (
                            dealerCustomerGroups.map(g => <Chip key={g.id} label={`Customer Group: ${g.name}`} />)
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                          <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                            Assigned Catalogue Groups · {dealerCatalogueGroups.length}
                          </div>
                          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 420, overflow: 'auto' }}>
                            {dealerCatalogueGroups.map(group => (
                              <div key={group.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
                                <span style={{ ...sBody, color: 'var(--ink)' }}>{group.name}</span>
                                <span style={{ ...sBody, color: 'var(--ink-2)' }}>{group.catalogueIds.length} catalogues</span>
                              </div>
                            ))}
                            {dealerCatalogueGroups.length === 0 && (
                              <div style={{ ...sBody, color: 'var(--ink-2)', padding: 14 }}>No catalogue groups assigned to this dealer.</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                              Resolved Catalogues (all groups combined) · {dealerCatalogues.length}
                            </div>
                            <span style={{ ...sBody, color: 'var(--ink-2)', fontSize: 11 }}>Removing here only affects this dealer</span>
                          </div>
                          <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 420, overflow: 'auto' }}>
                            {dealerCatalogues.map(c => (
                              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
                                <span style={{ ...sBody, color: 'var(--ink)' }}>{c.id} - {c.name}</span>
                                <IconActionButton label="Remove" onClick={() => excludeDealerCatalogue(c.id)} icon={<IconTrash size={14} />} />
                              </div>
                            ))}
                            {dealerCatalogues.length === 0 && (
                              <div style={{ ...sBody, color: 'var(--ink-2)', padding: 14 }}>No catalogues assigned to this dealer.</div>
                            )}
                          </div>

                          {dealerExcludedCatalogues.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                                Excluded For This Dealer · {dealerExcludedCatalogues.length}
                              </div>
                              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', maxHeight: 200, overflow: 'auto' }}>
                                {dealerExcludedCatalogues.map(c => (
                                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
                                    <span style={{ ...sBody, color: 'var(--ink-2)' }}>{c.id} - {c.name}</span>
                                    <IconActionButton label="Restore" onClick={() => restoreDealerCatalogue(c.id)} icon={<IconPlus size={14} />} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {dealerPendingCatalogues.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <div style={{ ...sBodyB, color: 'var(--amber)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                                Pending Go-Live (not yet visible to dealer) · {dealerPendingCatalogues.length}
                              </div>
                              <div style={{ border: '1px solid var(--amber)', background: 'var(--amber-soft)', borderRadius: 'var(--radius)', maxHeight: 200, overflow: 'auto' }}>
                                {dealerPendingCatalogues.map(c => (
                                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderTop: '1px solid var(--line)' }}>
                                    <span style={{ ...sBody, color: 'var(--ink)' }}>{c.id} - {c.name}</span>
                                    <span style={{ ...sBodyB, fontSize: 11, color: 'var(--amber)' }}>Live from {catalogueGoLiveById.get(c.id)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </TableCard>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />

      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete?.kind === 'catalogue' ? 'Delete Catalogue Group' : 'Delete Customer Group'}
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={confirmDeleteGroup}
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
