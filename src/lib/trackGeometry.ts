import type { Point, TrackNode, SegmentData, SurfaceType, SurfaceSide } from '../types/track';
import type { SplineSample } from './spline';
import type { ComputedSegment } from '../store/editorStore';

export interface TrackLines {
  centerPoints: number[];
  innerPoints: number[];
  outerPoints: number[];
}

export interface CornerLine {
  id: string;
  inner: Point;
  outer: Point;
  center: Point;
  normal: Point;
  sampleIndex: number;
}

export interface SpaceTick {
  inner: Point;
  outer: Point;
  center: Point;
}

/**
 * Build flat point arrays for center, inner and outer spline lines.
 */
export function buildTrackLines(
  samples: SplineSample[],
  halfWidth: number
): TrackLines {
  const center: number[] = [];
  const inner: number[] = [];
  const outer: number[] = [];

  for (const s of samples) {
    center.push(s.point.x, s.point.y);
    inner.push(s.point.x - s.normal.x * halfWidth, s.point.y - s.normal.y * halfWidth);
    outer.push(s.point.x + s.normal.x * halfWidth, s.point.y + s.normal.y * halfWidth);
  }

  if (samples.length > 0) {
    center.push(samples[0].point.x, samples[0].point.y);
    inner.push(
      samples[0].point.x - samples[0].normal.x * halfWidth,
      samples[0].point.y - samples[0].normal.y * halfWidth
    );
    outer.push(
      samples[0].point.x + samples[0].normal.x * halfWidth,
      samples[0].point.y + samples[0].normal.y * halfWidth
    );
  }

  return { centerPoints: center, innerPoints: inner, outerPoints: outer };
}

/**
 * For each corner node, compute the cross-track line geometry at that node's
 * position on the spline. Node i → sample index i * samplesPerEdge.
 */
export function buildCornerLines(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  halfWidth: number
): CornerLine[] {
  if (samples.length === 0) return [];
  return nodes
    .map((nd, i) => ({ nd, i }))
    .filter(({ nd }) => nd.isCorner)
    .map(({ nd, i }) => {
      const sampleIdx = Math.min(i * samplesPerEdge, samples.length - 1);
      const s = samples[sampleIdx];
      return {
        id: nd.id,
        center: s.point,
        normal: s.normal,
        inner: {
          x: s.point.x - s.normal.x * halfWidth,
          y: s.point.y - s.normal.y * halfWidth,
        },
        outer: {
          x: s.point.x + s.normal.x * halfWidth,
          y: s.point.y + s.normal.y * halfWidth,
        },
        sampleIndex: sampleIdx,
      };
    });
}

/**
 * Build space-tick marks. Each intermediate node between two consecutive corner
 * nodes is one tick (one edge = one playable space).
 * Returns one array of ticks per segment (corner-to-corner arc).
 */
export function buildSpaceTicks(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  halfWidth: number
): SpaceTick[][] {
  if (samples.length === 0) return [];

  const n = nodes.length;
  const cornerIndices = nodes
    .map((nd, i) => (nd.isCorner ? i : -1))
    .filter(i => i >= 0);

  if (cornerIndices.length < 2) return [];

  return cornerIndices.map((cStart, ci) => {
    const cEnd = cornerIndices[(ci + 1) % cornerIndices.length];
    const dist = (cEnd - cStart + n) % n;

    const ticks: SpaceTick[] = [];
    for (let k = 1; k < dist; k++) {
      const nodeIdx = (cStart + k) % n;
      if (nodes[nodeIdx].isPhantom) continue; // phantom node — no tick for this boundary
      const sampleIdx = Math.min(nodeIdx * samplesPerEdge, samples.length - 1);
      const s = samples[sampleIdx];
      ticks.push({
        center: s.point,
        inner: {
          x: s.point.x - s.normal.x * halfWidth,
          y: s.point.y - s.normal.y * halfWidth,
        },
        outer: {
          x: s.point.x + s.normal.x * halfWidth,
          y: s.point.y + s.normal.y * halfWidth,
        },
      });
    }
    return ticks;
  });
}

