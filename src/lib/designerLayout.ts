import type { Point, TrackNode, DesignerSegment } from '../types/track';
import {
  spacePointsOnCurve,
  chooseSpaceCount,
  quadraticArcLength,
  segmentNormal,
  quadraticPoint,
  nearestPointOnQuadratic,
  splitQuadraticSegment,
} from './designerCurve';

const MIN_SPLIT_T = 0.08;
const MAX_SPLIT_T = 0.92;

export function makeLayoutNode(x: number, y: number, id?: string): TrackNode {
  return {
    id: id ?? Math.random().toString(36).slice(2, 10),
    x,
    y,
    isCorner: false,
    speedLimit: 4,
    isFinishLine: false,
    isLegendsLine: false,
    isPhantom: false,
    surfaceType: 'plain',
    surfaceSide: 'both',
  };
}

/** Collect anchor node ids from layout segments + optional active anchor. */
export function getAnchorNodeIds(
  segments: DesignerSegment[],
  nodes: TrackNode[],
  activeAnchorId: string | null,
): Set<string> {
  const ids = new Set<string>();
  if (nodes.length > 0 && segments.length === 0) ids.add(nodes[0].id);
  for (const seg of segments) {
    ids.add(seg.startNodeId);
    ids.add(seg.endNodeId);
  }
  if (activeAnchorId) ids.add(activeAnchorId);
  return ids;
}

function spaceCountForSegment(
  start: Point,
  end: Point,
  bendOffset: number,
  idealLength: number,
  minRatio: number,
  maxRatio: number,
): number {
  const arcLen = quadraticArcLength(start, end, bendOffset);
  return chooseSpaceCount(arcLen, idealLength, minRatio, maxRatio);
}

/**
 * Replace nodes strictly between start and end anchor (open chain, startIdx < endIdx).
 */
export function rebuildOpenSegmentInNodes(
  nodes: TrackNode[],
  segment: DesignerSegment,
  idealLength: number,
  minRatio: number,
  maxRatio: number,
): TrackNode[] {
  const startIdx = nodes.findIndex(n => n.id === segment.startNodeId);
  const endIdx = nodes.findIndex(n => n.id === segment.endNodeId);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return nodes;

  const start = nodes[startIdx];
  const end = nodes[endIdx];
  const spaceCount = spaceCountForSegment(start, end, segment.bendOffset, idealLength, minRatio, maxRatio);
  const points = spacePointsOnCurve(start, end, segment.bendOffset, spaceCount);
  const intermediates = points.slice(1, spaceCount).map(p => makeLayoutNode(p.x, p.y));

  return [
    ...nodes.slice(0, startIdx + 1),
    ...intermediates,
    ...nodes.slice(endIdx),
  ];
}

/**
 * Rebuild the closing segment (last anchor → first anchor).
 * Closing intermediates live at the tail of the nodes array.
 */
export function rebuildClosingSegmentInNodes(
  nodes: TrackNode[],
  segment: DesignerSegment,
  idealLength: number,
  minRatio: number,
  maxRatio: number,
): TrackNode[] {
  const startIdx = nodes.findIndex(n => n.id === segment.startNodeId);
  const endNode = nodes.find(n => n.id === segment.endNodeId);
  if (startIdx === -1 || !endNode) return nodes;

  const start = nodes[startIdx];
  const spaceCount = spaceCountForSegment(start, endNode, segment.bendOffset, idealLength, minRatio, maxRatio);
  const points = spacePointsOnCurve(start, endNode, segment.bendOffset, spaceCount);
  const intermediates = points.slice(1, spaceCount).map(p => makeLayoutNode(p.x, p.y));

  return [...nodes.slice(0, startIdx + 1), ...intermediates];
}

