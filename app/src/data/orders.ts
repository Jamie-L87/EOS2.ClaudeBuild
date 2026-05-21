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
  'Confirmed':   { fg: '#00816C', bg: '#E7EDEE', dot: '#00816C' },
  'In Progress': { fg: '#28628E', bg: '#DCE7EF', dot: '#28628E' },
  'Pending':     { fg: '#8A6D1E', bg: '#FAF1DA', dot: '#CA9D3D' },
  'On Hold':     { fg: '#A11616', bg: '#FCEAEA', dot: '#DF1F1F' },
  'Completed':   { fg: '#00816C', bg: '#E7EDEE', dot: '#00816C' },
  'Delivered':   { fg: '#00816C', bg: '#E7EDEE', dot: '#00816C' },
  'Invoiced':    { fg: '#28628E', bg: '#DCE7EF', dot: '#28628E' },
  'Archived':    { fg: '#616161', bg: '#EEEEEE', dot: '#9A9A9A' },
  'Cancelled':   { fg: '#A11616', bg: '#FCEAEA', dot: '#DF1F1F' },
};

export function formatMoney(n: number): string {
  return '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
