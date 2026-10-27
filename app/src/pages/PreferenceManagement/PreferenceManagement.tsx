import { useEffect, useMemo, useState } from 'react';
import { IconClose, IconEdit, IconEye, IconPlus } from '../../components/Icons';
import { color, radius, size, t } from '../../tokens';
import {
  PREFERENCE_DATA_TYPES,
  isValueSourceApi,
  resolveValueSource,
  type PreferenceDataType,
  type PreferenceDefinition,
} from '../../data/preferences';
import { loadAllPreferenceDefinitions, saveAllPreferenceDefinitions } from '../../services/preferencesStore';
import { IconActionButton, PrimaryButton, StrokeButton } from '../CatalogueAccessAdmin/shared';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };
const sLargeB = { ...t.largeB };

type YesNoAll = 'all' | 'yes' | 'no';
type Mode = 'create' | 'edit' | 'view';

interface Filters {
  code: string;
  name: string;
  dataType: PreferenceDataType | 'all';
  allowEdit: YesNoAll;
  api: string;
  active: YesNoAll;
}

const EMPTY_FILTERS: Filters = { code: '', name: '', dataType: 'all', allowEdit: 'all', api: '', active: 'all' };

const labelStyle = { ...sBodyB, color: 'var(--ink-2)', textTransform: 'uppercase' as const, letterSpacing: 0.6, fontSize: 11, display: 'block', marginBottom: 6 };
const inputStyle = {
  ...sBody,
  width: '100%',
  height: 44,
  boxSizing: 'border-box' as const,
  border: '2px solid var(--ink)',
  borderRadius: 'var(--radius)',
  padding: '0 12px',
  fontFamily: 'inherit',
  color: 'var(--ink)',
  background: color.bg,
};

const yesNo = (v: boolean) => (v ? 'Yes' : 'No');
const matchesYesNo = (f: YesNoAll, v: boolean) => f === 'all' || (f === 'yes') === v;

function emptyDefinition(nextOrder: number): PreferenceDefinition {
  return {
    preferenceCode: '',
    preferenceName: '',
    description: '',
    dataType: 'DROPDOWN',
    isMultiValue: false,
    allowEditInPreference: true,
    valueSourceApi: '',
    displayOrder: nextOrder,
    isActive: true,
  };
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
      {error && <span style={{ ...sBody, color: 'var(--red)', display: 'block', marginTop: 6 }}>{error}</span>}
    </div>
  );
}

