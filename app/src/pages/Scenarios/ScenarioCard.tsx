import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { t } from '../../tokens';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };
const sLargeM = { ...t.large };

interface ScenarioItem { code: string; feature: string; product: string; qty: number }

interface Scenario {
  title: string;
  story: string;
  /** Tasks, in order. Shown as a numbered list. */
  tasks: string[];
  /** Items to paste in (code plus feature string), or null when the scenario starts from a file */
  items: ScenarioItem[] | null;
  file?: { href: string; label: string; note: string };
}

const SCENARIOS: Scenario[] = [
  {
    title: 'Office refresh',
    story: 'A dealer has sent you a basket from their design tool. Bring it into EOS, check it survives a save and reload, then get the order submitted.',
    items: null,
    file: { href: '/scenarios/scenario-1-basket.obx', label: 'Download the basket file (.obx)', note: 'Save it to your computer, then upload it on the import page.' },
    tasks: [
      'Upload the basket file below.',
      'Export your basket as an EOS file (.eos).',
      'Clear the basket, then import the .eos file you just exported. Check the items and quantities match.',
      'Create the order, with a reference and purchase order of your choice.',
      'Add any UK delivery address.',
      'Give every line a delivery date and submit the order.',
    ],
  },
  {
    title: 'Something to fix',
    story: 'A colleague has prepared a spreadsheet for a customer. Import it and get the order submitted. Something may need fixing along the way.',
    items: null,
    file: { href: '/scenarios/scenario-2-order-sheet.xlsx', label: 'Download the spreadsheet (.xlsx)', note: 'Save it to your computer, then upload it on the import page.' },
    tasks: [
      'Upload the spreadsheet below. When asked, tell EOS which columns hold the article code, the feature string and the quantity.',
      'Deal with any problem you find however you think is right.',
      'Create the order, with a reference and purchase order of your choice.',
      'Add a delivery address of your choice.',
      'Choose delivery dates and submit the order.',
    ],
  },
  {
    title: 'Staggered delivery',
    story: 'The customer wants the chairs first and the tables a few weeks later. Build the order and set the delivery dates to suit.',
    items: [
      { code: 'AS2EA33AA', feature: 'N2 BK BB BK BK 7O005', product: 'Sayl chair', qty: 4 },
      { code: 'MIR2B33DW', feature: 'ALP G1 G1 G1 BB BK', product: 'Mirra chair', qty: 4 },
      { code: 'MEXXAW.0909S4MG', feature: 'NN X1 X1 X1 X1', product: 'Civic table', qty: 2 },
      { code: 'MEXXBW.1016S4MG', feature: 'NN X1 X1 X1 X1 X1', product: 'Civic table', qty: 2 },
    ],
    tasks: [
      'Add the items below to a new order by pasting the article codes with their feature strings, then set the quantities.',
      'Create the order, with a reference and purchase order of your choice.',
      'Add a delivery address of your choice.',
      'Deliver the chairs as early as possible. Deliver the tables at least two weeks after the chairs.',
      'Submit the order.',
    ],
  },
];

const label = { ...sBodyB, fontSize: 11, color: 'var(--ink-2)', textTransform: 'uppercase' as const, letterSpacing: 0.6 };
const btn = { ...sLargeB, height: 50, padding: '0 22px', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' as const };

const CSS = `
  .eos-scn-stroke { transition: background .15s ease, color .15s ease; }
  .eos-scn-stroke:hover { background: var(--ink) !important; color: #fff !important; }
  .eos-scn-primary { transition: background .15s ease; }
  .eos-scn-primary:hover { background: var(--brand-dark) !important; border-color: var(--brand-dark) !important; }
`;

export default function ScenarioCardPage() {
  const { n } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const index = Number(n) - 1;
  const scenario = SCENARIOS[index];
  if (!scenario) return <Navigate to="/scenarios/1" replace />;

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText((scenario.items ?? []).map(i => `${i.code} ${i.feature}`).join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable: codes are still visible to type */ }
  };

  return (
    <>
      <style>{CSS}</style>
      <main style={{ minHeight: '100vh', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box' }}>
        <article
          aria-label={`Scenario ${index + 1}: ${scenario.title}`}
          style={{ width: 640, maxWidth: '100%', background: '#fff', border: '2px solid var(--ink)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-pop)', padding: 40, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 28 }}
        >
          <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={label}>Scenario {index + 1} of {SCENARIOS.length}</span>
              <span aria-hidden style={{ display: 'flex', gap: 6 }}>
                {SCENARIOS.map((_, i) => (
                  <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === index ? 'var(--brand)' : 'var(--line)' }} />
                ))}
              </span>
            </div>
            <h1 style={{ fontWeight: 700, fontSize: 33.18, lineHeight: 1.2, letterSpacing: '-0.01em', margin: 0, color: 'var(--ink)' }}>{scenario.title}</h1>
            <p style={{ ...sLargeM, margin: 0, color: 'var(--ink-2)', lineHeight: 1.4 }}>{scenario.story}</p>
          </header>

          <section aria-label="Your tasks" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={label}>Your tasks</div>
            <ol style={{ ...sLargeM, margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 10, color: 'var(--ink)', lineHeight: 1.35 }}>
              {scenario.tasks.map(task => <li key={task}>{task}</li>)}
            </ol>
          </section>

          {scenario.items && (
            <section aria-label="Items" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={label}>Items</div>
                <button onClick={copyCodes} className="eos-scn-stroke"
                  style={{ ...sBodyB, height: 36, padding: '0 14px', border: '2px solid var(--ink)', borderRadius: 'var(--radius)', background: '#fff', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? 'Copied' : 'Copy codes and features'}
                </button>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {[{ h: 'Article code' }, { h: 'Feature string' }, { h: 'Product' }, { h: 'Qty', c: true }].map(({ h, c }) => (
                        <th key={h} style={{ ...sBodyB, fontSize: 12.5, color: '#fff', background: 'var(--ink)', textAlign: c ? 'center' : 'left', padding: '0 14px', height: 40 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scenario.items.map(i => (
                      <tr key={i.code}>
                        <td style={{ ...sBodyB, padding: '10px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>{i.code}</td>
                        <td style={{ ...sBody, padding: '10px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>{i.feature}</td>
                        <td style={{ ...sBody, padding: '10px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink-2)' }}>{i.product}</td>
                        <td style={{ ...sBody, padding: '10px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink)', textAlign: 'center' }}>{i.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {scenario.file && (
            <section aria-label="File" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={label}>File</div>
              <a href={scenario.file.href} download className="eos-scn-stroke"
                style={{ ...btn, alignSelf: 'flex-start', border: '2px solid var(--ink)', background: '#fff', color: 'var(--ink)' }}>
                {scenario.file.label}
              </a>
              <span style={{ ...sBody, color: 'var(--ink-2)' }}>{scenario.file.note}</span>
            </section>
          )}

          <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            <span style={{ ...sBody, color: 'var(--ink-2)' }}>Please think out loud as you go.</span>
            <button onClick={() => navigate('/')} className="eos-scn-primary"
              style={{ ...btn, border: '2px solid var(--brand)', background: 'var(--brand)', color: '#fff' }}>
              Start scenario
            </button>
          </footer>
        </article>
      </main>
    </>
  );
}
