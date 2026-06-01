import yaml from 'js-yaml';
import type { EditorState, TrackNode } from '../types/track';
import { computeSegments } from '../store/editorStore';
import { buildPressCornersMap } from './pressCorners';

export function buildYamlObject(state: EditorState): Record<string, unknown> {
  const { meta, nodes, segmentData, conditionMarkers, tileColumns, tileRows } = state;

  const n = nodes.length;
  const computed = computeSegments(nodes);
  const totalSpaces = computed.reduce((sum, seg) => sum + seg.spaces, 0);

  const yamlSegments = computed.map(seg => {
    const sd = segmentData.find(d => d.startNodeId === seg.startNodeId);
    const endNode = nodes[seg.endNodeIndex];

    // Legends line: find a node with isLegendsLine in this segment arc
    const legendsNode = findNodeInArc(nodes, seg.startNodeIndex, seg.endNodeIndex, nd => nd.isLegendsLine);
    const legendsLine = legendsNode !== null
      ? countNonPhantomEdges(legendsNode, seg.endNodeIndex, nodes)
      : 0;

    // Finish line: find a node with isFinishLine in this segment arc
    const finishNode = findNodeInArc(nodes, seg.startNodeIndex, seg.endNodeIndex, nd => nd.isFinishLine);
    const finishLineAfter = finishNode !== null
      ? countNonPhantomEdges(seg.startNodeIndex, finishNode, nodes) - 1
      : -1;

    const obj: Record<string, unknown> = {
      spaces: seg.spaces,
      raceLine: sd?.raceLine ?? 'L',
      legendsLine,
      cornerSpeedLimit: endNode?.speedLimit ?? 4,
    };
    if (finishLineAfter >= 0) obj.finishLineAfter = finishLineAfter;
    if (sd?.isChicane) obj.isChicane = true;

    // Legends countdown markers (0 = closest to corner)
    const maxCountdowns = 4;
    const countdownCount = Math.min(maxCountdowns, seg.spaces);
    const countdowns = sd?.legendCountdowns ?? [0, 0, 0, 0];
    const activeCountdowns = countdowns.slice(0, countdownCount);
    obj.legendCountdowns = activeCountdowns;

    // Surfaces: iterate the arc, skip phantom nodes, assign game-space indices
    const surfaces: Record<string, unknown>[] = [];
    const arcLen = (seg.endNodeIndex - seg.startNodeIndex + n) % n;
    let gameSpaceIndex = 0;
    for (let step = 0; step < arcLen; step++) {
      const nd = nodes[(seg.startNodeIndex + step) % n];
      if (nd.isPhantom) continue;
      if (nd?.surfaceType && nd.surfaceType !== 'plain') {
        surfaces.push({ spaceIndex: gameSpaceIndex, type: nd.surfaceType, side: nd.surfaceSide });
      }
      gameSpaceIndex++;
    }
    if (surfaces.length > 0) obj.surfaces = surfaces;
    if (sd?.pressCornerLabel) obj.pressCornerLabel = sd.pressCornerLabel;

    return obj;
  });

  const yamlMarkers = conditionMarkers.map(m => ({
    label: m.label,
    type: m.type,
    x: Math.round(m.x * 100) / 100,
    y: Math.round(m.y * 100) / 100,
    rotation: Math.round(m.rotation * 10) / 10,
  }));

  const pressCorners = buildPressCornersMap(segmentData, computed);

  return {
    schemaVersion: 1,
    id: meta.trackId,
    name: meta.name,
    country: meta.country,
    laps: meta.laps,
    totalSpaces,
    totalCorners: computed.length,
    heat: meta.heat,
    stress: meta.stress,
    tileColumns,
    tileRows,
    tileSizePx: 2048,
    tileSizeCm: 28.5,
    segments: yamlSegments,
    ...(Object.keys(pressCorners).length > 0 ? { pressCorners } : {}),
    ...(yamlMarkers.length > 0 ? { conditionMarkers: yamlMarkers } : {}),
  };
}

export function exportYamlString(state: EditorState): string {
  const obj = buildYamlObject(state);
  return yaml.dump(obj, { lineWidth: 120, quotingType: '"' });
}

export function downloadFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Count non-phantom edges in the arc [from, to) — i.e. edges whose
 * SOURCE node is not phantom, stepping clockwise from `from` up to but
 * not including `to`. Node i is the source of edge i→i+1.
 */
function countNonPhantomEdges(from: number, to: number, nodes: TrackNode[]): number {
  const n = nodes.length;
  const dist = (to - from + n) % n;
  let count = 0;
  for (let k = 0; k < dist; k++) {
    if (!nodes[(from + k) % n].isPhantom) count++;
  }
  return count;
}

/**
 * Find the first node index satisfying `predicate` within the arc from
 * startIdx to endIdx (exclusive, clockwise). Skips phantom nodes.
 * Returns the node index or null.
 */
function findNodeInArc(
  nodes: TrackNode[],
  startIdx: number,
  endIdx: number,
  predicate: (nd: TrackNode) => boolean
): number | null {
  const n = nodes.length;
  const dist = (endIdx - startIdx + n) % n;
  // Start at k=0 so a legends-line placed on the sector's start corner is found.
  // The end corner (k=dist) is intentionally excluded to avoid ambiguity.
  for (let k = 0; k < dist; k++) {
    const idx = (startIdx + k) % n;
    if (nodes[idx].isPhantom) continue;
    if (predicate(nodes[idx])) return idx;
  }
  return null;
}
