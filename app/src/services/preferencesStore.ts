import {
  DEFAULT_PREFERENCE_DEFINITIONS,
  DEFAULT_USER_PREFERENCES,
  type PreferenceDefinition,
  type UserPreferenceValues,
} from '../data/preferences';

const DEFINITIONS_KEY = 'eos-preference-definitions:v1';
const USER_VALUES_KEY = 'eos-user-preferences:v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** GET /api/admin/preferences - every definition, including inactive and hidden ones. */
export function loadAllPreferenceDefinitions(): PreferenceDefinition[] {
  return read(DEFINITIONS_KEY, DEFAULT_PREFERENCE_DEFINITIONS);
}

export function saveAllPreferenceDefinitions(defs: PreferenceDefinition[]): void {
  localStorage.setItem(DEFINITIONS_KEY, JSON.stringify(defs));
}

/** GET /api/user-preferences/definitions - active and user-editable only, in display order. */
export function loadEditablePreferenceDefinitions(): PreferenceDefinition[] {
  return loadAllPreferenceDefinitions()
    .filter(d => d.isActive && d.allowEditInPreference)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/** GET /api/user-preferences */
export function loadUserPreferences(): UserPreferenceValues {
  return read(USER_VALUES_KEY, DEFAULT_USER_PREFERENCES);
}

/** POST /api/user-preferences - replaces the stored values for each supplied preference code. */
export function saveUserPreferences(values: UserPreferenceValues): void {
  localStorage.setItem(USER_VALUES_KEY, JSON.stringify({ ...loadUserPreferences(), ...values }));
}

/** DELETE /api/user-preferences/{preferenceCode} */
export function resetUserPreference(code: string): UserPreferenceValues {
  const { [code]: _removed, ...rest } = loadUserPreferences();
  localStorage.setItem(USER_VALUES_KEY, JSON.stringify(rest));
  return rest;
}
