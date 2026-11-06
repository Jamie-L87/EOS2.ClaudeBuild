import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconChevronDown, IconClose, IconSearch } from '../../components/Icons';
import { color, radius, t } from '../../tokens';
import {
  isMultiPreference,
  resolveValueSource,
  type PreferenceDefinition,
  type PreferenceOption,
  type UserPreferenceValues,
} from '../../data/preferences';
import {
  loadEditablePreferenceDefinitions,
  loadUserPreferences,
  resetUserPreference,
  saveUserPreferences,
} from '../../services/preferencesStore';
import { DateInput, PrimaryButton, StrokeButton } from '../CatalogueAccessAdmin/shared';

const sBody = { ...t.body };
const sBodyB = { ...t.bodyB };

const labelStyle = { ...sBodyB, color: 'var(--ink-2)', textTransform: 'uppercase' as const, letterSpacing: 0.6, fontSize: 11 };
const inputStyle = {
  ...sBody,
  width: '100%',
  height: 44,
  boxSizing: 'border-box' as const,
  border: '2px solid var(--strong)',
  borderRadius: 'var(--radius)',
  padding: '0 12px',
  fontFamily: 'inherit',
  color: 'var(--ink)',
  background: color.bg,
};

interface ControlProps {
  def: PreferenceDefinition;
  options: PreferenceOption[] | null;
  value: string[];
  onChange: (next: string[]) => void;
}

