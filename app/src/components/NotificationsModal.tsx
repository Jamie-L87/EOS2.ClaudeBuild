import { useEffect, useState } from 'react';
import { IconClose } from './Icons';
import NotificationCard, { NotificationBodyStyles } from './NotificationCard';
import {
  NOTIFICATIONS_CHANGED_EVENT,
  loadReadIds,
  loadVisibleNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from '../services/notificationsStore';
import { NOTIFICATION_CATEGORIES } from '../data/notifications';
import { t } from '../tokens';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

const actionBtn = {
  ...sBodyB,
  height: 36,
  padding: '0 14px',
  border: '2px solid var(--a-fg)',
  borderRadius: 'var(--radius)',
  background: 'var(--bg)',
  color: 'var(--a-fg)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background .15s ease, color .15s ease',
};

export default function NotificationsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick(n => n + 1);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const notifications = loadVisibleNotifications();
  const readIds = loadReadIds();
  const unreadIds = notifications.filter(n => !readIds.has(n.id)).map(n => n.id);

  return (
    <>
      <NotificationBodyStyles />
      <style>{`
        .eos-notif-markall:hover { background: var(--ink) !important; color: var(--bg) !important; }
        .eos-notif-action:hover { background: var(--a-fg) !important; color: var(--a-bg) !important; }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,9,0.32)', zIndex: 130 }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          zIndex: 131,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 640,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
          border: '2px solid #000',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ ...sLargeB, margin: 0 }}>
            Notifications{unreadIds.length > 0 ? ` (${unreadIds.length} unread)` : ''}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close notifications"
            className="om-iconplus"
            style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconClose size={18} stroke={1.8} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 12 }}>
          {notifications.length === 0 && (
            <p style={{ ...sBody, color: 'var(--ink-2)', margin: 0, textAlign: 'center', padding: '24px 0' }}>
              You're all caught up - no notifications.
            </p>
          )}
          {notifications.map(n => {
            const unread = !readIds.has(n.id);
            return (
              <NotificationCard
                key={n.id}
                notification={n}
                unread={unread}
                actions={
                  <button
                    className="eos-notif-action"
                    style={{ ...actionBtn, '--a-fg': NOTIFICATION_CATEGORIES[n.category].fg, '--a-bg': NOTIFICATION_CATEGORIES[n.category].bg } as React.CSSProperties}
                    onClick={() => (unread ? markNotificationRead(n.id) : markNotificationUnread(n.id))}
                  >
                    {unread ? 'Mark as read' : 'Mark as unread'}
                  </button>
                }
              />
            );
          })}
        </div>

        {unreadIds.length > 0 && (
          <div style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="eos-notif-markall"
              onClick={() => markAllNotificationsRead(unreadIds)}
              style={{ ...sLargeB, height: 44, border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--ink)', padding: '0 18px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>
    </>
  );
}
