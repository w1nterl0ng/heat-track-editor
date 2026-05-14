import type { EditorState, Point } from '../types/track';
import { downloadFile } from './exportYaml';

const EXPORT_SCALE = 20;

function normalizePoints(points: Point[], canvasWidth: number, canvasHeight: number): Point[] {
  if (points.length === 0) return [];
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const scale = EXPORT_SCALE / Math.max(canvasWidth, canvasHeight);
  return points.map(p => ({
    x: parseFloat(((p.x - cx) * scale).toFixed(4)),
    y: parseFloat(((cy - p.y) * scale).toFixed(4)),
  }));
}

export function buildTrackLayoutJson(state: EditorState): object {
  const { meta, nodes, trackWidthPct, tileColumns, tileRows } = state;
  const worldWidth = tileColumns * 2048;
  const worldHeight = tileRows * 2048;

  const normalized = normalizePoints(
    nodes.map(nd => ({ x: nd.x, y: nd.y })),
    worldWidth,
    worldHeight
  );

  const scaleUnitsPerPx = EXPORT_SCALE / Math.max(worldWidth, worldHeight);
  // Track width is always relative to one tile (fixed physical scale: 2048 px = 28.5 cm)
  const trackWidthPx = (trackWidthPct / 100) * 2048;
  const trackWidth = parseFloat((trackWidthPx * scaleUnitsPerPx).toFixed(4));

  const cornerIndices = nodes
    .map((nd, i) => (nd.isCorner ? i : -1))
    .filter(i => i >= 0);

  const phantomIndices = nodes
    .map((nd, i) => (nd.isPhantom ? i : -1))
    .filter(i => i >= 0);

  return {
    trackId: meta.trackId,
    controlPoints: normalized,
    cornerIndices,
    ...(phantomIndices.length > 0 ? { phantomIndices } : {}),
    trackWidth,
    samplesPerEdge: 16,
  };
}

export function exportTrackLayoutJson(state: EditorState): void {
  const obj = buildTrackLayoutJson(state);
  const json = JSON.stringify(obj, null, 2);
  downloadFile(`TrackLayout_${state.meta.trackId}.json`, json, 'application/json');
}
