export type UserRole = 'Admin' | 'User';

export interface CatalogueRecord {
  id: number;
  name: string;
  leadTimeDays: number;
}

export interface CustomerRecord {
  id: string;
  site: string;
  dealerNum: string;
  currency: string;
  dealerName: string;
  customerType: 'Dealer' | 'Retailer' | 'Shop';
}

export interface CatalogueGroup {
  id: string;
  name: string;
  catalogueIds: number[];
}

export interface CustomerGroup {
  id: string;
  name: string;
  customerIds: string[];
}

export interface CustomerCatalogueGroupAssignment {
  customerGroupId: string;
  catalogueGroupIds: string[];
}

export interface DealerCatalogueExclusion {
  dealerId: string;
  catalogueIds: number[];
}

export interface CatalogueGoLiveDate {
  catalogueId: number;
  /** ISO date (YYYY-MM-DD) the catalogue becomes live and visible to dealers. */
  goLiveDate: string;
}

export interface CatalogueAccessState {
  catalogueGroups: CatalogueGroup[];
  customerGroups: CustomerGroup[];
  assignments: CustomerCatalogueGroupAssignment[];
  dealerCatalogueExclusions: DealerCatalogueExclusion[];
  catalogueGoLiveDates: CatalogueGoLiveDate[];
}

export const CATALOGUES: CatalogueRecord[] = [
  { id: 4, name: '5-day Asia HM Seating', leadTimeDays: 5 },
  { id: 14, name: '20-day Asia HM Seating', leadTimeDays: 20 },
  { id: 15, name: 'Lighting', leadTimeDays: 10 },
  { id: 16, name: 'Workwalls', leadTimeDays: 25 },
  { id: 17, name: 'Storage', leadTimeDays: 22 },
  { id: 18, name: 'Desking Core', leadTimeDays: 18 },
  { id: 19, name: 'Knoll Seating EU', leadTimeDays: 15 },
  { id: 20, name: 'Knoll Lounge', leadTimeDays: 28 },
  { id: 21, name: 'Herman Miller Seating UK', leadTimeDays: 14 },
  { id: 22, name: 'Herman Miller Tables UK', leadTimeDays: 17 },
  { id: 23, name: 'Herman Miller Ancillary UK', leadTimeDays: 9 },
  { id: 24, name: 'Scandinavian Collection', leadTimeDays: 21 },
  { id: 25, name: 'DACH Seating', leadTimeDays: 16 },
  { id: 26, name: 'Benelux Projects', leadTimeDays: 20 },
  { id: 27, name: 'France Commercial', leadTimeDays: 19 },
  { id: 28, name: 'Spain Commercial', leadTimeDays: 19 },
  { id: 29, name: 'Italy Commercial', leadTimeDays: 19 },
  { id: 30, name: 'Middle East Seating', leadTimeDays: 30 },
  { id: 31, name: 'Australia Fastlane', leadTimeDays: 7 },
  { id: 32, name: 'Japan Seating', leadTimeDays: 12 },
  { id: 33, name: 'India Seating', leadTimeDays: 14 },
  { id: 34, name: 'APMEA Projects', leadTimeDays: 26 },
  { id: 35, name: 'North America Seating', leadTimeDays: 8 },
  { id: 36, name: 'North America Retail', leadTimeDays: 11 },
  { id: 37, name: 'Global Accessories', leadTimeDays: 6 },
  { id: 38, name: 'Global Care and Repair', leadTimeDays: 4 },
  { id: 39, name: 'Education Program', leadTimeDays: 13 },
  { id: 40, name: 'Healthcare Program', leadTimeDays: 13 },
  { id: 41, name: 'Government Program', leadTimeDays: 18 },
  { id: 42, name: 'Retail Program', leadTimeDays: 9 },
  { id: 43, name: 'Workspace Essentials', leadTimeDays: 8 },
  { id: 44, name: 'Collaborative Spaces', leadTimeDays: 12 },
  { id: 45, name: 'Executive Seating', leadTimeDays: 15 },
  { id: 46, name: 'Task Seating', leadTimeDays: 10 },
  { id: 47, name: 'Outdoor Program', leadTimeDays: 23 },
  { id: 48, name: 'Acoustic Solutions', leadTimeDays: 11 },
  { id: 49, name: 'Power and Data', leadTimeDays: 9 },
  { id: 50, name: 'Special Order Program', leadTimeDays: 35 },
  { id: 51, name: 'Nordic Task Seating', leadTimeDays: 12 },
];

export function isCatalogueLive(goLiveDate: string | undefined, asOf: Date = new Date()): boolean {
  if (!goLiveDate) return true;
  return new Date(goLiveDate) <= asOf;
}

const SITES: Array<{ site: string; currency: string }> = [
  { site: 'UK', currency: 'GBP' },
  { site: 'NL', currency: 'EUR' },
  { site: 'FR', currency: 'EUR' },
  { site: 'DE', currency: 'EUR' },
  { site: 'ES', currency: 'EUR' },
  { site: 'IT', currency: 'EUR' },
  { site: 'JP', currency: 'JPY' },
  { site: 'AU', currency: 'AUD' },
  { site: 'IN', currency: 'INR' },
  { site: 'AE', currency: 'AED' },
];

const CUSTOMER_TYPES: CustomerRecord['customerType'][] = ['Dealer', 'Retailer', 'Shop'];

const NAME_PARTS = [
  'Tsunami', 'Axis', 'Herman', 'Miller', 'Knoll', 'Vertex', 'Summit', 'Nimbus', 'Atelier', 'Studio',
  'Meridian', 'North', 'South', 'East', 'West', 'Prime', 'Orbit', 'Bridge', 'Evergreen', 'Harbor',
];

function seededName(i: number): string {
  const first = NAME_PARTS[i % NAME_PARTS.length];
  const second = NAME_PARTS[(i * 7 + 3) % NAME_PARTS.length];
  return `${first} ${second} Ltd`;
}

function seededDealerNum(i: number): string {
  return `F${String(100000 + (i * 137) % 900000)}`;
}

function seededType(i: number): CustomerRecord['customerType'] {
  return CUSTOMER_TYPES[i % CUSTOMER_TYPES.length];
}

export function toDealerCode(customer: CustomerRecord): string {
  return `${customer.site}-${customer.dealerNum}-${customer.currency}`;
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function wildcardIncludes(text: string, query: string): boolean {
  const clean = query.trim().toLowerCase();
  if (!clean) return true;

  const hay = text.toLowerCase();
  const tokens = clean.split(/\s+/).filter(Boolean);
  return tokens.every(token => {
    if (!token.includes('*')) return hay.includes(token);

    const escaped = token
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    const re = new RegExp(escaped, 'i');
    return re.test(hay);
  });
}

function createCustomers(): CustomerRecord[] {
  const result: CustomerRecord[] = [];
  for (let i = 0; i < 320; i += 1) {
    const site = SITES[i % SITES.length];
    const dealerNum = seededDealerNum(i);
    result.push({
      id: `${site.site}-${dealerNum}`,
      site: site.site,
      dealerNum,
      currency: site.currency,
      dealerName: seededName(i),
      customerType: seededType(i),
    });
  }
  return result;
}

export const CUSTOMERS: CustomerRecord[] = createCustomers();

export function customerSearchText(customer: CustomerRecord): string {
  return [
    toDealerCode(customer),
    customer.site,
    customer.dealerNum,
    customer.dealerName,
    customer.customerType,
  ].join(' ');
}
