import { Fragment, useEffect, useRef, useState } from 'react';
import { IconCalendar, IconChevronRight, IconClose, IconSearch } from '../../components/Icons';
import { color, radius, shadow, t } from '../../tokens';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

export function DetailBreadcrumb({ crumbs }: { crumbs: Array<{ label: string; onClick?: () => void }> }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0 16px' }}>
      {crumbs.map((crumb, i) => (
        <Fragment key={i}>
          {i > 0 && <IconChevronRight size={14} stroke={2} />}
          {crumb.onClick ? (
            <button
              onClick={crumb.onClick}
              style={{ ...sBody, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              {crumb.label}
            </button>
          ) : (
            <span style={{ ...sBodyB, color: 'var(--ink)' }}>{crumb.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

export function Chip({ label }: { label: string }) {
  return (
    <span
      style={{
        ...sBodyB,
        fontSize: 11,
        color: 'var(--ink-2)',
        background: 'var(--bg-soft)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '4px 10px',
      }}
    >
      {label}
    </span>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 44,
        border: '2px solid var(--ink)',
        borderRadius: 'var(--radius)',
        padding: '0 12px',
        background: color.bg,
        minWidth: 260,
      }}
    >
      <IconSearch size={16} stroke={1.8} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          ...sBody,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          width: '100%',
          color: 'var(--ink)',
          fontFamily: 'inherit',
        }}
      />
    </label>
  );
}

export function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="eos-primary-btn"
      style={{
        ...sLargeB,
        height: 50,
        border: '2px solid var(--brand)',
        borderRadius: radius,
        background: 'var(--brand)',
        color: color.bg,
        padding: '0 18px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

export function StrokeButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="eos-stroke-btn"
      style={{
        ...sLargeB,
        height: 50,
        border: '2px solid var(--ink)',
        borderRadius: radius,
        background: color.bg,
        color: 'var(--ink)',
        padding: '0 18px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

export function IconActionButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="eos-stroke-btn"
      style={{
        ...sBodyB,
        height: 36,
        border: '1px solid var(--ink)',
        borderRadius: radius,
        background: color.bg,
        color: 'var(--ink)',
        padding: '0 10px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,9,0.32)', zIndex: 130 }} onClick={onCancel} />
      <div
        style={{
          position: 'fixed',
          zIndex: 131,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          background: color.bg,
          border: '2px solid var(--black)',
          borderRadius: radius,
          boxShadow: shadow.pop,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ ...sLargeB, margin: 0 }}>{title}</h3>
          <button onClick={onCancel} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <IconClose size={16} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ ...sBody, margin: 0, color: 'var(--ink)' }}>{message}</p>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <StrokeButton onClick={onCancel}>Cancel</StrokeButton>
          <PrimaryButton onClick={onConfirm}>Delete</PrimaryButton>
        </div>
      </div>
    </>
  );
}

/** ISO (YYYY-MM-DD) -> DD/MM/YYYY. Returns the input unchanged if it is not an ISO date. */
export function formatDisplayDate(iso: string | undefined | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
}

function parseDisplayDate(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Text date field that always shows DD/MM/YYYY (native date inputs follow the browser locale). Value is ISO. */
/** Text date field that always shows DD/MM/YYYY (native date inputs follow the browser locale), with a calendar picker. Value is ISO. */
export function DateInput({ value, onChange, style }: { value: string; onChange: (iso: string) => void; style?: React.CSSProperties }) {
  const [text, setText] = useState(formatDisplayDate(value));
  const [invalid, setInvalid] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setText(formatDisplayDate(value)); setInvalid(false); }, [value]);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="DD/MM/YYYY"
        value={text}
        aria-invalid={invalid}
        onChange={e => {
          const next = e.target.value;
          setText(next);
          if (next.trim() === '') { setInvalid(false); onChange(''); return; }
          const iso = parseDisplayDate(next);
          setInvalid(iso === null);
          if (iso) onChange(iso);
        }}
        onBlur={() => { setText(formatDisplayDate(value)); setInvalid(false); }}
        style={{ ...style, width: 128, paddingRight: 30, ...(invalid ? { borderColor: 'var(--red)' } : null) }}
      />
      <button
        type="button"
        aria-label="Open calendar"
        onMouseDown={e => e.preventDefault()}
        onClick={() => pickerRef.current?.showPicker?.()}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', padding: 0 }}
      >
        <IconCalendar size={14} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none', border: 0, padding: 0 }}
      />
    </span>
  );
}