/** Rebuild every layout segment (open + optional closing). */
export function rebuildAllSegments(
  nodes: TrackNode[],
  segments: DesignerSegment[],
  idealLength: number,
  minRatio: number,
  maxRatio: number,
  closingSegmentId: string | null,
): TrackNode[] {
  let result = nodes;
  for (const seg of segments) {
    if (closingSegmentId && seg.id === closingSegmentId) continue;
    result = rebuildOpenSegmentInNodes(result, seg, idealLength, minRatio, maxRatio);
  }
  const closing = closingSegmentId ? segments.find(s => s.id === closingSegmentId) : null;
  if (closing) {
    result = rebuildClosingSegmentInNodes(result, closing, idealLength, minRatio, maxRatio);
  }
  return result;
}

/** Commit a new open segment from start anchor to a new end anchor. */
export function commitNewSegment(
  nodes: TrackNode[],
  startNodeId: string,
  endX: number,
  endY: number,
  bendOffset: number,
  idealLength: number,
  minRatio: number,
  maxRatio: number,
  segmentId: string,
): { nodes: TrackNode[]; segment: DesignerSegment } {
  const startIdx = nodes.findIndex(n => n.id === startNodeId);
  if (startIdx === -1) {
    return { nodes, segment: { id: segmentId, startNodeId, endNodeId: startNodeId, bendOffset } };
  }

  const start = nodes[startIdx];
  const endNode = makeLayoutNode(endX, endY);
  const spaceCount = spaceCountForSegment(start, endNode, bendOffset, idealLength, minRatio, maxRatio);
  const points = spacePointsOnCurve(start, endNode, bendOffset, spaceCount);
  const intermediates = points.slice(1, spaceCount).map(p => makeLayoutNode(p.x, p.y));

  return {
    nodes: [
      ...nodes.slice(0, startIdx + 1),
      ...intermediates,
      endNode,
    ],
    segment: {
      id: segmentId,
      startNodeId: startNodeId,
      endNodeId: endNode.id,
      bendOffset,
    },
  };
}

/** Commit closing segment; appends intermediates after the last anchor. */
export function commitClosingSegment(
  nodes: TrackNode[],
  startNodeId: string,
  endNodeId: string,
  bendOffset: number,
  idealLength: number,
  minRatio: number,
  maxRatio: number,
  segmentId: string,
): { nodes: TrackNode[]; segment: DesignerSegment } {
  const startIdx = nodes.findIndex(n => n.id === startNodeId);
  const endNode = nodes.find(n => n.id === endNodeId);
  if (startIdx === -1 || !endNode) {
    return { nodes, segment: { id: segmentId, startNodeId, endNodeId, bendOffset } };
  }

  const start = nodes[startIdx];
  const spaceCount = spaceCountForSegment(start, endNode, bendOffset, idealLength, minRatio, maxRatio);
  const points = spacePointsOnCurve(start, endNode, bendOffset, spaceCount);
  const intermediates = points.slice(1, spaceCount).map(p => makeLayoutNode(p.x, p.y));

  return {
    nodes: [...nodes.slice(0, startIdx + 1), ...intermediates],
    segment: { id: segmentId, startNodeId, endNodeId, bendOffset },
  };
}

