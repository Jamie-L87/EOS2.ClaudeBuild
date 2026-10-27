import { CUSTOMERS, toDealerCode } from './catalogueAccess';
import { CONTRACTS } from './contracts';
import { PRODUCT_CATALOG } from './productCatalog';

export const PREFERENCE_DATA_TYPES = ['TEXTBOX', 'DROPDOWN', 'MULTISELECT', 'CHECKBOX', 'DATE'] as const;
export type PreferenceDataType = (typeof PREFERENCE_DATA_TYPES)[number];

/** A row of the Preferences table (EOS-1515). */
export interface PreferenceDefinition {
  preferenceCode: string;
  preferenceName: string;
  description: string;
  dataType: PreferenceDataType;
  isMultiValue: boolean;
  allowEditInPreference: boolean;
  /** API path that supplies the options, or a "|" separated list of literal options. */
  valueSourceApi: string;
  displayOrder: number;
  isActive: boolean;
}

/** Shape returned by GET /api/user-preferences - every value is a list, single-value preferences hold one entry. */
export type UserPreferenceValues = Record<string, string[]>;

export interface PreferenceOption {
  value: string;
  label: string;
}

export const DEFAULT_PREFERENCE_DEFINITIONS: PreferenceDefinition[] = [
  { preferenceCode: 'LANG',        preferenceName: 'Default Language', description: 'Language used for the EOS interface and documents.',  dataType: 'DROPDOWN',    isMultiValue: false, allowEditInPreference: true,  valueSourceApi: '/api/PDM/reference/languages',     displayOrder: 1, isActive: true },
  { preferenceCode: 'CUSTOMER',    preferenceName: 'Default Customer', description: 'Customer account selected when you sign in.',         dataType: 'DROPDOWN',    isMultiValue: false, allowEditInPreference: true,  valueSourceApi: '/api/EOS2/Customer/MyCustomers',   displayOrder: 2, isActive: true },
  { preferenceCode: 'CONTRACT',    preferenceName: 'Default Contract', description: 'Contract pre-selected on new orders.',                dataType: 'DROPDOWN',    isMultiValue: false, allowEditInPreference: true,  valueSourceApi: '/api/contracts',                   displayOrder: 3, isActive: true },
  { preferenceCode: 'SCREEN_MODE', preferenceName: 'Screen Mode',      description: 'Light or dark appearance.',                           dataType: 'DROPDOWN',    isMultiValue: false, allowEditInPreference: true,  valueSourceApi: 'DARK Mode|LIGHT Mode',             displayOrder: 4, isActive: true },
  { preferenceCode: 'FAV_ITEM',    preferenceName: 'Favorite Items',   description: 'Frequently ordered articles (maintained on its own page).', dataType: 'MULTISELECT', isMultiValue: true,  allowEditInPreference: false, valueSourceApi: '/api/PDM/products/search',         displayOrder: 5, isActive: true },
];

export const DEFAULT_USER_PREFERENCES: UserPreferenceValues = {
  LANG: ['en-GB'],
  SCREEN_MODE: ['LIGHT Mode'],
  FAV_ITEM: ['AER1B23DW', 'WC111N'],
};

/* ------------------------------------------------------------------ */
/*  Mock value-source APIs                                              */
/* ------------------------------------------------------------------ */

const LANGUAGES: PreferenceOption[] = [
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'nl-NL', label: 'Nederlands' },
  { value: 'es-ES', label: 'Español' },
  { value: 'it-IT', label: 'Italiano' },
  { value: 'ja-JP', label: '日本語' },
];

const MOCK_VALUE_APIS: Record<string, () => PreferenceOption[]> = {
  languages: () => LANGUAGES,
  customers: () => CUSTOMERS
    .filter(c => c.customerType === 'Dealer')
    .slice(0, 40)
    .map(c => ({ value: toDealerCode(c), label: `${c.dealerName}: ${toDealerCode(c)}` })),
  contracts: () => CONTRACTS.map(c => ({ value: c.id, label: `${c.name} (${c.currency})` })),
  products: () => PRODUCT_CATALOG.map(p => ({ value: p.articleCode, label: `${p.articleCode} - ${p.productName}` })),
};

/** Last path segment (singular or plural, any API prefix) -> mock endpoint, so every spelling used across the tickets resolves. */
const API_ALIASES: Record<string, keyof typeof MOCK_VALUE_APIS> = {
  language: 'languages', languages: 'languages',
  customer: 'customers', customers: 'customers', mycustomers: 'customers',
  contract: 'contracts', contracts: 'contracts',
  search: 'products', products: 'products', favorites: 'products',
};

/** A value source is an API path when it contains a path separator (either slash style); otherwise it is a "|" list. */
export function isValueSourceApi(source: string): boolean {
  return /[\\/]/.test(source);
}

/**
 * Prototype stand-in for "call the configured ValueSourceApi".
 * Returns null when the source is an API the prototype has no mock for.
 */
export function resolveValueSource(source: string): PreferenceOption[] | null {
  const trimmed = source.trim();
  if (!trimmed) return [];
  if (!isValueSourceApi(trimmed)) {
    return trimmed.split('|').map(s => s.trim()).filter(Boolean).map(s => ({ value: s, label: s }));
  }
  const segments = trimmed.toLowerCase().split(/[\\/]+/).filter(Boolean);
  const key = API_ALIASES[segments[segments.length - 1]];
  return key ? MOCK_VALUE_APIS[key]() : null;
}

export function isMultiPreference(def: Pick<PreferenceDefinition, 'dataType' | 'isMultiValue'>): boolean {
  return def.dataType === 'MULTISELECT' || (def.dataType === 'DROPDOWN' && def.isMultiValue);
}
