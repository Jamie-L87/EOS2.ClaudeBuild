import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconClose, IconChevronRight, IconUpload } from './Icons';
import type { SVGProps } from 'react';

type NavId = 'import' | 'orders';

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  current: NavId;
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'stroke'> {
  size?: number;
  stroke?: number;
}

const IconOrders = (p: IconProps) => (
  <svg
    width={p.size ?? 18}
    height={p.size ?? 18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={p.stroke ?? 1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="M3 10h18M8 5v14" />
  </svg>
);

const NAV_ITEMS: Array<{
  id: NavId;
  label: string;
  sub: string;
  path: string;
  Icon: React.ComponentType<IconProps>;
}> = [
  { id: 'import', label: 'Import',  sub: 'Upload files or paste codes',         path: '/',       Icon: IconUpload },
  { id: 'orders', label: 'Orders',  sub: 'Active, completed and archived',       path: '/orders', Icon: IconOrders },
];

export default function NavDrawer({ open, onClose, current }: NavDrawerProps) {
  const navigate = useNavigate();

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

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden={!open}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(9,9,9,0.32)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .2s ease',
          zIndex: 90,
        }}
      />

      <aside
        role="dialog"
        aria-label="Navigation"
        aria-modal="true"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 360, maxWidth: '85vw',
          background: '#fff',
          borderRight: '2px solid var(--ink)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
          zIndex: 91,
          display: 'flex', flexDirection: 'column',
          boxShadow: open ? 'var(--shadow-pop)' : 'none',
        }}
      >
        <div style={{
          height: 92,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, letterSpacing: '0.05em', color: 'var(--brand)', fontSize: 18 }}>
            EOS CLOUD
          </span>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="om-iconplus"
            style={{
              width: 44, height: 44, borderRadius: 22,
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink)',
            }}
          >
            <IconClose size={20} stroke={1.8} />
          </button>
        </div>

        <div style={{
          padding: '20px 24px 8px',
          fontWeight: 700, letterSpacing: '0.06em',
          fontSize: 11, textTransform: 'uppercase',
          color: 'var(--ink-3)',
        }}>
          Navigate
        </div>

        <nav style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = current === item.id;
            return (
              <button
                key={item.id}
                className="om-nav-item"
                data-active={active}
                aria-current={active ? 'page' : undefined}
                onClick={() => { navigate(item.path); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  borderRadius: 'var(--radius)',
                  border: active ? '2px solid var(--brand)' : '2px solid transparent',
                  background: active ? 'var(--brand-soft)' : 'transparent',
                  textDecoration: 'none',
                  color: active ? 'var(--brand)' : 'var(--ink)',
                  transition: 'background .15s ease, color .15s ease, border-color .15s ease',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{
                  width: 40, height: 40, borderRadius: 'var(--radius)',
                  background: active ? 'var(--brand)' : 'var(--line)',
                  color: active ? '#fff' : 'var(--ink)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background .15s ease, color .15s ease',
                }}>
                  <item.Icon size={18} stroke={1.7} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, letterSpacing: '0.010em', fontSize: 16, lineHeight: 1.2 }}>
                    {item.label}
                  </span>
                  <span style={{ display: 'block', fontWeight: 500, letterSpacing: '0.010em', fontSize: 13, lineHeight: 1.3, color: active ? 'var(--brand)' : 'var(--ink-2)', marginTop: 2 }}>
                    {item.sub}
                  </span>
                </span>
                <IconChevronRight size={16} stroke={2} />
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--line)',
          fontSize: 12, fontWeight: 500, letterSpacing: '0.010em',
          color: 'var(--ink-2)',
        }}>
          EOS Cloud · Tsunami Axis Ltd
        </div>
      </aside>

      <style>{`
        .om-nav-item:hover { background: var(--bg-soft) !important; }
        .om-nav-item[data-active="true"]:hover { background: var(--brand-soft) !important; }
      `}</style>
    </>
  );
}
