import type { Point, SegmentData, TrackNode } from '../types/track';
import type { SplineSample } from './spline';

/**
 * Car footprint vs track width — matches Unity TopDown2DView defaults:
 * carSize = 0.35 world units, trackWidth ≈ 0.772 at the standard 33 mm board scale.
 */
export const CAR_WIDTH_TO_TRACK_WIDTH = 0.35 / 0.772;

/** Car token sprite aspect (length : width), Resources/UI/CarTokens ~3028×1408 px. */
export const CAR_LENGTH_TO_WIDTH = 3028 / 1408;

/** Lateral spot offset from centre — matches TrackLayout.GetSpotPosition (trackWidth × 0.25). */
export const CAR_SPOT_OFFSET_RATIO = 0.25;

export function carDimensionsPx(trackWidthPx: number): { length: number; width: number } {
  const width = trackWidthPx * CAR_WIDTH_TO_TRACK_WIDTH;
  return { width, length: width * CAR_LENGTH_TO_WIDTH };
}

export type CarSpot = 'race' | 'outside';

export interface CarOverlay {
  nodeId: string;
  spot: CarSpot;
  center: Point;
  /** Degrees — forward along the track. */
  rotation: number;
  length: number;
  width: number;
}

function sectorStartNodeIdForSpace(
  nodeIndex: number,
  nodes: TrackNode[],
): string | null {
  const cornerIndices = nodes
    .map((nd, i) => (nd.isCorner ? i : -1))
    .filter(i => i >= 0);
  if (cornerIndices.length < 2) return null;

  const n = nodes.length;
  for (let ci = 0; ci < cornerIndices.length; ci++) {
    const cStart = cornerIndices[ci];
    const cEnd = cornerIndices[(ci + 1) % cornerIndices.length];
    const dist = (cEnd - cStart + n) % n;
    for (let k = 0; k < dist; k++) {
      if ((cStart + k) % n === nodeIndex) {
        return nodes[cStart].id;
      }
    }
  }
  return null;
}

/** Two car footprints per playable space — race line and outside spots, like the board game. */
export function buildCarOverlays(
  samples: SplineSample[],
  nodes: TrackNode[],
  samplesPerEdge: number,
  trackWidthPx: number,
  segmentData: SegmentData[],
): CarOverlay[] {
  if (samples.length === 0 || nodes.length === 0) return [];

  const { length, width } = carDimensionsPx(trackWidthPx);
  const spotOffset = trackWidthPx * CAR_SPOT_OFFSET_RATIO;
  const totalSamples = samples.length;
  const result: CarOverlay[] = [];

  nodes.forEach((nd, ni) => {
    if (nd.isPhantom) return;

    const midIdx = (ni * samplesPerEdge + Math.floor(samplesPerEdge / 2)) % totalSamples;
    const s = samples[midIdx];
    const rotation = (Math.atan2(s.tangent.y, s.tangent.x) * 180) / Math.PI;

    const sectorStartId = sectorStartNodeIdForSpace(ni, nodes);
    const sd = sectorStartId
      ? segmentData.find(d => d.startNodeId === sectorStartId)
      : undefined;
    const raceLineIsLeft = (sd?.raceLine ?? 'L') === 'L';
    const raceSide = raceLineIsLeft ? 1 : -1;
    const outsideSide = -raceSide;

    const spots: { spot: CarSpot; side: number }[] = [
      { spot: 'race', side: raceSide },
      { spot: 'outside', side: outsideSide },
    ];

    for (const { spot, side } of spots) {
      result.push({
        nodeId: nd.id,
        spot,
        center: {
          x: s.point.x + s.normal.x * spotOffset * side,
          y: s.point.y + s.normal.y * spotOffset * side,
        },
        rotation,
        length,
        width,
      });
    }
  });

  return result;
}