/**
 * Find the finish line position (at the node with isFinishLine=true).
 */
export function buildFinishLine(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  halfWidth: number
): { inner: Point; outer: Point; center: Point } | null {
  if (samples.length === 0) return null;
  const idx = nodes.findIndex(nd => nd.isFinishLine);
  if (idx === -1) return null;
  const sampleIdx = Math.min(idx * samplesPerEdge, samples.length - 1);
  const s = samples[sampleIdx];
  return {
    center: s.point,
    inner: {
      x: s.point.x - s.normal.x * halfWidth,
      y: s.point.y - s.normal.y * halfWidth,
    },
    outer: {
      x: s.point.x + s.normal.x * halfWidth,
      y: s.point.y + s.normal.y * halfWidth,
    },
  };
}

/**
 * Build the filled arc geometry for a single sector (for selection highlight).
 * Returns flat point arrays for the inner and outer edges of that arc.
 */
export function buildSegmentArcPoints(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  startNodeIndex: number,
  endNodeIndex: number,
): { innerPoints: number[]; outerPoints: number[] } | null {
  if (samples.length === 0) return null;
  const n = nodes.length;
  const dist = (endNodeIndex - startNodeIndex + n) % n;
  if (dist === 0) return null;

  const innerPoints: number[] = [];
  const outerPoints: number[] = [];
  const totalSamples = samples.length;

  for (let k = 0; k <= dist * samplesPerEdge; k++) {
    const idx = (startNodeIndex * samplesPerEdge + k) % totalSamples;
    const s = samples[idx];
    // We use a unit-normal offset here; caller multiplies by halfWidth
    innerPoints.push(s.point.x, s.point.y, -s.normal.x, -s.normal.y);
    outerPoints.push(s.point.x, s.point.y, s.normal.x, s.normal.y);
  }

  return { innerPoints, outerPoints };
}

/**
 * Build the filled sector highlight polygon (closed, for a Konva <Line closed fill>).
 * Returns a single flat [x,y,...] array tracing inner edge forward, then outer edge backward.
 */
export function buildSectorHighlightPolygon(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  startNodeIndex: number,
  endNodeIndex: number,
  halfWidth: number,
): number[] {
  if (samples.length === 0) return [];
  const n = nodes.length;
  const dist = (endNodeIndex - startNodeIndex + n) % n;
  if (dist === 0) return [];

  const totalSamples = samples.length;
  const inner: number[] = [];
  const outer: number[] = [];

  for (let k = 0; k <= dist * samplesPerEdge; k++) {
    const idx = (startNodeIndex * samplesPerEdge + k) % totalSamples;
    const s = samples[idx];
    inner.push(
      s.point.x - s.normal.x * halfWidth,
      s.point.y - s.normal.y * halfWidth,
    );
    outer.push(
      s.point.x + s.normal.x * halfWidth,
      s.point.y + s.normal.y * halfWidth,
    );
  }

  // Trace inner forward, then outer backward → closed polygon
  const reversed: number[] = [];
  for (let i = outer.length - 2; i >= 0; i -= 2) {
    reversed.push(outer[i], outer[i + 1]);
  }

  return [...inner, ...reversed];
}

export interface RaceLineArc {
  points: number[];
  side: 'L' | 'R';
}

/**
 * Build a thick arc along the inner (L) or outer (R) edge for each sector.
 * The arc is drawn just outside the track edge so it's clearly visible.
 */
