import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import { t, size } from '../../tokens';
import { setVariant } from '../../hooks/useVariant';
import type { Variant } from '../../variants';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };
const sLargeM = { ...t.large };

interface ScenarioItem { code: string; feature: string; product: string; qty: number }

interface Scenario {
  title: string;
  /** Order page layout this scenario runs on: a = original, b = side panel, c = tabbed */
  variant: Variant;
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
    variant: 'a',
    story: 'A dealer has sent you a basket from their design tool. Bring it into EOS and get the order submitted. Finish by checking your export brings the basket back.',
    items: null,
    file: { href: '/scenarios/scenario-1-basket.obx', label: 'Download the basket file (.obx)', note: 'Save it to your computer, then upload it on the import page.' },
    tasks: [
      'Upload the basket file below.',
      'Add a contract to the basket.',
      'Export your basket as an EOS file (.eos) before you create the order.',
      'Create the order, with a reference and purchase order of your choice.',
      'Choose a delivery address from the dropdown.',
      'Give every line a delivery date and submit the order.',
      'Upload the .eos file you exported on the import page. Check the items match.',
    ],
  },
  {
    title: 'Something to fix',
    variant: 'b',
    story: 'A colleague has prepared a spreadsheet for a customer. Import it and get the order submitted. Something may need fixing along the way.',
    items: null,
    file: { href: '/scenarios/scenario-2-order-sheet.xlsx', label: 'Download the spreadsheet (.xlsx)', note: 'Save it to your computer, then upload it on the import page.' },
    tasks: [
      'Upload the spreadsheet below. When asked, tell EOS which columns hold the article code, the feature string and the quantity.',
      'Deal with any problem you find however you think is right.',
      'Create the order, with a reference and purchase order of your choice.',
      'Choose a delivery address from the dropdown.',
      'Choose delivery dates and submit the order.',
    ],
  },
  {
    title: 'Staggered delivery',
    variant: 'c',
    story: 'The customer wants the chairs first and the tables a few weeks later. Build the order and set the delivery dates to suit.',
    items: [
      { code: 'AS2EA33AA', feature: 'N2 BK BB BK BK 7O005', product: 'Sayl chair', qty: 4 },
      { code: 'MIR2B33DW', feature: 'ALP G1 G1 G1 BB BK', product: 'Mirra chair', qty: 4 },
      { code: 'MEXXAW.0909S4MG', feature: 'NN X1 X1 X1 X1', product: 'Civic table', qty: 2 },
      { code: 'MEXXBW.1016S4MG', feature: 'NN X1 X1 X1 X1 X1', product: 'Civic table', qty: 2 },
    ],
    tasks: [
      'Paste the articles below, with their feature strings, into a new order, then set the quantities.',
      'Create the order, with a reference and purchase order of your choice.',
      'Choose a delivery address from the dropdown.',
      'Deliver the chairs as early as possible. Deliver the tables at least two weeks after the chairs.',
      'Submit the order.',
    ],
  },
];

const label = { ...sBodyB, fontSize: 11, color: 'var(--ink-2)', textTransform: 'uppercase' as const, letterSpacing: 0.6 };
const btn = { ...sLargeB, height: 50, padding: '0 22px', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' as const };

const CSS = `
  .eos-scn-stroke { transition: background .15s ease, color .15s ease; }
  .eos-scn-stroke:hover { background: var(--ink-fill) !important; color: #fff !important; }
  .eos-scn-primary { transition: background .15s ease; }
  .eos-scn-primary:hover { background: var(--brand-dark) !important; border-color: var(--brand-dark) !important; }
`;

export default function ScenarioCardPage() {
  const { n } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

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
      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current={`scenario${index + 1}` as 'scenario1' | 'scenario2' | 'scenario3'} />

      <main style={{ minHeight: `calc(100vh - ${size.navH}px)`, background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, boxSizing: 'border-box' }}>
        <article
          aria-label={`Scenario ${index + 1}: ${scenario.title}`}
          style={{ width: 768, maxWidth: '100%', background: 'var(--bg)', border: '2px solid var(--strong)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-pop)', padding: 18, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={label}>Scenario {index + 1} of {SCENARIOS.length}</span>
              <span aria-hidden style={{ display: 'flex', gap: 6 }}>
                {SCENARIOS.map((_, i) => (
                  <span key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i === index ? 'var(--brand)' : 'var(--line)' }} />
                ))}
              </span>
            </div>
            <h1 style={{ fontWeight: 700, fontSize: 28, lineHeight: 1.2, letterSpacing: '-0.01em', margin: 0, color: 'var(--ink)' }}>{scenario.title}</h1>
            <p style={{ ...sLargeM, fontSize: 14.5, margin: 0, color: 'var(--ink-2)', lineHeight: 1.35 }}>{scenario.story}</p>
          </header>

          <section aria-label="Your tasks" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={label}>Your tasks</div>
            <ol style={{ ...sLargeM, fontSize: 14.5, margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--ink)', lineHeight: 1.35 }}>
              {scenario.tasks.map(task => <li key={task}>{task}</li>)}
            </ol>
          </section>

          {scenario.items && (
            <section aria-label="Items" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={label}>Items</div>
                <button onClick={copyCodes} className="eos-scn-stroke"
                  style={{ ...sBodyB, height: 30, padding: '0 12px', border: '2px solid var(--strong)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {copied ? 'Copied' : 'Copy codes and features'}
                </button>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {[{ h: 'Article code' }, { h: 'Feature string' }, { h: 'Product' }, { h: 'Qty', c: true }].map(({ h, c }) => (
                        <th key={h} style={{ ...sBodyB, fontSize: 12.5, color: '#fff', background: 'var(--ink-fill)', textAlign: c ? 'center' : 'left', padding: '0 14px', height: 30 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scenario.items.map(i => (
                      <tr key={i.code}>
                        <td style={{ ...sBodyB, padding: '4px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>{i.code}</td>
                        <td style={{ ...sBody, padding: '4px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>{i.feature}</td>
                        <td style={{ ...sBody, padding: '4px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink-2)' }}>{i.product}</td>
                        <td style={{ ...sBody, padding: '4px 14px', borderTop: '1px solid var(--line)', color: 'var(--ink)', textAlign: 'center' }}>{i.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {scenario.file && (
            <section aria-label="File" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={label}>File</div>
              <a href={scenario.file.href} download className="eos-scn-stroke"
                style={{ ...btn, height: 44, alignSelf: 'flex-start', border: '2px solid var(--strong)', background: 'var(--bg)', color: 'var(--ink)' }}>
                {scenario.file.label}
              </a>
              <span style={{ ...sBody, color: 'var(--ink-2)' }}>{scenario.file.note}</span>
            </section>
          )}

          <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <span style={{ ...sBody, color: 'var(--ink-2)' }}>Please think out loud as you go.</span>
            <button onClick={() => { setVariant('orderPage', scenario.variant); navigate('/'); }} className="eos-scn-primary"
              style={{ ...btn, height: 44, border: '2px solid var(--brand)', background: 'var(--brand)', color: '#fff' }}>
              Start scenario
            </button>
          </footer>
        </article>
      </main>
    </>
  );
}
