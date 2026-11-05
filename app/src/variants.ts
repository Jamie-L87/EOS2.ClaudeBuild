/**
 * Variant registry — one entry per A/B experiment.
 *
 * id:      URL param value used to activate variant B  (?variant=<id>)
 * label:   Human-readable name shown in the variant indicator (dev only)
 * default: Which variant is shown when no ?variant= param is present
 * extra:   Further variants (c, ...) and the URL param value that activates each
 * sticky:  Remember the choice for the browser session, so a tester who arrives on a
 *          link with ?variant=<id> keeps seeing that variant after navigating (the
 *          param is lost on in-app navigation). Use ?variant=<id>-a to switch back to A.
 */
export type Variant = 'a' | 'b' | 'c';

export interface VariantDef {
  id: string;
  label: string;
  default: Variant;
  extra?: Partial<Record<'c', string>>;
  sticky?: boolean;
}

export const VARIANTS = {
  exportPreview: {
    id: 'export-preview',
    label: 'Export Preview',
    default: 'a',
  },
  // A = original order page, B = order details in a side panel, C = EOS 1 style tabbed order page
  orderPage: {
    id: 'order-page-panel',
    label: 'Order page layout',
    default: 'a',
    extra: { c: 'order-page-tabs' },
    sticky: true,
  },
} satisfies Record<string, VariantDef>;

export type VariantKey = keyof typeof VARIANTS;
