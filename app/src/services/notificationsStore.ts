import { audienceSites, defaultNotifications, isNotificationActive, languageForSite, notificationLanguage, type NotificationRecord } from '../data/notifications';

const NOTIFICATIONS_KEY = 'eos-notifications-admin:v1';
const USER_STATE_KEY = 'eos-notifications-user-state:v1';
const VIEWER_SITE_KEY = 'eos-notifications-viewer-site';

/** Fired on window whenever notifications, read state or the viewer's site change, so the nav badge stays live. */
export const NOTIFICATIONS_CHANGED_EVENT = 'eos-notifications-changed';

function emitChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function loadNotifications(): NotificationRecord[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return defaultNotifications();
    return JSON.parse(raw) as NotificationRecord[];
  } catch {
    return defaultNotifications();
  }
}

export function saveNotifications(notifications: NotificationRecord[]): void {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  emitChanged();
}

interface NotificationUserState {
  readIds: string[];
}

function loadUserState(): NotificationUserState {
  try {
    const raw = localStorage.getItem(USER_STATE_KEY);
    if (!raw) return { readIds: [] };
    return { readIds: (JSON.parse(raw) as NotificationUserState).readIds ?? [] };
  } catch {
    return { readIds: [] };
  }
}

function saveUserState(state: NotificationUserState): void {
  localStorage.setItem(USER_STATE_KEY, JSON.stringify(state));
  emitChanged();
}

export function loadReadIds(): Set<string> {
  return new Set(loadUserState().readIds);
}

export function markNotificationRead(id: string): void {
  const state = loadUserState();
  if (!state.readIds.includes(id)) state.readIds.push(id);
  saveUserState(state);
}

export function markNotificationUnread(id: string): void {
  const state = loadUserState();
  state.readIds = state.readIds.filter(r => r !== id);
  saveUserState(state);
}

export function markAllNotificationsRead(ids: string[]): void {
  const state = loadUserState();
  for (const id of ids) if (!state.readIds.includes(id)) state.readIds.push(id);
  saveUserState(state);
}

/** The dealer site (UK, NL, ...) currently selected in the top nav; drives audience targeting. */
export function setViewerSite(site: string): void {
  try { sessionStorage.setItem(VIEWER_SITE_KEY, site); } catch { /* ignore */ }
  emitChanged();
}

function getViewerSite(): string | null {
  try { return sessionStorage.getItem(VIEWER_SITE_KEY); } catch { return null; }
}

function targetsSite(n: NotificationRecord, site: string | null): boolean {
  const sites = audienceSites(n);
  return sites.length === 0 || (site !== null && sites.includes(site));
}

/** What the selected dealer sees: within the display window, targeted at their site and written in their language, newest first. */
export function loadVisibleNotifications(): NotificationRecord[] {
  const site = getViewerSite();
  const language = languageForSite(site);
  return loadNotifications()
    .filter(n => isNotificationActive(n) && targetsSite(n, site) && notificationLanguage(n) === language)
    .sort((a, b) => b.displayDate.localeCompare(a.displayDate));
}

export function countUnreadNotifications(): number {
  const read = loadReadIds();
  return loadVisibleNotifications().filter(n => !read.has(n.id)).length;
}