export function buildRaceLineArcs(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  segmentData: SegmentData[],
  halfWidth: number,
): RaceLineArc[] {
  if (samples.length === 0) return [];
  const result: RaceLineArc[] = [];
  const n = nodes.length;
  const cornerIndices = nodes
    .map((nd, i) => (nd.isCorner ? i : -1))
    .filter(i => i >= 0);
  if (cornerIndices.length < 2) return result;

  const totalSamples = samples.length;
  const offset = halfWidth * 1.175;

  cornerIndices.forEach((cStart, ci) => {
    const cEnd = cornerIndices[(ci + 1) % cornerIndices.length];
    const dist = (cEnd - cStart + n) % n;
    const sd = segmentData.find(d => d.startNodeId === nodes[cStart].id);
    if (!sd) return;

    const useOuter = sd.raceLine === 'R';
    let points: number[] = [];

    for (let k = 0; k <= dist * samplesPerEdge; k++) {
      const nodeIdx = (cStart + Math.floor(k / samplesPerEdge)) % n;
      // Break arc at phantom spaces and start a new sub-arc
      if (nodes[nodeIdx].isPhantom) {
        if (points.length >= 4) result.push({ points, side: sd.raceLine });
        points = [];
        continue;
      }
      const idx = (cStart * samplesPerEdge + k) % totalSamples;
      const s = samples[idx];
      if (useOuter) {
        points.push(s.point.x + s.normal.x * offset, s.point.y + s.normal.y * offset);
      } else {
        points.push(s.point.x - s.normal.x * offset, s.point.y - s.normal.y * offset);
      }
    }

    if (points.length >= 4) result.push({ points, side: sd.raceLine });
  });

  return result;
}

export interface SurfaceOverlay {
  points: number[];     // closed polygon [x,y,...]
  surfaceType: SurfaceType;
  surfaceSide: SurfaceSide;
  nodeId: string;
}

/** Colour config for surface types (used by canvas renderer too). */
export const SURFACE_COLORS: Record<SurfaceType, { fill: string; opacity: number }> = {
  plain:   { fill: 'transparent', opacity: 0 },
  tunnel:  { fill: '#292524', opacity: 0.72 },
  flooded: { fill: '#3b82f6', opacity: 0.45 },
  gravel:  { fill: '#d97706', opacity: 0.50 },
  banked:  { fill: '#94a3b8', opacity: 0.40 },  // light gray / cement
};

/**
 * Build filled polygon overlays for every non-plain space.
 * `side` controls which lateral half is covered:
 *   both    → inner edge to outer edge (full width)
 *   inside  → center line to inner edge
 *   outside → center line to outer edge
 */
export function buildSurfaceOverlays(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  halfWidth: number,
): SurfaceOverlay[] {
  if (samples.length === 0) return [];
  const totalSamples = samples.length;

  const result: SurfaceOverlay[] = [];

  nodes.forEach((nd, ni) => {
    if (nd.surfaceType === 'plain') return;
    if (nd.isPhantom) return;

    const startSample = ni * samplesPerEdge;
    // tunnel and banked always span the full track width
    const side: SurfaceSide = (nd.surfaceType === 'tunnel' || nd.surfaceType === 'banked') ? 'both' : nd.surfaceSide;

    const innerOffset = side === 'outside' ? 0 : -halfWidth;
    const outerOffset = side === 'inside'  ? 0 :  halfWidth;

    const innerPts: number[] = [];
    const outerPts: number[] = [];

    for (let k = 0; k <= samplesPerEdge; k++) {
      const idx = (startSample + k) % totalSamples;
      const s = samples[idx];
      innerPts.push(s.point.x + s.normal.x * innerOffset, s.point.y + s.normal.y * innerOffset);
      outerPts.push(s.point.x + s.normal.x * outerOffset, s.point.y + s.normal.y * outerOffset);
    }

    // Closed polygon: trace inner forward, outer backward
    const reversed: number[] = [];
    for (let i = outerPts.length - 2; i >= 0; i -= 2) {
      reversed.push(outerPts[i], outerPts[i + 1]);
    }

    result.push({
      points: [...innerPts, ...reversed],
      surfaceType: nd.surfaceType,
      surfaceSide: side,
      nodeId: nd.id,
    });
  });

  return result;
}

/**
 * Build a single-space highlight polygon (used for hover preview in surface mode).
 * Pass `side` to show only the left or right half; defaults to full width.
 * Matches the offset convention used in buildSurfaceOverlays:
 *   'outside' (Left)  → center (+normal) to left edge
 *   'inside'  (Right) → right edge to center (-normal)
 *   'both'           → full width
 */
