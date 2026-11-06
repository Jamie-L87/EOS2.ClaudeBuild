import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IconClose, IconCheck } from './Icons';
import { t } from '../tokens';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

const TYPES = [
  { id: 'bug', label: 'Something is broken' },
  { id: 'idea', label: 'I have an idea' },
  { id: 'confusing', label: 'Something is confusing' },
  { id: 'praise', label: 'Something works well' },
] as const;

const RATINGS = [
  { value: 1, label: 'Very poor' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'OK' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

const MAX_COMMENT = 1000;

const fieldLabel = { ...sBodyB, color: 'var(--ink-2)', textTransform: 'uppercase' as const, letterSpacing: 0.6, margin: '0 0 8px', display: 'block' };

const DRAFT_KEY = 'eos-feedback-draft';

interface Draft { type: string; rating: number | null; comment: string; contactOk: boolean }

function loadDraft(): Draft {
  const empty: Draft = { type: 'idea', rating: null, comment: '', contactOk: true };
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    return saved ? { ...empty, ...JSON.parse(saved) } : empty;
  } catch {
    return empty;
  }
}

function saveDraft(d: Draft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}

export default function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const [draft] = useState(loadDraft);
  const [type, setType] = useState<string>(draft.type);
  const [rating, setRating] = useState<number | null>(draft.rating);
  const [comment, setComment] = useState(draft.comment);
  const [contactOk, setContactOk] = useState(draft.contactOk);
  const [sent, setSent] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

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

  const loadImage = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith('image/')) return false;
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
    return true;
  };

  // Paste anywhere in the modal (including the comment box) attaches a screenshot.
  useEffect(() => {
    if (!open) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      if (item && loadImage(item.getAsFile())) e.preventDefault();
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open]);

  // Keep the draft while the modal is closed (e.g. to take a screenshot) or the user changes
  // page; only a sent submission starts the next one fresh. The screenshot is not kept.
  useEffect(() => {
    if (!sent) saveDraft({ type, rating, comment, contactOk });
  }, [type, rating, comment, contactOk, sent]);

  useEffect(() => {
    if (open) return;
    setScreenshot(null);
    if (sent) {
      clearDraft();
      setType('idea'); setRating(null); setComment(''); setContactOk(true); setSent(false);
    }
  }, [open, sent]);

  if (!open) return null;

  const canSubmit = comment.trim().length > 0;

  return (
    <>
      <style>{`
        .eos-fb-chip:hover { background: var(--bg-soft) !important; }
        .eos-fb-rate:hover { border-color: var(--brand) !important; }
        .eos-fb-field:focus { border-color: var(--brand) !important; box-shadow: 0 0 0 4px rgba(226,45,0,0.08); outline: none; }
      `}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'var(--backdrop)', zIndex: 130 }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Give feedback"
        style={{
          position: 'fixed', zIndex: 131, top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 560, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 64px)',
          display: 'flex', flexDirection: 'column', background: 'var(--bg)',
          border: '2px solid var(--modal-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-pop)',
          animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ ...sLargeB, margin: 0 }}>Give feedback</h2>
          <button
            onClick={onClose}
            aria-label="Close feedback"
            className="om-iconplus"
            style={{ width: 44, height: 44, borderRadius: 22, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconClose size={18} stroke={1.8} />
          </button>
        </div>

        {sent ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', display: 'grid', gap: 12, justifyItems: 'center' }}>
            <span style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--green-soft)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconCheck size={24} stroke={2} />
            </span>
            <h3 style={{ ...sLargeB, margin: 0 }}>Thanks for your feedback</h3>
            <p style={{ ...sBody, color: 'var(--ink-2)', margin: 0, maxWidth: 380 }}>
              The EOS 2.0 team reads every submission and uses it to decide what to fix and build next.
            </p>
            <button
              onClick={onClose}
              style={{ ...sLargeB, height: 50, marginTop: 8, padding: '0 28px', border: '2px solid var(--brand)', borderRadius: 'var(--radius)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 20 }}>
              <p style={{ ...sBody, color: 'var(--ink-2)', margin: 0 }}>
                You're using an early release of EOS 2.0. Tell us what's working and what isn't.
              </p>

              <div>
                <span style={fieldLabel}>What kind of feedback?</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="radiogroup" aria-label="Feedback type">
                  {TYPES.map(o => {
                    const active = type === o.id;
                    return (
                      <button
                        key={o.id}
                        role="radio"
                        aria-checked={active}
                        className="eos-fb-chip"
                        onClick={() => setType(o.id)}
                        style={{
                          ...sBodyB, height: 40, padding: '0 14px', cursor: 'pointer', fontFamily: 'inherit',
                          border: `2px solid ${active ? 'var(--brand)' : 'var(--ink)'}`,
                          borderRadius: 'var(--radius)',
                          background: active ? 'var(--brand-soft)' : 'var(--bg)',
                          color: 'var(--ink)',
                        }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span style={fieldLabel}>How is EOS 2.0 working for you? (optional)</span>
                <div style={{ display: 'flex', gap: 8 }} role="radiogroup" aria-label="Rating">
                  {RATINGS.map(r => {
                    const active = rating === r.value;
                    return (
                      <button
                        key={r.value}
                        role="radio"
                        aria-checked={active}
                        aria-label={`${r.value} - ${r.label}`}
                        title={r.label}
                        className="eos-fb-rate"
                        onClick={() => setRating(active ? null : r.value)}
                        style={{
                          ...sLargeB, flex: 1, height: 44, cursor: 'pointer', fontFamily: 'inherit',
                          border: `2px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                          borderRadius: 'var(--radius)',
                          background: active ? 'var(--ink-fill)' : 'var(--bg)',
                          color: active ? '#fff' : 'var(--ink)',
                        }}
                      >
                        {r.value}
                      </button>
                    );
                  })}
                </div>
                <div style={{ ...sBody, color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span>Very poor</span><span>Great</span>
                </div>
              </div>

              <div>
                <label htmlFor="eos-fb-comment" style={fieldLabel}>Your feedback</label>
                <textarea
                  id="eos-fb-comment"
                  className="eos-fb-field"
                  value={comment}
                  maxLength={MAX_COMMENT}
                  onChange={e => setComment(e.target.value)}
                  placeholder="What were you trying to do? What happened, and what did you expect?"
                  rows={5}
                  style={{ ...sBody, width: '100%', boxSizing: 'border-box', padding: 12, resize: 'vertical', fontFamily: 'inherit', color: 'var(--ink)', border: '2px solid var(--strong)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}
                />
                <div style={{ ...sBody, color: 'var(--ink-3)', textAlign: 'right', marginTop: 4 }}>{comment.length}/{MAX_COMMENT}</div>
              </div>

              <div>
                <span style={fieldLabel}>Screenshot (optional)</span>
                {screenshot ? (
                  <div style={{ position: 'relative', border: '2px solid var(--line)', borderRadius: 'var(--radius)', padding: 8, background: 'var(--bg-soft)' }}>
                    <img src={screenshot} alt="Pasted screenshot" style={{ display: 'block', maxWidth: '100%', maxHeight: 180, margin: '0 auto' }} />
                    <button
                      onClick={() => setScreenshot(null)}
                      aria-label="Remove screenshot"
                      className="om-iconplus"
                      style={{ position: 'absolute', top: 4, right: 4, width: 32, height: 32, borderRadius: 16, border: 'none', background: 'var(--bg)', cursor: 'pointer', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <IconClose size={14} stroke={1.8} />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); loadImage(e.dataTransfer.files[0]); }}
                    style={{ ...sBody, color: 'var(--ink-2)', border: '2px dashed var(--ink-3)', borderRadius: 'var(--radius)', padding: '16px 12px', textAlign: 'center' }}
                  >
                    Press <strong>Ctrl+V</strong> to paste a screenshot, or drop an image here.
                    <div style={{ color: 'var(--ink-3)', marginTop: 4 }}>Tip: Win+Shift+S captures part of your screen.</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: 4 }}>
                <p style={{ ...sBody, color: 'var(--ink-2)', margin: '0 0 8px' }}>
                  Your name, email, dealer, role and the page you're on <span style={{ color: 'var(--ink-3)' }}>({pathname})</span> are sent with your feedback.
                </p>
                <label style={{ ...sBody, display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, cursor: 'pointer' }}>
                  <input type="checkbox" checked={contactOk} onChange={e => setContactOk(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
                  <span>The EOS team can contact me about this feedback</span>
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={onClose}
                style={{ ...sLargeB, height: 44, padding: '0 18px', border: '2px solid var(--strong)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                disabled={!canSubmit}
                onClick={() => setSent(true)}
                style={{
                  ...sLargeB, height: 44, padding: '0 22px', fontFamily: 'inherit',
                  border: `2px solid ${canSubmit ? 'var(--brand)' : 'var(--line)'}`,
                  borderRadius: 'var(--radius)',
                  background: canSubmit ? 'var(--brand)' : 'var(--line)',
                  color: canSubmit ? '#fff' : 'var(--ink-3)',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                Send feedback
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