function SingleSelect({ def, options, value, onChange }: ControlProps) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        aria-label={def.preferenceName}
        value={value[0] ?? ''}
        onChange={e => onChange(e.target.value ? [e.target.value] : [])}
        style={{ ...inputStyle, appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
      >
        <option value="">Not set</option>
        {(options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 12, top: 0, bottom: 0, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
        <IconChevronDown size={18} />
      </span>
    </div>
  );
}

function MultiSelect({ def, options, value, onChange }: ControlProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);

  const labelOf = (v: string) => options?.find(o => o.value === v)?.label ?? v;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (options ?? []).filter(o => !value.includes(o.value) && (!q || o.label.toLowerCase().includes(q))).slice(0, 50);
  }, [options, query, value]);

  return (
    <div ref={wrapRef} style={{ display: 'grid', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconSearch size={16} stroke={1.8} />
          <input
            aria-label={`Search ${def.preferenceName}`}
            value={query}
            placeholder="Search..."
            onFocus={() => setOpen(true)}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
            style={{ ...sBody, border: 'none', outline: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', color: 'var(--ink)' }}
          />
        </label>
        {open && (
          <div role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: color.bg, border: '2px solid var(--modal-border)', borderRadius: radius, boxShadow: 'var(--shadow-pop)', zIndex: 20, maxHeight: 240, overflowY: 'auto' }}>
            {matches.length === 0 && <div style={{ ...sBody, color: 'var(--ink-3)', padding: '10px 16px' }}>No matches</div>}
            {matches.map(o => (
              <button
                key={o.value}
                role="option"
                aria-selected={false}
                className="eos-pref-option"
                onClick={() => { onChange([...value, o.value]); setQuery(''); }}
                style={{ ...sBody, display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', borderBottom: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)' }}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {value.length === 0 ? (
        <span style={{ ...sBody, color: 'var(--ink-3)' }}>Nothing selected.</span>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {value.map(v => (
            <li key={v} style={{ ...sBody, display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}>
              <span style={{ color: 'var(--green)', display: 'flex' }}><IconCheck size={16} stroke={2.2} /></span>
              <span style={{ flex: 1 }}>{labelOf(v)}</span>
              <button
                aria-label={`Remove ${labelOf(v)}`}
                onClick={() => onChange(value.filter(x => x !== v))}
                style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-2)' }}
              >
                <IconClose size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Checkbox({ def, value, onChange }: ControlProps) {
  const checked = value[0] === 'true';
  return (
    <label style={{ ...sBody, display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange([String(e.target.checked)])} style={{ width: 18, height: 18, accentColor: 'var(--brand)', cursor: 'pointer' }} />
      {def.preferenceName}
    </label>
  );
}

/** Picks the control from the definition's DataType alone - no preference-specific code. */
function PreferenceControl(props: ControlProps) {
  const { def, value, onChange } = props;
  switch (def.dataType) {
    case 'TEXTBOX':
      return <input aria-label={def.preferenceName} value={value[0] ?? ''} onChange={e => onChange(e.target.value ? [e.target.value] : [])} style={inputStyle} />;
    case 'CHECKBOX':
      return <Checkbox {...props} />;
    case 'DATE':
      return <DateInput value={value[0] ?? ''} onChange={iso => onChange(iso ? [iso] : [])} style={{ ...inputStyle, width: 160 }} />;
    default:
      return isMultiPreference(def) ? <MultiSelect {...props} /> : <SingleSelect {...props} />;
  }
}

export default function MyPreferencesTab() {
  const [definitions] = useState(loadEditablePreferenceDefinitions);
  const [saved, setSaved] = useState<UserPreferenceValues>(loadUserPreferences);
  const [draft, setDraft] = useState<UserPreferenceValues>(saved);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const optionsByCode = useMemo(
    () => Object.fromEntries(definitions.map(d => [d.preferenceCode, resolveValueSource(d.valueSourceApi)])),
    [definitions],
  );

  const same = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((v, i) => v === b[i]);
  const dirty = definitions.some(d => !same(draft[d.preferenceCode], saved[d.preferenceCode]));

  const save = () => {
    const payload: UserPreferenceValues = {};
    definitions.forEach(d => { payload[d.preferenceCode] = draft[d.preferenceCode] ?? []; });
    saveUserPreferences(payload);
    setSaved(loadUserPreferences());
    setToast('Preferences saved');
  };

  const reset = (code: string) => {
    const next = resetUserPreference(code);
    setSaved(next);
    setDraft(d => { const { [code]: _removed, ...rest } = d; return rest; });
    setToast('Preference reset');
  };

  return (
    <>
      <p style={{ ...sBody, margin: '0 0 16px', color: 'var(--ink-2)' }}>Personalise EOS. These settings only apply to you.</p>

        <section style={{ maxWidth: 720, border: '1px solid var(--line)', borderRadius: radius, background: color.bg }}>
          {definitions.length === 0 && (
            <p style={{ ...sBody, padding: 24, margin: 0, color: 'var(--ink-2)' }}>No preferences are available to edit.</p>
          )}
          {definitions.map((def, i) => {
            const options = optionsByCode[def.preferenceCode];
            const isSet = (saved[def.preferenceCode] ?? []).length > 0;
            return (
              <div key={def.preferenceCode} style={{ padding: '20px 24px', borderTop: i === 0 ? 'none' : '1px solid var(--line)', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  {def.dataType !== 'CHECKBOX' ? <span style={labelStyle}>{def.preferenceName}</span> : <span />}
                  <button
                    onClick={() => reset(def.preferenceCode)}
                    disabled={!isSet}
                    style={{ ...sBodyB, border: 'none', background: 'transparent', padding: 0, cursor: isSet ? 'pointer' : 'not-allowed', color: isSet ? 'var(--ink-2)' : 'var(--ink-3)', textDecoration: 'underline', fontFamily: 'inherit' }}
                  >
                    Reset
                  </button>
                </div>
                <PreferenceControl def={def} options={options} value={draft[def.preferenceCode] ?? []} onChange={next => setDraft(d => ({ ...d, [def.preferenceCode]: next }))} />
                {options === null && <span style={{ ...sBody, color: 'var(--red)' }}>Options could not be loaded from {def.valueSourceApi}.</span>}
                {def.description && <span style={{ ...sBody, color: 'var(--ink-2)' }}>{def.description}</span>}
              </div>
            );
          })}
          <div style={{ padding: 16, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <StrokeButton onClick={() => setDraft(saved)}>Cancel</StrokeButton>
            <PrimaryButton onClick={save} disabled={!dirty}>Save</PrimaryButton>
          </div>
        </section>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--ink-fill)', color: 'var(--on-ink)', padding: '12px 18px', borderRadius: radius, ...sBody, zIndex: 200 }}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss" style={{ marginLeft: 10, border: 'none', background: 'transparent', color: 'var(--on-ink)', cursor: 'pointer' }}>
            <IconClose size={13} />
          </button>
        </div>
      )}
    </>
  );
}