export function buildSpacePolygon(
  samples: SplineSample[],
  nodeIndex: number,
  samplesPerEdge: number,
  halfWidth: number,
  totalSamples: number,
  side: SurfaceSide = 'both',
): number[] {
  const startSample = nodeIndex * samplesPerEdge;
  const innerOffset = side === 'outside' ? 0 : -halfWidth;
  const outerOffset = side === 'inside'  ? 0 :  halfWidth;
  const innerPts: number[] = [];
  const outerPts: number[] = [];

  for (let k = 0; k <= samplesPerEdge; k++) {
    const idx = (startSample + k) % totalSamples;
    const s = samples[idx];
    innerPts.push(s.point.x + s.normal.x * innerOffset, s.point.y + s.normal.y * innerOffset);
    outerPts.push(s.point.x + s.normal.x * outerOffset, s.point.y + s.normal.y * outerOffset);
  }

  const reversed: number[] = [];
  for (let i = outerPts.length - 2; i >= 0; i -= 2) {
    reversed.push(outerPts[i], outerPts[i + 1]);
  }
  return [...innerPts, ...reversed];
}

export interface SpeedMarker {
  nodeId: string;
  stickStart: Point;
  circleCenter: Point;
  circleRadius: number;
  speedLimit: number;
  /** Unit tangent at the corner (forward along the track). */
  tangent: Point;
  /** Unit left-normal at the corner. */
  normal: Point;
  /** +1 when the lollipop is on the outer edge, -1 on inner. */
  lollipopDir: number;
}

/**
 * Build speed-limit lollipop markers for every corner node.
 * Each marker is a circle on a short stick extending outward from the outer track edge.
 */
export function buildSpeedMarkers(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  halfWidth: number,
): SpeedMarker[] {
  if (samples.length === 0) return [];
  const totalSamples = samples.length;
  const circleRadius = halfWidth * 0.6;
  const stickLength = halfWidth * 0.80; // distance speed lollipop graphic is from the track edge

  return nodes
    .map((nd, i) => ({ nd, i }))
    .filter(({ nd }) => nd.isCorner)
    .map(({ nd, i }) => {
      const sampleIdx = (i * samplesPerEdge) % totalSamples;
      const s = samples[sampleIdx];
      const dir = (nd.cornerLollipopSide ?? 'outer') === 'outer' ? 1 : -1;
      const edgeDist = halfWidth * dir;
      const totalDist = (halfWidth + stickLength) * dir;
      return {
        nodeId: nd.id,
        stickStart: {
          x: s.point.x + s.normal.x * edgeDist,
          y: s.point.y + s.normal.y * edgeDist,
        },
        circleCenter: {
          x: s.point.x + s.normal.x * (totalDist + circleRadius * dir),
          y: s.point.y + s.normal.y * (totalDist + circleRadius * dir),
        },
        circleRadius,
        speedLimit: nd.speedLimit,
        tangent: { ...s.tangent },
        normal: { ...s.normal },
        lollipopDir: dir,
      };
    });
}

export interface CornerStripe {
  /** Flat [x,y,...] arc along the outer track edge spanning 1 space before → corner → 1 space after. */
  points: number[];
}

/**
 * Build red corner-stripe arcs for every corner that is NOT part of a chicane sector.
 * Each stripe runs along the outer track edge, covering the space before and after the corner.
 */
