import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import {
  IconChevronRight, IconSearch, IconClose, IconPlus, IconMinus,
  IconCopy, IconTrash, IconChevronDown,
} from '../../components/Icons';
import { validateItem } from '../../services/validation';
import { getPricingCurrency } from '../../services/accountStore';
import { pricingCurrency } from '../../data/currency';
import type { SuperChild } from '../../data/superProducts';
import { loadDetail, upsert } from '../../services/orderStore';
import type { StoredOrder } from '../../services/orderStore';
import { CONTRACTS, PRODUCT_LINE_PLCS, getContractDiscount } from '../../data/contracts';
import { COUNTRIES } from '../../data/countries';
import { missingDelivery } from '../../data/deliveryAddress';
import { computeDeliveryCharges, formatDeliveryDate, mockLeadTime } from '../../data/delivery';
import DeliveryModal from './DeliveryModal';
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
  /** Freshly added blank line, opened straight into the code field */
  isNew?: boolean;
  /** ISO date chosen in the Promise Dates & Delivery Charges screen; blank until then */
  promiseDate?: string | null;
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
  deliveryCountry?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactTelephone?: string | null;
  pricingDate?: string | null;
  /** Promise dates that have a timed delivery slot added */
  timedDeliveries?: string[];
}

/* ------------------------------------------------------------------ */
/*  Style shorthands                                                    */
/* ------------------------------------------------------------------ */
const sBody  = { ...t.body  };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

const CONTRACT_OPTIONS = CONTRACTS.map(c => c.name);
const HM_SALES_PERSONS = ['Alex Thompson', 'Sarah Williams', 'James Mitchell', 'Emma Clarke', 'David Hughes'];
const ORDER_TYPE_OPTIONS = ['Normal', 'Direct', 'Showroom', 'MockUp', 'FOC', 'SwatchRequest', 'Sample'];

const CCY: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' };
function fmt(n: number, c = 'EUR') {
  return (CCY[c] ?? c + ' ') + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
interface DeliveryAddress { companyName: string; line1: string; line2: string; line3: string; line4: string; city: string; county: string; postcode: string; countryCode: string; }

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countryCode = (place.address_components as any[])?.find((c) => c.types.includes('country'))?.short_name ?? '';
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
/*  HEADER STRIP (EOS 1 style: label / value pairs above the tabs)       */
/* ------------------------------------------------------------------ */
/** Missing required fields only show in red once the user has tried to submit, as in EOS 1. */
const FlagMissingContext = createContext(false);

function StripItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, minHeight: 28 }}>
      <span style={{ ...sBodyB, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{label}:</span>
      <span style={{ ...sBody, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{children}</span>
    </div>
  );
}

function OrderHeaderStrip({ order, total, deliveryTotal }: { order: OrderData; total: number; deliveryTotal: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '4px 32px', padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
      <StripItem label="Reference">{order.reference || '—'}</StripItem>
      <StripItem label="Purchase Order">{order.purchaseOrder || '—'}</StripItem>
      <StripItem label="Contract">{order.contract || '—'}</StripItem>
      <StripItem label="Order Date">{order.orderPlaced}</StripItem>
      <StripItem label="Status"><StatusBadge status={order.status} /></StripItem>
      <StripItem label="HM Order Number">—</StripItem>
      <StripItem label="Pricing Date">{order.pricingDate ? formatDeliveryDate(order.pricingDate) : '—'}</StripItem>
      <StripItem label="Order Total">
        <strong>{fmt(total, order.currency)}</strong>
        {deliveryTotal > 0 && <span style={{ color: 'var(--ink-3)' }}> (incl. {fmt(deliveryTotal, order.currency)} delivery)</span>}
      </StripItem>
    </div>
  );
}

const fieldLabel = { ...sBodyB, color: 'var(--ink-2)', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.6 };
const fieldBox = { ...sBody, height: 40, boxSizing: 'border-box' as const, width: '100%', padding: '0 10px', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'inherit' };

function PanelInput({ id, label, value, required, placeholder, onChange }: {
  id: string; label: string; value: string | null; required?: boolean; placeholder?: string; onChange: (v: string | null) => void;
}) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => setV(value ?? ''), [value]);
  const flag = useContext(FlagMissingContext);
  const missing = flag && !!required && !value;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={fieldLabel}>{label}{required && <span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span>}</label>
      <input
        id={id} className="om-field" value={v} placeholder={placeholder ?? ''}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { const n = v.trim() || null; if (n !== (value ?? null)) onChange(n); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        style={{ ...fieldBox, border: `2px solid ${missing ? 'var(--red)' : 'var(--ink)'}` }}
      />
    </div>
  );
}

