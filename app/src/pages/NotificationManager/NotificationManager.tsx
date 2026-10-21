import { useEffect, useMemo, useState } from 'react';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import NotificationCard, { CategoryTag, NotificationBodyStyles } from '../../components/NotificationCard';
import { IconClose, IconEdit, IconPlus, IconTrash } from '../../components/Icons';
import { color, radius, size, t } from '../../tokens';
import {
  NOTIFICATION_SITES,
  audienceLabel,
  audienceSites,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_LANGUAGES,
  DEFAULT_NOTIFICATION_LANGUAGE,
  localizedContent,
  translatedLanguages,
  type NotificationCategory,
  type NotificationRecord,
  type NotificationTranslation,
} from '../../data/notifications';
import { loadNotifications, saveNotifications } from '../../services/notificationsStore';
import { uid } from '../../data/catalogueAccess';
import { Chip, ConfirmDialog, IconActionButton, PrimaryButton, SearchInput, StrokeButton } from '../CatalogueAccessAdmin/shared';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

const today = () => new Date().toISOString().slice(0, 10);

type Status = 'Scheduled' | 'Active' | 'Expired';

function statusOf(n: NotificationRecord): Status {
  const d = today();
  if (d < n.displayDate) return 'Scheduled';
  if (d > n.expiryDate) return 'Expired';
  return 'Active';
}

const STATUS_COLOR: Record<Status, { dot: string; fg: string }> = {
  Active:    { dot: 'var(--green)', fg: 'var(--green)' },
  Scheduled: { dot: 'var(--blue)',  fg: 'var(--blue)' },
  Expired:   { dot: 'var(--ink-3)', fg: 'var(--ink-2)' },
};

interface Draft {
  id: string | null;
  category: NotificationCategory;
  audience: string[];
  translations: Record<string, NotificationTranslation>;
  bodyFormat: 'text' | 'html';
  displayDate: string;
  expiryDate: string;
}

function emptyDraft(): Draft {
  const exp = new Date();
  exp.setDate(exp.getDate() + 14);
  return { id: null, category: 'info', audience: [], translations: { [DEFAULT_NOTIFICATION_LANGUAGE]: { header: '', body: '' } }, bodyFormat: 'text', displayDate: today(), expiryDate: exp.toISOString().slice(0, 10) };
}

const labelStyle = { ...sBodyB, color: 'var(--ink-2)', textTransform: 'uppercase' as const, letterSpacing: 0.6, fontSize: 11, display: 'block', marginBottom: 6 };
const inputStyle = {
  ...sBody,
  width: '100%',
  height: 44,
  boxSizing: 'border-box' as const,
  border: '2px solid var(--ink)',
  borderRadius: 'var(--radius)',
  padding: '0 12px',
  fontFamily: 'inherit',
  color: 'var(--ink)',
  background: color.bg,
};

function AudienceChip({ label, title, active, onClick, onRemove, removeLabel }: { label: string; title?: string; active: boolean; onClick: () => void; onRemove?: () => void; removeLabel?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        title={title}
        aria-pressed={active}
        onClick={onClick}
        style={{
          ...sBodyB,
          height: 36,
          padding: onRemove ? '0 34px 0 14px' : '0 14px',
          border: `2px solid ${active ? 'var(--brand)' : 'var(--ink)'}`,
          borderRadius: radius,
          background: active ? 'var(--brand)' : color.bg,
          color: active ? color.bg : 'var(--ink)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {label}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel ?? 'Remove'}
          title={removeLabel ?? 'Remove'}
          onClick={onRemove}
          style={{
            position: 'absolute', top: 0, right: 0, width: 32, height: 36,
            border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: active ? color.bg : 'var(--ink-2)',
          }}
        >
          <IconClose size={12} />
        </button>
      )}
    </span>
  );
}

