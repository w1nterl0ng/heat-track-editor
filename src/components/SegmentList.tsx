import React from 'react';
import { useEditorStore, computeSegments } from '../store/editorStore';

export const SegmentList: React.FC = () => {
  const { nodes, segmentData, selectedSegmentId, setSelectedSegment, loopClosed } = useEditorStore();

  const computed = computeSegments(nodes);

    if (!loopClosed || computed.length === 0) {
    return (
      <div style={styles.empty}>
        {!loopClosed
          ? 'Close the loop to start adding corners and sectors'
          : 'Mark nodes as corners (Shift+click a node, then press C) to create sectors'}
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {computed.map((seg, i) => {
        const sd = segmentData.find(d => d.startNodeId === seg.startNodeId);
        const endNode = nodes[seg.endNodeIndex];
        const hasFinish = nodes.some((nd, idx) => {
          if (!nd.isFinishLine) return false;
          const dist = (idx - seg.startNodeIndex + nodes.length) % nodes.length;
          const segDist = (seg.endNodeIndex - seg.startNodeIndex + nodes.length) % nodes.length;
          return dist > 0 && dist <= segDist;
        });
        const isSelected = selectedSegmentId === (sd?.id ?? null);

        return (
          <div
            key={seg.startNodeId}
            onClick={() => setSelectedSegment(sd?.id ?? null)}
            style={{
              ...styles.item,
              ...(isSelected ? styles.itemSelected : {}),
            }}
          >
            <div style={styles.itemLeft}>
              <div style={styles.cornerBadge}>C{i + 1}</div>
              <div style={styles.itemInfo}>
                <div style={styles.itemName}>
                  Sector {i + 1}
                  {hasFinish && <span style={styles.finishBadge}>FINISH</span>}
                </div>
                <div style={styles.itemMeta}>
                  {seg.spaces} spaces · {sd?.raceLine ?? 'L'} · limit {endNode?.speedLimit ?? 4}
                </div>
              </div>
            </div>
            <div style={styles.chevron}>{isSelected ? '▶' : '›'}</div>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  list: { overflowY: 'auto', maxHeight: 200 },
  empty: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    padding: '16px 12px',
    lineHeight: '16px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '7px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #1e293b',
    transition: 'background 0.1s',
  },
  itemSelected: { background: '#1e3a5f' },
  itemLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  cornerBadge: {
    width: 24, height: 24, borderRadius: 12,
    background: '#ef4444', color: '#fff',
    fontSize: 10, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: 1 },
  itemName: {
    color: '#e2e8f0', fontSize: 12,
    display: 'flex', alignItems: 'center', gap: 5,
  },
  finishBadge: {
    background: '#854d0e', color: '#facc15',
    fontSize: 9, fontWeight: 700,
    padding: '1px 4px', borderRadius: 2,
  },
  itemMeta: { color: '#475569', fontSize: 10 },
  chevron: { color: '#334155', fontSize: 14 },
};
