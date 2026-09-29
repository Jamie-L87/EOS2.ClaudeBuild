import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { t, size } from '../tokens';
import {
  IconMenu, IconChevronDown,
  IconMail, IconHelp, IconBasket,
} from './Icons';
import { CUSTOMERS, toDealerCode, customerSearchText, wildcardIncludes } from '../data/catalogueAccess';
import type { CustomerRecord } from '../data/catalogueAccess';

interface TopNavProps {
  onMenu: () => void;
  basketCount?: number;
}

const sLargeB = { ...t.largeB };
const sLargeM = { ...t.large };
const sBody   = { ...t.body };
const sBodyB  = { ...t.bodyB };

// Real dealers switch between customer accounts here, so only customerType
// 'Dealer' is listed (not Retailer/Shop) — reuses the same mock customer
// data as Catalogue Access Admin rather than a separate hardcoded list.
const DEALER_CUSTOMERS: CustomerRecord[] = CUSTOMERS
  .filter(c => c.customerType === 'Dealer')
  .sort((a, b) => a.dealerName.localeCompare(b.dealerName));

function dealerLabel(c: CustomerRecord): string {
  return `${c.dealerName}: ${toDealerCode(c)}`;
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

  const [selectedDealer, setSelectedDealer] = useState<CustomerRecord>(DEALER_CUSTOMERS[0]);
  const [dealerInput, setDealerInput] = useState(dealerLabel(DEALER_CUSTOMERS[0]));
  const [dealerMenuOpen, setDealerMenuOpen] = useState(false);
  const [dealerEdited, setDealerEdited] = useState(false);
  const dealerMenuRef = useRef<HTMLDivElement>(null);

  const closeDealerMenu = (pick: CustomerRecord | null) => {
    const next = pick ?? selectedDealer;
    setSelectedDealer(next);
    setDealerInput(dealerLabel(next));
    setDealerMenuOpen(false);
    setDealerEdited(false);
  };

  const filteredDealers = dealerEdited
    ? DEALER_CUSTOMERS.filter(c => wildcardIncludes(customerSearchText(c), dealerInput))
    : DEALER_CUSTOMERS;

  useEffect(() => {
    if (!dealerMenuOpen) return;
    const off = (e: MouseEvent) => {
      if (!dealerMenuRef.current?.contains(e.target as Node)) closeDealerMenu(null);
    };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div style={{ ...styles.dealerInputWrap, ...(dealerMenuOpen ? styles.dealerInputWrapFocused : null) }}>
            <input
              className="eos-dealer-input"
              style={{ ...sLargeB, ...styles.dealerInput }}
              value={dealerInput}
              onFocus={(e) => { setDealerMenuOpen(true); setDealerEdited(false); e.currentTarget.select(); }}
              onChange={(e) => { setDealerInput(e.target.value); setDealerEdited(true); }}
              onKeyDown={(e) => { if (e.key === 'Escape') closeDealerMenu(null); }}
              aria-haspopup="listbox"
              aria-expanded={dealerMenuOpen}
            />
            <span style={styles.dealerChevron}><IconChevronDown size={16} /></span>
          </div>
          {dealerMenuOpen && (
            <div style={styles.dealerMenu} role="listbox">
              <div style={styles.dealerList}>
                {filteredDealers.length === 0 && (
                  <div style={{ ...sBody, color: 'var(--ink-3)', padding: '10px 14px' }}>No dealers match "{dealerInput}"</div>
                )}
                {filteredDealers.map(d => {
                  const isSelected = d.id === selectedDealer.id;
                  return (
                    <button
                      key={d.id}
                      role="option"
                      aria-selected={isSelected}
                      className={isSelected ? undefined : 'eos-dealer-item'}
                      style={{
                        ...styles.dealerMenuItem,
                        ...(isSelected ? { ...sBodyB, background: 'var(--ink)', color: '#fff' } : { ...sBody, color: 'var(--ink)' }),
                      }}
                      onClick={() => closeDealerMenu(d)}
                    >
                      {dealerLabel(d)}
                    </button>
                  );
                })}
              </div>
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
  dealerInputWrap: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    width: 300,
    height: size.hit,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'var(--ink)',
    borderRadius: 'var(--radius)',
    background: '#fff',
    transition: 'border-color .15s ease, box-shadow .15s ease',
    boxShadow: '0 0 0 0 rgba(226,45,0,0)',
  },
  dealerInputWrapFocused: {
    borderColor: 'var(--brand)',
    boxShadow: '0 0 0 4px rgba(226,45,0,0.08)',
  },
  dealerInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    padding: '0 8px 0 14px',
    color: '#000',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    textOverflow: 'ellipsis',
  },
  dealerChevron: {
    flexShrink: 0,
    width: 32,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink)',
    pointerEvents: 'none' as const,
  },
  dealerMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: 8,
    width: 380,
    background: '#fff',
    border: '2px solid #000',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-pop)',
    zIndex: 40,
    animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
    overflow: 'hidden',
  },
  dealerList: {
    maxHeight: 320,
    overflowY: 'auto' as const,
    padding: '6px 4px',
  },
  dealerMenuItem: {
    display: 'block',
    width: '100%',
    padding: '9px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 'calc(var(--radius) - 2px)',
    textAlign: 'left' as const,
    whiteSpace: 'normal' as const,
    lineHeight: 1.3,
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
