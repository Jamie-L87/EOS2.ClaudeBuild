export type OrderTab = 'active' | 'completed' | 'archived';

export interface Order {
  id: string;
  reference: string;
  description: string;
  orderNo: string;
  purchaseOrder: string;
  orderValue: number;
  customer: string;
  orderPlaced: string;
  orderPlacedSort: number;
  status: string;
  type: string;
  shared: boolean;
  sharedWith: string | null;
  mine: boolean;
  csNo: string;
}

export interface StatusColors {
  fg: string;
  bg: string;
  dot: string;
}

export const STATUS_COLOR: Record<string, StatusColors> = {
  'Confirmed':   { fg: 'var(--green)', bg: 'var(--green-soft)', dot: 'var(--green)' },
  'In Progress': { fg: 'var(--blue)', bg: 'var(--blue-soft)', dot: 'var(--blue)' },
  'Pending':     { fg: 'var(--amber-text)', bg: 'var(--pending-bg)', dot: 'var(--amber)' },
  'On Hold':     { fg: 'var(--red-text)', bg: 'var(--red-wash)', dot: 'var(--red-dot)' },
  'Completed':   { fg: 'var(--green)', bg: 'var(--green-soft)', dot: 'var(--green)' },
  'Delivered':   { fg: 'var(--green)', bg: 'var(--green-soft)', dot: 'var(--green)' },
  'Invoiced':    { fg: 'var(--blue)', bg: 'var(--blue-soft)', dot: 'var(--blue)' },
  'Archived':    { fg: 'var(--ink-2)', bg: 'var(--line)', dot: 'var(--ink-3)' },
  'Cancelled':   { fg: 'var(--red-text)', bg: 'var(--red-wash)', dot: 'var(--red-dot)' },
};

export function formatMoney(n: number): string {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
