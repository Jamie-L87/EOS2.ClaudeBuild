export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  /** Whether a delivery address in this country needs a postcode */
  postcodeRequired: boolean;
}

export const COUNTRIES: Country[] = [
  { code: 'GB', name: 'United Kingdom',       postcodeRequired: true },
  { code: 'IE', name: 'Ireland',              postcodeRequired: true },
  { code: 'NL', name: 'Netherlands',          postcodeRequired: true },
  { code: 'BE', name: 'Belgium',              postcodeRequired: true },
  { code: 'FR', name: 'France',               postcodeRequired: true },
  { code: 'DE', name: 'Germany',              postcodeRequired: true },
  { code: 'AT', name: 'Austria',              postcodeRequired: true },
  { code: 'CH', name: 'Switzerland',          postcodeRequired: true },
  { code: 'ES', name: 'Spain',                postcodeRequired: true },
  { code: 'PT', name: 'Portugal',             postcodeRequired: true },
  { code: 'IT', name: 'Italy',                postcodeRequired: true },
  { code: 'SE', name: 'Sweden',               postcodeRequired: true },
  { code: 'NO', name: 'Norway',               postcodeRequired: true },
  { code: 'DK', name: 'Denmark',              postcodeRequired: true },
  { code: 'PL', name: 'Poland',               postcodeRequired: true },
  { code: 'US', name: 'United States',        postcodeRequired: true },
  { code: 'CA', name: 'Canada',               postcodeRequired: true },
  { code: 'JP', name: 'Japan',                postcodeRequired: true },
  { code: 'CN', name: 'China',                postcodeRequired: true },
  { code: 'AU', name: 'Australia',            postcodeRequired: true },
  { code: 'IN', name: 'India',                postcodeRequired: true },
  { code: 'SG', name: 'Singapore',            postcodeRequired: true },
  { code: 'HK', name: 'Hong Kong',            postcodeRequired: false },
  { code: 'AE', name: 'United Arab Emirates', postcodeRequired: false },
  { code: 'QA', name: 'Qatar',                postcodeRequired: false },
];

export function findCountry(code: string | null | undefined): Country | null {
  return code ? COUNTRIES.find(c => c.code === code) ?? null : null;
}

export function postcodeRequiredFor(code: string | null | undefined): boolean {
  return findCountry(code)?.postcodeRequired ?? false;
}
