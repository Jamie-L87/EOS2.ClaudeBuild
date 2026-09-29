import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { t, size } from '../tokens';
import {
  IconMenu, IconChevronDown,
  IconMail, IconHelp, IconBasket,
} from './Icons';

interface TopNavProps {
  onMenu: () => void;
  basketCount?: number;
}

const sLargeB = { ...t.largeB };
const sLargeM = { ...t.large };
const sBody   = { ...t.body };

interface DealerOption {
  name: string;
  site: string;
  dealerNum: string;
  currency: 'GBP' | 'EUR' | 'INR' | 'JPY' | 'USD';
}

// Names researched from Herman Miller / MillerKnoll's public dealer network;
// dealer numbers and currencies are fictional, deliberately varied in length.
const DEALERS: DealerOption[] = [
  { name: 'Tsunami Axis Ltd',                site: 'UK', dealerNum: 'DK066080',  currency: 'GBP' },
  { name: 'K2 Space Ltd',                    site: 'UK', dealerNum: 'KS20194',   currency: 'GBP' },
  { name: 'Heering Office B.V.',             site: 'NL', dealerNum: 'HO8873',    currency: 'EUR' },
  { name: 'InteriorWorks Amsterdam',         site: 'NL', dealerNum: 'IW551209',  currency: 'EUR' },
  { name: 'Aarts & Co Amsterdam',            site: 'NL', dealerNum: 'AC42',      currency: 'EUR' },
  { name: 'Benhar Office Interiors',         site: 'US', dealerNum: 'BN77410',   currency: 'USD' },
  { name: 'Miles Treaster & Associates',     site: 'US', dealerNum: 'MT2091',    currency: 'USD' },
  { name: 'Workrite India Pvt Ltd',          site: 'IN', dealerNum: 'WI3300871', currency: 'INR' },
  { name: 'Inscape Modern Private Limited',  site: 'IN', dealerNum: 'IM56',      currency: 'INR' },
  { name: 'Chair Co., Ltd',                  site: 'JP', dealerNum: 'CC910244',  currency: 'JPY' },
];

function dealerCode(d: DealerOption): string {
  return `${d.site}-${d.dealerNum}-${d.currency}`;
}

function readBasketCount(): number {
  try {
    const saved = sessionStorage.getItem('eos-basket');
    if (!saved) return 0;
    const items = JSON.parse(saved) as unknown[];
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return 0;
  }
}

export default function TopNav({ onMenu, basketCount: basketCountProp }: TopNavProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basketCount = basketCountProp ?? readBasketCount();
  const [dealer, setDealer] = useState<DealerOption>(DEALERS[0]);
  const [dealerMenuOpen, setDealerMenuOpen] = useState(false);
  const dealerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dealerMenuOpen) return;
    const off = (e: MouseEvent) => {
      if (!dealerMenuRef.current?.contains(e.target as Node)) setDealerMenuOpen(false);
    };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [dealerMenuOpen]);

  return (
    <header style={styles.bar}>
      <div style={styles.menuGroup}>
        <button className="om-iconplus" style={styles.menuBtn} onClick={onMenu} aria-label="Open menu">
          <span style={styles.iconBox}><IconMenu size={20} stroke={1.6} /></span>
          <span style={{ ...sLargeM, color: '#000' }}>Menu</span>
        </button>
        <button className="om-iconplus" style={styles.iconBtn} aria-label={basketCount > 0 ? `Basket — ${basketCount} item${basketCount !== 1 ? 's' : ''}` : 'Basket'} onClick={() => { if (pathname !== '/') navigate('/'); }}>
          <IconBasket size={20} stroke={1.6} />
          {basketCount > 0 && (
            <span style={styles.badge}>{basketCount > 99 ? '99+' : basketCount}</span>
          )}
        </button>
      </div>

      <div style={styles.rightGroup}>
        <div ref={dealerMenuRef} style={{ position: 'relative' }}>
          <button
            className="om-account-btn"
            style={styles.accountBtn}
            aria-haspopup="menu"
            aria-expanded={dealerMenuOpen}
            onClick={() => setDealerMenuOpen(o => !o)}
          >
            <span style={{ ...sLargeB, color: '#000' }}>{dealer.name}: {dealerCode(dealer)}</span>
            <span style={styles.iconBox}><IconChevronDown size={16} /></span>
          </button>
          {dealerMenuOpen && (
            <div style={styles.dealerMenu} role="menu">
              {DEALERS.map(d => (
                <button
                  key={dealerCode(d)}
                  role="menuitem"
                  className="eos-dealer-item"
                  style={styles.dealerMenuItem}
                  onClick={() => { setDealer(d); setDealerMenuOpen(false); }}
                >
                  <span style={{ ...sLargeM, color: 'var(--ink)' }}>{d.name}</span>
                  <span style={{ ...sBody, color: 'var(--ink-2)' }}>{dealerCode(d)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span style={styles.pinV} />
        <button className="om-iconplus" style={styles.iconBtn} aria-label="Mail">
          <IconMail size={20} stroke={1.6} />
          <span style={styles.badge}>3</span>
        </button>
        <button className="om-iconplus" style={styles.iconBtn} aria-label="Help">
          <IconHelp size={20} stroke={1.6} />
        </button>
        <div style={styles.avatar} title="Me">ME</div>
      </div>
      <style>{`
        .eos-dealer-item:hover { background: var(--line); }
      `}</style>
    </header>
  );
}

const styles = {
  bar: {
    height: size.navH,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    background: '#fff',
    borderBottom: '1px solid var(--ink-deep)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 30,
  },
  menuGroup:  { display: 'flex', alignItems: 'center', gap: 16 },
  rightGroup: { display: 'flex', alignItems: 'center', gap: 12 },
  pinV: { width: 1, height: 64, background: 'var(--pin)' },
  menuBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    color: 'var(--ink)',
  },
  iconBox: {
    width: size.hit,
    height: size.hit,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink)',
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 50,
    padding: '0 24px',
    border: '2px solid var(--brand)',
    borderRadius: 'var(--radius)',
    background: 'var(--brand)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background .15s ease, color .15s ease, border-color .15s ease',
  },
  accountBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
  },
  dealerMenu: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: 8,
    minWidth: 280,
    maxWidth: 360,
    background: '#fff',
    border: '2px solid #000',
    borderRadius: 'var(--radius)',
    padding: '6px 4px',
    boxShadow: 'var(--shadow-pop)',
    zIndex: 40,
    animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
  },
  dealerMenuItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: 2,
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 'calc(var(--radius) - 2px)',
    textAlign: 'left' as const,
  },
  iconBtn: {
    position: 'relative' as const,
    width: size.hit,
    height: size.hit,
    borderRadius: 22,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink)',
    transition: 'background .15s ease',
  },
  badge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    background: 'var(--brand)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    border: '2px solid #fff',
  },
  avatar: {
    width: size.hit,
    height: size.hit,
    borderRadius: '50%',
    background: 'var(--yellow)',
    color: '#000',
    ...t.largeB,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
};
