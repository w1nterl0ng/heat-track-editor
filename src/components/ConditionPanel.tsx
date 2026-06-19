import React from 'react';
import { useEditorStore, computeSegments } from '../store/editorStore';

const COLORS = {
  sector:  '#f59e0b',
  corner:  '#ef4444',
  chicane: '#3b82f6',
};

export const ConditionPanel: React.FC = () => {
  const {
    nodes, segmentData, conditionMarkers, generateConditionMarkers,
    weatherToken, placeWeatherToken, removeWeatherToken,
    trackStats, placeTrackStats, removeTrackStats,
  } = useEditorStore();

  const computed = computeSegments(nodes);
  const sectorCount  = computed.filter(seg => {
    const sd = segmentData.find(d => d.startNodeId === seg.startNodeId);
    return !sd?.isChicane;
  }).length;
  const chicaneCount = computed.filter(seg => {
    const sd = segmentData.find(d => d.startNodeId === seg.startNodeId);
    return sd?.isChicane ?? false;
  }).length;
  const cornerCount  = sectorCount;

  const hasMarkers = conditionMarkers.length > 0;

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>Condition Markers</div>

      <div style={styles.hint}>
        Drag a marker to reposition. Scroll wheel over a marker to rotate (hold Shift for 1° steps).
      </div>

      <button style={styles.generateBtn} onClick={generateConditionMarkers}>
        {hasMarkers ? '↺ Re-generate markers' : '+ Auto-generate markers'}
      </button>

      {/* Track stats */}
      {computed.length > 0 && (
        <div style={styles.stats}>
          <span style={styles.stat}>
            <span style={{ ...styles.dot, background: COLORS.sector }} />
            {sectorCount} sector{sectorCount !== 1 ? 's' : ''}
          </span>
          <span style={styles.stat}>
            <span style={{ ...styles.dot, background: COLORS.chicane }} />
            {chicaneCount} chicane{chicaneCount !== 1 ? 's' : ''}
          </span>
          <span style={styles.stat}>
            <span style={{ ...styles.dot, background: COLORS.corner }} />
            {cornerCount} corner{cornerCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Weather token */}
      <div style={styles.sectionLabel}>Weather Token</div>
      {weatherToken ? (
        <div style={styles.weatherBox}>
          <div style={styles.weatherRow}>
            <span style={styles.weatherSwatch}>W</span>
            <span style={styles.weatherCoords}>
              {weatherToken.x.toFixed(0)}, {weatherToken.y.toFixed(0)}
            </span>
            <span style={styles.weatherSize}>
              {weatherToken.width.toFixed(0)} px
            </span>
          </div>
          <div style={styles.weatherHint}>
            Drag to move · scroll wheel to scale (Shift = fine)
          </div>
          <button style={styles.removeBtn} onClick={removeWeatherToken}>
            ✕ Remove weather token
          </button>
        </div>
      ) : (
        <button style={styles.generateBtn} onClick={placeWeatherToken}>
          + Place weather token
        </button>
      )}

      {/* Track stats box */}
      <div style={styles.sectionLabel}>Track Stats</div>
      {trackStats ? (
        <div style={styles.weatherBox}>
          <div style={styles.weatherRow}>
            <span style={styles.weatherSwatch}>S</span>
            <span style={styles.weatherCoords}>
              {trackStats.x.toFixed(0)}, {trackStats.y.toFixed(0)}
            </span>
            <span style={styles.weatherSize}>
              {trackStats.width.toFixed(0)} px
            </span>
          </div>
          <div style={styles.weatherHint}>
            Drag to move · scroll wheel to scale (Shift = fine)
          </div>
          <button style={styles.removeBtn} onClick={removeTrackStats}>
            ✕ Remove track stats
          </button>
        </div>
      ) : (
        <button style={styles.generateBtn} onClick={placeTrackStats}>
          + Place track stats
        </button>
      )}

      {/* Legend */}
      <div style={styles.sectionLabel}>Legend</div>
      <div style={styles.legend}>
        {(['sector', 'chicane', 'corner'] as const).map(type => (
          <div key={type} style={styles.legendRow}>
            <span style={{ ...styles.legendSwatch, background: COLORS[type] }} />
            <span style={styles.legendLabel}>
              {type === 'sector'  && 'S — Sector condition'}
              {type === 'chicane' && 'S — Chicane condition'}
              {type === 'corner'  && 'C — Corner condition'}
            </span>
          </div>
        ))}
      </div>

      {/* Live marker list */}
      {hasMarkers && (
        <>
          <div style={styles.sectionLabel}>Placed markers ({conditionMarkers.length})</div>
          <div style={styles.markerList}>
            {conditionMarkers.map(m => (
              <div key={m.id} style={styles.markerRow}>
                <span style={{ ...styles.markerSwatch, background: COLORS[m.type] }}>
                  {m.label}
                </span>
                <span style={styles.markerCoords}>
                  {m.x.toFixed(0)}, {m.y.toFixed(0)}
                </span>
                <span style={styles.markerRotation}>
                  {Math.round(m.rotation)}°
                </span>
              </div>
            ))}
          </div>
        </>
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
  generateBtn: {
    width: '100%', padding: '8px 12px',
    background: '#1e3a5f', border: '1px solid #3b82f6',
    borderRadius: 6, color: '#93c5fd',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    marginBottom: 12,
  },
  stats: {
    display: 'flex', gap: 10, marginBottom: 12,
    padding: '6px 8px', background: '#0f172a',
    borderRadius: 4, border: '1px solid #1e293b',
  },
  stat: {
    display: 'flex', alignItems: 'center', gap: 5,
    color: '#94a3b8', fontSize: 11,
  },
  dot: { width: 8, height: 8, borderRadius: 1, flexShrink: 0 },
  sectionLabel: {
    color: '#64748b', fontSize: 10, textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 4,
  },
  legend: { marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  legendRow: { display: 'flex', alignItems: 'center', gap: 7 },
  legendSwatch: { width: 14, height: 14, borderRadius: 2, flexShrink: 0 },
  legendLabel: { color: '#94a3b8', fontSize: 11 },
  markerList: {
    display: 'flex', flexDirection: 'column', gap: 3,
    maxHeight: 200, overflowY: 'auto',
  },
  markerRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '3px 6px', background: '#1e293b', borderRadius: 4,
  },
  markerSwatch: {
    minWidth: 28, textAlign: 'center',
    padding: '1px 3px', borderRadius: 2,
    color: '#fff', fontSize: 10, fontWeight: 700,
    flexShrink: 0,
  },
  markerCoords: { color: '#475569', fontSize: 10, fontFamily: 'monospace', flex: 1 },
  markerRotation: { color: '#64748b', fontSize: 10, fontFamily: 'monospace', minWidth: 36, textAlign: 'right' as const },
  weatherBox: {
    marginBottom: 12, padding: '7px 8px',
    background: '#0f172a', borderRadius: 4, border: '1px solid #334155',
  },
  weatherRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  weatherSwatch: {
    minWidth: 28, textAlign: 'center' as const,
    padding: '1px 3px', borderRadius: 2,
    background: '#334155', color: '#94a3b8',
    fontSize: 10, fontWeight: 700, flexShrink: 0,
  },
  weatherCoords: { color: '#475569', fontSize: 10, fontFamily: 'monospace', flex: 1 },
  weatherSize: { color: '#64748b', fontSize: 10, fontFamily: 'monospace', minWidth: 48, textAlign: 'right' as const },
  weatherHint: { color: '#334155', fontSize: 9, lineHeight: '13px', marginBottom: 6 },
  removeBtn: {
    width: '100%', padding: '5px 8px',
    background: 'transparent', border: '1px solid #451a03',
    borderRadius: 4, color: '#f97316',
    fontSize: 10, cursor: 'pointer',
  },
};
