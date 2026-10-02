import { NOTIFICATION_CATEGORIES, type NotificationRecord } from '../data/notifications';
import { t } from '../tokens';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };

// Prototype-grade sanitiser: strips scripts/embeds, inline handlers and
// javascript: URLs. The real build should sanitise server-side.
function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(el => el.remove());
  doc.body.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(attr.value))) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return doc.body.innerHTML;
}

export function NotificationBody({ notification }: { notification: Pick<NotificationRecord, 'bodyFormat' | 'body'> }) {
  if (notification.bodyFormat === 'html') {
    return (
      <div
        className="eos-notif-body"
        style={{ ...sBody }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(notification.body) }}
      />
    );
  }
  return <div className="eos-notif-body" style={{ ...sBody, whiteSpace: 'pre-wrap' }}>{notification.body}</div>;
}

/** Scoped styles for HTML bodies; render once wherever NotificationBody is used. */
export function NotificationBodyStyles() {
  return (
    <style>{`
      .eos-notif-body > :first-child { margin-top: 0; }
      .eos-notif-body > :last-child { margin-bottom: 0; }
      .eos-notif-body p { margin: 0 0 8px; }
      .eos-notif-body ul, .eos-notif-body ol { margin: 0 0 8px; padding-left: 20px; }
      .eos-notif-body a { color: inherit; text-decoration: underline; }
    `}</style>
  );
}

export function CategoryTag({ category }: { category: NotificationRecord['category'] }) {
  const c = NOTIFICATION_CATEGORIES[category];
  return (
    <span style={{ ...sBodyB, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.fg }}>
      {c.label}
    </span>
  );
}

/** Banner-style card using the styleguide's Info / Warning / Error notification colours. */
export default function NotificationCard({
  notification,
  unread,
  actions,
}: {
  notification: NotificationRecord;
  unread?: boolean;
  actions?: React.ReactNode;
}) {
  const c = NOTIFICATION_CATEGORIES[notification.category];
  return (
    <article
      style={{
        background: c.bg,
        color: c.fg,
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        display: 'grid',
        gap: 8,
        // Read cards sit back slightly; the preview and unread cards stay full strength
        opacity: unread === false ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {unread && <span aria-label="Unread" style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--brand)', flexShrink: 0 }} />}
        <CategoryTag category={notification.category} />
        <span style={{ ...sBody, fontSize: 12, marginLeft: 'auto', opacity: 0.8 }}>{notification.displayDate}</span>
      </div>
      <h3 style={{ ...t.largeB, margin: 0, color: c.fg }}>{notification.header}</h3>
      <NotificationBody notification={notification} />
      {actions && <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>{actions}</div>}
    </article>
  );
}
