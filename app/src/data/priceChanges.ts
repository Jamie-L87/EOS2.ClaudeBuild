/* ------------------------------------------------------------------ */
/*  Mock price-list changes, keyed by productLine                      */
/*  Demonstrates date-based pricing in the basket: catalog prices in   */
/*  productCatalog.ts represent today's rate. An entry here describes  */
/*  the one other rate on file for that product line, either a         */
/*  scheduled future change (effectiveDate after today) or a change    */
/*  that already happened (effectiveDate in the past, already baked    */
/*  into today's catalog price).                                       */
/* ------------------------------------------------------------------ */
export interface PriceChange {
  productLine: string;
  effectiveDate: string; // ISO "YYYY-MM-DD" — date the new rate takes effect
  multiplier: number;    // new rate = today's catalog rate * multiplier (future) or / multiplier (past)
  label: string;
}

export const PRICE_CHANGES: PriceChange[] = [
  { productLine: 'AERON', effectiveDate: '2027-01-01', multiplier: 1.035, label: 'Jan 2027 price list' },
  { productLine: 'LINO',  effectiveDate: '2026-11-01', multiplier: 1.02,  label: 'Nov 2026 price list' },
  { productLine: 'COSM',  effectiveDate: '2026-04-01', multiplier: 1.05,  label: 'Apr 2026 price list' },
];

export interface PricedResult {
  price: number;
  changed: boolean;
  note: string | null;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Resolve what an item's list price would be on a given pricing date. */
export function getPricedAsOf(productLine: string | null, basePrice: number, pricingDate: string, todayISO: string): PricedResult {
  const change = productLine ? PRICE_CHANGES.find(c => c.productLine === productLine) : undefined;
  if (!change) return { price: basePrice, changed: false, note: null };

  const isFutureChange = change.effectiveDate > todayISO;

  if (isFutureChange) {
    if (pricingDate >= change.effectiveDate) {
      return {
        price: Math.round(basePrice * change.multiplier * 100) / 100,
        changed: true,
        note: `New price effective ${fmtDate(change.effectiveDate)} (${change.label})`,
      };
    }
    return { price: basePrice, changed: false, note: null };
  }

  // Change already happened — today's catalog price already reflects it.
  if (pricingDate < change.effectiveDate) {
    return {
      price: Math.round((basePrice / change.multiplier) * 100) / 100,
      changed: true,
      note: `Price before ${fmtDate(change.effectiveDate)} (${change.label})`,
    };
  }
  return { price: basePrice, changed: false, note: null };
}
