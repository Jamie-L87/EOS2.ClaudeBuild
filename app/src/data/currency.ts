/* ------------------------------------------------------------------ */
/*  Pricing currency                                                    */
/*  The catalogue holds list prices in GBP and EUR. A dealer account   */
/*  prices in its own currency when we hold a list for it; any other   */
/*  account currency (JPY, AUD, INR...) falls back to the EUR list.    */
/* ------------------------------------------------------------------ */
export type PriceCurrency = 'GBP' | 'EUR';

/** Mock exchange rate used to derive the GBP list from the EUR list. */
export const GBP_PER_EUR = 0.86;

export function pricingCurrency(accountCurrency: string | null | undefined): PriceCurrency {
  return accountCurrency === 'GBP' ? 'GBP' : 'EUR';
}

/** Convert between the two list currencies, rounded to pence/cents. */
export function convertPrice(amount: number, from: string, to: PriceCurrency): number {
  if (from === to) return amount;
  const eur = from === 'GBP' ? amount / GBP_PER_EUR : amount;
  const out = to === 'GBP' ? eur * GBP_PER_EUR : eur;
  return Math.round(out * 100) / 100;
}