export function buildCornerStripes(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  segmentData: SegmentData[],
  halfWidth: number,
): CornerStripe[] {
  if (samples.length === 0) return [];
  const n = nodes.length;
  const totalSamples = samples.length;

  const cornerIndices = nodes
    .map((nd, i) => (nd.isCorner ? i : -1))
    .filter(i => i >= 0);
  if (cornerIndices.length < 2) return [];

  // Collect all corner node indices that border a chicane sector
  const chicaneCornerSet = new Set<number>();
  cornerIndices.forEach((cStart, ci) => {
    const cEnd = cornerIndices[(ci + 1) % cornerIndices.length];
    const sd = segmentData.find(d => d.startNodeId === nodes[cStart].id);
    if (sd?.isChicane) {
      chicaneCornerSet.add(cStart);
      chicaneCornerSet.add(cEnd);
    }
  });

  return cornerIndices
    .filter(ci => !chicaneCornerSet.has(ci))
    .map(ci => {
      // Outer edge from (ci-1) through corner to (ci+1) — 2 edges = 2*SPE samples
      const startSample = ((ci - 1 + n) % n) * samplesPerEdge;
      const points: number[] = [];
      for (let k = 0; k <= 2 * samplesPerEdge; k++) {
        const idx = (startSample + k) % totalSamples;
        const s = samples[idx];
        points.push(
          s.point.x + s.normal.x * halfWidth,
          s.point.y + s.normal.y * halfWidth,
        );
      }
      return { points };
    });
}

export interface ChicaneStripe {
  /** Flat [x,y,...] arc along the inner track edge. */
  innerPoints: number[];
  /** Flat [x,y,...] arc along the outer track edge. */
  outerPoints: number[];
}

/**
 * Build blue chicane-stripe arcs for sectors marked isChicane=true.
 * Each stripe runs along BOTH track edges, from 1 space before the start corner
 * to 1 space after the end corner.
 */
export function buildChicaneStripes(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  segmentData: SegmentData[],
  halfWidth: number,
): ChicaneStripe[] {
  if (samples.length === 0) return [];
  const n = nodes.length;
  const totalSamples = samples.length;

  const cornerIndices = nodes
    .map((nd, i) => (nd.isCorner ? i : -1))
    .filter(i => i >= 0);
  if (cornerIndices.length < 2) return [];

  const result: ChicaneStripe[] = [];

  cornerIndices.forEach((cStart, ci) => {
    const cEnd = cornerIndices[(ci + 1) % cornerIndices.length];
    const sd = segmentData.find(d => d.startNodeId === nodes[cStart].id);
    if (!sd?.isChicane) return;

    // Arc from node (cStart-1) to node (cEnd+1) — spans (dist + 2) edges
    const arcStartNode = (cStart - 1 + n) % n;
    const arcEndNode   = (cEnd   + 1) % n;
    const arcEdges     = (arcEndNode - arcStartNode + n) % n;
    const startSample  = arcStartNode * samplesPerEdge;

    const innerPoints: number[] = [];
    const outerPoints: number[] = [];

    for (let k = 0; k <= arcEdges * samplesPerEdge; k++) {
      const idx = (startSample + k) % totalSamples;
      const s = samples[idx];
      innerPoints.push(
        s.point.x - s.normal.x * halfWidth,
        s.point.y - s.normal.y * halfWidth,
      );
      outerPoints.push(
        s.point.x + s.normal.x * halfWidth,
        s.point.y + s.normal.y * halfWidth,
      );
    }

    result.push({ innerPoints, outerPoints });
  });

  return result;
}

export interface LegendsMarker {
  stickStart: Point;
  circleCenter: Point;
  circleRadius: number;
}

/**
 * Build Legends lollipop markers on the outside of the track for every
 * node with isLegendsLine=true. Mirrors the speed-marker pattern.
 */
export function buildLegendsMarkers(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  halfWidth: number,
): LegendsMarker[] {
  if (samples.length === 0) return [];
  const circleRadius = halfWidth * 0.6;
  const stickLength  = halfWidth * 0.8; // distance legends lollipop graphic is from the track edge

  return nodes
    .map((nd, i) => ({ nd, i }))
    .filter(({ nd }) => nd.isLegendsLine)
    .map(({ nd, i }) => {
      const sampleIdx = Math.min(i * samplesPerEdge, samples.length - 1);
      const s = samples[sampleIdx];
      // Legends lollipops default to 'inner' to match the original placement
      // (negative normal = inner edge). Flip to 'outer' via the I hotkey.
      const dir = (nd.legendsLollipopSide ?? 'inner') === 'outer' ? 1 : -1;
      const edgeDist = halfWidth * dir;
      const totalDist = (halfWidth + stickLength) * dir;
      return {
        stickStart: {
          x: s.point.x + s.normal.x * edgeDist,
          y: s.point.y + s.normal.y * edgeDist,
        },
        circleCenter: {
          x: s.point.x + s.normal.x * (totalDist + circleRadius * dir),
          y: s.point.y + s.normal.y * (totalDist + circleRadius * dir),
        },
        circleRadius,
      };
    });
}

