import React from 'react';
import { useEditorStore } from '../store/editorStore';
import type { SurfaceType, SurfaceSide } from '../types/track';

const TYPES: { type: SurfaceType; label: string; color: string; description: string }[] = [
  { type: 'plain',   label: 'Plain',   color: '#475569', description: 'Normal asphalt (eraser)' },
  { type: 'gravel',  label: 'Gravel',  color: '#d97706', description: 'Rocky Roads / loose surface' },
  { type: 'flooded', label: 'Flooded', color: '#3b82f6', description: 'Heavy Rain / standing water' },
  { type: 'tunnel',  label: 'Tunnel',  color: '#57534e', description: 'Tunnel Vision (always full width)' },
];

const SIDES: { side: SurfaceSide; label: string; icon: string }[] = [
  { side: 'both',    label: 'Both',  icon: '⬛' },
  { side: 'inside',  label: 'Left',  icon: '◀' },
  { side: 'outside', label: 'Right', icon: '▶' },
];

export const SurfacePanel: React.FC = () => {
  const { activeSurfaceType, activeSurfaceSide, setActiveSurface } = useEditorStore();

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>Surface Painter</div>

      <div style={styles.hint}>
        Select a surface type, then click any space on the track to paint it.
        Click a space again with the same type to remove it.
      </div>

      {/* Surface type */}
      <div style={styles.sectionLabel}>Surface type</div>
      <div style={styles.typeGrid}>
        {TYPES.map(t => (
          <button
            key={t.type}
            style={{
              ...styles.typeBtn,
              borderColor: activeSurfaceType === t.type ? t.color : '#1e293b',
              background: activeSurfaceType === t.type ? '#1e293b' : 'transparent',
            }}
            onClick={() => setActiveSurface(t.type)}
            title={t.description}
          >
            <span style={{ ...styles.typeSwatch, background: t.type === 'plain' ? '#334155' : t.color }} />
            <span style={{ color: activeSurfaceType === t.type ? '#e2e8f0' : '#64748b' }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Side selector (hidden for tunnel and plain) */}
      {activeSurfaceType !== 'tunnel' && activeSurfaceType !== 'plain' && (
        <>
          <div style={styles.sectionLabel}>Side</div>
          <div style={styles.sideRow}>
            {SIDES.map(s => (
              <button
                key={s.side}
                style={{
                  ...styles.sideBtn,
                  ...(activeSurfaceSide === s.side ? styles.sideBtnActive : {}),
                }}
                onClick={() => setActiveSurface(activeSurfaceType, s.side)}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Keyboard shortcuts */}
      <div style={styles.shortcuts}>
        <div style={styles.shortcutRow}><kbd style={styles.kbd}>P</kbd> Plain</div>
        <div style={styles.shortcutRow}><kbd style={styles.kbd}>G</kbd> Gravel</div>
        <div style={styles.shortcutRow}><kbd style={styles.kbd}>W</kbd> Flooded</div>
        <div style={styles.shortcutRow}><kbd style={styles.kbd}>T</kbd> Tunnel</div>
        <div style={styles.shortcutRow}><kbd style={styles.kbd}>1</kbd> Both &nbsp;<kbd style={styles.kbd}>2</kbd> Left &nbsp;<kbd style={styles.kbd}>3</kbd> Right</div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: { padding: '10px 12px' },
  panelTitle: {
    color: '#cbd5e1', fontWeight: 700, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
  },
  hint: { color: '#475569', fontSize: 10, lineHeight: '14px', marginBottom: 10 },
  sectionLabel: {
    color: '#64748b', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
  },
  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 },
  typeBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 8px', border: '1px solid',
    borderRadius: 4, cursor: 'pointer',
    fontSize: 11, textAlign: 'left' as const,
  },
  typeSwatch: { width: 10, height: 10, borderRadius: 2, flexShrink: 0 },
  sideRow: { display: 'flex', gap: 4, marginBottom: 10 },
  sideBtn: {
    flex: 1, display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', gap: 2,
    padding: '5px 4px', background: 'transparent',
    border: '1px solid #1e293b', borderRadius: 4,
    color: '#475569', fontSize: 10, cursor: 'pointer',
  },
  sideBtnActive: {
    background: '#1e293b', border: '1px solid #3b82f6', color: '#93c5fd',
  },
  shortcuts: {
    marginTop: 8, padding: '6px 8px',
    background: '#0f172a', borderRadius: 4, border: '1px solid #1e293b',
  },
  shortcutRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    color: '#475569', fontSize: 10, lineHeight: '18px',
  },
  kbd: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 3, padding: '0 4px', fontSize: 9, color: '#93c5fd',
  },
};
