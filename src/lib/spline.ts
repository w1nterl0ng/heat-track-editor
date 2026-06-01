import type { Point } from '../types/track';

const ALPHA = 0.5; // centripetal Catmull-Rom
const EPS = 1e-5;

function ptDist(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Centripetal Catmull-Rom interpolation between p1 and p2, with context p0 and p3.
 * alpha=0.5 prevents self-intersections and overshoot at hairpin turns.
 * tLocal is in [0, 1] where 0 → p1 and 1 → p2.
 */
export function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, tLocal: number): Point {
  const t0 = 0;
  const t1 = t0 + Math.max(EPS, Math.pow(ptDist(p0, p1), ALPHA));
  const t2 = t1 + Math.max(EPS, Math.pow(ptDist(p1, p2), ALPHA));
  const t3 = t2 + Math.max(EPS, Math.pow(ptDist(p2, p3), ALPHA));

  const span = t2 - t1;
  if (span < EPS) return { x: p1.x, y: p1.y };

  const t = t1 + tLocal * span;

  // Barry-Goldman algorithm
  const a1x = ((t1 - t) * p0.x + (t - t0) * p1.x) / (t1 - t0);
  const a1y = ((t1 - t) * p0.y + (t - t0) * p1.y) / (t1 - t0);
  const a2x = ((t2 - t) * p1.x + (t - t1) * p2.x) / (t2 - t1);
  const a2y = ((t2 - t) * p1.y + (t - t1) * p2.y) / (t2 - t1);
  const a3x = ((t3 - t) * p2.x + (t - t2) * p3.x) / (t3 - t2);
  const a3y = ((t3 - t) * p2.y + (t - t2) * p3.y) / (t3 - t2);

  const b1x = ((t2 - t) * a1x + (t - t0) * a2x) / (t2 - t0);
  const b1y = ((t2 - t) * a1y + (t - t0) * a2y) / (t2 - t0);
  const b2x = ((t3 - t) * a2x + (t - t1) * a3x) / (t3 - t1);
  const b2y = ((t3 - t) * a2y + (t - t1) * a3y) / (t3 - t1);

  return {
    x: ((t2 - t) * b1x + (t - t1) * b2x) / span,
    y: ((t2 - t) * b1y + (t - t1) * b2y) / span,
  };
}

export interface SplineSample {
  point: Point;
  tangent: Point;   // unit tangent (forward direction)
  normal: Point;    // unit left-normal
  arcLength: number; // cumulative arc-length from start
  t: number;         // global t in [0, 1) along full spline
}

/**
 * Densely sample a closed centripetal Catmull-Rom spline through controlPoints.
 * Returns `samplesPerEdge * n` samples, one "edge" per control point pair.
 * Node i → sample index i * samplesPerEdge (exact position on the spline).
 */
export function sampleSpline(
  controlPoints: Point[],
  samplesPerEdge = 16
): SplineSample[] {
  const n = controlPoints.length;
  if (n < 2) return [];

  const spe = Math.max(4, samplesPerEdge);
  const total = n * spe;
  const samples: SplineSample[] = [];

  for (let i = 0; i < n; i++) {
    const p0 = controlPoints[(i - 1 + n) % n];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % n];
    const p3 = controlPoints[(i + 2) % n];

    for (let s = 0; s < spe; s++) {
      const tLocal = s / spe;
      const pt = catmullRom(p0, p1, p2, p3, tLocal);

      // Finite-difference tangent (always one step ahead within the same edge)
      const tAhead = Math.min(tLocal + 1 / spe, 1 - 1e-9);
      const ahead = catmullRom(p0, p1, p2, p3, tAhead);
      let tx = ahead.x - pt.x;
      let ty = ahead.y - pt.y;
      const len = Math.sqrt(tx * tx + ty * ty) || 1;
      tx /= len;
      ty /= len;

      samples.push({
        point: pt,
        tangent: { x: tx, y: ty },
        normal: { x: -ty, y: tx },
        arcLength: 0,
        t: (i * spe + s) / total,
      });
    }
  }

  // Cumulative arc lengths
  let cum = 0;
  for (let i = 0; i < samples.length; i++) {
    samples[i].arcLength = cum;
    const next = samples[(i + 1) % samples.length];
    const dx = next.point.x - samples[i].point.x;
    const dy = next.point.y - samples[i].point.y;
    cum += Math.sqrt(dx * dx + dy * dy);
  }

  return samples;
}