function YesNoSelect({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <select disabled={disabled} value={value ? 'yes' : 'no'} onChange={e => onChange(e.target.value === 'yes')} style={{ ...inputStyle, opacity: disabled ? 0.5 : 1 }}>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

function PreferenceForm({
  mode, initial, existingCodes, onCancel, onSave,
}: {
  mode: Mode;
  initial: PreferenceDefinition;
  existingCodes: string[];
  onCancel: () => void;
  onSave: (d: PreferenceDefinition) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof PreferenceDefinition, string>>>({});
  const readOnly = mode === 'view';
  const set = <K extends keyof PreferenceDefinition>(k: K, v: PreferenceDefinition[K]) => setDraft(d => ({ ...d, [k]: v }));
  const usesSource = draft.dataType === 'DROPDOWN' || draft.dataType === 'MULTISELECT';
  const sourcePreview = usesSource && draft.valueSourceApi.trim() && !isValueSourceApi(draft.valueSourceApi)
    ? resolveValueSource(draft.valueSourceApi)
    : null;

  const submit = () => {
    const next: typeof errors = {};
    const code = draft.preferenceCode.trim().toUpperCase();
    if (!code) next.preferenceCode = 'Preference code is required.';
    else if (mode === 'create' && existingCodes.includes(code)) next.preferenceCode = `Preference code ${code} already exists.`;
    if (!draft.preferenceName.trim()) next.preferenceName = 'Preference name is required.';
    if (!draft.description.trim()) next.description = 'Description is required.';
    if (!Number.isInteger(draft.displayOrder)) next.displayOrder = 'Display order must be a whole number.';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({
      ...draft,
      preferenceCode: code,
      preferenceName: draft.preferenceName.trim(),
      description: draft.description.trim(),
      valueSourceApi: usesSource ? draft.valueSourceApi.trim() : '',
      isMultiValue: draft.dataType === 'MULTISELECT' ? true : draft.dataType === 'DROPDOWN' ? draft.isMultiValue : false,
    });
  };

  const title = mode === 'create' ? 'Create Preference' : mode === 'edit' ? 'Edit Preference' : 'View Preference';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,9,9,0.32)', zIndex: 130 }} onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed', zIndex: 131, top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 640, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)',
          display: 'flex', flexDirection: 'column',
          background: color.bg, border: '2px solid #000', borderRadius: radius, boxShadow: 'var(--shadow-pop)',
          animation: 'menuPop .14s cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <h2 style={{ ...sLargeB, margin: 0 }}>{title}</h2>
          <button onClick={onCancel} aria-label="Close" style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}>
            <IconClose size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignContent: 'start' }}>
          <Field label="Preference code" error={errors.preferenceCode}>
            <input
              value={draft.preferenceCode}
              disabled={mode !== 'create'}
              onChange={e => set('preferenceCode', e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              placeholder="e.g. LANG"
              maxLength={50}
              style={{ ...inputStyle, opacity: mode === 'create' ? 1 : 0.5 }}
            />
            {mode === 'create' && <span style={{ ...sBody, color: 'var(--ink-2)', display: 'block', marginTop: 6 }}>Cannot be changed after creation.</span>}
          </Field>
          <Field label="Preference name" error={errors.preferenceName}>
            <input value={draft.preferenceName} disabled={readOnly} onChange={e => set('preferenceName', e.target.value)} maxLength={200} style={{ ...inputStyle, opacity: readOnly ? 0.5 : 1 }} />
          </Field>

          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Description" error={errors.description}>
              <input value={draft.description} disabled={readOnly} onChange={e => set('description', e.target.value)} maxLength={500} placeholder="Shown under the field on My Preferences" style={{ ...inputStyle, opacity: readOnly ? 0.5 : 1 }} />
            </Field>
          </div>

          <Field label="Data type">
            <select disabled={readOnly} value={draft.dataType} onChange={e => set('dataType', e.target.value as PreferenceDataType)} style={{ ...inputStyle, opacity: readOnly ? 0.5 : 1 }}>
              {PREFERENCE_DATA_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Multi-value">
            <YesNoSelect
              disabled={readOnly || draft.dataType !== 'DROPDOWN'}
              value={draft.dataType === 'MULTISELECT' ? true : draft.dataType === 'DROPDOWN' ? draft.isMultiValue : false}
              onChange={v => set('isMultiValue', v)}
            />
          </Field>

          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Value source API">
              <input
                value={draft.valueSourceApi}
                disabled={readOnly || !usesSource}
                onChange={e => set('valueSourceApi', e.target.value)}
                placeholder={usesSource ? '/api/pdm/languages  or  DARK Mode|LIGHT Mode' : 'Not used by this data type'}
                maxLength={500}
                style={{ ...inputStyle, opacity: readOnly || !usesSource ? 0.5 : 1 }}
              />
              <span style={{ ...sBody, color: 'var(--ink-2)', display: 'block', marginTop: 6 }}>
                {sourcePreview
                  ? `Not an API path - will show ${sourcePreview.length} option${sourcePreview.length === 1 ? '' : 's'}: ${sourcePreview.map(o => o.label).join(', ')}`
                  : 'Optional. An API path that returns the options, or a list of options separated by "|".'}
              </span>
            </Field>
          </div>

          <Field label="Display order" error={errors.displayOrder}>
            <input
              type="number"
              step={1}
              value={Number.isNaN(draft.displayOrder) ? '' : draft.displayOrder}
              disabled={readOnly}
              onChange={e => set('displayOrder', e.target.value === '' ? NaN : Number(e.target.value))}
              style={{ ...inputStyle, opacity: readOnly ? 0.5 : 1 }}
            />
          </Field>
          <Field label="Is active">
            <YesNoSelect disabled={readOnly} value={draft.isActive} onChange={v => set('isActive', v)} />
          </Field>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ ...sBody, display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: readOnly ? 'default' : 'pointer' }}>
              <input type="checkbox" disabled={readOnly} checked={draft.allowEditInPreference} onChange={e => set('allowEditInPreference', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
              <span>
                <strong>Allow edit in preference</strong>
                <span style={{ display: 'block', color: 'var(--ink-2)' }}>
                  {draft.allowEditInPreference ? 'Shown on the My Preferences page.' : 'Hidden from the My Preferences page.'}
                </span>
              </span>
            </label>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', padding: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <StrokeButton onClick={onCancel}>{readOnly ? 'Close' : 'Cancel'}</StrokeButton>
          {!readOnly && <PrimaryButton onClick={submit}>{mode === 'create' ? 'Create' : 'Save'}</PrimaryButton>}
        </div>
      </div>
    </>
  );
}

export default function PreferenceManagementTab() {
  const [definitions, setDefinitions] = useState(loadAllPreferenceDefinitions);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [form, setForm] = useState<{ mode: Mode; def: PreferenceDefinition } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const rows = useMemo(() => {
    const has = (hay: string, needle: string) => hay.toLowerCase().includes(needle.trim().toLowerCase());
    return definitions
      .filter(d =>
        has(d.preferenceCode, filters.code) &&
        has(d.preferenceName, filters.name) &&
        (filters.dataType === 'all' || d.dataType === filters.dataType) &&
        matchesYesNo(filters.allowEdit, d.allowEditInPreference) &&
        has(d.valueSourceApi, filters.api) &&
        matchesYesNo(filters.active, d.isActive))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [definitions, filters]);

  const persist = (next: PreferenceDefinition[], message: string) => {
    setDefinitions(next);
    saveAllPreferenceDefinitions(next);
    setToast(message);
  };

  const save = (d: PreferenceDefinition) => {
    const exists = definitions.some(x => x.preferenceCode === d.preferenceCode);
    persist(exists ? definitions.map(x => (x.preferenceCode === d.preferenceCode ? d : x)) : [...definitions, d], exists ? 'Preference updated' : 'Preference created');
    setForm(null);
  };

  // Deactivate sets IsActive = 0 - records are never physically deleted.
  const toggleActive = (d: PreferenceDefinition) =>
    persist(definitions.map(x => (x.preferenceCode === d.preferenceCode ? { ...x, isActive: !x.isActive } : x)), d.isActive ? 'Preference deactivated' : 'Preference activated');

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters(f => ({ ...f, [k]: v }));
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const th = { ...sBodyB, fontSize: 12.5, color: color.bg, background: 'var(--ink)', textAlign: 'left' as const, padding: '0 16px', height: 44 };
  const td = { ...sBody, padding: '0 16px', height: size.rowH, borderBottom: '1px solid var(--line)', color: 'var(--ink)' };

  const yesNoFilter = (v: YesNoAll, onChange: (v: YesNoAll) => void) => (
    <select value={v} onChange={e => onChange(e.target.value as YesNoAll)} style={inputStyle}>
      <option value="all">All</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );

  return (
    <>
      <p style={{ ...sBody, margin: '0 0 16px', color: 'var(--ink-2)' }}>Define the preferences users can set on their My Preferences page.</p>

          <section style={{ border: '1px solid var(--line)', borderRadius: radius, background: color.bg, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ ...sLargeB, margin: 0 }}>Preferences</h2>
              <PrimaryButton onClick={() => setForm({ mode: 'create', def: emptyDefinition(Math.max(0, ...definitions.map(d => d.displayOrder)) + 1) })}>
                <IconPlus size={16} />
                Create
              </PrimaryButton>
            </div>

            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'end' }}>
              <Field label="Preference code"><input value={filters.code} onChange={e => setFilter('code', e.target.value)} style={inputStyle} /></Field>
              <Field label="Preference name"><input value={filters.name} onChange={e => setFilter('name', e.target.value)} style={inputStyle} /></Field>
              <Field label="Data type">
                <select value={filters.dataType} onChange={e => setFilter('dataType', e.target.value as Filters['dataType'])} style={inputStyle}>
                  <option value="all">All</option>
                  {PREFERENCE_DATA_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Allow edit in preference">{yesNoFilter(filters.allowEdit, v => setFilter('allowEdit', v))}</Field>
              <Field label="API"><input value={filters.api} onChange={e => setFilter('api', e.target.value)} style={inputStyle} /></Field>
              <Field label="Is active">{yesNoFilter(filters.active, v => setFilter('active', v))}</Field>
              {filtersActive && <div><StrokeButton onClick={() => setFilters(EMPTY_FILTERS)}>Clear</StrokeButton></div>}
            </div>

            <div style={{ padding: 24, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Preference code</th>
                    <th style={th}>Name</th>
                    <th style={th}>Data type</th>
                    <th style={th}>Allow edit in preference</th>
                    <th style={th}>API</th>
                    <th style={th}>Is active</th>
                    <th style={{ ...th, width: 300 }} />
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--ink-2)' }}>No preferences match.</td></tr>
                  )}
                  {rows.map(d => (
                    <tr key={d.preferenceCode} className="eos-row" style={{ opacity: d.isActive ? 1 : 0.6 }}>
                      <td style={{ ...td, ...sBodyB }}>{d.preferenceCode}</td>
                      <td style={td}>{d.preferenceName}</td>
                      <td style={td}>{d.dataType}</td>
                      <td style={td}>{yesNo(d.allowEditInPreference)}</td>
                      <td style={td}>{d.valueSourceApi}</td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: d.isActive ? 'var(--green)' : 'var(--ink-2)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 4, background: d.isActive ? 'var(--green)' : 'var(--ink-3)' }} />
                          {yesNo(d.isActive)}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', gap: 8 }}>
                          <IconActionButton label="View" icon={<IconEye size={14} />} onClick={() => setForm({ mode: 'view', def: d })} />
                          <IconActionButton label="Edit" icon={<IconEdit size={14} />} onClick={() => setForm({ mode: 'edit', def: d })} />
                          <IconActionButton label={d.isActive ? 'Deactivate' : 'Activate'} icon={null} onClick={() => toggleActive(d)} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

      {form && (
        <PreferenceForm
          mode={form.mode}
          initial={form.def}
          existingCodes={definitions.map(d => d.preferenceCode)}
          onCancel={() => setForm(null)}
          onSave={save}
        />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink)', color: color.bg, padding: '12px 18px', borderRadius: radius, ...sBody, zIndex: 200 }}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ marginLeft: 10, border: 'none', background: 'transparent', color: color.bg, cursor: 'pointer' }}>
            <IconClose size={13} />
          </button>
        </div>
      )}
    </>
  );
}