/**
 * Find all legends line positions (nodes with isLegendsLine=true).
 */
export function buildLegendsLines(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  halfWidth: number
): { inner: Point; outer: Point }[] {
  if (samples.length === 0) return [];
  return nodes
    .map((nd, i) => ({ nd, i }))
    .filter(({ nd }) => nd.isLegendsLine)
    .map(({ i }) => {
      const sampleIdx = Math.min(i * samplesPerEdge, samples.length - 1);
      const s = samples[sampleIdx];
      return {
        inner: {
          x: s.point.x - s.normal.x * halfWidth,
          y: s.point.y - s.normal.y * halfWidth,
        },
        outer: {
          x: s.point.x + s.normal.x * halfWidth,
          y: s.point.y + s.normal.y * halfWidth,
        },
      };
    });
}

export interface CountdownMarkerVisual {
  label: string;
  aggression: number;
  point: Point;
  normal: Point;
  /** Unit tangent (forward direction along track) — used for chevron offset. */
  tangent: Point;
}

/**
 * Helper: walk backward from endNodeIndex finding the nodeIdx for the i-th
 * non-phantom game space from the corner (0 = space immediately before corner).
 */
function findSpaceNodeIdx(
  seg: ComputedSegment,
  spaceFromCorner: number,
  nodes: TrackNode[],
  nodeCount: number,
): number {
  let gameSpacesFound = 0;
  const arcLen = (seg.endNodeIndex - seg.startNodeIndex + nodeCount) % nodeCount;
  for (let step = 1; step <= arcLen; step++) {
    const candidateIdx = ((seg.endNodeIndex - step) + nodeCount) % nodeCount;
    if (!nodes[candidateIdx].isPhantom) {
      if (gameSpacesFound === spaceFromCorner) return candidateIdx;
      gameSpacesFound++;
    }
  }
  return -1;
}

/**
 * Build visual positions for legends countdown markers (0–3) at the end of each sector.
 * Each is placed on the inner or outer edge depending on countdownSide.
 * Counts backward by game-space position (skipping phantom nodes).
 */
export function buildCountdownMarkers(
  samples: SplineSample[],
  computed: ComputedSegment[],
  segmentData: SegmentData[],
  samplesPerEdge: number,
  halfWidth: number,
  nodes: TrackNode[],
): CountdownMarkerVisual[] {
  if (samples.length === 0) return [];
  const result: CountdownMarkerVisual[] = [];
  const edgeDist = halfWidth * 1.5;
  const nodeCount = nodes.length;

  for (const seg of computed) {
    const sd = segmentData.find(d => d.startNodeId === seg.startNodeId);
    const countdowns = sd?.legendCountdowns ?? [0, 0, 0, 0];
    const count = Math.min(4, seg.spaces);
    const dir = (sd?.countdownSide ?? 'inner') === 'outer' ? 1 : -1;

    for (let i = 0; i < count; i++) {
      const nodeIdx = findSpaceNodeIdx(seg, i, nodes, nodeCount);
      if (nodeIdx === -1) continue;

      const midSampleIdx = (nodeIdx * samplesPerEdge + Math.floor(samplesPerEdge / 2)) % samples.length;
      const s = samples[midSampleIdx];
      result.push({
        label: String(i),
        aggression: countdowns[i] ?? 0,
        point: {
          x: s.point.x + s.normal.x * edgeDist * dir,
          y: s.point.y + s.normal.y * edgeDist * dir,
        },
        normal: { x: s.normal.x, y: s.normal.y },
        tangent: { x: s.tangent.x, y: s.tangent.y },
      });
    }
  }
  return result;
}

