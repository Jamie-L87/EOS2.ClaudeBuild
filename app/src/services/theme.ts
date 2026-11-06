import { loadUserPreferences, PREFERENCES_CHANGED_EVENT } from './preferencesStore';

/** Screen Mode preference ('LIGHT Mode' | 'DARK Mode') as the theme set on <html data-theme>. */
export function applyTheme(): void {
  const mode = loadUserPreferences().SCREEN_MODE?.[0] ?? 'LIGHT Mode';
  document.documentElement.dataset.theme = /^dark/i.test(mode) ? 'dark' : 'light';
}

/** Apply the saved theme now, and again whenever preferences change (this tab or another). */
export function initTheme(): void {
  applyTheme();
  window.addEventListener(PREFERENCES_CHANGED_EVENT, applyTheme);
  window.addEventListener('storage', applyTheme);
}