function PanelSelect({ id, label, value, options, required, onChange }: {
  id: string; label: string; value: string | null; options: Array<string | { value: string; label: string }>; required?: boolean; onChange: (v: string | null) => void;
}) {
  const flag = useContext(FlagMissingContext);
  const missing = flag && !!required && !value;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={fieldLabel}>{label}{required && <span style={{ color: 'var(--red)' }} aria-hidden="true"> *</span>}</label>
      <select id={id} className="om-field" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} style={{ ...fieldBox, border: `2px solid ${missing ? 'var(--red)' : 'var(--ink)'}` }}>
        <option value="">{required ? 'Select...' : 'Not set'}</option>
        {options.map(o => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return <option key={opt.value} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    </div>
  );
}

function PanelDate({ id, label, value, onChange }: {
  id: string; label: string; value: string | null; onChange: (v: string | null) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={fieldLabel}>{label}</label>
      <input id={id} type="date" className="om-field" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} style={{ ...fieldBox, border: '2px solid var(--strong)' }} />
    </div>
  );
}

const panelStyle = { flex: 1, minWidth: 0, padding: '4px 24px 8px', display: 'flex', flexDirection: 'column' as const, gap: 14 };

function PanelHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={{ ...sLargeB, margin: '16px 0 2px' }}>{children}</h3>;
}

/** The Order Details tab: order, delivery and contact details side by side, as on EOS 1. */
function OrderDetailsTab({ order, onUpdateMeta }: { order: OrderData; onUpdateMeta: (k: keyof OrderData, v: string | null) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', border: '1px solid var(--line)', borderRadius: 'var(--radius)', background: 'var(--bg)', paddingBottom: 16 }}>
      <div style={{ ...panelStyle, borderRight: '1px solid var(--line)' }}>
        <PanelHeading>Order Details</PanelHeading>
        <PanelSelect id="op-order-type" label="Order Type" value={order.orderType ?? 'Normal'} options={ORDER_TYPE_OPTIONS} onChange={(v) => onUpdateMeta('orderType', v)} />
        <PanelInput id="op-reference" label="Reference" required value={order.reference} onChange={(v) => onUpdateMeta('reference', v)} />
        <PanelInput id="op-purchase-order" label="Purchase Order" required value={order.purchaseOrder} onChange={(v) => onUpdateMeta('purchaseOrder', v)} />
        <PanelSelect id="op-contract" label="Contract" required value={order.contract ?? null} options={CONTRACT_OPTIONS} onChange={(v) => onUpdateMeta('contract', v)} />
        <PanelDate id="op-pricing-date" label="Pricing Date" value={order.pricingDate ?? null} onChange={(v) => onUpdateMeta('pricingDate', v)} />
        <PanelSelect id="op-hm-sales-person" label="HM Sales Person" value={order.hmSalesPerson ?? null} options={HM_SALES_PERSONS} onChange={(v) => onUpdateMeta('hmSalesPerson', v)} />
        <PanelInput id="op-sales-person" label="Sales Person" value={order.salesPerson ?? null} onChange={(v) => onUpdateMeta('salesPerson', v)} />
      </div>

      <div style={{ ...panelStyle, borderRight: '1px solid var(--line)' }}>
        <PanelHeading>Delivery Details</PanelHeading>
        <DeliveryAddressLookup onFill={(addr) => {
          onUpdateMeta('companyName',      addr.companyName || null);
          onUpdateMeta('deliveryLine1',    addr.line1       || null);
          onUpdateMeta('deliveryLine2',    addr.line2       || null);
          onUpdateMeta('deliveryLine3',    addr.line3       || null);
          onUpdateMeta('deliveryLine4',    addr.line4       || null);
          onUpdateMeta('deliveryCity',     addr.city        || null);
          onUpdateMeta('deliveryCounty',   addr.county      || null);
          onUpdateMeta('deliveryPostcode', addr.postcode    || null);
          if (COUNTRIES.some(c => c.code === addr.countryCode)) onUpdateMeta('deliveryCountry', addr.countryCode);
        }} />
        <PanelInput id="op-company-name"      label="Company Name"   value={order.companyName ?? null}      onChange={(v) => onUpdateMeta('companyName', v)} />
        <PanelInput id="op-delivery-line1"    label="Address Line 1" required value={order.deliveryLine1 ?? null} onChange={(v) => onUpdateMeta('deliveryLine1', v)} />
        <PanelInput id="op-delivery-line2"    label="Address Line 2" value={order.deliveryLine2 ?? null}    onChange={(v) => onUpdateMeta('deliveryLine2', v)} />
        <PanelInput id="op-delivery-line3"    label="Address Line 3" value={order.deliveryLine3 ?? null}    onChange={(v) => onUpdateMeta('deliveryLine3', v)} />
        <PanelInput id="op-delivery-line4"    label="Address Line 4" value={order.deliveryLine4 ?? null}    onChange={(v) => onUpdateMeta('deliveryLine4', v)} />
        <PanelInput id="op-delivery-city"     label="City"           value={order.deliveryCity ?? null}     onChange={(v) => onUpdateMeta('deliveryCity', v)} />
        <PanelInput id="op-delivery-county"   label="Region / State / County" required value={order.deliveryCounty ?? null} onChange={(v) => onUpdateMeta('deliveryCounty', v)} />
        <PanelInput id="op-delivery-postcode" label="Postcode" required value={order.deliveryPostcode ?? null} onChange={(v) => onUpdateMeta('deliveryPostcode', v)} />
        <PanelSelect id="op-delivery-country" label="Country" required value={order.deliveryCountry ?? null} options={COUNTRIES.map(c => ({ value: c.code, label: c.name }))} onChange={(v) => onUpdateMeta('deliveryCountry', v)} />
      </div>

      <div style={panelStyle}>
        <PanelHeading>Contact Details</PanelHeading>
        <PanelInput id="op-contact-name"      label="Contact Name"      value={order.contactName ?? null}      onChange={(v) => onUpdateMeta('contactName', v)} />
        <PanelInput id="op-contact-email"     label="Contact Email"     value={order.contactEmail ?? null}     onChange={(v) => onUpdateMeta('contactEmail', v)} />
        <PanelInput id="op-contact-telephone" label="Contact Telephone" value={order.contactTelephone ?? null} onChange={(v) => onUpdateMeta('contactTelephone', v)} />
      </div>
    </div>
  );
}

