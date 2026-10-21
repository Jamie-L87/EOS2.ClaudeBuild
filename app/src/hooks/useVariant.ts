import { useMemo } from 'react';
import { VARIANTS, type VariantDef, type VariantKey } from '../variants';

const storageKey = (id: string) => `eos-variant:${id}`;

function readSticky(id: string): 'a' | 'b' | null {
  try {
    const v = sessionStorage.getItem(storageKey(id));
    return v === 'a' || v === 'b' ? v : null;
  } catch { return null; }
}

function writeSticky(id: string, value: 'a' | 'b'): void {
  try { sessionStorage.setItem(storageKey(id), value); } catch { /* ignore */ }
}

/**
 * Returns 'a' or 'b' for a given experiment key.
 *
 * Variant B is active when the URL contains ?variant=<id> matching the experiment.
 * Falls back to the experiment's default when no matching param is present.
 * Experiments marked sticky remember the last choice for the browser session.
 *
 * Usage:
 *   const variant = useVariant('exportPreview');
 *   if (variant === 'b') { ... }
 */
export function useVariant(key: VariantKey): 'a' | 'b' {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const active = params.get('variant');
    const def: VariantDef = VARIANTS[key];
    const fromUrl = active === def.id ? 'b' : active === `${def.id}-a` ? 'a' : null;
    if (def.sticky) {
      if (fromUrl) { writeSticky(def.id, fromUrl); return fromUrl; }
      return readSticky(def.id) ?? def.default;
    }
    return fromUrl ?? def.default;
  }, [key]);
}
