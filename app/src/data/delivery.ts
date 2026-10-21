/*
 * Mock delivery rules for the prototype: lead times, which dates can be chosen,
 * and delivery charges. The real rules come from the delivery rules service;
 * these are illustrative so the promise-date flow can be demonstrated.
 */

export interface LeadTime { min: number; max: number; label: string; days: number }

const LEAD_TIMES: Record<string, { min: number; max: number }> = {
  AERON: { min: 30, max: 40 }, COSM: { min: 20, max: 30 }, SAYL: { min: 15, max: 25 },
  EMBODY: { min: 40, max: 50 }, LINO: { min: 20, max: 30 }, ZEPH: { min: 25, max: 35 },
  CAPER: { min: 20, max: 30 }, PRONTA: { min: 10, max: 20 }, CIVIC_TABLES: { min: 30, max: 40 },
  DEFAULT: { min: 20, max: 40 },
};

export function mockLeadTime(productLine: string | null): LeadTime {
  const spec = (productLine && LEAD_TIMES[productLine]) || LEAD_TIMES.DEFAULT;
  return { min: spec.min, max: spec.max, label: `${spec.max}`, days: spec.max };
}

/** Charges per currency: one charge per delivery date, free above a threshold. */
export const DELIVERY_RULES: Record<string, { base: number; timed: number; freeOver: number }> = {
  GBP: { base: 95,  timed: 45, freeOver: 5000 },
  EUR: { base: 110, timed: 50, freeOver: 6000 },
  USD: { base: 120, timed: 55, freeOver: 6500 },
};

export function rulesFor(currency: string) {
  return DELIVERY_RULES[currency] ?? DELIVERY_RULES.EUR;
}

export function isWeekend(iso: string): boolean {
  const d = new Date(iso + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export function addBusinessDays(fromIso: string, days: number): string {
  const d = new Date(fromIso + 'T00:00:00');
  if (isNaN(d.getTime())) return fromIso;
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDeliveryDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export interface DeliveryLine {
  id: string;
  articleCode: string;
  featureString: string;
  productName: string | null;
  productLine: string | null;
  qty: number;
  promiseDate?: string | null;
  leadTime?: LeadTime;
  validationStatus: 'passed' | 'failed' | 'pending';
}

/** Earliest date a line can be promised: its lead time in working days from the order date. */
export function earliestPromiseDate(line: Pick<DeliveryLine, 'productLine' | 'leadTime'>, orderPlaced: string): string {
  const lead = line.leadTime ?? mockLeadTime(line.productLine);
  return addBusinessDays(orderPlaced, lead.days);
}

export interface DeliveryChargeRow {
  date: string;
  lineCount: number;
  base: number;
  timed: boolean;
  timedAmount: number;
  amount: number;
}

export interface DeliveryCharges {
  rows: DeliveryChargeRow[];
  total: number;
  isFree: boolean;
  freeOver: number;
}

/** One delivery per distinct promise date. Base charge is waived over the free-delivery threshold. */
export function computeDeliveryCharges(
  lines: Array<Pick<DeliveryLine, 'promiseDate'>>,
  currency: string,
  linesTotal: number,
  timedDates: string[],
): DeliveryCharges {
  const rules = rulesFor(currency);
  const isFree = linesTotal >= rules.freeOver;
  const counts = new Map<string, number>();
  for (const l of lines) if (l.promiseDate) counts.set(l.promiseDate, (counts.get(l.promiseDate) ?? 0) + 1);
  const rows: DeliveryChargeRow[] = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, lineCount]) => {
      const timed = timedDates.includes(date);
      const base = isFree ? 0 : rules.base;
      const timedAmount = timed ? rules.timed : 0;
      return { date, lineCount, base, timed, timedAmount, amount: base + timedAmount };
    });
  return { rows, total: rows.reduce((s, r) => s + r.amount, 0), isFree, freeOver: rules.freeOver };
}