/** Distance from point to quadratic curve (sampled). */
export function distanceToSegment(
  a: Point,
  b: Point,
  bendOffset: number,
  px: number,
  py: number,
): number {
  let best = Infinity;
  const samples = 32;
  for (let i = 0; i <= samples; i++) {
    const pt = quadraticPoint(a, b, bendOffset, i / samples);
    const dx = pt.x - px;
    const dy = pt.y - py;
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** Find nearest designer segment to a world point. */
export function findNearestSegment(
  nodes: TrackNode[],
  segments: DesignerSegment[],
  px: number,
  py: number,
): DesignerSegment | null {
  let best: DesignerSegment | null = null;
  let bestDist = Infinity;
  for (const seg of segments) {
    const a = nodes.find(n => n.id === seg.startNodeId);
    const b = nodes.find(n => n.id === seg.endNodeId);
    if (!a || !b) continue;
    const d = distanceToSegment(a, b, seg.bendOffset, px, py);
    if (d < bestDist) {
      bestDist = d;
      best = seg;
    }
  }
  return best;
}

/** Strip game-authoring data from nodes (for unlock / reset). */
export function stripNodeGameData(nodes: TrackNode[]): TrackNode[] {
  return nodes.map(nd => ({
    ...nd,
    isCorner: false,
    isFinishLine: false,
    isLegendsLine: false,
    isPhantom: false,
    speedLimit: 4,
    surfaceType: 'plain' as const,
    surfaceSide: 'both' as const,
    cornerLollipopSide: undefined,
    legendsLollipopSide: undefined,
  }));
}

/**
 * Insert a new anchor on a segment at the nearest point to (clickX, clickY).
 * Splits one quadratic span into two, preserving curve shape via de Casteljau.
 */
export function splitDesignerSegment(
  nodes: TrackNode[],
  segments: DesignerSegment[],
  segmentId: string,
  clickX: number,
  clickY: number,
  closingSegmentId: string | null,
  idealLength: number,
  minRatio: number,
  maxRatio: number,
  newSegId1: string,
  newSegId2: string,
): { nodes: TrackNode[]; segments: DesignerSegment[]; newAnchorId: string } | null {
  const segIdx = segments.findIndex(s => s.id === segmentId);
  if (segIdx === -1) return null;

  const seg = segments[segIdx];
  const a = nodes.find(n => n.id === seg.startNodeId);
  const b = nodes.find(n => n.id === seg.endNodeId);
  if (!a || !b) return null;

  const hit = nearestPointOnQuadratic(a, b, seg.bendOffset, clickX, clickY);
  if (hit.t < MIN_SPLIT_T || hit.t > MAX_SPLIT_T) return null;

  const { point, bend1, bend2 } = splitQuadraticSegment(a, b, seg.bendOffset, hit.t);
  const newAnchor = makeLayoutNode(point.x, point.y);
  const isClosing = closingSegmentId === segmentId;
  const startIdx = nodes.findIndex(n => n.id === seg.startNodeId);
  const endIdx = nodes.findIndex(n => n.id === seg.endNodeId);

  let working: TrackNode[];
  if (isClosing) {
    if (startIdx === -1) return null;
    working = [...nodes.slice(0, startIdx + 1), newAnchor];
  } else {
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null;
    working = [
      ...nodes.slice(0, startIdx + 1),
      newAnchor,
      ...nodes.slice(endIdx),
    ];
  }

  const seg1: DesignerSegment = {
    id: newSegId1,
    startNodeId: seg.startNodeId,
    endNodeId: newAnchor.id,
    bendOffset: bend1,
  };
  const seg2: DesignerSegment = {
    id: newSegId2,
    startNodeId: newAnchor.id,
    endNodeId: seg.endNodeId,
    bendOffset: bend2,
  };

  let rebuilt = rebuildOpenSegmentInNodes(working, seg1, idealLength, minRatio, maxRatio);
  if (isClosing) {
    rebuilt = rebuildClosingSegmentInNodes(rebuilt, seg2, idealLength, minRatio, maxRatio);
  } else {
    rebuilt = rebuildOpenSegmentInNodes(rebuilt, seg2, idealLength, minRatio, maxRatio);
  }

  const newSegments = [
    ...segments.slice(0, segIdx),
    seg1,
    seg2,
    ...segments.slice(segIdx + 1),
  ];

  return { nodes: rebuilt, segments: newSegments, newAnchorId: newAnchor.id };
}

/** Perpendicular distance from point to segment normal (for bend handle drag). */
export function bendOffsetFromControlDrag(
  a: Point,
  b: Point,
  controlX: number,
  controlY: number,
): number {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const n = segmentNormal(a, b);
  const dx = controlX - mid.x;
  const dy = controlY - mid.y;
  return dx * n.x + dy * n.y;
}
