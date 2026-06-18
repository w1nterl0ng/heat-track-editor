import React, { useRef, useState } from 'react';
import Konva from 'konva';
import { useEditorStore } from '../store/editorStore';
import { ALL_STYLE_PRESETS, getStyleById } from '../lib/stylePresets';
import { exportBoardImage } from '../lib/exportImage';
import type { TrackStyle } from '../types/trackStyle';

// ── Style file import/export ──────────────────────────────────────────────────

function downloadStyleFile(style: TrackStyle) {
  const { id: _id, ...rest } = style;
  const json = JSON.stringify({ ...rest, id: 'custom' }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${style.label.toLowerCase().replace(/\s+/g, '_')}.htstyle`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isValidStyle(obj: unknown): obj is TrackStyle {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Record<string, unknown>;
  return (
    typeof s.background === 'object' &&
    typeof s.track      === 'object' &&
    typeof s.markers    === 'object' &&
    typeof s.lollipops  === 'object' &&
    typeof s.surfaces   === 'object'
  );
}

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
}

// ── Color picker row ──────────────────────────────────────────────────────────

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange }) => {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);

  // Keep draft in sync if value changes externally (e.g. preset switch)
  React.useEffect(() => { setDraft(value); }, [value]);

  const commitHex = (raw: string) => {
    const trimmed = raw.startsWith('#') ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
      onChange(trimmed);
      setDraft(trimmed);
    }
  };

  return (
    <div style={cfStyles.row}>
      <span style={cfStyles.label}>{label}</span>
      {/* Native color picker hidden under a styled swatch */}
      <div
        style={{ ...cfStyles.swatch, background: value }}
        onClick={() => pickerRef.current?.click()}
        title="Click to open color picker"
      >
        <input
          ref={pickerRef}
          type="color"
          value={value}
          onChange={e => { onChange(e.target.value); setDraft(e.target.value); }}
          style={cfStyles.hiddenPicker}
        />
      </div>
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => commitHex(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commitHex((e.target as HTMLInputElement).value); }}
        maxLength={7}
        spellCheck={false}
        style={cfStyles.hexInput}
      />
    </div>
  );
};

const cfStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  hiddenPicker: {
    opacity: 0,
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer',
    padding: 0,
    border: 'none',
  },
  hexInput: {
    width: 72,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 4,
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
    padding: '2px 5px',
    outline: 'none',
    flexShrink: 0,
  },
};

// ── Number input field ───────────────────────────────────────────────────────

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({ label, value, min, max, step = 0.1, onChange }) => {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => { setDraft(String(value)); }, [value]);

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      const clamped = min !== undefined ? Math.max(min, max !== undefined ? Math.min(max, n) : n) : n;
      onChange(clamped);
      setDraft(String(clamped));
    }
  };

  return (
    <div style={cfStyles.row}>
      <span style={cfStyles.label}>{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }}
        style={{ ...cfStyles.hexInput, width: 56 }}
      />
    </div>
  );
};

// ── Color editor groups ───────────────────────────────────────────────────────

interface ColorEditorProps {
  style: TrackStyle;
  onField: (section: 'background' | 'track' | 'markers' | 'lollipops', key: string, value: string | number | boolean | number[]) => void;
}

const ColorEditor: React.FC<ColorEditorProps> = ({ style: s, onField }) => {
  const bg  = (k: string, v: string | number | boolean) => onField('background', k, v);
  const tr  = (k: string, v: string | number | boolean) => onField('track', k, v);
  const mk  = (k: string, v: string | number | boolean) => onField('markers', k, v);
  const lo  = (k: string, v: string | number | boolean) => onField('lollipops', k, v);

  return (
    <div style={edStyles.editor}>

      <div style={edStyles.group}>
        <div style={edStyles.groupLabel}>Background</div>
        <ColorField label="Fill"       value={s.background.fill}      onChange={v => bg('fill', v)} />
        <ColorField label="Grid color" value={s.background.gridColor} onChange={v => bg('gridColor', v)} />
      </div>

      <div style={edStyles.group}>
        <div style={edStyles.groupLabel}>Track</div>
        <ColorField label="Body fill"       value={s.track.bodyFill}       onChange={v => tr('bodyFill', v)} />
        <ColorField label="Edge stroke"     value={s.track.edgeStroke}     onChange={v => tr('edgeStroke', v)} />
        <NumberField label="Edge width"     value={s.track.edgeWidth}      min={0.5} max={8} step={0.5} onChange={v => tr('edgeWidth', v)} />
        <ColorField label="Center line"     value={s.track.centerStroke}   onChange={v => tr('centerStroke', v)} />
        <NumberField label="Center width"   value={s.track.centerLineWidth} min={0.5} max={6} step={0.5} onChange={v => tr('centerLineWidth', v)} />
        <NumberField label="Dash on"        value={s.track.centerDash[0]}  min={1} max={40} step={1}   onChange={v => onField('track', 'centerDash', [v, s.track.centerDash[1]])} />
        <NumberField label="Dash off"       value={s.track.centerDash[1]}  min={1} max={40} step={1}   onChange={v => onField('track', 'centerDash', [s.track.centerDash[0], v])} />
      </div>

      <div style={edStyles.group}>
        <div style={edStyles.groupLabel}>Markers</div>
        <ColorField label="Corner stroke"        value={s.markers.cornerStroke}        onChange={v => mk('cornerStroke', v)} />
        <ColorField label="Corner label"         value={s.markers.cornerLabelColor}    onChange={v => mk('cornerLabelColor', v)} />
        <ColorField label="Corner stripe"        value={s.markers.cornerStripeStroke}  onChange={v => mk('cornerStripeStroke', v)} />
        <ColorField label="Chicane stripe"       value={s.markers.chicaneStripeStroke} onChange={v => mk('chicaneStripeStroke', v)} />
        <ColorField label="Finish stroke"        value={s.markers.finishStroke}        onChange={v => mk('finishStroke', v)} />
        <ColorField label="Finish label"         value={s.markers.finishLabelColor}    onChange={v => mk('finishLabelColor', v)} />
        <ColorField label="Legends stroke"       value={s.markers.legendsStroke}       onChange={v => mk('legendsStroke', v)} />
        <ColorField  label="Race line"       value={s.markers.raceLineStroke}  onChange={v => mk('raceLineStroke', v)} />
        <NumberField label="Race line width" value={s.markers.raceLineWidth}   min={0.01} max={0.2} step={0.01} onChange={v => mk('raceLineWidth', v)} />
      </div>

      <div style={edStyles.group}>
        <div style={edStyles.groupLabel}>Lollipops</div>
        {/* Speed marker shape toggle */}
        <div style={cfStyles.row}>
          <span style={cfStyles.label}>Speed marker</span>
          <div style={edStyles.toggleRow}>
            {(['circle', 'gauge'] as const).map(shape => (
              <button
                key={shape}
                onClick={() => onField('lollipops', 'speedMarkerShape', shape)}
                style={{
                  ...edStyles.toggleBtn,
                  ...(s.lollipops.speedMarkerShape === shape ? edStyles.toggleBtnActive : {}),
                }}
              >
                {shape}
              </button>
            ))}
          </div>
        </div>
        <ColorField label="Speed fill"        value={s.lollipops.speedFill}         onChange={v => lo('speedFill', v)} />
        <ColorField label="Speed stroke"      value={s.lollipops.speedStroke}       onChange={v => lo('speedStroke', v)} />
        <ColorField label="Speed label"       value={s.lollipops.speedLabelColor}   onChange={v => lo('speedLabelColor', v)} />
        <ColorField label="Legends fill"      value={s.lollipops.legendsFill}       onChange={v => lo('legendsFill', v)} />
        <ColorField label="Legends stroke"    value={s.lollipops.legendsStroke}     onChange={v => lo('legendsStroke', v)} />
        <ColorField label="Legends label"     value={s.lollipops.legendsLabelColor} onChange={v => lo('legendsLabelColor', v)} />
        <ColorField label="Countdown fill"    value={s.lollipops.countdownFill}     onChange={v => lo('countdownFill', v)} />
        <ColorField label="Countdown stroke"  value={s.lollipops.countdownStroke}   onChange={v => lo('countdownStroke', v)} />
      </div>

    </div>
  );
};

const edStyles: Record<string, React.CSSProperties> = {
  editor: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    padding: '8px 8px 10px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 6,
  },
  groupLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  toggleRow: {
    display: 'flex',
    gap: 4,
  },
  toggleBtn: {
    padding: '2px 8px',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: 4,
    color: '#64748b',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  toggleBtnActive: {
    background: '#1e3a5f',
    border: '1px solid #3b82f6',
    color: '#93c5fd',
  },
};

// ── Main panel ────────────────────────────────────────────────────────────────

export const StylePanel: React.FC<Props> = ({ stageRef }) => {
  const {
    activeStyleId,
    setActiveStyleId,
    customStyle,
    createCustomStyle,
    updateCustomStyleField,
    meta,
  } = useEditorStore();

  const styleFileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExportImage = async () => {
    if (!stageRef.current) return;
    await exportBoardImage(stageRef.current, meta.trackId);
  };

  const handleExportStyle = () => {
    const style = isCustom && customStyle ? customStyle : getStyleById(activeStyleId);
    downloadStyleFile(style);
  };

  const handleImportStyle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!isValidStyle(parsed)) throw new Error('Not a valid .htstyle file');
        const style: TrackStyle = { ...parsed, id: 'custom' };
        useEditorStore.setState({ customStyle: style, activeStyleId: 'custom' });
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Import failed');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const isCustom = activeStyleId === 'custom';
  const activeStyle = isCustom && customStyle ? customStyle : getStyleById(activeStyleId);

  return (
    <div style={styles.panel}>

      {/* ── Preset selector ───────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Style Preset</div>
        <div style={styles.presetGrid}>
          {ALL_STYLE_PRESETS.map(preset => {
            const active = preset.id === activeStyleId;
            return (
              <button
                key={preset.id}
                onClick={() => setActiveStyleId(preset.id)}
                style={{
                  ...styles.presetCard,
                  ...(active ? styles.presetCardActive : {}),
                }}
              >
                <div style={styles.presetSwatch}>
                  <div style={{
                    ...styles.swatchBg,
                    background: preset.background.fill,
                  }}>
                    <div style={{
                      ...styles.swatchTrack,
                      borderColor: preset.track.edgeStroke,
                      background: preset.track.bodyFill,
                      opacity: preset.track.bodyOpacity + 0.5,
                    }} />
                  </div>
                </div>
                <div style={styles.presetLabel}>{preset.label}</div>
                <div style={styles.presetDesc}>{preset.description}</div>
                {active && <div style={styles.activeDot} />}
              </button>
            );
          })}

          {/* Custom style card — shown if one has been created */}
          {customStyle && (
            <button
              onClick={() => setActiveStyleId('custom')}
              style={{
                ...styles.presetCard,
                ...(isCustom ? styles.presetCardActive : {}),
              }}
            >
              <div style={styles.presetSwatch}>
                <div style={{
                  ...styles.swatchBg,
                  background: customStyle.background.fill,
                }}>
                  <div style={{
                    ...styles.swatchTrack,
                    borderColor: customStyle.track.edgeStroke,
                    background: customStyle.track.bodyFill,
                    opacity: customStyle.track.bodyOpacity + 0.5,
                  }} />
                </div>
              </div>
              <div style={styles.presetLabel}>Custom</div>
              <div style={styles.presetDesc}>Your edited style</div>
              {isCustom && <div style={styles.activeDot} />}
            </button>
          )}
        </div>

        {/* Create / re-base custom style button */}
        <button
          onClick={createCustomStyle}
          style={styles.createBtn}
          title={customStyle ? 'Reset custom style from the active preset' : 'Clone the active preset into a new custom style'}
        >
          {customStyle ? 'Reset custom from this preset' : '+ Create custom style from preset'}
        </button>

        {/* Style file import / export */}
        <div style={styles.styleFileRow}>
          <button onClick={handleExportStyle} style={styles.styleFileBtn} title="Save style to a .htstyle file">
            ↓ Export style
          </button>
          <button onClick={() => styleFileRef.current?.click()} style={styles.styleFileBtn} title="Load a .htstyle file">
            ↑ Import style
          </button>
          <input
            ref={styleFileRef}
            type="file"
            accept=".htstyle,application/json"
            style={{ display: 'none' }}
            onChange={handleImportStyle}
          />
        </div>
        {importError && <div style={styles.importError}>{importError}</div>}
      </div>

      <div style={styles.divider} />

      {/* ── Color editor (only when custom is active) ─ */}
      {isCustom && customStyle ? (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Edit Colors</div>
          <ColorEditor
            style={customStyle}
            onField={(section, key, value) => updateCustomStyleField(section, key, value)}
          />
        </div>
      ) : (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Active Colors</div>
          <div style={edStyles.editor}>
            {(['background.fill', 'track.bodyFill', 'track.edgeStroke',
               'markers.cornerStroke', 'markers.finishStroke',
               'markers.legendsStroke', 'markers.raceLineStroke'] as const).map(path => {
              const [sec, key] = path.split('.') as [keyof TrackStyle, string];
              const section = activeStyle[sec] as Record<string, unknown>;
              const color = section[key] as string;
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, s => s.toUpperCase())
                .replace('Fill', 'fill')
                .replace('Stroke', 'stroke');
              return (
                <div key={path} style={cfStyles.row}>
                  <span style={cfStyles.label}>{label}</span>
                  <div style={{ ...cfStyles.swatch, background: color, cursor: 'default' }} />
                  <span style={{ ...cfStyles.hexInput, border: 'none', background: 'transparent', color: '#475569' }}>
                    {color}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={styles.readonlyNote}>
            Select "Custom" or create a custom style to edit colors.
          </div>
        </div>
      )}

      <div style={styles.divider} />

      {/* ── Export ────────────────────────────────────── */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Export</div>
        <button onClick={handleExportImage} style={styles.exportBtn}>
          <span style={styles.exportIcon}>🖼</span>
          <div style={styles.exportBtnText}>
            <div style={styles.exportBtnLabel}>Board Image (PNG)</div>
            <div style={styles.exportBtnDesc}>Styled board — 2× resolution</div>
          </div>
        </button>
        <div style={styles.exportNote}>
          The exported image uses the active style. Switch styles and re-export to compare looks.
        </div>
      </div>

    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
    padding: '12px',
    gap: 0,
    minWidth: 220,
    maxWidth: 260,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#475569',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    background: '#1e293b',
    margin: '4px 0 12px',
    flexShrink: 0,
  },
  presetGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  presetCard: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'border-color 0.15s',
  },
  presetCardActive: {
    border: '1px solid #3b82f6',
    background: '#1e3a5f',
  },
  presetSwatch: { flexShrink: 0 },
  swatchBg: {
    width: 40,
    height: 28,
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid #334155',
  },
  swatchTrack: {
    width: '80%',
    height: 6,
    borderRadius: 3,
    borderTop: '1.5px solid',
    borderBottom: '1.5px solid',
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e2e8f0',
    flex: 1,
  },
  presetDesc: {
    fontSize: 9,
    color: '#475569',
    position: 'absolute',
    bottom: 5,
    left: 60,
    right: 24,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#3b82f6',
    flexShrink: 0,
  },
  styleFileRow: {
    display: 'flex',
    gap: 6,
    marginTop: 4,
  },
  styleFileBtn: {
    flex: 1,
    padding: '5px 8px',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: 6,
    color: '#64748b',
    fontSize: 11,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  importError: {
    fontSize: 10,
    color: '#f87171',
    marginTop: 4,
  },
  createBtn: {
    padding: '6px 10px',
    background: 'transparent',
    border: '1px dashed #334155',
    borderRadius: 6,
    color: '#64748b',
    fontSize: 11,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'border-color 0.15s, color 0.15s',
  },
  readonlyNote: {
    fontSize: 10,
    color: '#334155',
    lineHeight: '14px',
    fontStyle: 'italic',
  },
  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  },
  exportIcon: { fontSize: 22, flexShrink: 0 },
  exportBtnText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  exportBtnLabel: { fontSize: 12, fontWeight: 600 },
  exportBtnDesc: { fontSize: 10, color: '#64748b' },
  exportNote: {
    fontSize: 10,
    color: '#334155',
    lineHeight: '14px',
  },
};
