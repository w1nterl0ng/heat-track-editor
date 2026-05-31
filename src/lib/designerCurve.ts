import type { Point } from '../types/track';

/** Default ideal space length in world px (~38.5 mm at 33 mm track width). */
export const DEFAULT_IDEAL_SPACE_LENGTH_PX = 276.8;

export const DEFAULT_SPACE_LENGTH_MIN_RATIO = 0.85;
export const DEFAULT_SPACE_LENGTH_MAX_RATIO = 1.15;

const ARC_SAMPLES = 64;

function ptDist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Unit left-normal of segment a→b (zero length → east). */
export function segmentNormal(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: -dy / len, y: dx / len };
}

/** Quadratic Bézier control point from endpoints and signed perpendicular offset. */
export function quadraticControl(a: Point, b: Point, bendOffset: number): Point {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const n = segmentNormal(a, b);
  return { x: mid.x + n.x * bendOffset, y: mid.y + n.y * bendOffset };
}

/** Point on quadratic Bézier at t ∈ [0, 1]. */
export function quadraticPoint(a: Point, b: Point, bendOffset: number, t: number): Point {
  const c = quadraticControl(a, b, bendOffset);
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}

/** Densely sample a quadratic segment for arc-length integration. */
export function sampleQuadratic(
  a: Point,
  b: Point,
  bendOffset: number,
  count = ARC_SAMPLES,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= count; i++) {
    pts.push(quadraticPoint(a, b, bendOffset, i / count));
  }
  return pts;
}

/** Arc length of a quadratic Bézier segment. */
export function quadraticArcLength(a: Point, b: Point, bendOffset: number): number {
  const pts = sampleQuadratic(a, b, bendOffset, ARC_SAMPLES);
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += ptDist(pts[i - 1], pts[i]);
  }
  return len;
}

/**
 * Pick an integer space count so each space length stays within
 * [ideal * minRatio, ideal * maxRatio], preferring closest to ideal.
 */
export function chooseSpaceCount(
  arcLength: number,
  idealLength: number,
  minRatio: number,
  maxRatio: number,
): number {
  if (arcLength < 1e-3 || idealLength < 1e-3) return 1;
  const raw = arcLength / idealLength;
  const minN = Math.max(1, Math.ceil(arcLength / (idealLength * maxRatio)));
  const maxN = Math.max(minN, Math.floor(arcLength / (idealLength * minRatio)));
  let bestN = Math.max(1, Math.round(raw));
  if (bestN < minN) bestN = minN;
  if (bestN > maxN) bestN = maxN;
  return bestN;
}

/**
 * Sample `spaceCount` equal arc-length divisions along the curve.
 * Returns spaceCount+1 points (start → end inclusive).
 */
export function spacePointsOnCurve(
  a: Point,
  b: Point,
  bendOffset: number,
  spaceCount: number,
): Point[] {
  if (spaceCount < 1) return [a, b];

  const dense = sampleQuadratic(a, b, bendOffset, Math.max(ARC_SAMPLES, spaceCount * 8));
  const cum: number[] = [0];
  for (let i = 1; i < dense.length; i++) {
    cum.push(cum[i - 1] + ptDist(dense[i - 1], dense[i]));
  }
  const total = cum[cum.length - 1];
  if (total < 1e-6) {
    return Array.from({ length: spaceCount + 1 }, (_, k) =>
      k === 0 ? a : k === spaceCount ? b : {
        x: a.x + (b.x - a.x) * (k / spaceCount),
        y: a.y + (b.y - a.y) * (k / spaceCount),
      },
    );
  }

  const result: Point[] = [a];
  for (let k = 1; k < spaceCount; k++) {
    const target = (total * k) / spaceCount;
    let di = 0;
    while (di + 1 < cum.length && cum[di + 1] < target) di++;
    const segLen = cum[di + 1] - cum[di];
    const localT = segLen > 1e-6 ? (target - cum[di]) / segLen : 0;
    const p0 = dense[di];
    const p1 = dense[di + 1];
    result.push({
      x: p0.x + (p1.x - p0.x) * localT,
      y: p0.y + (p1.y - p0.y) * localT,
    });
  }
  result.push(b);
  return result;
}

/** Flat [x,y,...] polyline approximating the quadratic curve. */
export function quadraticPolyline(
  a: Point,
  b: Point,
  bendOffset: number,
  samples = 32,
): number[] {
  const pts = sampleQuadratic(a, b, bendOffset, samples);
  return pts.flatMap(p => [p.x, p.y]);
}

export interface SegmentPreview {
  spaceCount: number;
  arcLength: number;
  avgSpaceLength: number;
  points: Point[];
  polyline: number[];
  controlPoint: Point;
}

function lerpPt(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Signed bend offset for a control point between endpoints. */
export function bendOffsetFromControl(p0: Point, p2: Point, control: Point): number {
  const mid = { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };
  const n = segmentNormal(p0, p2);
  return (control.x - mid.x) * n.x + (control.y - mid.y) * n.y;
}

/** Closest point on a quadratic segment to a canvas coordinate. */
export function nearestPointOnQuadratic(
  a: Point,
  b: Point,
  bendOffset: number,
  px: number,
  py: number,
): { point: Point; t: number; distance: number } {
  let bestT = 0.5;
  let bestDist = Infinity;
  let bestPoint = a;
  const samples = 64;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = quadraticPoint(a, b, bendOffset, t);
    const dx = pt.x - px;
    const dy = pt.y - py;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
      bestPoint = pt;
    }
  }
  return { point: bestPoint, t: bestT, distance: bestDist };
}

/**
 * Split a quadratic segment at parameter t using de Casteljau.
 * Returns the split point and equivalent bend offsets for each half.
 */
export function splitQuadraticSegment(
  a: Point,
  b: Point,
  bendOffset: number,
  t: number,
): { point: Point; bend1: number; bend2: number } {
  const c = quadraticControl(a, b, bendOffset);
  const q0 = lerpPt(a, c, t);
  const q1 = lerpPt(c, b, t);
  const s = lerpPt(q0, q1, t);
  return {
    point: s,
    bend1: bendOffsetFromControl(a, s, q0),
    bend2: bendOffsetFromControl(s, b, q1),
  };
}

/** Build live preview data for a segment being drawn or edited. */
export function buildSegmentPreview(
  a: Point,
  b: Point,
  bendOffset: number,
  idealLength: number,
  minRatio: number,
  maxRatio: number,
): SegmentPreview {
  const arcLength = quadraticArcLength(a, b, bendOffset);
  const spaceCount = chooseSpaceCount(arcLength, idealLength, minRatio, maxRatio);
  const points = spacePointsOnCurve(a, b, bendOffset, spaceCount);
  return {
    spaceCount,
    arcLength,
    avgSpaceLength: spaceCount > 0 ? arcLength / spaceCount : arcLength,
    points,
    polyline: quadraticPolyline(a, b, bendOffset),
    controlPoint: quadraticControl(a, b, bendOffset),
  };
}
