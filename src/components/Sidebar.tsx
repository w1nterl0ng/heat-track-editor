import React, { useState } from 'react';
import Konva from 'konva';
import { useEditorStore, computeSegments } from '../store/editorStore';
import { TrackProperties } from './TrackProperties';
import { SegmentList } from './SegmentList';
import { SegmentProperties } from './SegmentProperties';
import { SurfacePanel } from './SurfacePanel';
import { ConditionPanel } from './ConditionPanel';
import { BackgroundPanel } from './BackgroundPanel';
import { exportYamlString, downloadFile } from '../lib/exportYaml';
import { exportTrackLayoutJson } from '../lib/exportJson';
import { exportV2Package, exportV2Bundle } from '../lib/exportV2';
import { exportBoardImage } from '../lib/exportImage';
import { exportBackgroundTiles } from '../lib/exportTiles';

type Tab = 'track' | 'segments' | 'export';

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const Sidebar: React.FC<Props> = ({ stageRef }) => {
  const [activeTab, setActiveTab] = useState<Tab>('track');
  const [bundleExporting, setBundleExporting] = useState(false);
  const store = useEditorStore();
  const { meta, nodes, tool, backgroundImage, segmentData, conditionMarkers } = store;

  const computed = computeSegments(nodes);
  const cornerCount = computed.length;
  const totalSpaces = computed.reduce((s, seg) => s + seg.spaces, 0);
  const hasFinish = nodes.some(nd => nd.isFinishLine);
  const canExport = cornerCount > 0 && totalSpaces > 0 && hasFinish;

  // ── Checklist derivations ──────────────────────────────────────────────────
  const hasConditionMarkers = conditionMarkers.length > 0;

  const zeroRotationCount = conditionMarkers.filter(m => m.rotation === 0).length;
  const hasZeroRotationMarkers = zeroRotationCount > 0;

  const hasAnySurface = nodes.some(nd => nd.surfaceType !== 'plain');

  const cornerNodes = nodes.filter(nd => nd.isCorner);
  const allSpeedsDefault = cornerNodes.length > 0 && cornerNodes.every(nd => nd.speedLimit === 4);

  const hasAnyAggression = segmentData.some(sd =>
    (sd.legendCountdowns ?? [0, 0, 0, 0]).some(v => v > 0)
  );

  // Per-sector legends line check — mirrors the k=0 detection in SegmentProperties.
  const segsWithLegendsLine = computed.reduce((count, seg) => {
    const n = nodes.length;
    for (let k = 0; k <= seg.spaces; k++) {
      const idx = (seg.startNodeIndex + k) % n;
      if (nodes[idx]?.isLegendsLine) return count + 1;
    }
    return count;
  }, 0);
  const allSectorsHaveLegends = cornerCount > 0 && segsWithLegendsLine === cornerCount;
  const hasLegendsLines = segsWithLegendsLine > 0;
  const noAggressionOnLegends = hasLegendsLines && !hasAnyAggression;

  const allRaceLinesDefault = computed.length > 0 &&
    computed.every(seg => (segmentData.find(sd => sd.startNodeId === seg.startNodeId)?.raceLine ?? 'L') === 'L');

  const handleExportYaml = () => {
    const content = exportYamlString(store);
    downloadFile(`track_${meta.trackId}.yml`, content, 'text/yaml');
  };

  const handleExportJson = () => exportTrackLayoutJson(store);
  const handleExportV2   = () => exportV2Package(store);

  const handleExportV2Bundle = async () => {
    setBundleExporting(true);
    try { await exportV2Bundle(store); }
    finally { setBundleExporting(false); }
  };

  const handleExportImage = async () => {
    if (!stageRef.current) return;
    await exportBoardImage(stageRef.current, meta.trackId);
  };

  const handleExportTiles = async () => {
    await exportBackgroundTiles(store);
  };

  return (
    <div style={styles.sidebar}>
      {/* Surface / Condition / Background modes replace normal tab UI */}
      {tool === 'surface' ? (
        <div style={styles.tabContent}>
          <SurfacePanel />
        </div>
      ) : tool === 'condition' ? (
        <div style={styles.tabContent}>
          <ConditionPanel />
        </div>
      ) : tool === 'background' ? (
        <div style={styles.tabContent}>
          <BackgroundPanel />
        </div>
      ) : (<>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        <TabBtn id="track" label="Track" active={activeTab === 'track'} onClick={setActiveTab} />
        <TabBtn
          id="segments"
          label={`Sectors${cornerCount > 0 ? ` (${cornerCount})` : ''}`}
          active={activeTab === 'segments'}
          onClick={setActiveTab}
        />
        <TabBtn id="export" label="Export" active={activeTab === 'export'} onClick={setActiveTab} />
      </div>

      {/* Tab content */}
      <div style={styles.tabContent}>

        {/* ── TRACK TAB ────────────────────────────────────────── */}
        {activeTab === 'track' && (
          <TrackProperties />
        )}

        {/* ── SEGMENTS TAB ─────────────────────────────────────── */}
        {activeTab === 'segments' && (
          <div style={styles.segmentsTab}>
            {/* Compact list header */}
            <div style={styles.listHeader}>
              <span style={styles.listHeaderText}>
                {cornerCount === 0
                  ? 'Mark corners on the canvas to create sectors'
                  : `${cornerCount} sector${cornerCount !== 1 ? 's' : ''} · ${totalSpaces} spaces`}
              </span>
              {!hasFinish && cornerCount > 0 && (
                <span style={styles.warnBadge}>No finish line</span>
              )}
            </div>

            {/* Scrollable segment list */}
            <div style={styles.listScroll}>
              <SegmentList />
            </div>

            {/* Properties below — takes remaining space */}
            <div style={styles.propsDivider}>
              <span>Properties</span>
            </div>
            <div style={styles.propsScroll}>
              <SegmentProperties />
            </div>
          </div>
        )}

        {/* ── EXPORT TAB ───────────────────────────────────────── */}
        {activeTab === 'export' && (
          <div style={styles.exportTab}>
            <div style={styles.exportIntro}>
              Export your track. Use <strong style={{ color: '#93c5fd' }}>V2</strong> for new tracks.
              V1 (YAML + JSON) is kept for reference only.
            </div>

            {/* ── V2 unified export (recommended) ── */}
            <div style={styles.exportGroupLabel}>V2 — Recommended</div>
            <ExportButton
              label={bundleExporting ? 'Building package…' : `track_${meta.trackId}_v2_package.zip`}
              description="JSON + background tiles in one ZIP · drop into Unity"
              icon="📦"
              disabled={!canExport || !backgroundImage || bundleExporting}
              badge={!canExport ? 'Incomplete' : !backgroundImage ? 'No tiles' : bundleExporting ? '…' : 'Ready'}
              badgeOk={canExport && !!backgroundImage && !bundleExporting}
              onClick={handleExportV2Bundle}
            />
            <ExportButton
              label={`track_${meta.trackId}_v2.json`}
              description="JSON only — without tiles"
              icon="🚀"
              disabled={!canExport}
              badge={canExport ? 'Ready' : 'Incomplete'}
              badgeOk={canExport}
              onClick={handleExportV2}
            />

            {/* ── V1 legacy exports ── */}
            <div style={{ ...styles.exportGroupLabel, marginTop: 8 }}>V1 — Legacy</div>
            <ExportButton
              label={`track_${meta.trackId}.yml`}
              description="V1 game logic (YAML)"
              icon="📄"
              disabled={!canExport}
              badge={canExport ? 'Ready' : 'Incomplete'}
              badgeOk={canExport}
              onClick={handleExportYaml}
            />

            <ExportButton
              label={`TrackLayout_${meta.trackId}.json`}
              description="V1 Unity spline geometry (JSON)"
              icon="🗂"
              disabled={nodes.length === 0}
              badge={nodes.length > 0 ? 'Ready' : 'No nodes'}
              badgeOk={nodes.length > 0}
              onClick={handleExportJson}
            />

            <ExportButton
              label="Board Image (PNG)"
              description="Flattened board graphic · 2× resolution"
              icon="🖼"
              disabled={false}
              badge="Always ready"
              badgeOk
              onClick={handleExportImage}
            />

            <ExportButton
              label="Background Tiles (JPG)"
              description="T_{id}_{col}_{row}.jpg · one per tile — standalone"
              icon="🗺"
              disabled={!backgroundImage}
              badge={backgroundImage ? 'Ready' : 'No image'}
              badgeOk={!!backgroundImage}
              onClick={handleExportTiles}
            />

            {/* Validation checklist */}
            <div style={styles.checklist}>
              <div style={styles.checklistSection}>FATAL</div>
              <CheckItem kind="fatal" ok={cornerCount > 0} label={`${cornerCount} sector${cornerCount !== 1 ? 's' : ''} defined`} />
              <CheckItem kind="fatal" ok={totalSpaces > 0} label={`${totalSpaces} total space${totalSpaces !== 1 ? 's' : ''}`} />
              <CheckItem kind="fatal" ok={hasFinish} label="Finish line placed" />
              <CheckItem kind="fatal" ok={allSectorsHaveLegends}
                label={allSectorsHaveLegends
                  ? `All ${cornerCount} sector${cornerCount !== 1 ? 's' : ''} have a legends line`
                  : `${segsWithLegendsLine} of ${cornerCount} sector${cornerCount !== 1 ? 's' : ''} have a legends line`}
              />
              <CheckItem kind="fatal" ok={hasConditionMarkers} label="Condition markers placed" />

              <div style={{ ...styles.checklistSection, marginTop: 6 }}>WARNINGS</div>
              {hasLegendsLines && (
                <CheckItem kind="warn" ok={!noAggressionOnLegends} label="Aggression set on Legends countdown markers" />
              )}
              {conditionMarkers.length > 0 && (
                <CheckItem kind="warn" ok={!hasZeroRotationMarkers}
                  label={hasZeroRotationMarkers
                    ? `${zeroRotationCount} of ${conditionMarkers.length} condition marker${conditionMarkers.length !== 1 ? 's' : ''} at 0°`
                    : 'All condition markers rotated'}
                />
              )}
              <CheckItem kind="warn" ok={!allRaceLinesDefault} label="Race line side customised (not all Left)" />
              <CheckItem kind="warn" ok={hasAnySurface} label="Surfaces defined" />
              {cornerNodes.length > 0 && (
                <CheckItem kind="warn" ok={!allSpeedsDefault} label="Corner speeds customised (not all 4)" />
              )}
            </div>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

const TabBtn: React.FC<{ id: Tab; label: string; active: boolean; onClick: (id: Tab) => void }> = ({
  id, label, active, onClick,
}) => (
  <button
    onClick={() => onClick(id)}
    style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}
  >
    {label}
  </button>
);

const CheckItem: React.FC<{ ok: boolean; label: string; kind: 'fatal' | 'warn' }> = ({ ok, label, kind }) => {
  const color = ok ? '#4ade80' : kind === 'fatal' ? '#f87171' : '#fbbf24';
  const icon  = ok ? '✓'       : kind === 'fatal' ? '✗'       : '⚠';
  return (
    <div style={{ ...styles.checkItem, color }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
};

const ExportButton: React.FC<{
  label: string;
  description: string;
  icon: string;
  disabled: boolean;
  badge: string;
  badgeOk: boolean;
  onClick: () => void;
}> = ({ label, description, icon, disabled, badge, badgeOk, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{ ...styles.exportBtn, ...(disabled ? styles.exportBtnDisabled : {}) }}
  >
    <span style={styles.exportIcon}>{icon}</span>
    <div style={styles.exportBtnText}>
      <div style={styles.exportBtnLabel}>{label}</div>
      <div style={styles.exportBtnDesc}>{description}</div>
    </div>
    <span style={{ ...styles.badge, color: badgeOk ? '#4ade80' : '#f87171' }}>{badge}</span>
  </button>
);

// ── Styles ─────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 300,
    flexShrink: 0,
    background: '#0f172a',
    borderLeft: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },

  // Tab bar
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: '9px 4px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#475569',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    letterSpacing: '0.02em',
  },
  tabActive: {
    color: '#93c5fd',
    borderBottom: '2px solid #3b82f6',
  },

  // Content area
  tabContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  // Segments tab layout
  segmentsTab: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 12px',
    flexShrink: 0,
    borderBottom: '1px solid #1e293b',
  },
  listHeaderText: {
    color: '#64748b',
    fontSize: 11,
  },
  warnBadge: {
    background: '#451a03',
    color: '#fb923c',
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 3,
    fontWeight: 600,
  },
  listScroll: {
    flexShrink: 0,
    maxHeight: '35%',
    overflowY: 'auto',
    borderBottom: '1px solid #1e293b',
  },
  propsDivider: {
    padding: '5px 12px',
    background: '#1e293b',
    color: '#64748b',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    flexShrink: 0,
    borderBottom: '1px solid #334155',
  },
  propsScroll: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },

  exportGroupLabel: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#475569',
    textTransform: 'uppercase' as const,
    paddingBottom: 2,
  },

  // Export tab
  exportTab: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    overflowY: 'auto',
    height: '100%',
  },
  exportIntro: {
    color: '#475569',
    fontSize: 11,
    lineHeight: '16px',
    marginBottom: 4,
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
  exportBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
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
    color: '#e2e8f0',
    wordBreak: 'break-all',
  },
  exportBtnDesc: {
    fontSize: 10,
    color: '#64748b',
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    flexShrink: 0,
  },
  checklist: {
    marginTop: 4,
    padding: '8px 10px',
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  checkItem: {
    display: 'flex',
    gap: 6,
    fontSize: 11,
    lineHeight: '16px',
  },
  checklistSection: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#475569',
    textTransform: 'uppercase' as const,
    paddingBottom: 2,
    borderBottom: '1px solid #1e293b',
    marginBottom: 2,
  },
};