export interface SectorCountdownNumber {
  label: string;
  point: Point;
  /** Unit tangent (forward direction along track) — used for text rotation. */
  tangent: Point;
  /** +1 for outer side, -1 for inner side — used to orient text toward the track. */
  dir: number;
}

/**
 * Build plain space-count numbers for positions 4 and beyond in each sector.
 * These count down from sector_length at the entry corner to 4 just past the
 * legend diamond range. Placed on the inner or outer edge per countdownSide.
 */
export function buildSectorCountdownNumbers(
  samples: SplineSample[],
  computed: ComputedSegment[],
  segmentData: SegmentData[],
  samplesPerEdge: number,
  halfWidth: number,
  nodes: TrackNode[],
): SectorCountdownNumber[] {
  if (samples.length === 0) return [];
  const result: SectorCountdownNumber[] = [];
  const edgeDist = halfWidth * 1.5;
  const nodeCount = nodes.length;

  for (const seg of computed) {
    const sd = segmentData.find(d => d.startNodeId === seg.startNodeId);
    const dir = (sd?.countdownSide ?? 'inner') === 'outer' ? 1 : -1;
    // Positions 4 through seg.spaces-1 (4 is just beyond the legend diamond range)
    const start = 4;
    const end = seg.spaces - 1;
    if (end < start) continue;

    for (let i = start; i <= end; i++) {
      const nodeIdx = findSpaceNodeIdx(seg, i, nodes, nodeCount);
      if (nodeIdx === -1) continue;

      const midSampleIdx = (nodeIdx * samplesPerEdge + Math.floor(samplesPerEdge / 2)) % samples.length;
      const s = samples[midSampleIdx];
      result.push({
        label: String(i),
        point: {
          x: s.point.x + s.normal.x * edgeDist * dir,
          y: s.point.y + s.normal.y * edgeDist * dir,
        },
        tangent: { x: s.tangent.x, y: s.tangent.y },
        dir,
      });
    }
  }
  return result;
}

export interface PhantomOverlay {
  points: number[]; // closed polygon [x,y,...]
  nodeId: string;
}

/**
 * Build filled polygon overlays for phantom spaces (source-based: the edge
 * leaving a phantom node). Used to shade bridge-crossing zones in the editor.
 */
export function buildPhantomOverlays(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  halfWidth: number,
): PhantomOverlay[] {
  if (samples.length === 0) return [];
  const totalSamples = samples.length;
  const result: PhantomOverlay[] = [];

  nodes.forEach((nd, ni) => {
    if (!nd.isPhantom) return;

    const startSample = ni * samplesPerEdge;
    const innerPts: number[] = [];
    const outerPts: number[] = [];

    for (let k = 0; k <= samplesPerEdge; k++) {
      const idx = (startSample + k) % totalSamples;
      const s = samples[idx];
      innerPts.push(s.point.x - s.normal.x * halfWidth, s.point.y - s.normal.y * halfWidth);
      outerPts.push(s.point.x + s.normal.x * halfWidth, s.point.y + s.normal.y * halfWidth);
    }

    const reversed: number[] = [];
    for (let i = outerPts.length - 2; i >= 0; i -= 2) {
      reversed.push(outerPts[i], outerPts[i + 1]);
    }

    result.push({ points: [...innerPts, ...reversed], nodeId: nd.id });
  });

  return result;
}

// ── Surface image tiles ───────────────────────────────────────────────────────

export interface SurfaceTile {
  x: number;
  y: number;
  /** Clockwise degrees, aligned with track tangent. */
  rotation: number;
  /** Position within its contiguous section. */
  kind: 'start' | 'middle' | 'end' | 'only';
  side: SurfaceSide;
  nodeId: string;
}

/**
 * Build per-space tile positions for flooded or gravel surface sections.
 * Returns one tile per surface space; consecutive same-type spaces form a
 * section whose first space is 'start', last is 'end', and middle ones are
 * 'middle'.  Lone single-space sections get 'only'.
 */
