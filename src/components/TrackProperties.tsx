import React from 'react';
import { useEditorStore, computeSegments } from '../store/editorStore';

export const TrackProperties: React.FC = () => {
  const {
    meta, setMeta,
    trackWidthPct, setTrackWidth,
    backgroundImage, backgroundOpacity, setBackgroundOpacity,
    nodes,
  } = useEditorStore();
  const computed = computeSegments(nodes);
  const cornerCount = computed.length;
  const totalSpaces = computed.reduce((s, seg) => s + seg.spaces, 0);
  const hasFinish = nodes.some(nd => nd.isFinishLine);

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>Track Properties</div>

      <Field label="Name">
        <input
          style={styles.input}
          value={meta.name}
          onChange={e => setMeta({ name: e.target.value })}
        />
      </Field>
      <Field label="Track ID">
        <input
          style={styles.input}
          value={meta.trackId}
          placeholder="usa / france / ..."
          onChange={e => setMeta({ trackId: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
        />
      </Field>
      <Field label="Country">
        <input
          style={styles.input}
          value={meta.country}
          onChange={e => setMeta({ country: e.target.value })}
        />
      </Field>

      <div style={styles.row}>
        <div style={styles.halfField}>
          <Field label="Laps">
            <input
              style={styles.input}
              type="number"
              min={1}
              max={6}
              value={meta.laps}
              onChange={e => setMeta({ laps: parseInt(e.target.value) || 1 })}
            />
          </Field>
        </div>
        <div style={styles.halfField}>
          <Field label="Heat Cards">
            <input
              style={styles.input}
              type="number"
              min={1}
              max={12}
              value={meta.heat}
              onChange={e => setMeta({ heat: parseInt(e.target.value) || 6 })}
            />
          </Field>
        </div>
        <div style={styles.halfField}>
          <Field label="Stress">
            <input
              style={styles.input}
              type="number"
              min={0}
              max={8}
              value={meta.stress}
              onChange={e => setMeta({ stress: parseInt(e.target.value) || 3 })}
            />
          </Field>
        </div>
      </div>

      <Field label={`Track Width: ${(trackWidthPct * 2.85).toFixed(1)} mm`}>
        <input
          type="range" min={0.5} max={25} step={0.1}
          value={trackWidthPct}
          onChange={e => setTrackWidth(parseFloat(e.target.value))}
          style={styles.slider}
        />
      </Field>

      {backgroundImage && (
        <Field label={`Background opacity: ${Math.round(backgroundOpacity * 100)}%`}>
          <input
            type="range" min={0} max={1} step={0.01}
            value={backgroundOpacity}
            onChange={e => setBackgroundOpacity(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </Field>
      )}

      {/* Validation summary */}
      <div style={styles.validationBox}>
        <ValidationRow
          ok={cornerCount > 0}
          label={`Corners: ${cornerCount}`}
        />
        <ValidationRow
          ok={totalSpaces > 0}
          label={`Total spaces: ${totalSpaces}`}
        />
        <ValidationRow
          ok={hasFinish}
          label={hasFinish ? 'Finish line set ✓' : 'No finish line set'}
        />
      </div>
    </div>
  );
};

const ValidationRow: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <div style={{ ...styles.validationRow, color: ok ? '#4ade80' : '#f87171' }}>
    <span>{ok ? '✓' : '✗'}</span>
    <span>{label}</span>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={styles.field}>
    <label style={styles.label}>{label}</label>
    {children}
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '10px 12px',
    borderBottom: '1px solid #1e293b',
  },
  panelTitle: {
    color: '#cbd5e1',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  field: {
    marginBottom: 8,
  },
  label: {
    display: 'block',
    color: '#64748b',
    fontSize: 10,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 4,
    color: '#e2e8f0',
    padding: '4px 8px',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  slider: {
    width: '100%',
    accentColor: '#3b82f6',
  },
  row: {
    display: 'flex',
    gap: 6,
    marginBottom: 0,
  },
  halfField: {
    flex: 1,
  },
  validationBox: {
    marginTop: 8,
    padding: '6px 8px',
    background: '#0f172a',
    borderRadius: 4,
    border: '1px solid #1e293b',
  },
  validationRow: {
    display: 'flex',
    gap: 6,
    fontSize: 11,
    lineHeight: '18px',
  },
};
