import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { t, size } from '../tokens';
import {
  IconMenu, IconChevronDown,
  IconMail, IconHelp, IconBasket,
} from './Icons';
import { CUSTOMERS, toDealerCode, customerSearchText, wildcardIncludes } from '../data/catalogueAccess';
import type { CustomerRecord } from '../data/catalogueAccess';
import NotificationsModal from './NotificationsModal';
import FeedbackModal from './FeedbackModal';
import { NOTIFICATIONS_CHANGED_EVENT, countUnreadNotifications, setViewerSite } from '../services/notificationsStore';
import { getSelectedAccount, setSelectedAccount } from '../services/accountStore';

interface TopNavProps {
  onMenu: () => void;
  basketCount?: number;
}

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

// New sessions start on a Tsunami UK (GBP) account, so list prices open in GBP.
const DEFAULT_DEALER: CustomerRecord =
  DEALER_CUSTOMERS.find(c => c.currency === 'GBP' && c.country === 'GB' && /^tsunami/i.test(c.dealerName)) ?? DEALER_CUSTOMERS[0];

function initialDealer(): CustomerRecord {
  const saved = getSelectedAccount();
  return DEALER_CUSTOMERS.find(c => c.id === saved?.id) ?? DEFAULT_DEALER;
}

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

  const [selectedDealer, setSelectedDealer] = useState<CustomerRecord>(initialDealer);
  const [dealerInput, setDealerInput] = useState(() => dealerLabel(initialDealer()));
  const [dealerMenuOpen, setDealerMenuOpen] = useState(false);
  const [dealerEdited, setDealerEdited] = useState(false);
  const dealerMenuRef = useRef<HTMLDivElement>(null);
  const dealerInputRef = useRef<HTMLInputElement>(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const off = (e: MouseEvent) => { if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [userMenuOpen]);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(countUnreadNotifications);

  useEffect(() => {
    const refresh = () => setUnreadCount(countUnreadNotifications());
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
  }, []);

  // Notifications are targeted by dealer site, so follow the selected dealer.
  // Declared after the listener above so the event it fires updates the badge.
  useEffect(() => { setViewerSite(selectedDealer.site); }, [selectedDealer.site]);

  useEffect(() => {
    if (dealerMenuOpen) {
      dealerInputRef.current?.focus();
      dealerInputRef.current?.select();
    }
  }, [dealerMenuOpen]);

  const closeDealerMenu = (pick: CustomerRecord | null) => {
    const next = pick ?? selectedDealer;
    if (next.id !== selectedDealer.id) setSelectedAccount({ id: next.id, currency: next.currency });
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
          <span style={{ ...sLargeM, color: 'var(--menu-text)' }}>Menu</span>
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
                style={{ ...styles.dealerText, ...styles.dealerInput }}
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
        <button
          className="om-iconplus"
          style={styles.iconBtn}
          aria-label={unreadCount > 0 ? `Notifications — ${unreadCount} unread` : 'Notifications'}
          onClick={() => setNotificationsOpen(true)}
        >
          <IconMail size={20} stroke={1.6} />
          {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        <button className="om-iconplus" style={styles.iconBtn} aria-label="Help">
          <IconHelp size={20} stroke={1.6} />
        </button>
        <button
          className="eos-feedback-btn"
          style={styles.feedbackBtn}
          onClick={() => setFeedbackOpen(true)}
        >
          Feedback
        </button>
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            style={{ ...styles.avatar, border: 'none', fontFamily: 'inherit' }}
            title="Stephanie Li"
            aria-label="User menu"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen(o => !o)}
          >
            ME
          </button>
          {userMenuOpen && (
            <div role="menu" style={styles.userMenu}>
              <div style={styles.userMenuName}>Stephanie Li</div>
              <button role="menuitem" className="eos-dealer-item" style={styles.userMenuItem} onClick={() => { setUserMenuOpen(false); navigate('/preferences'); }}>
                My Preferences
              </button>
              <button role="menuitem" className="eos-dealer-item" style={{ ...styles.userMenuItem, borderBottom: 'none' }} onClick={() => { setUserMenuOpen(false); sessionStorage.removeItem('eos-user-role'); navigate('/'); }}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      <NotificationsModal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <style>{`
        .eos-feedback-btn:hover { background: var(--ink-fill) !important; color: #fff !important; }
        .eos-dealer-trigger:hover { border-color: var(--soft-border); }
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
    background: 'var(--bg)',
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
    background: 'var(--bg)',
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
    borderColor: 'var(--soft-border)',
  },
  dealerInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    padding: 0,
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
    color: 'var(--nav-text)',
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
    background: 'var(--bg)',
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
  feedbackBtn: {
    ...t.bodyB,
    height: 36,
    padding: '0 14px',
    border: '2px solid var(--strong)',
    borderRadius: 'var(--radius)',
    background: 'var(--bg)',
    color: 'var(--ink)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .15s ease, color .15s ease',
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
    border: '2px solid var(--bg)',
  },
  userMenu: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 220,
    background: 'var(--bg)',
    border: '2px solid var(--modal-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-pop)',
    zIndex: 60,
    overflow: 'hidden',
    animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
  },
  userMenuName: {
    ...t.bodyB,
    padding: '12px 16px',
    color: 'var(--ink-2)',
    borderBottom: '1px solid var(--line)',
  },
  userMenuItem: {
    ...t.body,
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    borderBottom: '1px solid var(--line)',
    background: 'transparent',
    color: 'var(--ink)',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
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