interface SubmitProblem { label: string; tab: 'details' | 'lines'; fieldId?: string }

function SubmitProblems({ problems, onGo }: { problems: SubmitProblem[]; onGo: (p: SubmitProblem) => void }) {
  return (
    <div role="alert" style={{ ...sBody, padding: '14px 16px', marginBottom: 16, borderRadius: 'var(--radius)', background: 'var(--err-bg)', color: 'var(--err-text)' }}>
      <div style={{ ...sBodyB, marginBottom: 6 }}>This order can't be submitted yet. Please sort out the following:</div>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {problems.map(p => (
          <li key={p.label}>
            <button onClick={() => onGo(p)} style={{ ...sBody, border: 'none', background: 'transparent', padding: 0, color: 'var(--err-text)', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', fontFamily: 'inherit' }}>{p.label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TAB STRIP                                                           */
/* ------------------------------------------------------------------ */
type DetailTab = 'details' | 'lines' | 'documents' | 'history';

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'details',   label: 'Order Details' },
  { id: 'lines',     label: 'Order Lines' },
  { id: 'documents', label: 'Documents' },
  { id: 'history',   label: 'History' },
];

function TabStrip({ active, onChange, right }: { active: DetailTab; onChange: (t: DetailTab) => void; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--line)', marginBottom: 24, marginTop: 8 }}>
      {DETAIL_TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} className="om-tab-strip" data-active={isActive}
            style={{ ...sLargeB, border: 'none', background: 'transparent', cursor: 'pointer', padding: '14px 24px', color: isActive ? 'var(--brand-text)' : 'var(--ink-2)', borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent', marginBottom: -1, transition: 'color .15s ease, border-color .15s ease', fontFamily: 'inherit' }}>
            {tab.label}
          </button>
        );
      })}
      {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
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
  return <span style={{ ...sBody, color: c.fg }}>{c.label}</span>;
}

/* ------------------------------------------------------------------ */

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
    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--control-border)', borderRadius: 'var(--radius)', overflow: 'hidden', height: 32 }}>
      <button onClick={() => onChange(qty - 1)} disabled={qty <= 1}
        style={{ width: 28, height: 30, border: 'none', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', ...sLargeB, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
      <input value={qty} type="number" min={1}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
        style={{ width: 40, height: 30, border: 'none', borderLeft: '1px solid var(--control-border)', borderRight: '1px solid var(--control-border)', textAlign: 'center', outline: 'none', ...sBodyB, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'inherit' }}
        aria-label="Quantity" />
      <button onClick={() => onChange(qty + 1)}
        style={{ width: 28, height: 30, border: 'none', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', ...sLargeB, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
    </div>
  );
}



/* ------------------------------------------------------------------ */
/*  FINISH SELECT (for editable super children)                         */
/* ------------------------------------------------------------------ */
function FinishSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid var(--line)', borderRadius: 4, padding: '0 8px 0 10px', height: 30, background: 'var(--bg)', maxWidth: '100%' }}>
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
      style={{ width: 60, height: 30, border: '1px solid var(--line)', borderRadius: 4, textAlign: 'center', outline: 'none', ...sBodyB, color: 'var(--ink)', background: 'var(--bg)', fontFamily: 'inherit' }}
      aria-label="Quantity shipped" />
  );
}

