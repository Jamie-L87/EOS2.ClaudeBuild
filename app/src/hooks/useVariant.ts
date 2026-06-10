import { useMemo } from 'react';
import { VARIANTS, type VariantKey } from '../variants';

/**
 * Returns 'a' or 'b' for a given experiment key.
 *
 * Variant B is active when the URL contains ?variant=<id> matching the experiment.
 * Falls back to the experiment's default when no matching param is present.
 *
 * Usage:
 *   const variant = useVariant('exportPreview');
 *   if (variant === 'b') { ... }
 */
export function useVariant(key: VariantKey): 'a' | 'b' {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const active = params.get('variant');
    const def = VARIANTS[key];
    if (active === def.id) return 'b';
    if (active === `${def.id}-a`) return 'a';
    return def.default;
  }, [key]);
}
