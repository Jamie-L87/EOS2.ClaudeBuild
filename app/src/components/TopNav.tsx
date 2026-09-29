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

// The trigger reserves ~66px for its chevron/padding vs. ~32px for a plain
// dropdown row, so at equal box widths a name that fits one line in the row
// wraps to two lines once it's the selected value shown in the trigger.
// Widened past that ~34px gap so a row's line-wrap point is never narrower
// than the trigger's.
const DEALER_TRIGGER_WIDTH = 320;

// A handful of longer, realistically-styled names (the naming conventions
// mirror real dealer records — "for General Trading & Contracting", legacy
// "do not use" accounts, "(Euro Trading Account)" suffixes) so the dropdown's
// line-wrap behaviour has something to show. The synthetic "Word Word Ltd"
// generator below never produces anything long enough to wrap on its own.
const LONG_NAME_DEALERS: CustomerRecord[] = [
  { id: 'SG-F079999', site: 'SG', dealerNum: 'F079999', currency: 'USD', dealerName: 'Meridian Engineering for General Trading & Contracting Company', customerType: 'Dealer', country: 'SG' },
  { id: 'UK-D066999', site: 'UK', dealerNum: 'D066999', currency: 'GBP', dealerName: 'Southgate Broadstock Workplace Solutions - Legacy Account Do Not Use', customerType: 'Dealer', country: 'GB' },
  { id: 'NL-F069999', site: 'NL', dealerNum: 'F069999', currency: 'EUR', dealerName: 'M R Bridge Interiors Limited (Euro Trading Account)', customerType: 'Dealer', country: 'NL' },
  { id: 'IN-F103999', site: 'IN', dealerNum: 'F103999', currency: 'INR', dealerName: 'Evergreen Harbor Business Furnishings Private Limited', customerType: 'Dealer', country: 'IN' },
];

// Real dealers switch between customer accounts here, so only customerType
// 'Dealer' is listed (not Retailer/Shop) — reuses the same mock customer
// data as Catalogue Access Admin rather than a separate hardcoded list.
const DEALER_CUSTOMERS: CustomerRecord[] = [
  ...CUSTOMERS.filter(c => c.customerType === 'Dealer'),
  ...LONG_NAME_DEALERS,
].sort((a, b) => a.dealerName.localeCompare(b.dealerName));

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
  const dealerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dealerMenuOpen) {
      dealerInputRef.current?.focus();
      dealerInputRef.current?.select();
    }
  }, [dealerMenuOpen]);

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
          {dealerMenuOpen ? (
            <div className="eos-dealer-trigger" style={{ ...styles.dealerTrigger, ...styles.dealerTriggerOpen, ...styles.dealerTriggerActive }}>
              <input
                ref={dealerInputRef}
                id="dealer-combobox"
                className="eos-dealer-input"
                style={{ ...sLargeB, ...styles.dealerInput }}
                value={dealerInput}
                onFocus={(e) => { setDealerEdited(false); e.currentTarget.select(); }}
                onChange={(e) => { setDealerInput(e.target.value); setDealerEdited(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') closeDealerMenu(null); }}
                role="combobox"
                aria-expanded={dealerMenuOpen}
                aria-autocomplete="list"
                aria-controls="dealer-listbox"
              />
              <span style={{ ...styles.dealerChevron, ...styles.dealerChevronRotated }}><IconChevronDown size={20} /></span>
            </div>
          ) : (
            <button
              className="eos-dealer-trigger eos-dealer-trigger-closed"
              style={{ ...styles.dealerTrigger, ...styles.dealerTriggerClosed }}
              onClick={() => setDealerMenuOpen(true)}
              aria-haspopup="listbox"
              aria-expanded={false}
              aria-controls="dealer-listbox"
            >
              <span style={styles.dealerClosedText}>
                <span style={styles.dealerText}>{dealerLabel(selectedDealer)}</span>
              </span>
              <span style={{ ...styles.dealerChevron, ...styles.dealerChevronClosed }}><IconChevronDown size={20} /></span>
            </button>
          )}
          {dealerMenuOpen && (
            <div style={styles.dealerMenu} role="listbox" id="dealer-listbox">
              <div style={styles.dealerList}>
                {filteredDealers.length === 0 && (
                  <div style={{ ...sBody, color: 'var(--ink-3)', padding: '10px 16px' }}>No dealers match "{dealerInput}"</div>
                )}
                {filteredDealers.map((d, i) => {
                  const isSelected = d.id === selectedDealer.id;
                  const isLast = i === filteredDealers.length - 1;
                  return (
                    <button
                      key={d.id}
                      role="option"
                      aria-selected={isSelected}
                      className={isSelected ? undefined : 'eos-dealer-item'}
                      style={{
                        ...styles.dealerMenuItem,
                        borderBottom: isLast ? 'none' : '1px solid var(--line)',
                        background: isSelected ? 'var(--ink)' : 'transparent',
                      }}
                      onClick={() => closeDealerMenu(d)}
                    >
                      <span style={{ ...styles.dealerText, ...(isSelected ? { color: '#fff' } : null) }}>{dealerLabel(d)}</span>
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
        .eos-dealer-trigger:hover { border-color: #cbd5e1; }
        .eos-dealer-item:hover { background: var(--bg-soft); }
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
  // Chrome (colors/spacing/radius/shadow/hover) matches the dev build 1:1,
  // pulled from a live DevTools inspection — see PR notes. The two-line
  // stacked closed state is our own addition on top of that chrome: the dev
  // build uses a single-line input with a placeholder, which still
  // truncates long names the same way ours used to.
  dealerTrigger: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: DEALER_TRIGGER_WIDTH,
    paddingLeft: 16,
    paddingRight: 6,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: 6,
    background: '#fff',
    transition: 'border-color .15s ease',
  },
  dealerTriggerOpen: {
    height: size.hit,
  },
  dealerTriggerClosed: {
    minHeight: size.hit,
    padding: '6px 6px 6px 16px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    font: 'inherit',
  },
  dealerTriggerActive: {
    borderColor: '#cbd5e1',
  },
  dealerInput: {
    flex: 1,
    minWidth: 0,
    maxWidth: 300,
    height: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    padding: 0,
    color: '#000',
    letterSpacing: '0.01em',
    overflow: 'hidden',
    whiteSpace: 'nowrap' as const,
    textOverflow: 'ellipsis',
  },
  dealerClosedText: {
    flex: 1,
    minWidth: 0,
  },
  // Shared with the dropdown rows below — the closed trigger shows the
  // selected dealer with exactly the same typography as its row in the
  // list (no bold name / grey code split), so it wraps instead of
  // truncating rather than looking like a different piece of UI.
  dealerText: {
    display: 'block',
    fontSize: 13,
    lineHeight: 1.2,
    color: '#334155',
    whiteSpace: 'normal' as const,
    overflowWrap: 'break-word' as const,
  },
  dealerChevron: {
    flexShrink: 0,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ink)',
    pointerEvents: 'none' as const,
    transition: 'transform .15s ease',
  },
  dealerChevronRotated: {
    transform: 'rotate(180deg)',
  },
  dealerChevronClosed: {
    alignSelf: 'flex-start' as const,
  },
  dealerMenu: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: 4,
    width: DEALER_TRIGGER_WIDTH,
    background: '#fff',
    border: '1px solid var(--line)',
    borderRadius: 6,
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
    zIndex: 60,
    overflow: 'hidden',
  },
  dealerList: {
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: 288,
    overflowY: 'auto' as const,
  },
  dealerMenuItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color .15s ease',
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
