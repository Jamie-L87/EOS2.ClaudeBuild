import { useState } from 'react';
import { AlphaBrand } from '../../components/AlphaBrand';
import { useSearchParams } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import NavDrawer from '../../components/NavDrawer';
import { color, size, t } from '../../tokens';
import MyPreferencesTab from '../MyPreferences/MyPreferences';
import PreferenceManagementTab from '../PreferenceManagement/PreferenceManagement';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

type TabId = 'my' | 'manage';

export default function PreferencesPage() {
  const [navOpen, setNavOpen] = useState(false);
  const [params, setParams] = useSearchParams();

  const isAdmin = (sessionStorage.getItem('eos-user-role') ?? 'Admin') === 'Admin';
  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'my', label: 'My Preferences' },
    ...(isAdmin ? [{ id: 'manage' as const, label: 'Manage Preferences' }] : []),
  ];
  const requested = params.get('tab');
  const active: TabId = requested === 'manage' && isAdmin ? 'manage' : 'my';

  return (
    <>
      <style>{`
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
        input:focus, select:focus { border-color: var(--brand) !important; box-shadow: 0 0 0 4px rgba(226,45,0,0.08); }
        .eos-primary-btn:not(:disabled):hover { background: var(--brand-dark) !important; border-color: var(--brand-dark) !important; }
        .eos-primary-btn:disabled { background: var(--line) !important; color: var(--ink-3) !important; border-color: var(--line) !important; cursor: not-allowed !important; }
        .eos-stroke-btn:hover { background: var(--ink-fill) !important; color: var(--on-ink) !important; border-color: var(--strong) !important; }
        .eos-pref-option:hover { background: var(--bg-soft) !important; }
        .eos-row:hover { background: var(--bg-soft); }
        .eos-pref-tab:not([aria-selected="true"]):hover { color: var(--ink) !important; }
      `}</style>

      <TopNav onMenu={() => setNavOpen(true)} />
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} current={active === 'manage' ? 'preferenceManagement' : null} />

      <main style={{ maxWidth: size.maxWidth, margin: '0 auto', padding: `0 ${size.pagePad}px 40px` }}>
        <header style={{ marginTop: 24 }}>
          <h1 style={{ ...sLargeB, fontSize: 33.18, lineHeight: 1.2, margin: 0 }}>Preferences</h1>
        </header>

        {tabs.length > 1 && (
          <div role="tablist" style={{ display: 'flex', gap: 24, marginTop: 20, borderBottom: '1px solid var(--line)' }}>
            {tabs.map(tab => {
              const selected = tab.id === active;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={selected}
                  className="eos-pref-tab"
                  onClick={() => setParams(tab.id === 'my' ? {} : { tab: tab.id }, { replace: true })}
                  style={{
                    ...sBodyB,
                    height: size.hit,
                    padding: 0,
                    border: 'none',
                    borderBottom: `3px solid ${selected ? 'var(--brand)' : 'transparent'}`,
                    marginBottom: -1,
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: selected ? 'var(--ink)' : 'var(--ink-2)',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          {active === 'manage' ? <PreferenceManagementTab /> : <MyPreferencesTab />}
        </div>
      </main>

      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', height: 72, marginTop: 40, borderTop: '1px solid var(--line)', background: color.bg }}>
        <AlphaBrand uppercase style={{ ...sLargeB, color: 'var(--brand-text)', letterSpacing: '0.05em' }} />
        <span style={{ ...sBody, color: 'var(--ink-2)' }}>2026 - MillerKnoll</span>
        <span style={{ ...sBodyB, color: 'var(--ink-2)' }}>Tsunami Axis Ltd</span>
      </footer>
    </>
  );
}
