import { useMemo } from 'react';
import { VARIANTS, type Variant, type VariantDef, type VariantKey } from '../variants';

const storageKey = (id: string) => `eos-variant:${id}`;

function readSticky(id: string): Variant | null {
  try {
    const v = sessionStorage.getItem(storageKey(id));
    return v === 'a' || v === 'b' || v === 'c' ? v : null;
  } catch { return null; }
}

function writeSticky(id: string, value: Variant): void {
  try { sessionStorage.setItem(storageKey(id), value); } catch { /* ignore */ }
}

function variantFromUrl(def: VariantDef): Variant | null {
  const active = new URLSearchParams(window.location.search).get('variant');
  return active === def.id ? 'b'
    : active === `${def.id}-a` ? 'a'
    : def.extra?.c && active === def.extra.c ? 'c'
    : null;
}

/**
 * Remember a ?variant= choice from whichever page the session starts on (Import, a scenario
 * card, the order list...). Called once at startup, so a facilitator can open any link with
 * the param and the choice is already set by the time the order page loads.
 */
export function captureVariantFromUrl(): void {
  for (const def of Object.values(VARIANTS) as VariantDef[]) {
    if (!def.sticky) continue;
    const fromUrl = variantFromUrl(def);
    if (fromUrl) writeSticky(def.id, fromUrl);
  }
}

/**
 * Set the remembered variant for a sticky experiment from inside the app (for example a
 * scenario card's Start button), so the choice applies without a ?variant= URL.
 */
export function setVariant(key: VariantKey, value: Variant): void {
  const def: VariantDef = VARIANTS[key];
  if (def.sticky) writeSticky(def.id, value);
}

/**
 * Returns the active variant ('a', 'b' or 'c') for a given experiment key.
 *
 * Variant B is active when the URL contains ?variant=<id> matching the experiment,
 * and C when it contains the experiment's extra id. ?variant=<id>-a forces A.
 * Falls back to the experiment's default when no matching param is present.
 * Experiments marked sticky remember the last choice for the browser session
 * (see captureVariantFromUrl for setting it from any page).
 *
 * Usage:
 *   const variant = useVariant('exportPreview');
 *   if (variant === 'b') { ... }
 */
export function useVariant(key: VariantKey): Variant {
  return useMemo(() => {
    const def: VariantDef = VARIANTS[key];
    const fromUrl = variantFromUrl(def);
    if (def.sticky) {
      if (fromUrl) { writeSticky(def.id, fromUrl); return fromUrl; }
      return readSticky(def.id) ?? def.default;
    }
    return fromUrl ?? def.default;
  }, [key]);
}
