/**
 * Variant registry — one entry per A/B experiment.
 *
 * id:      URL param value used to activate variant B  (?variant=<id>)
 * label:   Human-readable name shown in the variant indicator (dev only)
 * default: Which variant is shown when no ?variant= param is present ('a' | 'b')
 * sticky:  Remember the choice for the browser session, so a tester who arrives on a
 *          link with ?variant=<id> keeps seeing that variant after navigating (the
 *          param is lost on in-app navigation). Use ?variant=<id>-a to switch back to A.
 */
export interface VariantDef {
  id: string;
  label: string;
  default: 'a' | 'b';
  sticky?: boolean;
}

export const VARIANTS = {
  exportPreview: {
    id: 'export-preview',
    label: 'Export Preview',
    default: 'a',
  },
  orderPage: {
    id: 'order-page-panel',
    label: 'Order page: side panel',
    default: 'a',
    sticky: true,
  },
} satisfies Record<string, VariantDef>;

export type VariantKey = keyof typeof VARIANTS;
