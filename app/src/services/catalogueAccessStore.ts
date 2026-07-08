import {
  CATALOGUES,
  CUSTOMERS,
  type CatalogueAccessState,
} from '../data/catalogueAccess';

const STORAGE_KEY = 'eos-catalogue-access-admin:v1';

function defaultState(): CatalogueAccessState {
  const ukDealers = CUSTOMERS.filter(c => c.site === 'UK').slice(0, 20).map(c => c.id);
  const apacDealers = CUSTOMERS.filter(c => ['JP', 'AU', 'IN'].includes(c.site)).slice(0, 15).map(c => c.id);
  const indiaDealers = CUSTOMERS.filter(c => c.site === 'IN').slice(0, 10).map(c => c.id);

  return {
    catalogueGroups: [
      { id: 'cg-apmea-seating', name: 'APMEA Seating', catalogueIds: [4, 14, 31, 32, 33, 34] },
      { id: 'cg-europe-seating', name: 'Europe Seating', catalogueIds: [21, 25, 26, 27, 28] },
      { id: 'cg-knoll-europe', name: 'Knoll Europe', catalogueIds: [19, 20, 24, 29, 44, 45] },
    ],
    customerGroups: [
      { id: 'cust-europe-dealers', name: 'Europe Dealers', customerIds: ukDealers },
      { id: 'cust-apac-dealers', name: 'APAC Dealers', customerIds: apacDealers },
      { id: 'cust-india-dealers', name: 'India Dealers', customerIds: indiaDealers },
    ],
    assignments: [
      { customerGroupId: 'cust-europe-dealers', catalogueGroupIds: ['cg-europe-seating', 'cg-knoll-europe'] },
      { customerGroupId: 'cust-apac-dealers', catalogueGroupIds: ['cg-apmea-seating'] },
    ],
  };
}

function sanitize(state: CatalogueAccessState): CatalogueAccessState {
  const validCatalogueIds = new Set(CATALOGUES.map(c => c.id));
  const validCustomerIds = new Set(CUSTOMERS.map(c => c.id));
  const validCatalogueGroupIds = new Set(state.catalogueGroups.map(g => g.id));
  const validCustomerGroupIds = new Set(state.customerGroups.map(g => g.id));

  return {
    catalogueGroups: state.catalogueGroups.map(g => ({
      ...g,
      catalogueIds: Array.from(new Set(g.catalogueIds.filter(id => validCatalogueIds.has(id)))),
    })),
    customerGroups: state.customerGroups.map(g => ({
      ...g,
      customerIds: Array.from(new Set(g.customerIds.filter(id => validCustomerIds.has(id)))),
    })),
    assignments: state.assignments
      .filter(a => validCustomerGroupIds.has(a.customerGroupId))
      .map(a => ({
        customerGroupId: a.customerGroupId,
        catalogueGroupIds: Array.from(new Set(a.catalogueGroupIds.filter(id => validCatalogueGroupIds.has(id)))),
      })),
  };
}

export function loadCatalogueAccessState(): CatalogueAccessState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as CatalogueAccessState;
    return sanitize(parsed);
  } catch {
    return defaultState();
  }
}

export function saveCatalogueAccessState(state: CatalogueAccessState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(state)));
}
