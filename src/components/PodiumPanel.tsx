import React from 'react';
import { useEditorStore } from '../store/editorStore';

const RANK_COLORS: Record<number, string> = {
  1: '#f59e0b',
  2: '#94a3b8',
  3: '#b45309',
};

function rankColor(rank: number): string {
  return RANK_COLORS[rank] ?? '#64748b';
}

export const PodiumPanel: React.FC = () => {
  const { podiumSlots, removePodiumSlot } = useEditorStore();

  const hasSlots = podiumSlots.length > 0;

  const handleClearAll = () => {
    [...podiumSlots].reverse().forEach(p => removePodiumSlot(p.id));
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>Podium Slots</div>

      {hasSlots ? (
        <>
          <div style={styles.hint}>
            Drag a slot to reposition. Scroll wheel to rotate (hold Shift for 1° steps).
          </div>

          <div style={styles.slotList}>
            {podiumSlots.map(p => (
              <div key={p.id} style={styles.slotRow}>
                <span style={{ ...styles.rankBadge, background: rankColor(p.rank) }}>
                  {p.rank === 1 ? '1st' : p.rank === 2 ? '2nd' : p.rank === 3 ? '3rd' : `${p.rank}th`}
                </span>
                <span style={styles.coords}>
                  {p.x.toFixed(0)}, {p.y.toFixed(0)}
                </span>
                <span style={styles.rotation}>
                  {Math.round(p.rotation)}°
                </span>
                <button
                  style={styles.removeBtn}
                  onClick={() => removePodiumSlot(p.id)}
                  title={`Remove slot ${p.rank}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button style={styles.clearBtn} onClick={handleClearAll}>
            ✕ Clear all slots
          </button>
        </>
      ) : (
        <div style={styles.emptyHint}>
          Click on the canvas to place podium positions (1st, 2nd, 3rd…)
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: { padding: '10px 12px', overflowY: 'auto', height: '100%' },
  panelTitle: {
    color: '#cbd5e1', fontWeight: 700, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
  },
  hint: { color: '#475569', fontSize: 10, lineHeight: '14px', marginBottom: 10 },
  emptyHint: {
    color: '#334155', fontSize: 11, lineHeight: '16px',
    padding: '12px 0', textAlign: 'center' as const,
  },
  slotList: {
    display: 'flex', flexDirection: 'column', gap: 3,
    marginBottom: 10,
  },
  slotRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '3px 6px', background: '#1e293b', borderRadius: 4,
  },
  rankBadge: {
    minWidth: 32, textAlign: 'center' as const,
    padding: '1px 4px', borderRadius: 2,
    color: '#fff', fontSize: 10, fontWeight: 700,
    flexShrink: 0,
  },
  coords: { color: '#475569', fontSize: 10, fontFamily: 'monospace', flex: 1 },
  rotation: {
    color: '#64748b', fontSize: 10, fontFamily: 'monospace',
    minWidth: 36, textAlign: 'right' as const,
  },
  removeBtn: {
    background: 'transparent', border: 'none',
    color: '#64748b', fontSize: 14, cursor: 'pointer',
    padding: '0 2px', lineHeight: 1, flexShrink: 0,
  },
  clearBtn: {
    width: '100%', padding: '5px 8px',
    background: 'transparent', border: '1px solid #451a03',
    borderRadius: 4, color: '#f97316',
    fontSize: 10, cursor: 'pointer',
  },
};
