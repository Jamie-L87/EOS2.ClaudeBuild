import { useEffect, useMemo, useState } from 'react';
import { IconClose } from '../../components/Icons';
import { t } from '../../tokens';
import {
  computeDeliveryCharges, earliestPromiseDate, formatDeliveryDate, isWeekend, mockLeadTime,
} from '../../data/delivery';
import type { DeliveryLine } from '../../data/delivery';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

const CCY: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' };
function money(n: number, c: string) {
  return (CCY[c] ?? c + ' ') + Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const th = { ...sBodyB, fontSize: 12.5, color: '#fff', background: 'var(--ink)', textAlign: 'left' as const, padding: '0 14px', height: 40, whiteSpace: 'nowrap' as const };
const td = { ...sBody, padding: '10px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink)', verticalAlign: 'middle' as const };
const dateInput = { ...sBody, height: 36, boxSizing: 'border-box' as const, padding: '0 8px', border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: '#fff', color: 'var(--ink)', fontFamily: 'inherit' };

export default function DeliveryModal({ lines, currency, orderPlaced, linesTotal, timedDeliveries, onSetPromiseDate, onToggleTimed, onClose }: {
  lines: DeliveryLine[];
  currency: string;
  orderPlaced: string;
  /** Total of the order lines after discount, used for the free-delivery threshold */
  linesTotal: number;
  timedDeliveries: string[];
  onSetPromiseDate: (lineId: string, date: string | null) => void;
  onToggleTimed: (date: string) => void;
  onClose: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkDate, setBulkDate] = useState('');
  const [bulkNote, setBulkNote] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lines that still need attention can't be dated yet
  const dateable = useMemo(() => lines.filter(l => l.validationStatus === 'passed'), [lines]);
  const skipped = lines.length - dateable.length;
  const charges = useMemo(() => computeDeliveryCharges(dateable, currency, linesTotal, timedDeliveries), [dateable, currency, linesTotal, timedDeliveries]);
  const undated = dateable.filter(l => !l.promiseDate).length;

  const setError = (id: string, msg: string | null) =>
    setErrors(prev => { const next = { ...prev }; if (msg) next[id] = msg; else delete next[id]; return next; });

  const onLineDate = (line: DeliveryLine, value: string) => {
    if (!value) { setError(line.id, null); onSetPromiseDate(line.id, null); return; }
    const earliest = earliestPromiseDate(line, orderPlaced);
    if (isWeekend(value)) { setError(line.id, 'Weekends are not available'); return; }
    if (value < earliest) { setError(line.id, `Earliest available is ${formatDeliveryDate(earliest)}`); return; }
    setError(line.id, null);
    onSetPromiseDate(line.id, value);
  };

  const applyEarliest = () => {
    setErrors({});
    setBulkNote(null);
    dateable.forEach(l => onSetPromiseDate(l.id, earliestPromiseDate(l, orderPlaced)));
  };

  const applyToAll = () => {
    if (!bulkDate) return;
    if (isWeekend(bulkDate)) { setBulkNote('Weekends are not available.'); return; }
    setErrors({});
    let clamped = 0;
    dateable.forEach(l => {
      const earliest = earliestPromiseDate(l, orderPlaced);
      if (bulkDate < earliest) { clamped += 1; onSetPromiseDate(l.id, earliest); }
      else onSetPromiseDate(l.id, bulkDate);
    });
    setBulkNote(clamped > 0 ? `${clamped} line${clamped !== 1 ? 's' : ''} can't arrive that early and ${clamped !== 1 ? 'were' : 'was'} set to ${clamped !== 1 ? 'their' : 'its'} earliest date.` : null);
  };

  const btn = { ...sBodyB, height: 36, padding: '0 14px', border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: '#fff', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,9,0.32)', zIndex: 130 }} onClick={onClose} />
      <div
        role="dialog" aria-modal="true" aria-label="Promise dates and delivery charges"
        style={{
          position: 'fixed', zIndex: 131, top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 1040, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)',
          display: 'flex', flexDirection: 'column',
          background: '#fff', border: '2px solid #000', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-pop)',
          animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ ...sLargeB, margin: 0 }}>Promise Dates &amp; Delivery Charges</h2>
          <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section aria-label="Promise dates">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ ...sBody, color: 'var(--ink-2)', marginRight: 'auto' }}>
                {undated === 0 ? 'Every line has a promise date.' : `${undated} line${undated !== 1 ? 's' : ''} still need a promise date.`}
                {skipped > 0 && ` ${skipped} line${skipped !== 1 ? 's' : ''} that need attention can't be dated yet.`}
              </div>
              <button onClick={applyEarliest} className="om-stroke-btn" style={btn}>Use earliest date for all</button>
              <label htmlFor="dm-bulk-date" style={{ ...sBodyB, fontSize: 11, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Set all to</label>
              <input id="dm-bulk-date" type="date" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} style={dateInput} />
              <button onClick={applyToAll} disabled={!bulkDate} className="om-stroke-btn" style={{ ...btn, opacity: bulkDate ? 1 : 0.5, cursor: bulkDate ? 'pointer' : 'not-allowed' }}>Apply</button>
            </div>
            {bulkNote && <div role="status" style={{ ...sBody, color: 'var(--yellow-60)', background: 'var(--amber-soft)', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 12 }}>{bulkNote}</div>}

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: 48 }}>#</th>
                    <th style={th}>Article</th>
                    <th style={{ ...th, textAlign: 'center' }}>Qty</th>
                    <th style={{ ...th, textAlign: 'center' }}>Lead time</th>
                    <th style={th}>Earliest date</th>
                    <th style={th}>Promise date</th>
                  </tr>
                </thead>
                <tbody>
                  {dateable.length === 0 && (
                    <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--ink-2)' }}>There are no valid lines to date yet.</td></tr>
                  )}
                  {dateable.map((l, i) => {
                    const earliest = earliestPromiseDate(l, orderPlaced);
                    const lead = l.leadTime ?? mockLeadTime(l.productLine);
                    return (
                      <tr key={l.id}>
                        <td style={{ ...td, color: 'var(--ink-2)' }}>{i + 1}</td>
                        <td style={td}>
                          <div style={sBodyB}>{l.articleCode}</div>
                          <div style={{ ...sBody, fontSize: 12, color: 'var(--ink-2)' }}>{l.productName ?? l.featureString}</div>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>{l.qty}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{lead.label} days</td>
                        <td style={td}>{formatDeliveryDate(earliest)}</td>
                        <td style={td}>
                          <input
                            type="date" aria-label={`Promise date for ${l.articleCode}`}
                            value={l.promiseDate ?? ''} min={earliest}
                            onChange={(e) => onLineDate(l, e.target.value)}
                            style={{ ...dateInput, borderColor: errors[l.id] ? 'var(--red)' : 'var(--ink)' }}
                          />
                          {errors[l.id] && <div style={{ ...sBody, fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{errors[l.id]}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Delivery charges">
            <h3 style={{ ...sLargeB, margin: '0 0 4px' }}>Delivery charges</h3>
            <p style={{ ...sBody, color: 'var(--ink-2)', margin: '0 0 12px' }}>
              One delivery per promise date.{' '}
              {charges.isFree
                ? `This order is over ${money(charges.freeOver, currency)}, so delivery is free.`
                : `Delivery is free on orders over ${money(charges.freeOver, currency)}.`}
            </p>
            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Delivery date</th>
                    <th style={{ ...th, textAlign: 'center' }}>Lines</th>
                    <th style={{ ...th, textAlign: 'right' }}>Delivery</th>
                    <th style={{ ...th, textAlign: 'center' }}>Timed delivery</th>
                    <th style={{ ...th, textAlign: 'right' }}>Charge</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.rows.length === 0 && (
                    <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: 'var(--ink-2)' }}>Choose promise dates to see delivery charges.</td></tr>
                  )}
                  {charges.rows.map(r => (
                    <tr key={r.date}>
                      <td style={{ ...td, ...sBodyB }}>{formatDeliveryDate(r.date)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{r.lineCount}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{r.base === 0 ? 'Free' : money(r.base, currency)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={r.timed} onChange={() => onToggleTimed(r.date)} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
                          <span style={{ ...sBody, color: 'var(--ink-2)' }}>{r.timed ? `+${money(r.timedAmount, currency)}` : 'Add timed slot'}</span>
                        </label>
                      </td>
                      <td style={{ ...td, textAlign: 'right', ...sBodyB }}>{r.amount === 0 ? 'Free' : money(r.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
                {charges.rows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ ...td, textAlign: 'right', ...sBodyB }}>Total delivery charges</td>
                      <td style={{ ...td, textAlign: 'right', ...sBodyB }}>{charges.total === 0 ? 'Free' : money(charges.total, currency)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p style={{ ...sBody, fontSize: 12, color: 'var(--ink-3)', margin: '10px 0 0' }}>
              Prototype: lead times, available dates and charges are illustrative. The real build will use the delivery rules for the delivery address.
            </p>
          </section>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="om-primary-btn"
            style={{ ...sLargeB, height: 50, padding: '0 28px', border: '2px solid var(--brand)', borderRadius: 'var(--radius)', background: 'var(--brand)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}
