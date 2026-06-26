import React from 'react';
import { useEditorStore } from '../store/editorStore';

const TILE_CM = 28.5;

export const BackgroundPanel: React.FC = () => {
  const {
    backgroundImage,
    backgroundOpacity,
    backgroundScale,
    backgroundX,
    backgroundY,
    backgroundSize,
    tileColumns,
    tileRows,
    showTileGrid,
    backgroundMode,
    setBackgroundOpacity,
    setBackgroundTransform,
    setTileGrid,
    fitBackgroundToGrid,
    toggleTileGrid,
    setBackgroundMode,
    clearBackgroundImage,
  } = useEditorStore();

  const worldWidthCm = (tileColumns * TILE_CM).toFixed(1);
  const worldHeightCm = (tileRows * TILE_CM).toFixed(1);

  const imgWidthPx = backgroundImage
    ? Math.round(backgroundSize.width * backgroundScale)
    : null;
  const imgHeightPx = backgroundImage
    ? Math.round(backgroundSize.height * backgroundScale)
    : null;

  return (
    <div style={styles.panel}>

      {/* ── Background source ──────────────────────── */}
      <Section title="Export Background">
        <div style={styles.modeRow}>
          <span style={styles.modeLabel}>Source</span>
          <div style={styles.modeBtns}>
            {(['image', 'style'] as const).map(m => (
              <button
                key={m}
                onClick={() => setBackgroundMode(m)}
                style={{ ...styles.modeBtn, ...(backgroundMode === m ? styles.modeBtnActive : {}) }}
              >
                {m === 'image' ? 'Image' : 'Style Canvas'}
              </button>
            ))}
          </div>
        </div>
        <div style={styles.modeHint}>
          {backgroundMode === 'style'
            ? 'The styled track canvas will be rendered as the board tiles on export.'
            : 'The uploaded background image will be used as board tiles on export.'}
        </div>
      </Section>

      {/* ── Tile Grid ─────────────────────────────── */}
      <Section title="Tile Grid">
        <Row label="Columns">
          <NumberInput
            value={tileColumns}
            min={1} max={8}
            onChange={v => setTileGrid(v, tileRows)}
          />
        </Row>
        <Row label="Rows">
          <NumberInput
            value={tileRows}
            min={1} max={8}
            onChange={v => setTileGrid(tileColumns, v)}
          />
        </Row>
        <div style={styles.dimDisplay}>
          {tileColumns} × {tileRows} tiles &nbsp;·&nbsp; {worldWidthCm} × {worldHeightCm} cm
        </div>
        <div style={styles.dimSub}>
          Each tile = 2048 px = {TILE_CM} cm
        </div>

        <button
          onClick={toggleTileGrid}
          style={{ ...styles.btn, ...(showTileGrid ? styles.btnActive : {}) }}
        >
          {showTileGrid ? 'Hide' : 'Show'} Grid Overlay
        </button>
      </Section>

      {/* ── Background Image ──────────────────────── */}
      <Section title="Background Image">
        {!backgroundImage ? (
          <div style={styles.hint}>
            Upload an image using the toolbar{' '}
            <span style={styles.hintIcon}>📷</span> button.
            <br /><br />
            The image will be scaled to fit the tile grid.
            Switch to this layer to move or resize it.
          </div>
        ) : (
          <>
            <div style={styles.infoGrid}>
              <span style={styles.infoLabel}>Natural size</span>
              <span style={styles.infoValue}>{backgroundSize.width} × {backgroundSize.height} px</span>
              <span style={styles.infoLabel}>Scaled size</span>
              <span style={styles.infoValue}>{imgWidthPx} × {imgHeightPx} px</span>
              <span style={styles.infoLabel}>Scale</span>
              <span style={styles.infoValue}>{backgroundScale.toFixed(3)}×</span>
              <span style={styles.infoLabel}>Position</span>
              <span style={styles.infoValue}>
                {Math.round(backgroundX)}, {Math.round(backgroundY)}
              </span>
            </div>

            <Row label={`Opacity ${Math.round(backgroundOpacity * 100)}%`}>
              <input
                type="range"
                min={0} max={1} step={0.01}
                value={backgroundOpacity}
                onChange={e => setBackgroundOpacity(parseFloat(e.target.value))}
                style={styles.slider}
              />
            </Row>

            <div style={styles.btnRow}>
              <button onClick={fitBackgroundToGrid} style={styles.btn}>
                Fit to Grid
              </button>
              <button
                onClick={() => setBackgroundTransform(0, 0, backgroundScale)}
                style={styles.btn}
              >
                Reset Position
              </button>
            </div>
            <button
              onClick={clearBackgroundImage}
              style={{ ...styles.btn, flex: 'none', width: '100%', color: '#f87171', borderColor: '#7f1d1d' }}
            >
              Remove Background Image
            </button>
          </>
        )}
      </Section>

      {/* ── Interaction hint ─────────────────────── */}
      {backgroundImage && (
        <div style={styles.interactionHint}>
          Drag image to move &nbsp;·&nbsp; Drag corner handle to resize
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={styles.section}>
    <div style={styles.sectionTitle}>{title}</div>
    {children}
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={styles.row}>
    <span style={styles.rowLabel}>{label}</span>
    {children}
  </div>
);

const NumberInput: React.FC<{
  value: number; min: number; max: number;
  onChange: (v: number) => void;
}> = ({ value, min, max, onChange }) => (
  <input
    type="number"
    value={value}
    min={min} max={max}
    style={styles.numInput}
    onChange={e => {
      const v = parseInt(e.target.value, 10);
      if (!isNaN(v) && v >= min && v <= max) onChange(v);
    }}
  />
);

// ── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  modeRow: { display: 'flex', alignItems: 'center', gap: 8 },
  modeLabel: { fontSize: 11, color: '#94a3b8', flex: 1 },
  modeBtns: { display: 'flex', gap: 4 },
  modeBtn: {
    padding: '3px 10px', fontSize: 11, cursor: 'pointer',
    background: 'transparent', border: '1px solid #334155',
    borderRadius: 4, color: '#64748b',
  },
  modeBtnActive: {
    background: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd',
  },
  modeHint: { fontSize: 10, color: '#475569', fontStyle: 'italic', marginTop: 2 },
  panel: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    overflowY: 'auto',
    height: '100%',
    boxSizing: 'border-box',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    borderBottom: '1px solid #1e293b',
    paddingBottom: 4,
    marginBottom: 2,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowLabel: {
    color: '#94a3b8',
    fontSize: 12,
    flexShrink: 0,
  },
  numInput: {
    width: 56,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 4,
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 600,
    padding: '3px 6px',
    textAlign: 'right',
  },
  slider: {
    flex: 1,
    accentColor: '#22d3ee',
  },
  dimDisplay: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center',
    background: '#0c2233',
    border: '1px solid #164e63',
    borderRadius: 5,
    padding: '5px 8px',
  },
  dimSub: {
    color: '#475569',
    fontSize: 10,
    textAlign: 'center',
  },
  btn: {
    flex: 1,
    padding: '6px 10px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 5,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  btnActive: {
    background: '#0c2233',
    border: '1px solid #22d3ee',
    color: '#22d3ee',
  },
  btnRow: {
    display: 'flex',
    gap: 6,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '3px 10px',
    padding: '6px 8px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 5,
  },
  infoLabel: {
    color: '#475569',
    fontSize: 10,
    lineHeight: '18px',
  },
  infoValue: {
    color: '#94a3b8',
    fontSize: 10,
    lineHeight: '18px',
    fontFamily: 'monospace',
  },
  hint: {
    color: '#475569',
    fontSize: 11,
    lineHeight: '17px',
  },
  hintIcon: {
    fontSize: 13,
  },
  interactionHint: {
    color: '#334155',
    fontSize: 10,
    textAlign: 'center',
    padding: '4px 0',
    borderTop: '1px solid #1e293b',
    marginTop: 'auto',
  },
};
