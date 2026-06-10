/**
 * Variant registry — one entry per A/B experiment.
 *
 * id:      URL param value used to activate variant B  (?variant=<id>)
 * label:   Human-readable name shown in the variant indicator (dev only)
 * default: Which variant is shown when no ?variant= param is present ('a' | 'b')
 */
export interface VariantDef {
  id: string;
  label: string;
  default: 'a' | 'b';
}

export const VARIANTS = {
  exportPreview: {
    id: 'export-preview',
    label: 'Export Preview',
    default: 'a',
  },
} satisfies Record<string, VariantDef>;

export type VariantKey = keyof typeof VARIANTS;
