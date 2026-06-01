import React from 'react';
import { useEditorStore } from '../store/editorStore';

export const EmptyHint: React.FC = () => {
  const { nodes, loopClosed, backbonePhase, layoutActiveAnchorId, designerSegments } = useEditorStore();

  if (backbonePhase !== 'design') {
    if (loopClosed) return null;
    if (nodes.length === 0) {
      return (
        <div style={styles.hint}>
          <div style={styles.step}>Click to place the first track node</div>
        </div>
      );
    }
    return (
      <div style={styles.hint}>
        {nodes.length >= 3 ? (
          <div style={styles.step}>Click the <span style={styles.amber}>amber ring</span> on the first node to close the loop</div>
        ) : (
          <div style={styles.step}>Click to place nodes · close the loop when ready</div>
        )}
      </div>
    );
  }

  if (loopClosed) {
    return (
      <div style={styles.hint}>
        <div style={styles.title}>Loop closed</div>
        <div style={styles.step}>Adjust segments or anchors, then <strong style={{ color: '#a5f3fc' }}>Lock backbone</strong> in the sidebar.</div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div style={styles.hint}>
        <div style={styles.title}>Track layout</div>
        <div style={styles.step}>① Click to place the first anchor</div>
        <div style={styles.step}>② Move mouse — preview shows auto-spaced segment</div>
        <div style={styles.step}>③ Ctrl+scroll to bend · click to place next anchor</div>
        <div style={styles.step}>④ Double-click a segment to split · click <span style={styles.amber}>amber ring</span> to close</div>
        <div style={styles.step}>Or <strong style={{ color: '#a5f3fc' }}>Skip backbone</strong> in the sidebar to use manual node placement</div>
      </div>
    );
  }

  if (layoutActiveAnchorId && designerSegments.length >= 2) {
    return (
      <div style={styles.hint}>
        <div style={styles.step}>Click the <span style={styles.amber}>amber ring</span> on the first anchor to close the loop</div>
      </div>
    );
  }

  return (
    <div style={styles.hint}>
      <div style={styles.step}>Click to commit · Ctrl+scroll to bend · 0 to straighten</div>
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
    color: '#a5f3fc',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 2,
  },
  step: { color: '#64748b', fontSize: 12 },
  amber: { color: '#f59e0b' },
};
