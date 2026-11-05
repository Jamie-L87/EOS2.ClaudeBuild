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

/**
 * Returns the active variant ('a', 'b' or 'c') for a given experiment key.
 *
 * Variant B is active when the URL contains ?variant=<id> matching the experiment,
 * and C when it contains the experiment's extra id. ?variant=<id>-a forces A.
 * Falls back to the experiment's default when no matching param is present.
 * Experiments marked sticky remember the last choice for the browser session.
 *
 * Usage:
 *   const variant = useVariant('exportPreview');
 *   if (variant === 'b') { ... }
 */
export function useVariant(key: VariantKey): Variant {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const active = params.get('variant');
    const def: VariantDef = VARIANTS[key];
    const fromUrl: Variant | null =
      active === def.id ? 'b'
      : active === `${def.id}-a` ? 'a'
      : def.extra?.c && active === def.extra.c ? 'c'
      : null;
    if (def.sticky) {
      if (fromUrl) { writeSticky(def.id, fromUrl); return fromUrl; }
      return readSticky(def.id) ?? def.default;
    }
    return fromUrl ?? def.default;
  }, [key]);
}