/** Total arc length of a sampled spline (wrap-around included). */
export function totalArcLength(samples: SplineSample[]): number {
  if (samples.length === 0) return 0;
  const last = samples[samples.length - 1];
  const first = samples[0];
  const dx = first.point.x - last.point.x;
  const dy = first.point.y - last.point.y;
  return last.arcLength + Math.sqrt(dx * dx + dy * dy);
}

/**
 * Resample by arc length so that `count` samples are uniformly spaced.
 */
export function resampleByArcLength(
  samples: SplineSample[],
  count: number
): SplineSample[] {
  if (samples.length === 0 || count === 0) return [];

  const total = totalArcLength(samples);
  const result: SplineSample[] = [];
  let di = 0;

  const cum: number[] = samples.map(s => s.arcLength);
  cum.push(total);

  for (let k = 0; k < count; k++) {
    const target = (total * k) / count;
    while (di + 1 < cum.length - 1 && cum[di + 1] < target) di++;
    const segLen = cum[di + 1] - cum[di];
    const localT = segLen > 1e-6 ? (target - cum[di]) / segLen : 0;
    const next = (di + 1) % samples.length;
    const curr = samples[di];
    const nx = samples[next];
    const pt: Point = {
      x: lerp(curr.point.x, nx.point.x, localT),
      y: lerp(curr.point.y, nx.point.y, localT),
    };
    const tx = lerpNorm(curr.tangent, nx.tangent, localT);
    result.push({
      point: pt,
      tangent: tx,
      normal: { x: -tx.y, y: tx.x },
      arcLength: target,
      t: k / count,
    });
  }

  return result;
}

/**
 * Extract samples along the shorter arc from startIdx to endIdx on a closed sample ring.
 * Arc lengths are recomputed starting at 0 at startIdx.
 */
export function extractShorterArc(
  samples: SplineSample[],
  startIdx: number,
  endIdx: number,
): SplineSample[] {
  const n = samples.length;
  if (n === 0) return [];

  const cwSteps = (endIdx - startIdx + n) % n;
  const ccwSteps = (startIdx - endIdx + n) % n;
  const forward = cwSteps <= ccwSteps;
  const steps = forward ? cwSteps : ccwSteps;

  const arc: SplineSample[] = [];
  let i = startIdx;
  arc.push(samples[i]);
  for (let s = 0; s < steps; s++) {
    i = forward ? (i + 1) % n : (i - 1 + n) % n;
    arc.push(samples[i]);
  }

  const result: SplineSample[] = [];
  let cum = 0;
  for (let j = 0; j < arc.length; j++) {
    result.push({ ...arc[j], arcLength: cum });
    if (j + 1 < arc.length) {
      const a = arc[j].point;
      const b = arc[j + 1].point;
      cum += Math.hypot(b.x - a.x, b.y - a.y);
    }
  }
  return result;
}

/** Point at a fractional arc length along an arc extracted via extractShorterArc. */
export function pointAtArcFraction(arc: SplineSample[], fraction: number): Point {
  if (arc.length === 0) return { x: 0, y: 0 };
  if (fraction <= 0) return { ...arc[0].point };
  const total = arc[arc.length - 1].arcLength;
  if (total < 1e-6) return { ...arc[0].point };
  const target = total * Math.min(1, fraction);

  for (let i = 0; i < arc.length - 1; i++) {
    const a = arc[i];
    const b = arc[i + 1];
    if (b.arcLength >= target - 1e-6) {
      const segLen = b.arcLength - a.arcLength;
      const t = segLen > 1e-6 ? (target - a.arcLength) / segLen : 0;
      return {
        x: a.point.x + (b.point.x - a.point.x) * t,
        y: a.point.y + (b.point.y - a.point.y) * t,
      };
    }
  }
  return { ...arc[arc.length - 1].point };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpNorm(a: Point, b: Point, t: number): Point {
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const l = Math.sqrt(x * x + y * y) || 1;
  return { x: x / l, y: y / l };
}

/**
 * Given a t value (0..1), return the closest dense sample index.
 */
export function tToSampleIndex(samples: SplineSample[], t: number): number {
  if (samples.length === 0) return 0;
  return Math.min(samples.length - 1, Math.max(0, Math.round(t * samples.length)));
}

/**
 * Find the sample index of the spline point closest to a canvas coordinate.
 */
export function nearestSampleIndex(samples: SplineSample[], px: number, py: number): number {
  if (samples.length === 0) return 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const dx = s.point.x - px;
    const dy = s.point.y - py;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** @deprecated Use nearestSampleIndex */
export function nearestT(samples: SplineSample[], px: number, py: number): number {
  const idx = nearestSampleIndex(samples, px, py);
  return samples.length > 0 ? samples[idx].t : 0;
}
