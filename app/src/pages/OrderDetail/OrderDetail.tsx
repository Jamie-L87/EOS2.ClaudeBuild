import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import {
  IconChevronRight, IconSearch, IconClose, IconPlus, IconMinus,
  IconCopy, IconTrash, IconEdit, IconChevronDown,
} from '../../components/Icons';
import { validateItem } from '../../services/validation';
import type { SuperChild } from '../../data/superProducts';
import { loadDetail, upsert } from '../../services/orderStore';
import type { StoredOrder } from '../../services/orderStore';
import { CONTRACTS, PRODUCT_LINE_PLCS, getContractDiscount } from '../../data/contracts';
import { t, size } from '../../tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Currency = 'GBP' | 'EUR' | 'USD';

interface OrderLine {
  id: string;
  articleCode: string;
  featureString: string;
  productName: string | null;
  productLine: string | null;
  qty: number;
  listPrice: number;
  discount: number;
  currency: string;
  validationStatus: 'passed' | 'failed' | 'pending';
  validationError?: string | null;
  isSuper?: boolean;
  superChildren?: SuperChild[] | null;
  lineStatus?: string;
  leadTime?: { min: number; max: number; label: string; days: number };
  _explodedSuper?: Record<string, unknown>;
}

interface OrderData {
  orderNo: string;
  status: string;
  currency: Currency;
  orderPlaced: string;
  reference: string | null;
  customer: string | null;
  purchaseOrder: string | null;
  lines: OrderLine[];
  orderType?: string | null;
  salesPerson?: string | null;
  hmSalesPerson?: string | null;
  contract?: string | null;
  companyName?: string | null;
  deliveryLine1?: string | null;
  deliveryLine2?: string | null;
  deliveryLine3?: string | null;
  deliveryLine4?: string | null;
  deliveryCity?: string | null;
  deliveryCounty?: string | null;
  deliveryPostcode?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactTelephone?: string | null;
  pricingDate?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Style shorthands                                                    */
/* ------------------------------------------------------------------ */
const sBody  = { ...t.body  };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

const CONTRACT_OPTIONS = CONTRACTS.map(c => c.name);
const HM_SALES_PERSONS = ['Alex Thompson', 'Sarah Williams', 'James Mitchell', 'Emma Clarke', 'David Hughes'];

const CCY: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' };
function fmt(n: number, c = 'EUR') {
  return (CCY[c] ?? c + ' ') + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------------ */
/*  Lead time helpers                                                   */
/* ------------------------------------------------------------------ */
const LEAD_TIMES: Record<string, { min: number; max: number }> = {
  AERON: { min: 30, max: 40 }, COSM: { min: 20, max: 30 }, SAYL: { min: 15, max: 25 },
  EMBODY: { min: 40, max: 50 }, LINO: { min: 20, max: 30 }, ZEPH: { min: 25, max: 35 },
  CAPER: { min: 20, max: 30 }, PRONTA: { min: 10, max: 20 }, CIVIC_TABLES: { min: 30, max: 40 },
  DEFAULT: { min: 20, max: 40 },
};

function mockLeadTime(productLine: string | null) {
  const spec = (productLine && LEAD_TIMES[productLine]) || LEAD_TIMES.DEFAULT;
  return { min: spec.min, max: spec.max, label: `${spec.min}–${spec.max} days`, days: spec.max };
}

function computeDeliveryDate(fromDate: string, lead: { days: number }) {
  const d = new Date(fromDate);
  if (isNaN(d.getTime())) return '—';
  let remaining = lead.days || 30;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  BREADCRUMB                                                          */
/* ------------------------------------------------------------------ */
function Breadcrumb({ orderNo }: { orderNo: string }) {
  const navigate = useNavigate();
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0 16px' }}>
      <button onClick={() => navigate('/orders')} style={{ ...sBody, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Active Orders</button>
      <IconChevronRight size={14} stroke={2} />
      <span style={{ ...sBodyB, color: 'var(--ink)' }}>Order: {orderNo}</span>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  STATUS BADGE                                                        */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    Draft:     { bg: 'var(--line)',       fg: 'var(--ink)' },
    Confirmed: { bg: 'var(--green-soft)', fg: 'var(--green)' },
    Submitted: { bg: 'var(--blue-soft)',  fg: 'var(--blue)' },
    Cancelled: { bg: 'var(--red-soft)',   fg: 'var(--red)' },
  };
  const c = map[status] ?? { bg: 'var(--line)', fg: 'var(--ink-2)' };
  return (
    <span style={{ ...sBodyB, color: c.fg, background: c.bg, padding: '4px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: c.fg }} />
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  HEADER FIELD                                                        */
/* ------------------------------------------------------------------ */
function HeaderField({ label, value, placeholder, readonly, badge, required, onChange }: {
  label: string; value: string | null; placeholder?: string; readonly?: boolean;
  badge?: boolean; required?: boolean; onChange?: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);

  const display   = value || placeholder || '—';
  const isMissing = !value && !readonly;
  const showRequired = required && !value && !readonly;

  if (readonly) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{label}</div>
        {badge ? <StatusBadge status={value ?? ''} /> : <div style={{ ...sBodyB, color: 'var(--ink)' }}>{display}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{label}</div>
        {showRequired && <span style={{ color: 'var(--red)', fontSize: 13, lineHeight: 1 }} aria-hidden="true">*</span>}
      </div>
      {editing ? (
        <input
          autoFocus value={v}
          id={`hf-${label.toLowerCase().replace(/\s+/g, '-')}`}
          name={`hf-${label.toLowerCase().replace(/\s+/g, '-')}`}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => { onChange?.(v.trim() || null); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { setV(value ?? ''); setEditing(false); }
          }}
          style={{ ...sBodyB, color: 'var(--ink)', border: `2px solid ${showRequired ? 'var(--red)' : 'var(--brand)'}`, borderRadius: 4, padding: '6px 8px', margin: '-6px -8px', outline: 'none', background: '#fff', maxWidth: 240, fontFamily: 'inherit' }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="om-header-edit"
          style={{ ...sBodyB, color: showRequired ? 'var(--red)' : isMissing ? 'var(--ink-3)' : 'var(--ink)', border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <span>{showRequired ? 'Required' : display}</span>
          <IconEdit size={12} stroke={1.7} style={{ opacity: 0.5 }} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HEADER SELECT FIELD                                                 */
/* ------------------------------------------------------------------ */
function HeaderSelectField({ label, value, options, onChange }: {
  label: string; value: string | null; options: string[];
  onChange?: (v: string | null) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{label}</div>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <select
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value || null)}
          className="om-header-select"
          style={{ ...sBodyB, color: value ? 'var(--ink)' : 'var(--ink-3)', border: 'none', background: 'transparent', padding: 0, paddingRight: 20, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', fontFamily: 'inherit', outline: 'none' }}
        >
          <option value="">Not set</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 0, pointerEvents: 'none', color: 'var(--ink-3)', display: 'flex', alignItems: 'center' }}>
          <IconChevronDown size={12} stroke={2} />
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HEADER DATE FIELD                                                   */
/* ------------------------------------------------------------------ */
function HeaderDateField({ label, value, onChange }: {
  label: string; value: string | null; onChange?: (v: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>{label}</div>
      {editing ? (
        <input
          type="date"
          autoFocus
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value || null)}
          onBlur={() => setEditing(false)}
          style={{ ...sBodyB, color: 'var(--ink)', border: '2px solid var(--brand)', borderRadius: 4, padding: '6px 8px', margin: '-6px -8px', outline: 'none', background: '#fff', fontFamily: 'inherit' }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="om-header-edit"
          style={{ ...sBodyB, color: value ? 'var(--ink)' : 'var(--ink-3)', border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
          <span>{display}</span>
          <IconEdit size={12} stroke={1.7} style={{ opacity: 0.5 }} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GOOGLE MAPS LOADER                                                  */
/* ------------------------------------------------------------------ */
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
let _mapsPromise: Promise<void> | null = null;

function ensureMaps(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise<void>((resolve, reject) => {
    const cb = '_gmInit';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any)[cb] = () => { resolve(); delete (window as any)[cb]; };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&callback=${cb}`;
    s.async = true;
    s.onerror = () => { _mapsPromise = null; reject(new Error('Google Maps script failed to load — check the API key and browser console.')); };
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

/* ------------------------------------------------------------------ */
/*  DELIVERY ADDRESS LOOKUP                                             */
/* ------------------------------------------------------------------ */
interface DeliveryAddress { companyName: string; line1: string; line2: string; line3: string; line4: string; city: string; county: string; postcode: string; }

function DeliveryAddressLookup({ onFill }: { onFill: (addr: DeliveryAddress) => void }) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const onFillRef = useRef(onFill);
  useEffect(() => { onFillRef.current = onFill; }, [onFill]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    ensureMaps().then(() => setReady(true)).catch((e: Error) => {
      console.error('[Maps]', e.message);
      setLoadError(e.message);
    });
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    const ac = new g.maps.places.Autocomplete(inputRef.current, {
      fields: ['address_components', 'name'],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const get = (type: string): string => (place.address_components as any[])?.find((c) => c.types.includes(type))?.long_name ?? '';
      const streetNum = get('street_number');
      const route     = get('route');
      onFillRef.current({
        companyName: place.name || '',
        line1:       [streetNum, route].filter(Boolean).join(' '),
        line2:       get('subpremise') || get('premise'),
        line3:       '',
        line4:       '',
        city:        get('postal_town') || get('locality') || get('administrative_area_level_2'),
        county:      get('administrative_area_level_2') || get('administrative_area_level_1'),
        postcode:    get('postal_code'),
      });
      if (inputRef.current) inputRef.current.value = '';
    });
    return () => { g?.maps?.event?.removeListener(listener); };
  }, [ready]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Search Address</div>
      <div className="om-search-wrap" style={{ display: 'flex', alignItems: 'center', height: 44, border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: '#fff' }}>
        <span style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-3)' }}>
          <IconSearch size={16} stroke={1.7} />
        </span>
        <input
          ref={inputRef}
          id="delivery-address-search"
          name="delivery-address-search"
          type="text"
          autoComplete="off"
          placeholder={loadError ? 'Maps unavailable' : (ready ? 'Start typing an address…' : 'Loading…')}
          disabled={!ready || !!loadError}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: loadError ? 'var(--red)' : 'var(--ink)', paddingRight: 12, fontFamily: 'inherit' }}
        />
      </div>
      {loadError && (
        <div style={{ ...sBody, fontSize: 12, color: 'var(--red)' }}>
          Could not load Google Maps — check the API key is valid and the Maps JavaScript API + Places API are enabled in Google Cloud Console.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ORDER HEADER                                                        */
/* ------------------------------------------------------------------ */
function OrderHeader({ order, total, onUpdateMeta }: {
  order: OrderData; total: number; onUpdateMeta: (k: keyof OrderData, v: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: expanded ? 24 : 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, padding: '20px 0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px 32px' }}>
          <HeaderField label="Reference"      value={order.reference}     placeholder="Required" required onChange={(v) => onUpdateMeta('reference', v)} />
          <HeaderField label="Purchase Order" value={order.purchaseOrder} placeholder="Not set"  onChange={(v) => onUpdateMeta('purchaseOrder', v)} />
          <HeaderField label="Order Placed"    value={order.orderPlaced}  readonly />
          <HeaderField label="HM Order Number" value={null}               readonly />
          <HeaderField label="Status"          value={order.status}       readonly badge />
        </div>
        <div style={{ padding: '16px 24px', borderLeft: '1px solid var(--line)', minWidth: 240, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ ...sBody, color: 'var(--ink-2)', marginBottom: 4 }}>Total Order Value</div>
          <div style={{ fontWeight: 700, fontSize: 32, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{fmt(total, order.currency)}</div>
          <div style={{ ...sBody, color: 'var(--ink-3)', marginTop: 6 }}>
            {order.lines.length} line{order.lines.length !== 1 ? 's' : ''} · {order.lines.reduce((s, l) => s + l.qty, 0)} unit{order.lines.reduce((s, l) => s + l.qty, 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        className="om-expand-toggle"
        style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', border: 'none', borderTop: '1px solid var(--line)', background: 'var(--bg-soft)', cursor: 'pointer', padding: '0 4px', height: 44, ...sLargeB, color: 'var(--brand)', fontFamily: 'inherit', transition: 'background .15s ease' }}
      >
        <span>Order Details</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', transition: 'transform .2s ease', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <IconChevronDown size={16} stroke={2} />
        </span>
      </button>

      {expanded && (
        <div style={{ paddingTop: 20, animation: 'slideDown .2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px 64px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <DeliveryAddressLookup onFill={(addr) => {
                onUpdateMeta('companyName',      addr.companyName || null);
                onUpdateMeta('deliveryLine1',    addr.line1       || null);
                onUpdateMeta('deliveryLine2',    addr.line2       || null);
                onUpdateMeta('deliveryLine3',    addr.line3       || null);
                onUpdateMeta('deliveryLine4',    addr.line4       || null);
                onUpdateMeta('deliveryCity',     addr.city        || null);
                onUpdateMeta('deliveryCounty',   addr.county      || null);
                onUpdateMeta('deliveryPostcode', addr.postcode    || null);
              }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Delivery Address</div>
              <HeaderField label="Company Name"   value={order.companyName ?? null}      placeholder="Not set" onChange={(v) => onUpdateMeta('companyName', v)} />
              <HeaderField label="Address Line 1" value={order.deliveryLine1 ?? null}    placeholder="Not set" onChange={(v) => onUpdateMeta('deliveryLine1', v)} />
              <HeaderField label="Address Line 2" value={order.deliveryLine2 ?? null}    placeholder="Not set" onChange={(v) => onUpdateMeta('deliveryLine2', v)} />
              <HeaderField label="Address Line 3" value={order.deliveryLine3 ?? null}    placeholder="Not set" onChange={(v) => onUpdateMeta('deliveryLine3', v)} />
              <HeaderField label="Address Line 4" value={order.deliveryLine4 ?? null}    placeholder="Not set" onChange={(v) => onUpdateMeta('deliveryLine4', v)} />
              <HeaderField label="City"           value={order.deliveryCity ?? null}     placeholder="Not set" onChange={(v) => onUpdateMeta('deliveryCity', v)} />
              <HeaderField label="County"         value={order.deliveryCounty ?? null}   placeholder="Not set" onChange={(v) => onUpdateMeta('deliveryCounty', v)} />
              <HeaderField label="Postcode"       value={order.deliveryPostcode ?? null} placeholder="Not set" onChange={(v) => onUpdateMeta('deliveryPostcode', v)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Contact</div>
              <HeaderField label="Contact Name"      value={order.contactName ?? null}      placeholder="Not set" onChange={(v) => onUpdateMeta('contactName', v)} />
              <HeaderField label="Contact Email"     value={order.contactEmail ?? null}     placeholder="Not set" onChange={(v) => onUpdateMeta('contactEmail', v)} />
              <HeaderField label="Contact Telephone" value={order.contactTelephone ?? null} placeholder="Not set" onChange={(v) => onUpdateMeta('contactTelephone', v)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 }}>Order Details</div>
              <HeaderField       label="Purchase Order"  value={order.purchaseOrder ?? null} placeholder="Not set" onChange={(v) => onUpdateMeta('purchaseOrder', v)} />
              <HeaderSelectField label="Contract"        value={order.contract ?? null}      options={CONTRACT_OPTIONS} onChange={(v) => onUpdateMeta('contract', v)} />
              <HeaderSelectField label="HM Sales Person" value={order.hmSalesPerson ?? null} options={HM_SALES_PERSONS} onChange={(v) => onUpdateMeta('hmSalesPerson', v)} />
              <HeaderField       label="Sales Person"    value={order.salesPerson ?? null}   placeholder="Not set" onChange={(v) => onUpdateMeta('salesPerson', v)} />
              <HeaderDateField   label="Pricing Date"    value={order.pricingDate ?? null}   onChange={(v) => onUpdateMeta('pricingDate', v)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB STRIP                                                           */
/* ------------------------------------------------------------------ */
type DetailTab = 'lines' | 'documents' | 'history';

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'lines',     label: 'Order Lines' },
  { id: 'documents', label: 'Documents' },
  { id: 'history',   label: 'History' },
];

function TabStrip({ active, onChange }: { active: DetailTab; onChange: (t: DetailTab) => void }) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 24, marginTop: 8 }}>
      {DETAIL_TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} className="om-tab-strip" data-active={isActive}
            style={{ ...sLargeB, border: 'none', background: 'transparent', cursor: 'pointer', padding: '14px 24px', color: isActive ? 'var(--brand)' : 'var(--ink-2)', borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent', marginBottom: -1, transition: 'color .15s ease, border-color .15s ease', fontFamily: 'inherit' }}>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COMING SOON PLACEHOLDER                                             */
/* ------------------------------------------------------------------ */
function ComingSoon({ tab }: { tab: string }) {
  const titles: Record<string, string> = { documents: 'Documents', history: 'History' };
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center', border: '1px dashed var(--line)', borderRadius: 'var(--radius)', background: 'var(--bg-soft)' }}>
      <div style={{ ...sLargeB, color: 'var(--ink)', marginBottom: 6 }}>{titles[tab] ?? tab} — coming soon</div>
      <div style={{ ...sBody, color: 'var(--ink-2)' }}>Switch to <strong>Order Lines</strong> to manage line items.</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LINE STATUS PILL                                                    */
/* ------------------------------------------------------------------ */
function LineStatusPill({ status }: { status: string }) {
  const map: Record<string, { fg: string; dot: string; label: string }> = {
    'confirmed': { fg: 'var(--green)', dot: 'var(--green)', label: 'Confirmed' },
    'pending':   { fg: 'var(--amber)', dot: 'var(--amber)', label: 'Pending'   },
    'backorder': { fg: 'var(--blue)',  dot: 'var(--blue)',  label: 'Backorder' },
    'not-found': { fg: 'var(--red)',   dot: 'var(--red)',   label: 'Not found' },
  };
  const c = map[status] ?? map['pending'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: c.dot, flexShrink: 0 }} />
      <span style={{ ...sBody, color: c.fg }}>{c.label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SUPER BADGE                                                         */
/* ------------------------------------------------------------------ */
function SuperBadge({ count }: { count: number }) {
  return (
    <span style={{ fontWeight: 700, letterSpacing: 0.4, fontSize: 10.5, background: 'var(--blue)', color: '#fff', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', flexShrink: 0 }}>
      Super · {count} parts
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  DRAG HANDLE                                                         */
/* ------------------------------------------------------------------ */
function DragHandle() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
      {[5, 11].flatMap(x => [4, 10, 16].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  QTY STEPPER                                                         */
/* ------------------------------------------------------------------ */
function QtyStepper({ qty, onChange }: { qty: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden', height: 32 }}>
      <button onClick={() => onChange(qty - 1)} disabled={qty <= 1}
        style={{ width: 28, height: 30, border: 'none', background: '#fff', color: 'var(--ink)', cursor: 'pointer', ...sLargeB, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
      <input value={qty} type="number" min={1}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
        style={{ width: 40, height: 30, border: 'none', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', textAlign: 'center', outline: 'none', ...sBodyB, color: 'var(--ink)', background: '#fff', fontFamily: 'inherit' }}
        aria-label="Quantity" />
      <button onClick={() => onChange(qty + 1)}
        style={{ width: 28, height: 30, border: 'none', background: '#fff', color: 'var(--ink)', cursor: 'pointer', ...sLargeB, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
    </div>
  );
}



/* ------------------------------------------------------------------ */
/*  FINISH SELECT (for editable super children)                         */
/* ------------------------------------------------------------------ */
function FinishSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--line)', borderRadius: 4, padding: '0 8px 0 10px', height: 30, background: '#fff', maxWidth: '100%' }}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        style={{ border: 'none', outline: 'none', background: 'transparent', ...sBodyB, fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 12, color: 'var(--ink)', appearance: 'none' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <IconChevronDown size={12} stroke={2} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SHIPPED INPUT                                                       */
/* ------------------------------------------------------------------ */
function ShippedInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <input type="number" min={0} max={max} value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(0, parseInt(e.target.value, 10) || 0)))}
      style={{ width: 60, height: 30, border: '1px solid var(--line)', borderRadius: 4, textAlign: 'center', outline: 'none', ...sBodyB, color: 'var(--ink)', background: '#fff', fontFamily: 'inherit' }}
      aria-label="Quantity shipped" />
  );
}

/* ------------------------------------------------------------------ */
/*  SUPER CHILDREN EXPANSION                                            */
/* ------------------------------------------------------------------ */
const sCols = 'minmax(140px, 1fr) 100px minmax(180px, 1.6fr) 110px 90px 90px 110px';

function SuperChildren({ parent, currency, onUpdateChild }: {
  parent: OrderLine; currency: string; onUpdateChild: (childId: string, patch: Partial<SuperChild>) => void;
}) {
  const children = parent.superChildren ?? [];
  const parentQty = parent.qty || 1;
  return (
    <div style={{ background: 'var(--blue-soft)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div style={{ ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, padding: '12px 16px 6px 60px' }}>
        Bundle Contents · {children.length} parts
      </div>
      <div style={{ margin: '0 16px 16px 60px', background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: sCols, background: 'var(--bg-soft)', minHeight: 38, alignItems: 'stretch' }}>
          {['Component Item', 'Feature String', 'Short Description', 'Product Code', 'Quantity', 'Qty Shipped', 'Total Price'].map(h => (
            <div key={h} style={{ padding: '0 14px', display: 'flex', alignItems: 'center', color: 'var(--ink-2)', ...sBodyB, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</div>
          ))}
        </div>
        {children.map((c) => {
          const effQty = (c.qty || 1) * parentQty;
          const total  = (c.listPrice || 0) * effQty;
          const ccy    = c.currency || parent.currency || currency;
          return (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: sCols, alignItems: 'center', minHeight: 48, borderTop: '1px solid var(--line)' }}>
              <div style={{ padding: '8px 14px' }}><span style={{ ...sBodyB, color: 'var(--ink)' }}>{c.articleCode}</span></div>
              <div style={{ padding: '8px 14px' }}>
                {c.editableFinish && Array.isArray(c.finishOptions) ? (
                  <FinishSelect value={c.featureString ?? ''} options={c.finishOptions!} onChange={(v) => onUpdateChild(c.id!, { featureString: v })} />
                ) : (
                  <span style={{ ...sBody, color: 'var(--ink-2)', fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', fontSize: 12 }}>{c.featureString || '—'}</span>
                )}
              </div>
              <div style={{ padding: '8px 14px' }}><span style={{ ...sBody, color: 'var(--ink)' }}>{c.shortDescription}</span></div>
              <div style={{ padding: '8px 14px' }}><span style={{ ...sBody, color: 'var(--ink-2)' }}>{c.productCode}</span></div>
              <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{effQty}</span>
                {parentQty > 1 && <span style={{ ...sBody, color: 'var(--ink-3)', fontSize: 11 }}>({c.qty}×{parentQty})</span>}
              </div>
              <div style={{ padding: '8px 14px' }}>
                <ShippedInput value={c.qtyShipped ?? 0} max={effQty} onChange={(v) => onUpdateChild(c.id!, { qtyShipped: v })} />
              </div>
              <div style={{ padding: '8px 14px', textAlign: 'right' }}>
                <span style={{ ...sBody, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total, ccy)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ICON EXPLODE                                                        */
/* ------------------------------------------------------------------ */
function IconExplode({ size: s = 18 }: { size?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  LINE ROW                                                            */
/* ------------------------------------------------------------------ */
const LINE_COLS = '40px 48px minmax(160px, 1.2fr) minmax(140px, 1.4fr) 80px 100px 80px 110px 120px 100px 120px 110px 76px';

function LineRow({ line, idx, currency, orderPlaced, isDragging, isOver, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onUpdate, onDuplicate, onDelete, onExplode, isSuper, expanded, onToggleExpand }: {
  line: OrderLine; idx: number; currency: string; orderPlaced: string;
  isDragging: boolean; isOver: boolean;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void; onDrop: (e: React.DragEvent) => void; onDragEnd: () => void;
  onUpdate: (patch: Partial<OrderLine>) => void;
  onDuplicate: () => void; onDelete: () => void; onExplode: () => void;
  isSuper: boolean; expanded: boolean; onToggleExpand: () => void;
}) {
  const [editingCode, setEditingCode] = useState(false);
  const [codeVal, setCodeVal] = useState('');
  const combined = line.articleCode + (line.featureString ? ' ' + line.featureString : '');

  const startEdit = () => { setCodeVal(combined); setEditingCode(true); };
  const saveEdit  = () => {
    const v  = codeVal.trim();
    if (v && v !== combined) {
      const sp = v.indexOf(' ');
      const articleCode   = sp > 0 ? v.slice(0, sp) : v;
      const featureString = sp > 0 ? v.slice(sp + 1) : '';
      const result = validateItem(articleCode, featureString);
      onUpdate({
        articleCode, featureString,
        productName: result.valid ? result.productName : null,
        productLine: result.valid ? result.productLine : null,
        listPrice:   result.valid ? (result.price ?? 0) : 0,
        currency:    result.currency ?? currency,
        validationStatus: result.valid ? 'passed' : 'failed',
        validationError:  result.error,
        isSuper:        !!result.isSuper,
        superChildren:  result.superChildren ?? null,
      });
    }
    setEditingCode(false);
  };

  const effectiveListPrice = isSuper && Array.isArray(line.superChildren)
    ? line.superChildren.reduce((s, c) => s + (c.listPrice || 0) * (c.qty || 1), 0)
    : line.listPrice;
  const unitBuying  = effectiveListPrice * (1 - (line.discount || 0) / 100);
  const totalBuying = unitBuying * line.qty;
  const ccy         = line.currency || currency;
  const isInvalid   = line.validationStatus === 'failed';
  const lead        = line.leadTime ?? mockLeadTime(line.productLine);
  const delivDate   = computeDeliveryDate(orderPlaced, lead);
  const actBtn      = { width: 30, height: 30, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s ease, color .12s ease' };

  return (
    <div
      className="om-line-row"
      data-dragging={isDragging}
      data-over={isOver}
      style={{
        display: 'grid', gridTemplateColumns: LINE_COLS,
        alignItems: 'center', minHeight: 64,
        borderTop: '1px solid var(--line)',
        background: isOver ? 'var(--brand-soft)' : (isInvalid ? 'var(--red-soft)' : (isSuper && expanded ? 'var(--blue-soft)' : '#fff')),
        opacity: isDragging ? 0.4 : 1,
        transition: 'background .12s ease, opacity .12s ease',
      }}
      draggable={!editingCode}
      onDragStart={!editingCode ? onDragStart : undefined}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--ink-3)', cursor: editingCode ? 'default' : 'grab' }}>
        <DragHandle />
      </div>

      <div style={{ padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {isSuper && (
          <button onClick={onToggleExpand} aria-label={expanded ? 'Collapse parts' : 'Expand parts'}
            style={{ width: 20, height: 20, borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {expanded ? <IconMinus size={14} stroke={2.4} /> : <IconPlus size={14} stroke={2.4} />}
          </button>
        )}
        <span style={{ ...sBody, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>
        {isInvalid && <span style={{ width: 14, height: 14, borderRadius: 7, background: 'var(--red)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IconClose size={9} stroke={3} /></span>}
      </div>

      <div style={{ padding: '10px 16px', minWidth: 0 }}>
        {editingCode ? (
          <input autoFocus value={codeVal}
            onChange={(e) => setCodeVal(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCode(false); }}
            style={{ width: '100%', height: 36, border: '2px solid var(--brand)', borderRadius: 4, padding: '0 10px', ...sBody, color: 'var(--ink)', outline: 'none', fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}
          />
        ) : (
          <button onClick={startEdit} className="om-code-edit"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, width: '100%', border: 'none', background: 'transparent', cursor: 'text', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>
            {isSuper && line.superChildren && <SuperBadge count={line.superChildren.length} />}
            <span style={{ ...sBodyB, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{line.articleCode}</span>
            {line.featureString && (
              <span style={{ ...sBody, color: 'var(--ink-2)', fontSize: 12, fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{line.featureString}</span>
            )}
          </button>
        )}
      </div>

      <div style={{ padding: '0 16px', minWidth: 0 }}>
        {line.productName
          ? <span style={{ ...sBody, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{line.productName}</span>
          : <span style={{ ...sBody, color: isInvalid ? 'var(--red)' : 'var(--ink-3)' }}>{isInvalid ? (line.validationError ?? 'Not found') : '—'}</span>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <QtyStepper qty={line.qty} onChange={(q) => onUpdate({ qty: Math.max(1, q) })} />
      </div>

      <div style={{ padding: '0 12px', textAlign: 'right' }}>
        <span style={{ ...sBody, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {effectiveListPrice > 0 ? fmt(effectiveListPrice, ccy) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </span>
      </div>

      <div style={{ padding: '0 12px', textAlign: 'right' }}>
        <span style={{ ...sBody, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {line.discount > 0 ? `${line.discount}%` : '—'}
        </span>
      </div>

      <div style={{ padding: '0 12px', textAlign: 'right' }}>
        <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {effectiveListPrice > 0 ? fmt(unitBuying, ccy) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </span>
      </div>

      <div style={{ padding: '0 12px', textAlign: 'right' }}>
        <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {effectiveListPrice > 0 ? fmt(totalBuying, ccy) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </span>
      </div>

      <div style={{ padding: '0 8px', textAlign: 'center' }}>
        <span style={{ ...sBody, color: 'var(--ink-2)' }}>{lead.label}</span>
      </div>

      <div style={{ padding: '0 12px' }}>
        <span style={{ ...sBody, color: 'var(--ink)' }}>{delivDate}</span>
      </div>

      <div style={{ padding: '0 12px' }}>
        <LineStatusPill status={isInvalid ? 'not-found' : (line.lineStatus ?? 'confirmed')} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
        {isSuper && (
          <button onClick={onExplode} aria-label="Explode" title="Explode into individual lines" className="om-row-action" style={actBtn}>
            <IconExplode size={15} />
          </button>
        )}
        <button onClick={onDuplicate} aria-label="Duplicate" className="om-row-action" style={actBtn}><IconCopy  size={15} stroke={1.7} /></button>
        <button onClick={onDelete}    aria-label="Delete"    className="om-row-action" style={actBtn}><IconTrash size={15} stroke={1.7} /></button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LINE BLOCK (wraps row + super children)                             */
/* ------------------------------------------------------------------ */
function LineBlock(props: {
  line: OrderLine; idx: number; currency: string; orderPlaced: string;
  isDragging: boolean; isOver: boolean;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void; onDrop: (e: React.DragEvent) => void; onDragEnd: () => void;
  onUpdate: (patch: Partial<OrderLine>) => void;
  onUpdateChild: (childId: string, patch: Partial<SuperChild>) => void;
  onDuplicate: () => void; onDelete: () => void; onExplode: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSuper = !!props.line.isSuper && Array.isArray(props.line.superChildren);
  return (
    <>
      <LineRow {...props} expanded={expanded} onToggleExpand={() => setExpanded(e => !e)} isSuper={isSuper} />
      {isSuper && expanded && (
        <SuperChildren parent={props.line} currency={props.currency} onUpdateChild={props.onUpdateChild} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ORDER LINES TABLE                                                   */
/* ------------------------------------------------------------------ */
function OrderLinesTable({ lines, currency, orderPlaced, query, setQuery, onUpdateLine, onUpdateChild, onDuplicate, onDelete, onExplode, onReorder, onAddLine }: {
  lines: OrderLine[]; currency: string; orderPlaced: string;
  query: string; setQuery: (v: string) => void;
  onUpdateLine: (id: string, patch: Partial<OrderLine>) => void;
  onUpdateChild: (lineId: string, childId: string, patch: Partial<SuperChild>) => void;
  onDuplicate: (id: string) => void; onDelete: (id: string) => void; onExplode: (id: string) => void;
  onReorder: (from: number, to: number) => void; onAddLine: () => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return lines;
    const q = query.toLowerCase();
    return lines.filter(l => [l.articleCode, l.featureString, l.productName].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [lines, query]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="om-search-wrap" style={{ display: 'flex', alignItems: 'center', width: 380, height: 50, border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: '#fff', transition: 'box-shadow .15s ease' }}>
          <span style={{ width: size.hit, height: size.hit, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSearch size={18} stroke={1.7} />
          </span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code, feature or product"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', ...sBody, color: 'var(--ink)', paddingRight: 12, fontFamily: 'inherit' }} />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search"
              style={{ width: 36, height: 36, marginRight: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 18 }}>
              <IconClose size={14} />
            </button>
          )}
        </div>
        <button onClick={onAddLine} className="om-primary-btn"
          style={{ ...sLargeB, height: 50, padding: '0 20px', border: '2px solid var(--brand)', borderRadius: 'var(--radius)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'background .15s ease', fontFamily: 'inherit' }}>
          <IconPlus size={18} stroke={2} />
          <span style={{ whiteSpace: 'nowrap' }}>Add Line</span>
        </button>
      </div>

      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: LINE_COLS, background: 'var(--ink)', minHeight: size.rowH, alignItems: 'stretch' }}>
          {[{ label: '', w: '40px' }, { label: '#', w: '48px' },
            { label: 'Article Code', w: '' }, { label: 'Short Description', w: '' },
            { label: 'Qty', align: 'center' }, { label: 'List Price', align: 'right' },
            { label: 'Discount', align: 'right' }, { label: 'Unit Buying', align: 'right' },
            { label: 'Total Buying', align: 'right' }, { label: 'Lead Time', align: 'center' },
            { label: 'Delivery Date', w: '' }, { label: 'Status', w: '' },
            { label: 'Actions', align: 'center' }
          ].map((h) => (
            <div key={h.label} style={{ padding: '0 16px', display: 'flex', alignItems: 'center', color: '#fff', ...sBodyB, fontSize: 12.5, whiteSpace: 'nowrap', justifyContent: h.align === 'right' ? 'flex-end' : h.align === 'center' ? 'center' : 'flex-start' }}>
              {h.label}
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ ...sBodyB, color: 'var(--ink)', marginBottom: 4 }}>{query ? 'No lines match your search' : 'No order lines yet'}</div>
            <div style={{ ...sBody, color: 'var(--ink-2)' }}>{query ? 'Clear the search to see all lines.' : 'Click "Add Line" to add one manually.'}</div>
          </div>
        ) : (
          filtered.map((line, idx) => (
            <LineBlock
              key={line.id}
              line={line} idx={idx} currency={currency} orderPlaced={orderPlaced}
              isDragging={dragIdx === idx}
              isOver={overIdx === idx && dragIdx !== null && dragIdx !== idx}
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }}
              onDragLeave={() => setOverIdx(o => o === idx ? null : o)}
              onDrop={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) onReorder(dragIdx, idx); setDragIdx(null); setOverIdx(null); }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              onUpdate={(patch) => onUpdateLine(line.id, patch)}
              onUpdateChild={(childId, patch) => onUpdateChild(line.id, childId, patch)}
              onDuplicate={() => onDuplicate(line.id)}
              onDelete={() => onDelete(line.id)}
              onExplode={() => onExplode(line.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ACTION BAR                                                          */
/* ------------------------------------------------------------------ */
function ActionBar({ canSubmit, missingMeta, onSaveDraft, onSubmit, onCancel, total, currency }: {
  canSubmit: boolean; missingMeta: string[];
  onSaveDraft: () => void; onSubmit: () => void; onCancel: () => void;
  total: number; currency: string;
}) {
  const ready = canSubmit && missingMeta.length === 0;
  return (
    <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--line)', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 -2px 12px rgba(0,0,0,0.04)', zIndex: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ ...sBody, color: 'var(--ink-2)' }}>Total Order Value</div>
        <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmt(total, currency)}</div>
      </div>
      <div style={{ flex: 1, paddingLeft: 32, ...sBody, color: missingMeta.length ? 'var(--amber)' : 'var(--ink-2)' }}>
        {missingMeta.length > 0
          ? `Missing for submission: ${missingMeta.join(', ')}. Complete in Order Details.`
          : (!canSubmit ? 'Resolve invalid lines before submitting.' : null)}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onCancel}    className="om-stroke-btn" style={{ ...sLargeB, height: 50, padding: '0 18px', border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: '#fff', color: 'var(--ink)', cursor: 'pointer', transition: 'background .15s ease, color .15s ease', fontFamily: 'inherit' }}>Cancel</button>
        <button onClick={onSaveDraft} className="om-stroke-btn" style={{ ...sLargeB, height: 50, padding: '0 18px', border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: '#fff', color: 'var(--ink)', cursor: 'pointer', transition: 'background .15s ease, color .15s ease', fontFamily: 'inherit' }}>Save Draft</button>
        <button onClick={onSubmit} disabled={!ready} className="om-primary-btn"
          style={{ ...sLargeB, height: 50, padding: '0 28px', border: `2px solid ${ready ? 'var(--brand)' : 'var(--line)'}`, borderRadius: 'var(--radius)', background: ready ? 'var(--brand)' : 'var(--line)', color: ready ? '#fff' : 'var(--ink-3)', cursor: ready ? 'pointer' : 'not-allowed', transition: 'background .15s ease', fontFamily: 'inherit' }}>
          Submit Order
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TOAST                                                               */
/* ------------------------------------------------------------------ */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const id = setTimeout(onDone, 2400); return () => clearTimeout(id); }, [onDone]);
  return (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: '#fff', padding: '14px 22px', borderRadius: 'var(--radius)', ...sBody, zIndex: 80, boxShadow: 'var(--shadow-pop)', animation: 'toastIn .2s cubic-bezier(.4,0,.2,1)' }}>{message}</div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSS                                                                 */
/* ------------------------------------------------------------------ */
const CSS = `
  .om-tab-strip:hover[data-active="false"] { color: var(--ink); }
  .om-header-edit:hover { color: var(--brand) !important; }
  .om-header-select:hover { color: var(--brand) !important; }
  .om-expand-toggle:hover { background: var(--line) !important; }
  .om-stroke-btn:hover { background: var(--ink); color: #fff; }
  .om-primary-btn:not(:disabled):hover { background: #C42700 !important; border-color: #C42700 !important; }
  .om-line-row:hover { background: var(--bg-soft); }
  .om-line-row[data-over="true"] { background: var(--brand-soft) !important; }
  .om-row-action:hover { background: var(--line); color: var(--ink); }
  .om-code-edit:hover span:first-child { color: var(--brand); }
  .om-search-wrap:focus-within { box-shadow: 0 0 0 4px rgba(226,45,0,0.08); }
  .om-iconplus:hover { background: var(--line); border-radius: var(--radius); }
  .om-account-btn:hover { color: var(--brand); }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pac-container { border: 2px solid var(--black); border-radius: var(--radius); box-shadow: var(--shadow-pop); margin-top: 2px; z-index: 9999; font-family: inherit; }
  .pac-item { padding: 8px 12px; cursor: pointer; font-size: 13px; color: var(--ink); }
  .pac-item:hover, .pac-item-selected { background: var(--bg-soft); }
  .pac-item-query { color: var(--ink); font-size: 13px; }
  .pac-matched { font-weight: 700; }
  .pac-icon { display: none; }
`;

/* ------------------------------------------------------------------ */
/*  STORE HELPER                                                        */
/* ------------------------------------------------------------------ */
function toStored(o: OrderData): StoredOrder {
  return {
    id: o.orderNo, orderNo: o.orderNo, status: o.status, currency: o.currency,
    orderPlaced: o.orderPlaced, reference: o.reference, customer: o.customer,
    purchaseOrder: o.purchaseOrder, lines: o.lines as unknown[],
    orderType: o.orderType, salesPerson: o.salesPerson, hmSalesPerson: o.hmSalesPerson,
    contract: o.contract,
    companyName: o.companyName,
    deliveryLine1: o.deliveryLine1, deliveryLine2: o.deliveryLine2,
    deliveryLine3: o.deliveryLine3, deliveryLine4: o.deliveryLine4,
    deliveryCity: o.deliveryCity, deliveryCounty: o.deliveryCounty, deliveryPostcode: o.deliveryPostcode,
    contactName: o.contactName, contactEmail: o.contactEmail, contactTelephone: o.contactTelephone,
    pricingDate: o.pricingDate,
  };
}

/* ------------------------------------------------------------------ */
/*  DEFAULT DEMO ORDER                                                  */
/* ------------------------------------------------------------------ */
function buildDemoOrder(orderNo: string): OrderData {
  const atlas = validateItem('UPXSGA4NN22PPNU.0814RAM', 'X1 G1 G1');
  return {
    orderNo,
    status: 'Draft',
    currency: 'EUR',
    orderPlaced: new Date().toISOString().slice(0, 10),
    reference: null, customer: null, purchaseOrder: null,
    lines: [
      { id: 'demo-1', articleCode: 'AER1B23DW', featureString: 'ALP G1 G1 G1 BB BK 23103', productName: 'AERON', productLine: 'AERON', qty: 2,  listPrice: 2283,  discount: 10, currency: 'EUR', validationStatus: 'passed' },
      { id: 'demo-2', articleCode: 'AS1EA33AA', featureString: 'N2 BK BB BK BK 7O005',      productName: 'SAYL',  productLine: 'SAYL',  qty: 4,  listPrice: 901,   discount: 0,  currency: 'EUR', validationStatus: 'passed' },
      {
        id: 'demo-3',
        articleCode: 'UPXSGA4NN22PPNU.0814RAM', featureString: 'X1 G1 G1',
        productName: atlas.productName ?? 'Atlas Sit-to-Stand Desk', productLine: atlas.productLine,
        qty: 1, listPrice: atlas.price ?? 0, discount: 0, currency: 'GBP',
        validationStatus: 'passed', isSuper: true,
        superChildren: atlas.superChildren ?? [],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
export default function OrderDetailPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams<{ id: string }>();

  const [order,   setOrder]   = useState<OrderData | null>(null);
  const [tab,     setTab]     = useState<DetailTab>('lines');
  const [query,   setQuery]   = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [toast,   setToast]   = useState<string | null>(null);

  useEffect(() => {
    // 1. Passed via React Router state
    const passed = (location.state as { order?: OrderData } | null)?.order;
    if (passed) { setOrder(passed as unknown as OrderData); return; }

    // 2. Look up in order store by id
    if (id) {
      const stored = loadDetail(id);
      if (stored) { setOrder(stored as unknown as OrderData); return; }
    }

    // 3. Fallback demo order
    const draftNo = '234' + String(Math.floor(Math.random() * 9999999)).padStart(7, '0');
    setOrder(buildDemoOrder(draftNo));
  }, [id, location.state]);

  const updateMeta = useCallback((key: keyof OrderData, value: string | null) => {
    setOrder(o => {
      if (!o) return o;
      const updated = { ...o, [key]: value };
      if (key === 'contract' && value) {
        const contract = CONTRACTS.find(c => c.name === value);
        if (contract) {
          updated.lines = updated.lines.map(line => {
            if (!line.productLine) return line;
            const plcMeta = PRODUCT_LINE_PLCS[line.productLine];
            if (!plcMeta) return line;
            const discount = getContractDiscount(contract, plcMeta.plc);
            if (discount === null) return line;
            return { ...line, discount };
          });
        }
      }
      return updated;
    });
  }, []);
  const updateLine  = useCallback((id: string, patch: Partial<OrderLine>) => setOrder(o => o ? { ...o, lines: o.lines.map(l => l.id === id ? { ...l, ...patch } : l) } : o), []);
  const updateChild = useCallback((lineId: string, childId: string, patch: Partial<SuperChild>) => {
    setOrder(o => o ? { ...o, lines: o.lines.map(l => {
      if (l.id !== lineId || !l.superChildren) return l;
      return { ...l, superChildren: l.superChildren.map(c => c.id === childId ? { ...c, ...patch } : c) };
    }) } : o);
  }, []);

  const explodeLine = useCallback((id: string) => {
    setOrder(o => {
      if (!o) return o;
      const idx = o.lines.findIndex(l => l.id === id);
      if (idx < 0) return o;
      const parent = o.lines[idx];
      if (!parent.isSuper || !parent.superChildren) return o;
      const expanded: OrderLine[] = parent.superChildren.map((c, i) => ({
        id: `l-${Math.random().toString(36).slice(2, 9)}-${i}`,
        articleCode: c.articleCode, featureString: c.featureString ?? '',
        productName: c.shortDescription, productLine: parent.productLine,
        qty: (c.qty || 1) * parent.qty, listPrice: c.listPrice || 0,
        discount: parent.discount || 0, currency: c.currency || parent.currency,
        validationStatus: 'passed', isSuper: false, superChildren: null,
      }));
      const next = [...o.lines];
      next.splice(idx, 1, ...expanded);
      return { ...o, lines: next };
    });
    setToast('Super product exploded into individual lines');
  }, []);

  const duplicateLine = useCallback((id: string) => {
    setOrder(o => {
      if (!o) return o;
      const idx = o.lines.findIndex(l => l.id === id);
      if (idx < 0) return o;
      const dup = { ...o.lines[idx], id: `l-${Math.random().toString(36).slice(2, 9)}` };
      const next = [...o.lines]; next.splice(idx + 1, 0, dup);
      return { ...o, lines: next };
    });
    setToast('Line duplicated');
  }, []);

  const deleteLine = useCallback((id: string) => setOrder(o => o ? { ...o, lines: o.lines.filter(l => l.id !== id) } : o), []);

  const reorderLines = useCallback((from: number, to: number) => {
    setOrder(o => {
      if (!o) return o;
      const next = [...o.lines];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...o, lines: next };
    });
  }, []);

  const addLine = useCallback(() => {
    setOrder(o => o ? { ...o, lines: [...o.lines, {
      id: `l-${Math.random().toString(36).slice(2, 9)}`, articleCode: 'NEW-LINE', featureString: '',
      productName: null, productLine: null, qty: 1, listPrice: 0, discount: 0, currency: o.currency,
      validationStatus: 'failed', validationError: 'Article code "NEW-LINE" does not exist in the product catalog',
    }] } : o);
    setToast('Line added — click the code to edit');
  }, []);

  const total = useMemo(() => {
    if (!order) return 0;
    return order.lines.reduce((s, l) => {
      const listP = l.isSuper && Array.isArray(l.superChildren)
        ? l.superChildren.reduce((cs, c) => cs + (c.listPrice || 0) * (c.qty || 1), 0)
        : l.listPrice;
      return s + listP * (1 - (l.discount || 0) / 100) * l.qty;
    }, 0);
  }, [order]);

  const allPassed   = order != null && order.lines.length > 0 && order.lines.every(l => l.validationStatus === 'passed');
  const missingMeta = useMemo(() => {
    if (!order) return [];
    const out: string[] = [];
    if (!order.reference)     out.push('Reference');
    if (!order.purchaseOrder) out.push('Purchase Order');
    if (!order.deliveryLine1) out.push('Delivery Address');
    return out;
  }, [order]);

  const onSaveDraft = () => {
    if (!order) return;
    if (!order.reference) { setToast('A Reference is required before saving.'); return; }
    upsert(toStored(order));
    setToast(`Order ${order.orderNo} saved`);
  };

  const onSubmit = () => {
    if (!order) return;
    const updated = { ...order, status: 'Submitted' };
    setOrder(updated);
    upsert(toStored(updated));
    setToast(`Order ${updated.orderNo} submitted`);
    setTimeout(() => navigate('/orders'), 1200);
  };

  const onCancel = () => {
    if (!order) return;
    if (window.confirm('Cancel this order? Unsaved changes will be lost.')) {
      navigate('/orders');
    }
  };

  if (!order) return <div style={{ padding: 80, textAlign: 'center', ...sBody, color: 'var(--ink-2)' }}>Loading…</div>;

  return (
    <>
      <style>{CSS}</style>
      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="orders" />

      <main style={{ maxWidth: size.maxWidth, margin: '0 auto', padding: `0 ${size.pagePad}px 24px` }}>
        <Breadcrumb orderNo={order.orderNo} />
        <OrderHeader order={order} total={total} onUpdateMeta={updateMeta} />
        <TabStrip active={tab} onChange={setTab} />

        {tab === 'lines' ? (
          <OrderLinesTable
            lines={order.lines} currency={order.currency} orderPlaced={order.orderPlaced}
            query={query} setQuery={setQuery}
            onUpdateLine={updateLine} onUpdateChild={updateChild}
            onDuplicate={duplicateLine} onDelete={deleteLine}
            onExplode={explodeLine} onReorder={reorderLines} onAddLine={addLine}
          />
        ) : (
          <ComingSoon tab={tab} />
        )}
      </main>

      <ActionBar
        canSubmit={allPassed} missingMeta={missingMeta}
        total={total} currency={order.currency}
        onSaveDraft={onSaveDraft} onSubmit={onSubmit} onCancel={onCancel}
      />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
