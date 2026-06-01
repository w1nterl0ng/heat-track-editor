import React, { useState } from 'react';
import { useEditorStore } from '../store/editorStore';

export const LayoutPanel: React.FC = () => {
  const {
    backbonePhase,
    loopClosed,
    nodes,
    designerSegments,
    idealSpaceLengthPx,
    setIdealSpaceLength,
    lockBackbone,
    unlockBackbone,
    clearBackbone,
    trackWidthPct,
  } = useEditorStore();

  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const mmPerPx = 28.5 / 2048;
  const idealMm = idealSpaceLengthPx * mmPerPx * 10;
  const canLock = backbonePhase === 'design' && loopClosed && nodes.length >= 4;
  const canUnlock = backbonePhase === 'locked' && designerSegments.length > 0;
  const canClear = nodes.length > 0 || designerSegments.length > 0;

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearBackbone();
    setConfirmClear(false);
  };

  const handleUnlock = () => {
    if (!confirmUnlock) {
      setConfirmUnlock(true);
      return;
    }
    unlockBackbone();
    setConfirmUnlock(false);
  };

  if (backbonePhase === 'locked' && !canUnlock) return null;

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>Track Layout</div>

      {backbonePhase === 'design' ? (
        <>
          <p style={styles.desc}>
            Click to place anchors. Double-click a segment line to insert an anchor and split it.
            Scroll to zoom · Ctrl+scroll to bend · 0 or double-click handle to straighten.
            Click the first anchor to close the loop.
          </p>

          <div style={styles.statGrid}>
            <StatBox label="Anchors" value={String(designerSegments.length + (nodes.length > 0 ? 1 : 0))} />
            <StatBox label="Spaces" value={String(loopClosed ? nodes.length : Math.max(0, nodes.length - 1))} />
            <StatBox label="Width" value={(trackWidthPct * 2.85).toFixed(1)} unit="mm" />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Space length</label>
            <div style={styles.spaceLengthBox}>
              <div style={styles.spaceLengthValue}>{idealMm.toFixed(1)}</div>
              <div style={styles.spaceLengthUnit}>mm · {idealSpaceLengthPx.toFixed(0)} px</div>
            </div>
            <input
              type="range"
              min={150}
              max={400}
              step={1}
              value={idealSpaceLengthPx}
              onChange={e => setIdealSpaceLength(parseFloat(e.target.value))}
              style={styles.slider}
            />
          </div>

          {canClear && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={handleClear}
                style={confirmClear ? styles.btnDanger : styles.btnSecondary}
              >
                {confirmClear ? 'Confirm — clear backbone' : 'Clear backbone'}
              </button>
              {confirmClear && (
                <p style={styles.warn}>
                  Removes all anchors and segments so you can trace again. Background image, tile grid, and track settings are kept.
                </p>
              )}
            </div>
          )}

          <button
            onClick={lockBackbone}
            disabled={!canLock}
            title={canLock ? 'Lock backbone and continue to full editor' : 'Close the loop first'}
            style={{ ...styles.btnPrimary, ...(!canLock ? styles.btnDisabled : {}), marginTop: canClear ? 8 : 0 }}
          >
            Lock backbone →
          </button>
          {!canLock && (
            <p style={styles.hint}>
              {!loopClosed
                ? 'Close the loop, then lock to add corners, surfaces, and exports.'
                : 'Need at least 4 nodes to lock.'}
            </p>
          )}
        </>
      ) : (
        <>
          <p style={styles.desc}>
            Backbone is locked. Use Edit, Surface, and Condition tools to finish the track.
          </p>
          <button
            onClick={handleUnlock}
            style={confirmUnlock ? styles.btnDanger : styles.btnSecondary}
          >
            {confirmUnlock ? 'Confirm — wipe game data' : 'Edit layout again…'}
          </button>
          {confirmUnlock && (
            <p style={styles.warn}>
              This removes corners, race lines, lollipop sides, condition markers, weather token,
              surfaces, and all sector settings. The spline shape is kept.
            </p>
          )}
        </>
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; unit?: string }> = ({ label, value, unit }) => (
  <div style={styles.statBox}>
    <div style={styles.statLabel}>{label}</div>
    <div style={styles.statValueRow}>
      <span style={styles.statValue}>{value}</span>
      {unit && <span style={styles.statUnit}>{unit}</span>}
    </div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '10px 12px',
    borderBottom: '1px solid #1e293b',
    background: '#0f172a',
  },
  panelTitle: {
    color: '#a5f3fc',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  },
  desc: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 1.45,
    margin: '0 0 10px',
  },
  field: { marginBottom: 8 },
  label: {
    display: 'block',
    color: '#64748b',
    fontSize: 10,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  slider: { width: '100%', accentColor: '#22d3ee', marginTop: 8 },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 6,
    marginBottom: 10,
  },
  statBox: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '8px 6px',
    textAlign: 'center',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 4,
  },
  statValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 3,
  },
  statValue: {
    color: '#e2e8f0',
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  statUnit: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 500,
  },
  spaceLengthBox: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '10px 12px',
    textAlign: 'center',
  },
  spaceLengthValue: {
    color: '#a5f3fc',
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  spaceLengthUnit: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    fontVariantNumeric: 'tabular-nums',
  },
  btnPrimary: {
    width: '100%',
    padding: '8px 12px',
    background: '#164e63',
    border: '1px solid #22d3ee',
    borderRadius: 6,
    color: '#a5f3fc',
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
  },
  btnSecondary: {
    width: '100%',
    padding: '8px 12px',
    background: '#1e293b',
    border: '1px solid #475569',
    borderRadius: 6,
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
  },
  btnDanger: {
    width: '100%',
    padding: '8px 12px',
    background: '#450a0a',
    border: '1px solid #ef4444',
    borderRadius: 6,
    color: '#fca5a5',
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
  },
  btnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  hint: { color: '#475569', fontSize: 10, margin: '6px 0 0' },
  warn: {
    color: '#f87171',
    fontSize: 10,
    lineHeight: 1.4,
    margin: '8px 0 0',
    padding: '6px 8px',
    background: '#450a0a44',
    borderRadius: 4,
  },
};
