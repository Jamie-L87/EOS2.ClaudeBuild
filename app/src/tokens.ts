/* EOS Cloud 2.0 — JS/TS Design Tokens
   Mirror of tokens.css for use in inline styles.
   Always use these — never hard-code hex values in components. */

export const color = {
  brand:        'var(--brand)',
  brandDark:    'var(--brand-dark)',
  brandSoft:    'var(--brand-soft)',
  ink:          'var(--ink)',
  inkSelect:    'var(--ink-select)',
  ink2:         'var(--ink-2)',
  ink3:         'var(--ink-3)',
  line:         'var(--line)',
  bg:           'var(--bg)',
  bgSoft:       'var(--bg-soft)',
  black:        'var(--black)',
  inkDeep:      'var(--ink-deep)',
  pin:          'var(--pin)',
  pinLight:     'var(--pin-light)',
  green:        'var(--green)',
  greenSoft:    'var(--green-soft)',
  blue:         'var(--blue)',
  blueSoft:     'var(--blue-soft)',
  amber:        'var(--amber)',
  amberSoft:    'var(--amber-soft)',
  red:          'var(--red)',
  redSoft:      'var(--red-soft)',
  yellow:       'var(--yellow)',
} as const;

export const shadow = {
  pop: 'var(--shadow-pop)',
  sm:  'var(--shadow-sm)',
} as const;

export const radius = 'var(--radius)';

/* Hit areas & layout */
export const size = {
  hit:        44,   /* minimum touch/click target */
  rowH:       50,   /* table row height */
  tabH:       55,   /* tab bar / search bar / primary button height */
  navH:       92,   /* top nav height */
  footerH:    72,   /* page footer height */
  maxWidth:   1408, /* main content container */
  pagePad:    40,   /* horizontal page padding */
} as const;

/* Typography — pre-composed style objects for inline use */
const fontBold   = { fontWeight: 700, letterSpacing: '0.01em' } as const;
const fontMed    = { fontWeight: 500, letterSpacing: '0.01em' } as const;
const bodyScale  = { fontSize: 13.33, lineHeight: 1.2 } as const;
const largeScale = { fontSize: 16,    lineHeight: 1.2 } as const;

export const t = {
  /* body — 13.33px */
  body:   { ...fontMed,  ...bodyScale  },
  bodyB:  { ...fontBold, ...bodyScale  },
  /* large — 16px */
  large:  { ...fontMed,  ...largeScale },
  largeB: { ...fontBold, ...largeScale },
} as const;

/* Status colour map */
export type StatusKey =
  | 'Confirmed' | 'In Progress' | 'Pending' | 'On Hold'
  | 'Completed' | 'Delivered'   | 'Invoiced'
  | 'Archived'  | 'Cancelled'   | 'Draft'   | 'Submitted';

export const statusColor: Record<StatusKey, { fg: string; bg: string; dot: string }> = {
  'Confirmed':   { fg: 'var(--green)',       bg: 'var(--green-soft)',  dot: 'var(--green)'  },
  'In Progress': { fg: 'var(--blue)',        bg: 'var(--blue-soft)',   dot: 'var(--blue)'   },
  'Pending':     { fg: '#8A6D1E',            bg: 'var(--amber-soft)',  dot: 'var(--amber)'  },
  'On Hold':     { fg: '#A11616',            bg: 'var(--red-soft)',    dot: 'var(--red)'    },
  'Completed':   { fg: 'var(--green)',       bg: 'var(--green-soft)',  dot: 'var(--green)'  },
  'Delivered':   { fg: 'var(--green)',       bg: 'var(--green-soft)',  dot: 'var(--green)'  },
  'Invoiced':    { fg: 'var(--blue)',        bg: 'var(--blue-soft)',   dot: 'var(--blue)'   },
  'Archived':    { fg: 'var(--ink-2)',       bg: 'var(--line)',        dot: 'var(--ink-3)'  },
  'Cancelled':   { fg: '#A11616',            bg: 'var(--red-soft)',    dot: 'var(--red)'    },
  'Draft':       { fg: 'var(--ink)',         bg: 'var(--line)',        dot: 'var(--ink-3)'  },
  'Submitted':   { fg: 'var(--blue)',        bg: 'var(--blue-soft)',   dot: 'var(--blue)'   },
};
