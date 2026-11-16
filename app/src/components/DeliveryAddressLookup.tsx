import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch } from './Icons';
import { CLERKENWELL_ADDRESSES } from '../data/clerkenwellAddresses';
import type { DeliveryAddress } from '../data/clerkenwellAddresses';
import { t } from '../tokens';

const sBody  = { ...t.body };
const sBodyB = { ...t.bodyB };

/* ------------------------------------------------------------------ */
/*  GOOGLE MAPS LOADER                                                  */
/* ------------------------------------------------------------------ */
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
let _mapsPromise: Promise<void> | null = null;

function ensureMaps(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise<void>((resolve, reject) => {
    const cb = '_gmInit';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[cb] = () => { resolve(); delete (window as any)[cb]; };
    // Invalid / restricted keys fail after the script loads, via this global hook
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).gm_authFailure = () => { _mapsPromise = null; reject(new Error('Google Maps rejected the API key.')); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&callback=${cb}`;
    s.async = true;
    s.onerror = () => { _mapsPromise = null; reject(new Error('Google Maps script failed to load.')); };
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

/**
 * Delivery address lookup for the Order Detail pages. Uses Google Places autocomplete when
 * a key is configured and loads; otherwise falls back to the local Clerkenwell sample list
 * so workshops still work.
 */
export default function DeliveryAddressLookup({ onFill }: { onFill: (addr: DeliveryAddress) => void }) {
  const [failed, setFailed] = useState(!GMAPS_KEY);
  if (failed) return <LocalAddressLookup onFill={onFill} />;
  return <GoogleAddressLookup onFill={onFill} onFail={() => setFailed(true)} />;
}

function GoogleAddressLookup({ onFill, onFail }: { onFill: (addr: DeliveryAddress) => void; onFail: () => void }) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const onFillRef = useRef(onFill);
  useEffect(() => { onFillRef.current = onFill; }, [onFill]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureMaps().then(() => setReady(true)).catch((e: Error) => {
      console.error('[Maps]', e.message, '- falling back to local addresses');
      onFail();
    });
  }, [onFail]);

  useEffect(() => {
    if (!ready || !inputRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    const ac = new g.maps.places.Autocomplete(inputRef.current, { fields: ['address_components', 'name'] });
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const get = (type: string): string => (place.address_components as any[])?.find((c) => c.types.includes(type))?.long_name ?? '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countryCode = (place.address_components as any[])?.find((c) => c.types.includes('country'))?.short_name ?? '';
      onFillRef.current({
        companyName: place.name || '',
        line1:       [get('street_number'), get('route')].filter(Boolean).join(' '),
        line2:       get('subpremise') || get('premise'),
        line3:       '',
        line4:       '',
        city:        get('postal_town') || get('locality') || get('administrative_area_level_2'),
        county:      get('administrative_area_level_2') || get('administrative_area_level_1'),
        postcode:    get('postal_code'),
        countryCode,
      });
      if (inputRef.current) inputRef.current.value = '';
    });
    return () => { g?.maps?.event?.removeListener(listener); };
  }, [ready]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Search Address</div>
      <div className="om-search-wrap" style={{ display: 'flex', alignItems: 'center', height: 44, border: '2px solid var(--strong)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}>
        <span style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-3)' }}>
          <IconSearch size={16} stroke={1.7} />
        </span>
        <input
          ref={inputRef}
          id="delivery-address-search"
          name="delivery-address-search"
          type="text"
          autoComplete="off"
          placeholder={ready ? 'Start typing an address…' : 'Loading…'}
          disabled={!ready}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: 'var(--ink)', paddingRight: 12, fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
}

/** Local fallback: choose from the stored Clerkenwell sample addresses (used in workshops). */
function LocalAddressLookup({ onFill }: { onFill: (addr: DeliveryAddress) => void }) {
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