export function buildSurfaceTiles(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  type: SurfaceType,
): SurfaceTile[] {
  if (samples.length === 0) return [];

  // Collect indices of matching non-phantom nodes
  const typeNodeIndices: number[] = nodes
    .map((nd, i) => (nd.surfaceType === type && !nd.isPhantom ? i : -1))
    .filter(i => i >= 0);

  // Group into contiguous sections (consecutive index jumps of 1)
  const sections: number[][] = [];
  for (const ni of typeNodeIndices) {
    const last = sections[sections.length - 1];
    if (last && ni === last[last.length - 1] + 1) {
      last.push(ni);
    } else {
      sections.push([ni]);
    }
  }

  const result: SurfaceTile[] = [];
  const totalSamples = samples.length;

  for (const section of sections) {
    for (let si = 0; si < section.length; si++) {
      const nodeIdx = section[si];
      // Sample at midpoint of this space
      const midIdx = (nodeIdx * samplesPerEdge + Math.floor(samplesPerEdge / 2)) % totalSamples;
      const s = samples[midIdx];

      const kind: 'start' | 'middle' | 'end' | 'only' =
        section.length === 1 ? 'only' :
        si === 0             ? 'start' :
        si === section.length - 1 ? 'end' : 'middle';

      const nd = nodes[nodeIdx];
      const side: SurfaceSide = type === 'tunnel' ? 'both' : nd.surfaceSide;

      result.push({
        x: s.point.x,
        y: s.point.y,
        rotation: Math.atan2(s.tangent.y, s.tangent.x) * (180 / Math.PI),
        kind,
        side,
        nodeId: nd.id,
      });
    }
  }

  return result;
}

// ── Starting grid ─────────────────────────────────────────────────────────────

export interface StartingGridRow {
  rank1: number;        // odd rank — race line side
  rank2: number;        // even rank — opposite side
  /** Spline point AT the crossline tick for this row. */
  crossline: Point;
  tangent: Point;
  normal: Point;
  /** +1 = +normal direction is the race line side, -1 = -normal direction. */
  raceLineSide: 1 | -1;
}

/**
 * Build 6 starting grid rows (= 12 positions) behind the finish line.
 * Each row has an odd rank on the race line side and an even rank on the other.
 */
export function buildStartingGridRows(
  samples: SplineSample[],
  nodes: TrackNode[],
  segmentData: SegmentData[],
  samplesPerEdge: number,
): StartingGridRow[] {
  if (samples.length === 0 || nodes.length === 0) return [];

  const finishIdx = nodes.findIndex(nd => nd.isFinishLine);
  if (finishIdx < 0) return [];
  const nodeCount = nodes.length;

  // Find race line side from nearest corner before finish.
  // From buildRaceLineArcs: 'R' → +normal (+1), 'L' → -normal (-1)
  let raceLineSide: 1 | -1 = 1;
  {
    let ni = finishIdx;
    for (let i = 0; i < nodeCount; i++) {
      ni = (ni - 1 + nodeCount) % nodeCount;
      if (nodes[ni].isCorner) {
        const sd = segmentData.find(s => s.startNodeId === nodes[ni].id);
        if (sd) raceLineSide = sd.raceLine === 'R' ? 1 : -1;
        break;
      }
    }
  }

  // Collect 6 non-phantom node indices starting FROM the finish line node.
  // The finish line crossline is the forward boundary of row 1 (positions 1 & 2).
  const rowNodes: number[] = [];
  let ni = finishIdx;
  for (let safety = 0; rowNodes.length < 6 && safety < nodeCount; safety++) {
    if (!nodes[ni].isPhantom) rowNodes.push(ni);
    ni = (ni - 1 + nodeCount) % nodeCount;
  }

  return rowNodes.map((nodeIdx, row) => {
    const sIdx = Math.min(nodeIdx * samplesPerEdge, samples.length - 1);
    const s = samples[sIdx];
    return {
      rank1: row * 2 + 1,
      rank2: row * 2 + 2,
      crossline: { x: s.point.x, y: s.point.y },
      tangent:   { x: s.tangent.x, y: s.tangent.y },
      normal:    { x: s.normal.x,  y: s.normal.y  },
      raceLineSide,
    };
  });
}
