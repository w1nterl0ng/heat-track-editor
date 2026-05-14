import React from 'react';
import { useEditorStore } from '../store/editorStore';

export const EmptyHint: React.FC = () => {
  const { nodes, loopClosed } = useEditorStore();

  if (loopClosed) return null;

  if (nodes.length === 0) {
    return (
      <div style={styles.hint}>
        <div style={styles.title}>Building your track</div>
        <div style={styles.step}>① Click anywhere to place nodes one at a time</div>
        <div style={styles.step}>② Click the first node <span style={styles.amber}>●</span> to close the loop</div>
        <div style={styles.step}>③ Shift+click a node, press <kbd style={styles.kbd}>C</kbd> to mark it as a corner</div>
      </div>
    );
  }

  if (nodes.length < 3) {
    return (
      <div style={styles.hint}>
        <div style={styles.step}>Keep placing nodes…</div>
      </div>
    );
  }

  return (
    <div style={styles.hint}>
      <div style={styles.step}>
        Click the first node <span style={styles.amber}>●</span> to close the loop
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  hint: {
    position: 'absolute',
    bottom: 52,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(15, 23, 42, 0.88)',
    border: '1px solid #1e293b',
    borderRadius: 10,
    padding: '10px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    pointerEvents: 'none',
    backdropFilter: 'blur(6px)',
    whiteSpace: 'nowrap',
  },
  title: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 2,
  },
  step: { color: '#64748b', fontSize: 12 },
  amber: { color: '#f59e0b' },
  kbd: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 3,
    padding: '1px 4px',
    fontSize: 10,
    color: '#93c5fd',
    fontFamily: 'monospace',
  },
};
