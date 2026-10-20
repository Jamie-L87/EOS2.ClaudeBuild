export type NotificationCategory = 'info' | 'warning' | 'error';

/** Dealer sites a notification can be targeted at (matches the sites in the mock customer data). */
export const NOTIFICATION_SITES: Record<string, string> = {
  UK: 'United Kingdom',
  NL: 'Netherlands',
  FR: 'France',
  DE: 'Germany',
  ES: 'Spain',
  IT: 'Italy',
  JP: 'Japan',
  AU: 'Australia',
  IN: 'India',
  AE: 'UAE',
  SG: 'Singapore',
};

/** Languages a notification can be written in. */
export const NOTIFICATION_LANGUAGES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  nl: 'Dutch',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
};

export const DEFAULT_NOTIFICATION_LANGUAGE = 'en';

/**
 * Stand-in for a per-user language preference: the prototype has no profile
 * settings, so the viewer's language follows the selected dealer's site.
 */
export const SITE_LANGUAGE: Record<string, string> = {
  NL: 'nl', FR: 'fr', DE: 'de', ES: 'es', IT: 'it', JP: 'ja',
};

export function languageForSite(site: string | null): string {
  return (site && SITE_LANGUAGE[site]) || DEFAULT_NOTIFICATION_LANGUAGE;
}

export interface NotificationTranslation {
  header: string;
  body: string;
}

/**
 * Content for a language, falling back to English when that translation is
 * missing or empty. English is required, so there is always something to show.
 */
export function localizedContent(n: Pick<NotificationRecord, 'translations'>, language: string): NotificationTranslation {
  const wanted = n.translations[language];
  if (wanted && wanted.header.trim() && wanted.body.trim()) return wanted;
  return n.translations[DEFAULT_NOTIFICATION_LANGUAGE] ?? { header: '', body: '' };
}

/** Language codes that have a translation written, English first. */
export function translatedLanguages(n: Pick<NotificationRecord, 'translations'>): string[] {
  const codes = Object.keys(n.translations).filter(c => n.translations[c].header.trim() && n.translations[c].body.trim());
  return codes.sort((a, b) => (a === DEFAULT_NOTIFICATION_LANGUAGE ? -1 : b === DEFAULT_NOTIFICATION_LANGUAGE ? 1 : 0));
}

/**
 * Upgrades records saved before translations existed: they held a single
 * header/body (plus an optional language) directly on the record.
 */
export function normalizeNotification(raw: NotificationRecord & { header?: string; body?: string; language?: string }): NotificationRecord {
  if (raw.translations) return raw;
  const { header, body, language, ...rest } = raw;
  return { ...rest, translations: { [language ?? DEFAULT_NOTIFICATION_LANGUAGE]: { header: header ?? '', body: body ?? '' } } };
}

/**
 * Sites a notification is targeted at; empty = all dealers. Records saved
 * before multi-site targeting hold a single site string (or 'all') instead.
 */
export function audienceSites(n: Pick<NotificationRecord, 'audience'>): string[] {
  const a: unknown = n.audience;
  if (Array.isArray(a)) return a as string[];
  if (typeof a === 'string' && a !== 'all') return [a];
  return [];
}

export function audienceLabel(n: Pick<NotificationRecord, 'audience'>): string {
  const sites = audienceSites(n);
  return sites.length === 0 ? 'All dealers' : sites.join(', ');
}

export interface NotificationRecord {
  id: string;
  category: NotificationCategory;
  /** Target sites; empty or missing = all dealers (see audienceSites) */
  audience?: string[];
  /** Header and body per language code (see NOTIFICATION_LANGUAGES); English is required and is the fallback */
  translations: Record<string, NotificationTranslation>;
  bodyFormat: 'text' | 'html';
  /** ISO date (YYYY-MM-DD) — notification becomes active on this date */
  displayDate: string;
  /** ISO date (YYYY-MM-DD) — notification stops being active after this date */
  expiryDate: string;
  createdAt: string;
}

