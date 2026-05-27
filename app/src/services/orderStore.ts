import type { Order, OrderTab } from '../data/orders';

const KEY = 'eos:orders';

export interface StoredOrder {
  id: string;
  orderNo: string;
  status: string;
  currency: string;
  orderPlaced: string; // ISO "YYYY-MM-DD"
  reference: string | null;
  customer: string | null;
  purchaseOrder: string | null;
  lines: unknown[];
  orderType?: string | null;
  salesPerson?: string | null;
  hmSalesPerson?: string | null;
  contract?: string | null;
  companyName?: string | null;
  deliveryLine1?: string | null;
  deliveryLine2?: string | null;
  deliveryLine3?: string | null;
  deliveryLine4?: string | null;
  deliveryCity?: string | null;
  deliveryCounty?: string | null;
  deliveryPostcode?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactTelephone?: string | null;
}

function statusToTab(status: string): OrderTab {
  if (['Completed', 'Delivered', 'Invoiced'].includes(status)) return 'completed';
  if (['Archived', 'Cancelled'].includes(status)) return 'archived';
  return 'active';
}

function isoToDisplay(iso: string): string {
  const parts = (iso || '').split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

function isoToSort(iso: string): number {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return (y || 0) * 10000 + (m || 0) * 100 + (d || 0);
}

function calcValue(lines: unknown[]): number {
  type L = { listPrice?: number; qty?: number; discount?: number; isSuper?: boolean; superChildren?: Array<{ listPrice?: number; qty?: number }> };
  return (lines as L[]).reduce((sum, l) => {
    const base = l.isSuper && Array.isArray(l.superChildren)
      ? l.superChildren.reduce((cs, c) => cs + (c.listPrice || 0) * (c.qty || 1), 0)
      : (l.listPrice || 0);
    return sum + base * (1 - (l.discount || 0) / 100) * (l.qty || 1);
  }, 0);
}

export function toListOrder(s: StoredOrder): Order {
  return {
    id: s.id,
    reference: s.reference || '—',
    description: '—',
    orderNo: '—',
    purchaseOrder: s.purchaseOrder || '—',
    orderValue: calcValue(s.lines),
    customer: s.customer || '—',
    orderPlaced: isoToDisplay(s.orderPlaced),
    orderPlacedSort: isoToSort(s.orderPlaced),
    status: s.status,
    type: 'Normal',
    shared: false,
    sharedWith: null,
    mine: true,
    csNo: '—',
  };
}

export function loadAll(): StoredOrder[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as StoredOrder[]; }
  catch { return []; }
}

export function loadForTab(tab: OrderTab): Order[] {
  return loadAll().filter(s => statusToTab(s.status) === tab).map(toListOrder);
}

export function loadDetail(id: string): StoredOrder | null {
  return loadAll().find(s => s.id === id) ?? null;
}

export function upsert(order: StoredOrder): void {
  const all = loadAll();
  const idx = all.findIndex(s => s.id === order.id);
  if (idx >= 0) all[idx] = order; else all.push(order);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

export function remove(id: string): void {
  try { localStorage.setItem(KEY, JSON.stringify(loadAll().filter(s => s.id !== id))); }
  catch { /* ignore */ }
}

export function updateStatus(id: string, status: string): void {
  const all = loadAll();
  const idx = all.findIndex(s => s.id === id);
  if (idx >= 0) all[idx] = { ...all[idx], status };
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
}
