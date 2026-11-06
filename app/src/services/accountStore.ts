import { pricingCurrency } from '../data/currency';
import type { PriceCurrency } from '../data/currency';

/* ------------------------------------------------------------------ */
/*  Selected dealer account                                             */
/*  Remembered for the browser tab so every page (and the basket's      */
/*  pricing) follows the account chosen in the top nav.                 */
/* ------------------------------------------------------------------ */
const KEY = 'eos-account';
export const ACCOUNT_CHANGED_EVENT = 'eos-account-changed';

export interface SelectedAccount { id: string; currency: string }

export function getSelectedAccount(): SelectedAccount | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SelectedAccount) : null;
  } catch {
    return null;
  }
}

export function setSelectedAccount(account: SelectedAccount): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(account)); } catch { /* storage unavailable: selection just won't persist */ }
  window.dispatchEvent(new Event(ACCOUNT_CHANGED_EVENT));
}

/** Currency list prices are shown in. Defaults to GBP, matching the default (UK) account. */
export function getPricingCurrency(): PriceCurrency {
  return pricingCurrency(getSelectedAccount()?.currency ?? 'GBP');
}
