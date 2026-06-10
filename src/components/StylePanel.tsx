import React from 'react';
import Konva from 'konva';
import { useEditorStore } from '../store/editorStore';
import { ALL_STYLE_PRESETS } from '../lib/stylePresets';
import { exportBoardImage } from '../lib/exportImage';

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const StylePanel: React.FC<Props> = ({ stageRef }) => {
  const { activeStyleId, setActiveStyleId, meta } = useEditorStore();

  const handleExportImage = async () => {
    if (!stageRef.current) return;
    await exportBoardImage(stageRef.current, meta.trackId);
  };

  return (
    <div style={styles.panel}>

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
                {/* Mini swatch showing bg + track colors */}
                <div style={styles.presetSwatch}>
                  <div style={{
                    ...styles.swatchBg,
                    background: preset.background.fill,
                  }}>
                    {/* Track band preview */}
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
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Active Style</div>
        {(() => {
          const preset = ALL_STYLE_PRESETS.find(p => p.id === activeStyleId);
          if (!preset) return null;
          return (
            <div style={styles.colorGrid}>
              <ColorRow label="Background" value={preset.background.fill} />
              <ColorRow label="Track body" value={preset.track.bodyFill} />
              <ColorRow label="Track edges" value={preset.track.edgeStroke} />
              <ColorRow label="Corners" value={preset.markers.cornerStroke} />
              <ColorRow label="Finish line" value={preset.markers.finishStroke} />
              <ColorRow label="Legends" value={preset.markers.legendsStroke} />
              <ColorRow label="Race line" value={preset.markers.raceLineStroke} />
            </div>
          );
        })()}
      </div>

      <div style={styles.divider} />

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

const ColorRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={styles.colorRow}>
    <span style={styles.colorRowLabel}>{label}</span>
    <div style={{ ...styles.colorDot, background: value }} />
    <span style={styles.colorRowValue}>{value}</span>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto',
    padding: '12px',
    gap: 0,
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
  presetSwatch: {
    flexShrink: 0,
  },
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
  colorGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '6px 8px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 6,
  },
  colorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  colorRowLabel: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    border: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  colorRowValue: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
    flexShrink: 0,
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
  exportIcon: {
    fontSize: 22,
    flexShrink: 0,
  },
  exportBtnText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  exportBtnLabel: {
    fontSize: 12,
    fontWeight: 600,
  },
  exportBtnDesc: {
    fontSize: 10,
    color: '#64748b',
  },
  exportNote: {
    fontSize: 10,
    color: '#334155',
    lineHeight: '14px',
  },
};
