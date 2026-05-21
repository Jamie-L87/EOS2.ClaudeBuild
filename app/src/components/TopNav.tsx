import { t, size } from '../tokens';
import {
  IconMenu, IconChevronDown,
  IconMail, IconHelp,
} from './Icons';

interface TopNavProps {
  onMenu: () => void;
}

const sLargeB = { ...t.largeB };
const sLargeM = { ...t.large };

export default function TopNav({ onMenu }: TopNavProps) {
  return (
    <header style={styles.bar}>
      <div style={styles.menuGroup}>
        <button className="om-iconplus" style={styles.menuBtn} onClick={onMenu} aria-label="Open menu">
          <span style={styles.iconBox}><IconMenu size={20} stroke={1.6} /></span>
          <span style={{ ...sLargeM, color: '#000' }}>Menu</span>
        </button>
      </div>

      <div style={styles.rightGroup}>
        <button className="om-account-btn" style={styles.accountBtn}>
          <span style={{ ...sLargeB, color: '#000' }}>Tsunami Axis Ltd: UK-DK066080-GBP</span>
          <span style={styles.iconBox}><IconChevronDown size={16} /></span>
        </button>
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
