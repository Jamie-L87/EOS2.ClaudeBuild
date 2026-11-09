import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch } from './Icons';
import { CLERKENWELL_ADDRESSES } from '../data/clerkenwellAddresses';
import type { DeliveryAddress } from '../data/clerkenwellAddresses';
import { t } from '../tokens';

const sBody  = { ...t.body };
const sBodyB = { ...t.bodyB };

/**
 * Delivery address picker for the Order Detail pages. Choose from the locally stored
 * Clerkenwell sample addresses (used in workshops); picking one calls onFill with the
 * full address so the page can populate its fields.
 */
export default function DeliveryAddressLookup({ onFill }: { onFill: (addr: DeliveryAddress) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CLERKENWELL_ADDRESSES;
    return CLERKENWELL_ADDRESSES.filter((a) =>
      `${a.companyName} ${a.line1} ${a.line2} ${a.postcode}`.toLowerCase().includes(q));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function choose(addr: DeliveryAddress) {
    onFill(addr);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); choose(matches[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Search Address</div>
      <div className="om-search-wrap" style={{ display: 'flex', alignItems: 'center', height: 44, border: '2px solid var(--strong)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}>
        <span style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-3)' }}>
          <IconSearch size={16} stroke={1.7} />
        </span>
        <input
          id="delivery-address-search"
          name="delivery-address-search"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="delivery-address-list"
          autoComplete="off"
          placeholder="Select or search an address…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: 'var(--ink)', paddingRight: 12, fontFamily: 'inherit' }}
        />
      </div>

      {open && (
        <ul
          id="delivery-address-list"
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30,
            maxHeight: 320, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none',
            background: 'var(--bg)', border: '2px solid var(--strong)', borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          {matches.length === 0 && (
            <li style={{ ...sBody, padding: '12px 14px', color: 'var(--ink-2)' }}>No matching addresses</li>
          )}
          {matches.map((a, i) => (
            <li
              key={a.companyName}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(a); }}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                background: i === active ? 'var(--bg-soft)' : 'transparent',
                borderBottom: i === matches.length - 1 ? 'none' : '1px solid var(--line)',
              }}
            >
              <div style={{ ...sBodyB, color: 'var(--ink)' }}>{a.companyName}</div>
              <div style={{ ...sBody, fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
                {[a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(', ')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
