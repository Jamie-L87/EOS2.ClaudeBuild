import { Fragment } from 'react';
import { IconChevronRight, IconClose, IconSearch } from '../../components/Icons';
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

export function DetailTabStrip<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 24, marginTop: 8 }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="eos-detail-tab"
            data-active={isActive}
            style={{
              ...sLargeB,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '14px 24px',
              color: isActive ? 'var(--brand)' : 'var(--ink-2)',
              borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color .15s ease, border-color .15s ease',
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
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