/* ------------------------------------------------------------------ */
/*  SUPER CHILDREN EXPANSION                                            */
/* ------------------------------------------------------------------ */
const sCols = 'minmax(140px, 1fr) 130px minmax(180px, 1.6fr) 140px 90px 120px 100px 100px';

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
      <div style={{ margin: '0 16px 16px 60px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: sCols, background: 'var(--bg-soft)', minHeight: 38, alignItems: 'stretch' }}>
          {['Component Item', 'Feature String', 'Short Description', 'Product Code', 'Quantity', 'Qty Shipped', 'Unit Price', 'Total Price'].map(h => (
            <div key={h} style={{ padding: '0 14px', display: 'flex', alignItems: 'center', color: 'var(--ink-2)', ...sBodyB, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</div>
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
                <span style={{ ...sBody, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.listPrice || 0, ccy)}</span>
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
const LINE_COLS = '28px 36px minmax(200px, 1.5fr) minmax(140px, 1.4fr) 100px 100px 80px 110px 140px 72px 110px 110px 76px';

function LineRow({ line, lineNum, currency, isDragging, isOver, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, onUpdate, onDuplicate, onDelete, onExplode, onOpenDelivery, isSuper, expanded, onToggleExpand }: {
  line: OrderLine; idx: number; lineNum: number | 'SP'; currency: string;
  isDragging: boolean; isOver: boolean;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void; onDrop: (e: React.DragEvent) => void; onDragEnd: () => void;
  onUpdate: (patch: Partial<OrderLine>) => void;
  onDuplicate: () => void; onDelete: () => void; onExplode: () => void; onOpenDelivery: () => void;
  isSuper: boolean; expanded: boolean; onToggleExpand: () => void;
}) {
  const [editingCode, setEditingCode] = useState(!!line.isNew);
  const [codeVal, setCodeVal] = useState('');
  const combined = line.articleCode + (line.featureString ? ' ' + line.featureString : '');

  const startEdit = () => { setCodeVal(combined); setEditingCode(true); };
  const saveEdit  = () => {
    const v  = codeVal.trim();
    if (!v && line.isNew) { onDelete(); return; }
    if (v && v !== combined) {
      const sp = v.indexOf(' ');
      const articleCode   = sp > 0 ? v.slice(0, sp) : v;
      const featureString = sp > 0 ? v.slice(sp + 1) : '';
      const result = validateItem(articleCode, featureString, pricingCurrency(currency));
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
        isNew: false,
      });
    } else if (line.isNew) onUpdate({ isNew: false });
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
  const actBtn      = { width: 30, height: 30, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background .12s ease, color .12s ease' };

  return (
    <div
      id={`line-${line.id}`}
      className="om-line-row"
      data-dragging={isDragging}
      data-over={isOver}
      style={{
        display: 'grid', gridTemplateColumns: LINE_COLS,
        alignItems: 'center', minHeight: 64,
        borderTop: '1px solid var(--line)',
        background: isOver ? 'var(--brand-soft)' : (isInvalid ? 'var(--red-soft)' : (isSuper && expanded ? 'var(--blue-soft)' : 'var(--bg)')),
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
        <span style={{ ...sBody, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>{lineNum}</span>
        {isInvalid && <span style={{ width: 14, height: 14, borderRadius: 7, background: 'var(--red)', color: 'var(--on-red)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><IconClose size={9} stroke={3} /></span>}
      </div>

      <div style={{ padding: '10px 16px', minWidth: 0 }}>
        {editingCode ? (
          <input autoFocus value={codeVal}
            onChange={(e) => setCodeVal(e.target.value)}
            onBlur={saveEdit}
            placeholder="Article code and features"
            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { if (line.isNew) onDelete(); else setEditingCode(false); } }}
            style={{ width: '100%', height: 36, border: '2px solid var(--brand)', borderRadius: 4, padding: '0 10px', ...sBody, color: 'var(--ink)', outline: 'none', fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' }}
          />
        ) : (
          <button onClick={startEdit} className="om-code-edit"
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '0 8px', width: '100%', border: 'none', background: 'transparent', cursor: 'text', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>
            <span style={{ ...sBodyB, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.articleCode}</span>
            {line.featureString && (
              <span style={{ ...sBody, color: 'var(--ink-2)', fontSize: 12, fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.featureString}</span>
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

      <div style={{ padding: '0 12px', textAlign: 'right', overflow: 'hidden' }}>
        <span style={{ ...sBody, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {effectiveListPrice > 0 ? fmt(effectiveListPrice, ccy) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </span>
      </div>

      <div style={{ padding: '0 12px', textAlign: 'right', overflow: 'hidden' }}>
        <span style={{ ...sBody, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {line.discount > 0 ? `${line.discount}%` : '—'}
        </span>
      </div>

      <div style={{ padding: '0 12px', textAlign: 'right', overflow: 'hidden' }}>
        <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {effectiveListPrice > 0 ? fmt(unitBuying, ccy) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </span>
      </div>

      <div style={{ padding: '0 12px', textAlign: 'right', overflow: 'hidden' }}>
        <span style={{ ...sBodyB, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {effectiveListPrice > 0 ? fmt(totalBuying, ccy) : <span style={{ color: 'var(--ink-3)' }}>—</span>}
        </span>
      </div>

      <div style={{ padding: '0 8px', textAlign: 'center' }}>
        <span style={{ ...sBody, color: 'var(--ink-2)' }}>{lead.label}</span>
      </div>

      <div style={{ padding: '0 12px' }}>
        {isInvalid ? <span style={{ ...sBody, color: 'var(--ink-3)' }}>—</span> : (
          <button onClick={onOpenDelivery} className="om-promise-btn"
            style={{ ...sBody, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'inherit', color: line.promiseDate ? 'var(--ink)' : 'var(--brand-text)', textDecoration: line.promiseDate ? 'none' : 'underline', textUnderlineOffset: 3 }}>
            {line.promiseDate ? formatDeliveryDate(line.promiseDate) : 'Set date'}
          </button>
        )}
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
  line: OrderLine; idx: number; lineNum: number | 'SP'; currency: string;
  isDragging: boolean; isOver: boolean;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void; onDrop: (e: React.DragEvent) => void; onDragEnd: () => void;
  onUpdate: (patch: Partial<OrderLine>) => void;
  onUpdateChild: (childId: string, patch: Partial<SuperChild>) => void;
  onDuplicate: () => void; onDelete: () => void; onExplode: () => void; onOpenDelivery: () => void;
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
function OrderLinesTable({ lines, currency, query, setQuery, invalidCount, undatedCount, onJumpToIssue, onOpenDelivery, onUpdateLine, onUpdateChild, onDuplicate, onDelete, onExplode, onReorder, onAddLine }: {
  lines: OrderLine[]; currency: string;
  invalidCount: number; undatedCount: number; onJumpToIssue: () => void; onOpenDelivery: () => void;
  query: string; setQuery: (v: string) => void;
  onUpdateLine: (id: string, patch: Partial<OrderLine>) => void;
  onUpdateChild: (lineId: string, childId: string, patch: Partial<SuperChild>) => void;
  onDuplicate: (id: string) => void; onDelete: (id: string) => void; onExplode: (id: string) => void;
  onReorder: (from: number, to: number) => void; onAddLine: () => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const lineNumMap = useMemo(() => {
    const map = new Map<string, number | 'SP'>();
    let counter = 1;
    for (const line of lines) {
      const isSuper = !!line.isSuper && !!line.superChildren?.length;
      if (isSuper) {
        map.set(line.id, 'SP');
        counter += line.superChildren?.length ?? 1;
      } else {
        map.set(line.id, counter);
        counter += 1;
      }
    }
    return map;
  }, [lines]);

  const filtered = useMemo(() => {
    if (!query.trim()) return lines;
    const q = query.toLowerCase();
    return lines.filter(l => [l.articleCode, l.featureString, l.productName].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [lines, query]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="om-search-wrap" style={{ display: 'flex', alignItems: 'center', width: 380, height: 50, border: '2px solid var(--strong)', borderRadius: 'var(--radius)', background: 'var(--bg)', transition: 'box-shadow .15s ease' }}>
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
        <button onClick={onOpenDelivery} className="om-stroke-btn"
          style={{ ...sLargeB, height: 50, padding: '0 20px', border: '2px solid var(--strong)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, transition: 'background .15s ease, color .15s ease', fontFamily: 'inherit' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Promise Dates &amp; Delivery</span>
          {undatedCount > 0 && <span style={{ ...sBodyB, fontSize: 11, background: 'var(--red)', color: 'var(--on-red)', borderRadius: 999, padding: '2px 7px' }}>{undatedCount}</span>}
        </button>
      </div>

      {invalidCount > 0 && (
        <div role="status" style={{ ...sBody, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', marginBottom: 16, borderRadius: 'var(--radius)', background: 'var(--err-bg)', color: 'var(--err-text)' }}>
          <span>{invalidCount} line{invalidCount !== 1 ? 's' : ''} need{invalidCount === 1 ? 's' : ''} attention. They are marked in red where they are, so your line order is untouched.</span>
          <button onClick={onJumpToIssue} className="om-stroke-btn"
            style={{ ...sBodyB, height: 36, padding: '0 14px', border: '2px solid var(--err-text)', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--err-text)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            Go to next
          </button>
        </div>
      )}

      <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflowX: 'auto', background: 'var(--bg)' }}>
        <div style={{ minWidth: 1302 }}>
        <div style={{ display: 'grid', gridTemplateColumns: LINE_COLS, background: 'var(--ink-fill)', minHeight: size.rowH, alignItems: 'stretch' }}>
          {[{ label: '', w: '40px' }, { label: '#', w: '48px' },
            { label: 'Article Code', w: '' }, { label: 'Short Description', w: '' },
            { label: 'Qty', align: 'center' }, { label: 'List Price', align: 'right' },
            { label: 'Discount', align: 'right' }, { label: 'Unit Buying', align: 'right' },
            { label: 'Total Buying', align: 'right' }, { label: 'Lead Time', align: 'center' },
            { label: 'Promise Date', w: '' }, { label: 'Status', w: '' },
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
              line={line} idx={idx} lineNum={lineNumMap.get(line.id) ?? idx + 1} currency={currency}
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
              onOpenDelivery={onOpenDelivery}
            />
          ))
        )}
        </div>
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
    <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink-fill)', color: '#fff', padding: '14px 22px', borderRadius: 'var(--radius)', ...sBody, zIndex: 80, boxShadow: 'var(--shadow-pop)', animation: 'toastIn .2s cubic-bezier(.4,0,.2,1)' }}>{message}</div>
  );
}

/* ------------------------------------------------------------------ */
/*  CSS                                                                 */
/* ------------------------------------------------------------------ */
const CSS = `
  .om-tab-strip:hover[data-active="false"] { color: var(--ink); }
  .om-header-edit:hover { color: var(--brand-text) !important; }
  .om-header-select:hover { color: var(--brand-text) !important; }
  .om-expand-toggle:hover { background: var(--line) !important; }
  .om-field:focus { outline: none; border-color: var(--brand) !important; box-shadow: 0 0 0 4px rgba(226,45,0,0.08); }
  .om-check-item:hover { background: var(--bg-soft) !important; }
  .om-promise-btn:hover { color: var(--brand-text) !important; }
  .om-stroke-btn:hover { background: var(--ink-fill); color: #fff; }
  .om-primary-btn:not(:disabled):hover { background: var(--brand-hover) !important; border-color: var(--brand-hover) !important; }
  .om-line-row:hover { background: var(--bg-soft); }
  .om-line-row[data-over="true"] { background: var(--brand-soft) !important; }
  .om-row-action:hover { background: var(--line); color: var(--ink); }
  .om-code-edit:hover span:first-child { color: var(--brand-text); }
  .om-search-wrap:focus-within { box-shadow: 0 0 0 4px rgba(226,45,0,0.08); }
  .om-iconplus:hover { background: var(--line); border-radius: var(--radius); }
  .om-account-btn:hover { color: var(--brand-text); }
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
    deliveryCountry: o.deliveryCountry, timedDeliveries: o.timedDeliveries,
    contactName: o.contactName, contactEmail: o.contactEmail, contactTelephone: o.contactTelephone,
    pricingDate: o.pricingDate,
  };
}

/** Discounts for a contract, applied to every line whose PLC the contract covers. */
function applyContract(order: OrderData, contractName: string): OrderData {
  const contract = CONTRACTS.find(c => c.name === contractName);
  if (!contract) return order;
  return {
    ...order,
    contract: contract.name,
    lines: order.lines.map(line => {
      if (!line.productLine) return line;
      const plcMeta = PRODUCT_LINE_PLCS[line.productLine];
      if (!plcMeta) return line;
      const discount = getContractDiscount(contract, plcMeta.plc);
      return discount === null ? line : { ...line, discount };
    }),
  };
}

/** An order straight from the basket holds the contract id; convert it so the order opens priced. */
function hydrateOrder(o: OrderData): OrderData {
  const byId = o.contract ? CONTRACTS.find(c => c.id === o.contract) : null;
  return byId ? applyContract(o, byId.name) : o;
}

/* ------------------------------------------------------------------ */
/*  DEFAULT DEMO ORDER                                                  */
/* ------------------------------------------------------------------ */
function buildDemoOrder(orderNo: string): OrderData {
  const ccy = getPricingCurrency();
  const aeron = validateItem('AER1B23DW', 'ALP G1 G1 G1 BB BK 23103', ccy);
  const sayl = validateItem('AS1EA33AA', 'N2 BK BB BK BK 7O005', ccy);
  const atlas = validateItem('UPXSGA4NN22PPNU.0814RAM', 'X1 G1 G1', ccy);
  return {
    orderNo,
    status: 'Draft',
    currency: ccy,
    orderPlaced: new Date().toISOString().slice(0, 10),
    reference: null, customer: null, purchaseOrder: null,
    lines: [
      { id: 'demo-1', articleCode: 'AER1B23DW', featureString: 'ALP G1 G1 G1 BB BK 23103', productName: 'AERON', productLine: 'AERON', qty: 2,  listPrice: aeron.price ?? 0,  discount: 10, currency: ccy, validationStatus: 'passed' },
      { id: 'demo-2', articleCode: 'AS1EA33AA', featureString: 'N2 BK BB BK BK 7O005',      productName: 'SAYL',  productLine: 'SAYL',  qty: 4,  listPrice: sayl.price ?? 0,   discount: 0,  currency: ccy, validationStatus: 'passed' },
      {
        id: 'demo-3',
        articleCode: 'UPXSGA4NN22PPNU.0814RAM', featureString: 'X1 G1 G1',
        productName: atlas.productName ?? 'Atlas Sit-to-Stand Desk', productLine: atlas.productLine,
        qty: 1, listPrice: atlas.price ?? 0, discount: 0, currency: ccy,
        validationStatus: 'passed', isSuper: true,
        superChildren: atlas.superChildren ?? [],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
export default function OrderDetailTabsPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { id }    = useParams<{ id: string }>();

  const [order,   setOrder]   = useState<OrderData | null>(null);
  const [tab,     setTab]     = useState<DetailTab>('details');
  const [query,   setQuery]   = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [toast,   setToast]   = useState<string | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'edit' | 'submit'>('edit');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const issueCursor = useRef(0);

  useEffect(() => {
    // 1. Passed via React Router state
    const passed = (location.state as { order?: OrderData } | null)?.order;
    if (passed) { setOrder(hydrateOrder(passed as unknown as OrderData)); return; }

    // 2. Look up in order store by id
    if (id) {
      const stored = loadDetail(id);
      if (stored) { setOrder(hydrateOrder(stored as unknown as OrderData)); return; }
    }

    // 3. Fallback demo order
    const draftNo = '234' + String(Math.floor(Math.random() * 9999999)).padStart(7, '0');
    setOrder(buildDemoOrder(draftNo));
  }, [id, location.state]);

  const updateMeta = useCallback((key: keyof OrderData, value: string | null) => {
    setOrder(o => {
      if (!o) return o;
      const updated = { ...o, [key]: value };
      return key === 'contract' && value ? applyContract(updated, value) : updated;
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
    const id = `l-${Math.random().toString(36).slice(2, 9)}`;
    setOrder(o => o ? { ...o, lines: [...o.lines, {
      id, articleCode: '', featureString: '',
      productName: null, productLine: null, qty: 1, listPrice: 0, discount: 0, currency: o.currency,
      validationStatus: 'pending', isNew: true,
    }] } : o);
    setTimeout(() => document.getElementById(`line-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
  }, []);

  const setPromiseDate = useCallback((lineId: string, date: string | null) => {
    setOrder(o => o ? { ...o, lines: o.lines.map(l => l.id === lineId ? { ...l, promiseDate: date } : l) } : o);
  }, []);

  const toggleTimedDelivery = useCallback((date: string) => {
    setOrder(o => {
      if (!o) return o;
      const cur = o.timedDeliveries ?? [];
      return { ...o, timedDeliveries: cur.includes(date) ? cur.filter(d => d !== date) : [...cur, date] };
    });
  }, []);

  const linesTotal = useMemo(() => {
    if (!order) return 0;
    return order.lines.reduce((s, l) => {
      const listP = l.isSuper && Array.isArray(l.superChildren)
        ? l.superChildren.reduce((cs, c) => cs + (c.listPrice || 0) * (c.qty || 1), 0)
        : l.listPrice;
      return s + listP * (1 - (l.discount || 0) / 100) * l.qty;
    }, 0);
  }, [order]);

  const delivery = useMemo(
    () => order ? computeDeliveryCharges(order.lines.filter(l => l.validationStatus === 'passed'), order.currency, linesTotal, order.timedDeliveries ?? []) : null,
    [order, linesTotal],
  );
  const deliveryTotal = delivery?.total ?? 0;
  const total = linesTotal + deliveryTotal;

  const undatedCount = order ? order.lines.filter(l => l.validationStatus === 'passed' && !l.promiseDate).length : 0;
  const invalidCount = order ? order.lines.filter(l => l.validationStatus === 'failed').length : 0;

  // As on EOS 1, the order is checked when the user presses Submit. Promise dates are chosen in the submission step.
  const problems: SubmitProblem[] = useMemo(() => {
    if (!order) return [];
    const out: SubmitProblem[] = [];
    if (!order.reference)     out.push({ label: 'Reference is required', tab: 'details', fieldId: 'op-reference' });
    if (!order.purchaseOrder) out.push({ label: 'Purchase Order is required', tab: 'details', fieldId: 'op-purchase-order' });
    if (!order.contract)      out.push({ label: 'Contract is required', tab: 'details', fieldId: 'op-contract' });
    for (const d of missingDelivery(order)) out.push({ label: `Delivery ${d.label} is required`, tab: 'details', fieldId: d.fieldId });
    if (order.lines.length === 0) out.push({ label: 'Add at least one order line', tab: 'lines' });
    const bad = order.lines.filter(l => l.validationStatus !== 'passed').length;
    if (bad > 0) out.push({ label: `${bad} order line${bad !== 1 ? 's' : ''} need${bad === 1 ? 's' : ''} fixing`, tab: 'lines' });
    return out;
  }, [order]);

  const goToProblem = (p: SubmitProblem) => {
    setTab(p.tab);
    if (p.fieldId) {
      setTimeout(() => {
        const el = document.getElementById(p.fieldId!);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el?.focus({ preventScroll: true });
      }, 60);
    }
  };

  const jumpToIssue = () => {
    if (!order) return;
    const bad = order.lines.filter(l => l.validationStatus === 'failed');
    if (!bad.length) return;
    const target = bad[issueCursor.current % bad.length];
    issueCursor.current += 1;
    setTab('lines');
    setQuery('');
    setTimeout(() => document.getElementById(`line-${target.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  };

  const openDeliveryEdit = () => { setDeliveryMode('edit'); setDeliveryModalOpen(true); };

  const onSaveDraft = () => {
    if (!order) return;
    upsert(toStored(order));
    setToast(`Draft ${order.orderNo} saved`);
  };

  const onSubmitClick = () => {
    setSubmitAttempted(true);
    if (problems.length > 0) { goToProblem(problems[0]); return; }
    setDeliveryMode('submit');
    setDeliveryModalOpen(true);
  };

  const onConfirmSubmit = () => {
    if (!order) return;
    const updated = { ...order, status: 'Submitted' };
    setOrder(updated);
    upsert(toStored(updated));
    setDeliveryModalOpen(false);
    setToast(`Order ${updated.orderNo} submitted`);
    setTimeout(() => navigate('/orders'), 1200);
  };

  const onClose = () => {
    if (!order) return;
    if (window.confirm('Leave this order? Changes since your last Save Draft will be lost. The draft itself stays in your orders.')) {
      navigate('/orders');
    }
  };

  if (!order) return <div style={{ padding: 80, textAlign: 'center', ...sBody, color: 'var(--ink-2)' }}>Loading…</div>;

  const barBtn = { ...sLargeB, height: 50, padding: '0 22px', border: '2px solid var(--strong)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', transition: 'background .15s ease, color .15s ease', fontFamily: 'inherit' };

  return (
    <FlagMissingContext.Provider value={submitAttempted}>
      <style>{CSS}</style>
      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current="orders" />

      <main style={{ maxWidth: size.maxWidth, margin: '0 auto', padding: `0 ${size.pagePad}px 40px` }}>
        <Breadcrumb orderNo={order.orderNo} />
        <OrderHeaderStrip order={order} total={total} deliveryTotal={deliveryTotal} />
        <TabStrip active={tab} onChange={setTab} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
          <button onClick={onSaveDraft} className="om-stroke-btn" style={barBtn}>Save Draft</button>
          <button onClick={onSubmitClick} className="om-primary-btn"
            style={{ ...barBtn, padding: '0 28px', border: '2px solid var(--brand)', background: 'var(--brand)', color: '#fff' }}>
            Submit Order
          </button>
          <button onClick={onClose} className="om-stroke-btn" style={barBtn}>Close</button>
        </div>

        {submitAttempted && problems.length > 0 && <SubmitProblems problems={problems} onGo={goToProblem} />}

        {tab === 'details' && <OrderDetailsTab order={order} onUpdateMeta={updateMeta} />}
        {tab === 'lines' && (
          <OrderLinesTable
            lines={order.lines} currency={order.currency}
            query={query} setQuery={setQuery}
            invalidCount={invalidCount} undatedCount={undatedCount} onJumpToIssue={jumpToIssue}
            onOpenDelivery={openDeliveryEdit}
            onUpdateLine={updateLine} onUpdateChild={updateChild}
            onDuplicate={duplicateLine} onDelete={deleteLine}
            onExplode={explodeLine} onReorder={reorderLines} onAddLine={addLine}
          />
        )}
        {(tab === 'documents' || tab === 'history') && <ComingSoon tab={tab} />}
      </main>

      {deliveryModalOpen && (
        <DeliveryModal
          mode={deliveryMode}
          lines={order.lines} currency={order.currency} orderPlaced={order.orderPlaced}
          linesTotal={linesTotal} timedDeliveries={order.timedDeliveries ?? []}
          onSetPromiseDate={setPromiseDate} onToggleTimed={toggleTimedDelivery}
          onSubmit={onConfirmSubmit}
          onClose={() => setDeliveryModalOpen(false)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </FlagMissingContext.Provider>
  );
}
