import React from 'react';
import { useEditorStore, computeSegments } from '../store/editorStore';

export const SegmentProperties: React.FC = () => {
  const {
    nodes,
    segmentData,
    selectedSegmentId,
    updateSegmentData,
    updateCornerSpeedLimit,
    setLegendCountdown,
    snapshot,
  } = useEditorStore();

  if (!selectedSegmentId) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: 24 }}>←</span>
        <span>Click a sector in the list to edit its properties</span>
      </div>
    );
  }

  const sd = segmentData.find(s => s.id === selectedSegmentId);
  if (!sd) return null;

  const computed = computeSegments(nodes);
  const seg = computed.find(s => s.startNodeId === sd.startNodeId);
  if (!seg) return null;

  const segIndex = seg.segmentIndex;
  const endNode = nodes[seg.endNodeIndex];

  const n = nodes.length;

  const finishNodeInSeg = (() => {
    for (let k = 0; k <= seg.spaces; k++) {
      const idx = (seg.startNodeIndex + k) % n;
      if (nodes[idx]?.isFinishLine) return nodes[idx];
    }
    return null;
  })();

  // k=0 is the start corner — include it so a legends line placed there is detected.
  const legendsInfoInSeg = (() => {
    for (let k = 0; k <= seg.spaces; k++) {
      const idx = (seg.startNodeIndex + k) % n;
      if (nodes[idx]?.isLegendsLine) {
        // Count non-phantom edges from this node to the end corner.
        const dist = (seg.endNodeIndex - idx + n) % n;
        let spacesFromCorner = 0;
        for (let j = 0; j < dist; j++) {
          if (!nodes[(idx + j) % n].isPhantom) spacesFromCorner++;
        }
        return { spacesFromCorner };
      }
    }
    return null;
  })();

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>
        Sector {segIndex + 1}
        <span style={styles.subtitle}> · {seg.spaces} spaces → C{segIndex + 1}</span>
      </div>

      {/* Chicane */}
      <div style={styles.chicaneBox}>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={sd.isChicane}
            onChange={e => {
              snapshot();
              updateSegmentData(sd.startNodeId, { isChicane: e.target.checked });
              // Sync start-corner speed limit to match end corner
              if (e.target.checked && endNode) {
                const startNode = nodes[seg.startNodeIndex];
                if (startNode && startNode.speedLimit !== endNode.speedLimit) {
                  updateCornerSpeedLimit(startNode.id, endNode.speedLimit);
                }
              }
            }}
          />
          <span style={styles.chicaneLabel}>Chicane</span>
        </label>
        {sd.isChicane && (
          <div style={styles.chicaneNote}>
            Blue stripe on both edges · both corners share the same speed limit
          </div>
        )}
      </div>

      {/* Race line */}
      <Field label="Race line side">
        <div style={styles.toggle}>
          {(['L', 'R'] as const).map(side => (
            <button
              key={side}
              onClick={() => updateSegmentData(sd.startNodeId, { raceLine: side })}
              style={{
                ...styles.toggleBtn,
                ...(sd.raceLine === side ? styles.toggleBtnActive : {}),
              }}
            >
              {side === 'L' ? '← Left' : 'Right →'}
            </button>
          ))}
        </div>
      </Field>

      {/* Corner speed limit */}
      <Field label="Corner speed limit (end of sector)">
        <input
          style={styles.input}
          type="number" min={1} max={10}
          value={endNode?.speedLimit ?? 4}
          onChange={e => endNode && updateCornerSpeedLimit(endNode.id, parseInt(e.target.value) || 1)}
        />
      </Field>

      {/* Finish line — read-only */}
      <div style={styles.infoBox}>
        <div style={styles.infoRow}>
          <span style={styles.infoRowLabel}>Finish line</span>
          {finishNodeInSeg
            ? <span style={styles.finishPresent}>✓ Present</span>
            : <span style={styles.infoAbsent}>— Not in this sector</span>}
        </div>
        {finishNodeInSeg && (
          <div style={styles.infoNote}>
            Shift+click a node and press <kbd style={styles.kbd}>F</kbd> to move it.
          </div>
        )}
      </div>

      {/* Legends line — read-only */}
      <div style={styles.infoBox}>
        <div style={styles.infoRow}>
          <span style={styles.infoRowLabel}>Legends line</span>
          {legendsInfoInSeg
            ? <span style={styles.legendsPresent}>✓ {legendsInfoInSeg.spacesFromCorner} space{legendsInfoInSeg.spacesFromCorner !== 1 ? 's' : ''} before corner</span>
            : <span style={styles.infoAbsent}>— Not set</span>}
        </div>
        {legendsInfoInSeg && (
          <div style={styles.infoNote}>
            Press <kbd style={styles.kbd}>L</kbd> on a selected node to move it.
          </div>
        )}
      </div>

      {/* Legends countdown markers */}
      {(() => {
        const maxMarkers = 4;
        const count = Math.min(maxMarkers, seg.spaces);
        const countdowns = sd.legendCountdowns ?? [0, 0, 0, 0];
        return (
          <div style={styles.countdownBox}>
            <div style={styles.countdownTitle}>
              Legends Countdown Markers
              <span style={styles.countdownSubtitle}> · {count} active</span>
            </div>
            <div style={styles.countdownHint}>
              Click a marker to cycle aggression: none → ➤ → ➤➤
            </div>
            <div style={styles.countdownRow}>
              {Array.from({ length: maxMarkers }, (_, i) => {
                const active = i < count;
                const aggr = active ? (countdowns[i] ?? 0) : 0;
                return (
                  <button
                    key={i}
                    disabled={!active}
                    onClick={() => {
                      if (active) {
                        setLegendCountdown(sd.startNodeId, i, (aggr + 1) % 3);
                      }
                    }}
                    title={active ? `Position ${i} — click to change aggression` : `Not enough spaces`}
                    style={{
                      ...styles.countdownMarker,
                      ...(active ? styles.countdownMarkerActive : styles.countdownMarkerInactive),
                      ...(aggr === 1 ? styles.countdownAggr1 : {}),
                      ...(aggr === 2 ? styles.countdownAggr2 : {}),
                    }}
                  >
                    <span style={styles.countdownNum}>{i}</span>
                    {active && aggr > 0 && (
                      <span style={styles.countdownChevron}>
                        {aggr === 1 ? '➤' : '➤➤'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={styles.field}>
    <label style={styles.label}>{label}</label>
    {children}
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  panel: { padding: '10px 12px' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8, padding: 24,
    color: '#475569', fontSize: 12, textAlign: 'center',
  },
  panelTitle: {
    color: '#cbd5e1', fontWeight: 700, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
  },
  subtitle: { color: '#ef4444', fontWeight: 400, textTransform: 'none' },
  field: { marginBottom: 8 },
  label: {
    display: 'block', color: '#64748b', fontSize: 10,
    marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  input: {
    width: '100%', background: '#1e293b', border: '1px solid #334155',
    borderRadius: 4, color: '#e2e8f0', padding: '4px 8px',
    fontSize: 12, outline: 'none', boxSizing: 'border-box',
  },
  toggle: { display: 'flex', gap: 4 },
  toggleBtn: {
    flex: 1, padding: '4px 0', background: '#1e293b',
    border: '1px solid #334155', borderRadius: 4,
    color: '#64748b', fontSize: 11, cursor: 'pointer',
  },
  toggleBtnActive: {
    background: '#1e3a5f', border: '1px solid #3b82f6', color: '#93c5fd',
  },
  infoBox: {
    marginBottom: 8, padding: '7px 8px',
    background: '#0f172a', borderRadius: 4, border: '1px solid #1e293b',
  },
  infoRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  infoRowLabel: { color: '#64748b', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  finishPresent: { color: '#facc15', fontSize: 11, fontWeight: 600 },
  legendsPresent: { color: '#c084fc', fontSize: 11, fontWeight: 600 },
  infoAbsent: { color: '#334155', fontSize: 11 },
  infoNote: { color: '#475569', fontSize: 10, lineHeight: '14px', marginTop: 4 },
  kbd: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: 3, padding: '0 3px', fontSize: 9, color: '#93c5fd',
  },
  conditionBox: {
    marginTop: 4, padding: '8px 10px',
    background: '#0f172a', borderRadius: 4, border: '1px solid #1e293b',
  },
  conditionTitle: {
    color: '#94a3b8', fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  },
  conditionNote: {
    color: '#334155', fontSize: 10, lineHeight: '14px', marginBottom: 8,
  },
  countdownBox: {
    marginBottom: 8, padding: '8px 10px',
    background: '#0f172a', borderRadius: 4, border: '1px solid #1e293b',
  },
  countdownTitle: {
    color: '#94a3b8', fontSize: 10,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2,
  },
  countdownSubtitle: { color: '#475569', fontWeight: 400, textTransform: 'none' as const },
  countdownHint: { color: '#334155', fontSize: 9, marginBottom: 8 },
  countdownRow: { display: 'flex', gap: 6 },
  countdownMarker: {
    flex: 1, padding: '6px 2px',
    borderRadius: 4, border: '1px solid',
    cursor: 'pointer', display: 'flex',
    flexDirection: 'column' as const, alignItems: 'center', gap: 2,
  },
  countdownMarkerActive: {
    background: '#1e293b', borderColor: '#475569', color: '#94a3b8',
  },
  countdownMarkerInactive: {
    background: '#0f172a', borderColor: '#1e293b', color: '#1e293b',
    cursor: 'default' as const, opacity: 0.4,
  },
  countdownAggr1: { background: '#422006', borderColor: '#c2410c', color: '#fb923c' },
  countdownAggr2: { background: '#4c0519', borderColor: '#be123c', color: '#fb7185' },
  countdownNum: { fontSize: 13, fontWeight: 700, lineHeight: 1 },
  countdownChevron: { fontSize: 8, lineHeight: 1 },
  chicaneBox: {
    marginBottom: 8, padding: '7px 8px',
    background: '#0f172a', borderRadius: 4, border: '1px solid #1e3a5f',
  },
  chicaneLabel: { color: '#3b82f6', fontWeight: 700, fontSize: 12 },
  chicaneNote: { color: '#475569', fontSize: 10, lineHeight: '14px', marginTop: 4 },
};