// Exact values from the styleguide's "Notification messages" spec
// (Styleguide/Figma.css/Messages.txt, mirrored in CLAUDE.md) — the pink
// background is a one-off (#F7F0F1) that isn't part of the shared --pink-*
// ramp in tokens.css, so it's hardcoded here rather than invented.
export const NOTIFICATION_CATEGORIES: Record<NotificationCategory, { label: string; bg: string; fg: string }> = {
  info:    { label: 'Info',    bg: 'var(--blue-10)', fg: '#283D28' },
  warning: { label: 'Warning', bg: 'var(--yellow-5)', fg: '#926D53' },
  error:   { label: 'Error',   bg: '#F7F0F1',          fg: '#8A223B' },
};

export function isNotificationActive(n: NotificationRecord, asOf: Date = new Date()): boolean {
  const today = asOf.toISOString().slice(0, 10);
  return n.displayDate <= today && today <= n.expiryDate;
}

function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function defaultNotifications(): NotificationRecord[] {
  return [
    {
      id: 'notif-price-update',
      category: 'info',
      translations: {
        en: {
          header: 'Q1 price list now available',
          body: '<p>The updated Q1 price list is now live for all dealers. <strong>List prices in the basket will reflect the new figures automatically</strong> for any items added after today.</p><p>See the Import page for details.</p>',
        },
        fr: {
          header: 'La liste de prix du T1 est disponible',
          body: '<p>La liste de prix mise à jour du T1 est désormais en ligne. <strong>Les prix catalogue du panier reflètent automatiquement les nouveaux montants</strong> pour tout article ajouté à partir d\'aujourd\'hui.</p>',
        },
        de: {
          header: 'Die Preisliste für Q1 ist verfügbar',
          body: '<p>Die aktualisierte Preisliste für Q1 ist jetzt online. <strong>Die Listenpreise im Warenkorb spiegeln die neuen Werte automatisch wider</strong> für alle ab heute hinzugefügten Artikel.</p>',
        },
      },
      bodyFormat: 'html',
      displayDate: daysFromToday(-3),
      expiryDate: daysFromToday(11),
      createdAt: daysFromToday(-3),
    },
    {
      id: 'notif-maintenance',
      category: 'warning',
      audience: ['UK'],
      translations: {
        en: {
          header: 'Scheduled maintenance this weekend',
          body: 'EOS Cloud will be unavailable Saturday 02:00-04:00 GMT for scheduled maintenance. Please submit any time-sensitive orders before then.',
        },
      },
      bodyFormat: 'text',
      displayDate: daysFromToday(-1),
      expiryDate: daysFromToday(4),
      createdAt: daysFromToday(-1),
    },
    {
      id: 'notif-pdm-outage',
      category: 'error',
      translations: {
        en: {
          header: 'Product validation degraded',
          body: '<p><strong>Article code validation against PDM is currently slow or failing intermittently.</strong> Items may stay in a "validating" state longer than usual.</p><p>We are aware of the issue and working on it — no action needed on your part.</p>',
        },
      },
      bodyFormat: 'html',
      displayDate: daysFromToday(-1),
      expiryDate: daysFromToday(2),
      createdAt: daysFromToday(-1),
    },
    {
      id: 'notif-lead-time-column',
      category: 'info',
      translations: {
        en: {
          header: 'New: Lead Time column in the basket',
          body: 'You can now see estimated lead time per item directly in the basket table, and include it as an export column.',
        },
      },
      bodyFormat: 'text',
      displayDate: daysFromToday(-10),
      expiryDate: daysFromToday(-2),
      createdAt: daysFromToday(-10),
    },
    {
      id: 'notif-holiday-hours',
      category: 'warning',
      audience: ['NL'],
      translations: {
        en: {
          header: 'Holiday order cut-off dates',
          body: '<p>To guarantee delivery before the holidays, orders for the following catalogues must be submitted by the dates below:</p><ul><li>Herman Miller Seating UK — 12th</li><li>Desking Core — 15th</li><li>Storage — 18th</li></ul>',
        },
      },
      bodyFormat: 'html',
      displayDate: daysFromToday(-20),
      expiryDate: daysFromToday(-15),
      createdAt: daysFromToday(-20),
    },
  ];
}