function SegButtons<T extends string>({ value, options, onChange }: { value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex' }}>
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          style={{
            ...sBodyB,
            height: 44,
            padding: '0 16px',
            border: '2px solid var(--ink)',
            borderLeftWidth: i === 0 ? 2 : 1,
            borderRightWidth: i === options.length - 1 ? 2 : 1,
            borderRadius: 0,
            borderTopLeftRadius: i === 0 ? radius : 0,
            borderBottomLeftRadius: i === 0 ? radius : 0,
            borderTopRightRadius: i === options.length - 1 ? radius : 0,
            borderBottomRightRadius: i === options.length - 1 ? radius : 0,
            background: value === o.id ? 'var(--brand)' : color.bg,
            color: value === o.id ? color.bg : 'var(--ink)',
            borderColor: value === o.id ? 'var(--brand)' : 'var(--ink)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const HTML_TOOLS: Array<{ label: string; wrap: [string, string] }> = [
  { label: 'Bold', wrap: ['<strong>', '</strong>'] },
  { label: 'Italic', wrap: ['<em>', '</em>'] },
  { label: 'Paragraph', wrap: ['<p>', '</p>'] },
  { label: 'List', wrap: ['<ul><li>', '</li></ul>'] },
  { label: 'Link', wrap: ['<a href="https://">', '</a>'] },
];

function Composer({ initial, onCancel, onSave }: { initial: Draft; onCancel: () => void; onSave: (d: Draft) => void }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState(DEFAULT_NOTIFICATION_LANGUAGE);
  // Languages whose tile has been selected; each gets its own preview on the right
  const [opened, setOpened] = useState<string[]>(() => [...new Set([DEFAULT_NOTIFICATION_LANGUAGE, ...Object.keys(initial.translations)])]);
  const selectLang = (code: string) => { setLang(code); setOpened(o => (o.includes(code) ? o : [...o, code])); };
  const removeLang = (code: string) => {
    setDraft(d => { const { [code]: _removed, ...rest } = d.translations; return { ...d, translations: rest }; });
    setOpened(o => o.filter(c => c !== code));
    if (lang === code) setLang(DEFAULT_NOTIFICATION_LANGUAGE);
  };
  const previewLangs = Object.keys(NOTIFICATION_LANGUAGES).filter(c => opened.includes(c));
  const current = draft.translations[lang] ?? { header: '', body: '' };
  const setText = (field: keyof NotificationTranslation, v: string) =>
    setDraft(d => ({ ...d, translations: { ...d.translations, [lang]: { ...(d.translations[lang] ?? { header: '', body: '' }), [field]: v } } }));
  const isDone = (code: string) => { const x = draft.translations[code]; return !!x && !!x.header.trim() && !!x.body.trim(); };
  const isStarted = (code: string) => { const x = draft.translations[code]; return !!x && (!!x.header.trim() || !!x.body.trim()); };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }));

  const insertTag = (wrap: [string, string]) => {
    const ta = document.getElementById('notif-body') as HTMLTextAreaElement | null;
    const start = ta?.selectionStart ?? current.body.length;
    const end = ta?.selectionEnd ?? current.body.length;
    const selected = current.body.slice(start, end);
    setText('body', current.body.slice(0, start) + wrap[0] + selected + wrap[1] + current.body.slice(end));
  };

  const submit = () => {
    if (!isDone(DEFAULT_NOTIFICATION_LANGUAGE)) { setLang(DEFAULT_NOTIFICATION_LANGUAGE); return setError('English header and message are required (used when a translation is missing).'); }
    const half = Object.keys(draft.translations).find(c => isStarted(c) && !isDone(c));
    if (half) { selectLang(half); return setError(`${NOTIFICATION_LANGUAGES[half]} needs both a header and a message, or clear both to skip it.`); }
    if (draft.expiryDate < draft.displayDate) return setError('Expiry date cannot be before the display date.');
    onSave({ ...draft, translations: Object.fromEntries(Object.entries(draft.translations).filter(([c]) => isDone(c))) });
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,9,0.32)', zIndex: 130 }} onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={draft.id ? 'Edit notification' : 'New notification'}
        style={{
          position: 'fixed', zIndex: 131, top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 960, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)',
          display: 'flex', flexDirection: 'column',
          background: color.bg, border: '2px solid #000', borderRadius: radius, boxShadow: 'var(--shadow-pop)',
          animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ ...sLargeB, margin: 0 }}>{draft.id ? 'Edit Notification' : 'New Notification'}</h2>
          <button onClick={onCancel} aria-label="Close" style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24 }}>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <div>
              <span style={labelStyle}>Urgency</span>
              <SegButtons
                value={draft.category}
                options={(Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[]).map(id => ({ id, label: NOTIFICATION_CATEGORIES[id].label }))}
                onChange={v => set('category', v)}
              />
            </div>
            <div>
              <span style={labelStyle}>Translations</span>
              <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(NOTIFICATION_LANGUAGES).map(([code, name]) => (
                  <AudienceChip
                    key={code}
                    label={`${name}${code === DEFAULT_NOTIFICATION_LANGUAGE ? ' *' : isDone(code) ? ' \u2713' : ''}`}
                    title={code === DEFAULT_NOTIFICATION_LANGUAGE ? 'Required - shown when a translation is missing' : undefined}
                    active={lang === code}
                    onClick={() => selectLang(code)}
                    onRemove={code !== DEFAULT_NOTIFICATION_LANGUAGE && opened.includes(code) ? () => removeLang(code) : undefined}
                    removeLabel={`Remove ${name} translation`}
                  />
                ))}
              </div>
              <p style={{ ...sBody, fontSize: 12, color: 'var(--ink-2)', margin: '6px 0 0' }}>
                {lang === DEFAULT_NOTIFICATION_LANGUAGE
                  ? 'English is required and is shown to any dealer whose language has no translation.'
                  : `Optional. Leave blank and ${NOTIFICATION_LANGUAGES[lang]}-speaking dealers will see the English version.`}
              </p>
            </div>
            <div>
              <label htmlFor="notif-header" style={labelStyle}>Header ({NOTIFICATION_LANGUAGES[lang]})</label>
              <input id="notif-header" style={inputStyle} value={current.header} onChange={e => setText('header', e.target.value)} maxLength={120} />
            </div>
            <div>
              <span style={labelStyle}>Message format</span>
              <SegButtons
                value={draft.bodyFormat}
                options={[{ id: 'text', label: 'Plain text' }, { id: 'html', label: 'HTML' }]}
                onChange={v => set('bodyFormat', v)}
              />
            </div>
            <div>
              <label htmlFor="notif-body" style={labelStyle}>Message ({NOTIFICATION_LANGUAGES[lang]})</label>
              {draft.bodyFormat === 'html' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {HTML_TOOLS.map(tool => (
                    <IconActionButton key={tool.label} label={tool.label} onClick={() => insertTag(tool.wrap)} icon={null} />
                  ))}
                </div>
              )}
              <textarea
                id="notif-body"
                value={current.body}
                onChange={e => setText('body', e.target.value)}
                rows={8}
                style={{ ...inputStyle, height: 'auto', padding: 12, resize: 'vertical', fontFamily: draft.bodyFormat === 'html' ? 'monospace' : 'inherit' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="notif-display" style={labelStyle}>Display date</label>
                <input id="notif-display" type="date" style={inputStyle} value={draft.displayDate} onChange={e => set('displayDate', e.target.value)} />
              </div>
              <div>
                <label htmlFor="notif-expiry" style={labelStyle}>Expiry date</label>
                <input id="notif-expiry" type="date" style={inputStyle} value={draft.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
              </div>
            </div>
            <div>
              <span style={labelStyle}>Audience</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <AudienceChip label="All dealers" active={draft.audience.length === 0} onClick={() => set('audience', [])} />
                {Object.entries(NOTIFICATION_SITES).map(([code, name]) => (
                  <AudienceChip
                    key={code}
                    label={code}
                    title={name}
                    active={draft.audience.includes(code)}
                    onClick={() => set('audience', draft.audience.includes(code) ? draft.audience.filter(s => s !== code) : [...draft.audience, code])}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ alignContent: 'start' }}>
            <span style={labelStyle}>Previews (as dealers see them)</span>
            <div style={{ display: 'grid', gap: 20 }}>
              {previewLangs.map(code => (
                <div key={code}>
                  <span style={{ ...sBodyB, fontSize: 12, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
                    {NOTIFICATION_LANGUAGES[code]}{code !== DEFAULT_NOTIFICATION_LANGUAGE && !isDone(code) ? ' - no translation yet, dealers see English' : ''}
                  </span>
                  <NotificationCard
                    notification={{
                      id: 'preview-' + code,
                      category: draft.category,
                      audience: draft.audience,
                      translations: {
                        [DEFAULT_NOTIFICATION_LANGUAGE]: { header: 'Header', body: 'Your message will appear here.' },
                        ...Object.fromEntries(Object.entries(draft.translations).filter(([c]) => isDone(c))),
                      },
                      bodyFormat: draft.bodyFormat,
                      displayDate: draft.displayDate,
                      expiryDate: draft.expiryDate,
                      createdAt: draft.displayDate,
                    }}
                    language={code}
                    unread
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          {error && <span style={{ ...sBodyB, color: 'var(--red)', marginRight: 'auto' }}>{error}</span>}
          <StrokeButton onClick={onCancel}>Cancel</StrokeButton>
          <PrimaryButton onClick={submit}>{draft.id ? 'Save changes' : 'Publish'}</PrimaryButton>
        </div>
      </div>
    </>
  );
}

export default function NotificationManagerPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [notifications, setNotifications] = useState(loadNotifications);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NotificationRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const role = sessionStorage.getItem('eos-user-role') ?? 'Admin';
  const isAdmin = role === 'Admin';

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...notifications]
      .filter(n => !q || Object.values(n.translations).some(x => x.header.toLowerCase().includes(q)))
      .sort((a, b) => b.displayDate.localeCompare(a.displayDate));
  }, [notifications, query]);

  const persist = (next: NotificationRecord[], message: string) => {
    setNotifications(next);
    saveNotifications(next);
    setToast(message);
  };

  const save = (d: Draft) => {
    const record: NotificationRecord = {
      id: d.id ?? uid('notif'),
      category: d.category,
      audience: d.audience,
      translations: Object.fromEntries(Object.entries(d.translations).map(([c, x]) => [c, { header: x.header.trim(), body: x.body }])),
      bodyFormat: d.bodyFormat,
      displayDate: d.displayDate,
      expiryDate: d.expiryDate,
      createdAt: notifications.find(n => n.id === d.id)?.createdAt ?? today(),
    };
    persist(d.id ? notifications.map(n => (n.id === d.id ? record : n)) : [record, ...notifications], d.id ? 'Notification updated' : 'Notification published');
    setEditing(null);
  };

  const th = { ...sBodyB, fontSize: 12.5, color: color.bg, background: 'var(--ink)', textAlign: 'left' as const, padding: '0 16px', height: 44 };
  const td = { ...sBody, padding: '0 16px', height: size.rowH ?? 50, borderBottom: '1px solid var(--line)', color: 'var(--ink)' };

  return (
    <>
      <style>{`
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        .eos-primary-btn:not(:disabled):hover { background: var(--brand-dark) !important; border-color: var(--brand-dark) !important; }
        .eos-stroke-btn:hover { background: var(--ink) !important; color: var(--bg) !important; border-color: var(--ink) !important; }
        .eos-row:hover { background: var(--bg-soft); }
      `}</style>
      <NotificationBodyStyles />

      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="notifications" />

      <main style={{ maxWidth: size.maxWidth, margin: '0 auto', padding: `0 ${size.pagePad}px 40px` }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ ...sLargeB, fontSize: 33.18, lineHeight: 1.2, margin: 0 }}>Notification Manager</h1>
            <p style={{ ...sBody, margin: '8px 0 0', color: 'var(--ink-2)' }}>Create and schedule notifications shown to all dealers.</p>
          </div>
          <Chip label={`Role: ${role}`} />
        </header>

        {!isAdmin ? (
          <div style={{ marginTop: 24, border: '2px solid var(--red)', background: 'var(--red-soft)', borderRadius: radius, padding: 24 }}>
            <h2 style={{ ...sLargeB, margin: 0, color: 'var(--red)' }}>Access Denied</h2>
            <p style={{ ...sBody, margin: '10px 0 0' }}>You do not have permission to access Notification Manager. This page is restricted to Admin role users.</p>
          </div>
        ) : (
          <section style={{ marginTop: 20, border: '1px solid var(--line)', borderRadius: radius, background: color.bg, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ ...sLargeB, margin: 0 }}>Notifications</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <SearchInput value={query} onChange={setQuery} placeholder="Search headers..." />
                <PrimaryButton onClick={() => setEditing(emptyDraft())}>
                  <IconPlus size={16} />
                  New Notification
                </PrimaryButton>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Header</th>
                    <th style={th}>Urgency</th>
                    <th style={th}>Translations</th>
                    <th style={th}>Audience</th>
                    <th style={th}>Status</th>
                    <th style={th}>Display</th>
                    <th style={th}>Expiry</th>
                    <th style={{ ...th, width: 200 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--ink-2)' }}>No notifications.</td></tr>
                  )}
                  {rows.map(n => {
                    const status = statusOf(n);
                    return (
                      <tr key={n.id} className="eos-row">
                        <td style={{ ...td, ...sBodyB }}>{localizedContent(n, DEFAULT_NOTIFICATION_LANGUAGE).header}</td>
                        <td style={td}><CategoryTag category={n.category} /></td>
                        <td style={td}>{translatedLanguages(n).map(c => c.toUpperCase()).join(', ')}</td>
                        <td style={td}>{audienceLabel(n)}</td>
                        <td style={td}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: STATUS_COLOR[status].fg }}>
                            <span style={{ width: 8, height: 8, borderRadius: 4, background: STATUS_COLOR[status].dot }} />
                            {status}
                          </span>
                        </td>
                        <td style={td}>{n.displayDate}</td>
                        <td style={td}>{n.expiryDate}</td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', gap: 8 }}>
                            <IconActionButton label="Edit" icon={<IconEdit size={14} />} onClick={() => setEditing({ ...n, audience: audienceSites(n) })} />
                            <IconActionButton label="Delete" icon={<IconTrash size={14} />} onClick={() => setConfirmDelete(n)} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: 72, marginTop: 40, borderTop: '1px solid var(--line)', background: color.bg }}>
        <span style={{ ...sLargeB, color: 'var(--brand)', letterSpacing: '0.05em' }}>EOS CLOUD</span>
        <span style={{ ...sBody, color: 'var(--ink-2)' }}>2026 - MillerKnoll</span>
        <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>Tsunami Axis Ltd</span>
      </footer>

      {editing && <Composer initial={editing} onCancel={() => setEditing(null)} onSave={save} />}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Notification"
        message={`Are you sure you want to delete "${confirmDelete ? localizedContent(confirmDelete, DEFAULT_NOTIFICATION_LANGUAGE).header : ''}"? This cannot be undone.`}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) persist(notifications.filter(n => n.id !== confirmDelete.id), 'Notification deleted');
          setConfirmDelete(null);
        }}
      />

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: color.bg, padding: '12px 18px', borderRadius: radius, ...sBody, zIndex: 200 }}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} style={{ marginLeft: 10, border: 'none', background: 'transparent', color: color.bg, cursor: 'pointer' }}>
            <IconClose size={13} />
          </button>
        </div>
      )}
    </>
  );
}
