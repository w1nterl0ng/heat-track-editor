/**
 * V2 Track Package Exporter
 *
 * Produces a single unified JSON file containing both game logic and spline
 * geometry. Key differences from V1 (YAML):
 *
 *   - Sectors are numbered 0..N-1 in track order. Absolute space indices are
 *     sequential: sector 0 = spaces 0..S0-1, sector 1 = spaces S0..S0+S1-1,
 *     etc. The finish line has NO effect on space numbering.
 *
 *   - The finish line is a top-level { sectorIndex, afterSpaceIndex } object.
 *
 *   - Surface sides use "left" / "right" instead of "inside" / "outside".
 *
 *   - Track geometry (nodes) is embedded in the same file, replacing the
 *     separate TrackLayout_*.json file.
 *
 *   - Field renames for clarity:
 *       laps      → defaultLaps
 *       heat      → startingHeat
 *       stress    → startingStress
 *       spaces    → spaceCount           (per sector)
 *       cornerSpeedLimit → exitCornerSpeedLimit
 *       legendsLine      → legendsLineFromExit
 */

import JSZip from 'jszip';
import type { EditorState, TrackNode } from '../types/track';
import { computeSegments } from '../store/editorStore';
import { downloadFile } from './exportYaml';
import { addTilesToZip } from './exportTiles';

// Coordinate space: same as exportJson.ts — normalised to world center, y-flipped.
const EXPORT_SCALE = 20;

// ── Helpers (mirrors exportYaml.ts) ──────────────────────────────────────────

/**
 * Count non-phantom edges from node index `from` to `to` (exclusive),
 * stepping clockwise. Edge i→i+1 is non-phantom when node i is not phantom.
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
 * Find the first node index satisfying `predicate` in the arc [startIdx, endIdx),
 * clockwise. Skips phantom nodes. Returns null if not found.
 */
function findNodeInArc(
  nodes: TrackNode[],
  startIdx: number,
  endIdx: number,
  predicate: (nd: TrackNode) => boolean,
): number | null {
  const n = nodes.length;
  const dist = (endIdx - startIdx + n) % n;
  for (let k = 0; k < dist; k++) {
    const idx = (startIdx + k) % n;
    if (nodes[idx].isPhantom) continue;
    if (predicate(nodes[idx])) return idx;
  }
  return null;
}

/** Map editor surface side names to V2 canonical names. */
function exportSide(side: string): string {
  if (side === 'inside')  return 'left';
  if (side === 'outside') return 'right';
  return 'both';
}

/** Normalise node canvas coordinates to world-centred, y-flipped geometry space. */
function normaliseNodes(
  nodes: TrackNode[],
  worldWidth: number,
  worldHeight: number,
): { x: number; y: number }[] {
  const cx = worldWidth  / 2;
  const cy = worldHeight / 2;
  const scale = EXPORT_SCALE / Math.max(worldWidth, worldHeight);
  return nodes.map(nd => ({
    x: parseFloat(((nd.x - cx) * scale).toFixed(4)),
    y: parseFloat(((cy - nd.y) * scale).toFixed(4)),
  }));
}

// ── Main builder ──────────────────────────────────────────────────────────────

export function buildV2Object(state: EditorState): Record<string, unknown> {
  const {
    meta, nodes, segmentData, conditionMarkers, weatherToken,
    tileColumns, tileRows, trackWidthPct,
  } = state;

  const n         = nodes.length;
  const worldW    = tileColumns * 2048;
  const worldH    = tileRows   * 2048;
  const computed  = computeSegments(nodes);

  // ── Finish line: find which sector, and how many spaces after start ──────
  let finishSectorIndex    = -1;
  let finishAfterSpaceIdx  = -1;

  for (let si = 0; si < computed.length; si++) {
    const seg        = computed[si];
    const finishNode = findNodeInArc(nodes, seg.startNodeIndex, seg.endNodeIndex, nd => nd.isFinishLine);
    if (finishNode !== null) {
      finishSectorIndex   = si;
      // Number of complete non-phantom spaces before the finish-line node.
      // finishLineAfter = X means the line sits between space X and space X+1.
      finishAfterSpaceIdx = countNonPhantomEdges(seg.startNodeIndex, finishNode, nodes) - 1;
      break;
    }
  }

  // ── Sectors ────────────────────────────────────────────────────────────────
  const sectors = computed.map((seg) => {
    const sd      = segmentData.find(d => d.startNodeId === seg.startNodeId);
    const endNode = nodes[seg.endNodeIndex];

    // Legends line: distance from exit corner in non-phantom spaces.
    const legendsNode = findNodeInArc(
      nodes, seg.startNodeIndex, seg.endNodeIndex, nd => nd.isLegendsLine,
    );
    const legendsLineFromExit = legendsNode !== null
      ? countNonPhantomEdges(legendsNode, seg.endNodeIndex, nodes)
      : 0;

    // Surfaces: walk the arc, assign game-space indices, remap side names.
    const surfaces: Record<string, unknown>[] = [];
    const arcLen = (seg.endNodeIndex - seg.startNodeIndex + n) % n;
    let gameSpaceIdx = 0;
    for (let step = 0; step < arcLen; step++) {
      const nd = nodes[(seg.startNodeIndex + step) % n];
      if (nd.isPhantom) continue;
      if (nd.surfaceType && nd.surfaceType !== 'plain') {
        surfaces.push({
          spaceIndex: gameSpaceIdx,
          type: nd.surfaceType,
          side: exportSide(nd.surfaceSide),
        });
      }
      gameSpaceIdx++;
    }

    const countdownCount = Math.min(4, seg.spaces);
    const countdowns     = (sd?.legendCountdowns ?? [0, 0, 0, 0]).slice(0, countdownCount);

    const sectorObj: Record<string, unknown> = {
      spaceCount:           seg.spaces,
      raceLine:             sd?.raceLine ?? 'L',
      isChicane:            sd?.isChicane ?? false,
      exitCornerSpeedLimit: endNode?.speedLimit ?? 4,
      legendsLineFromExit,
      legendCountdowns:     countdowns,
    };
    if (surfaces.length > 0) sectorObj.surfaces = surfaces;
    return sectorObj;
  });

  // ── Geometry: normalised nodes + topology indices ──────────────────────────
  const normPts   = normaliseNodes(nodes, worldW, worldH);
  const exportNodes = nodes.map((nd, i) => {
    const pt: Record<string, unknown> = { x: normPts[i].x, y: normPts[i].y };
    if (nd.isPhantom) pt.isPhantom = true;
    return pt;
  });

  // Corner indices: the endNodeIndex of each computed sector.
  // These are needed by TrackLayout to build the dense spline correctly.
  const cornerIndices  = computed.map(seg => seg.endNodeIndex);
  const phantomIndices = nodes
    .map((nd, i) => (nd.isPhantom ? i : -1))
    .filter(i => i >= 0);

  // Track width in world units (same conversion as exportJson.ts).
  const scaleUnitPerPx = EXPORT_SCALE / Math.max(worldW, worldH);
  const trackWidthPx   = (trackWidthPct / 100) * 2048;
  const trackWidth     = parseFloat((trackWidthPx * scaleUnitPerPx).toFixed(4));

  // ── Condition markers ──────────────────────────────────────────────────────
  const markers = conditionMarkers.map(m => ({
    label:    m.label,
    type:     m.type,
    x:        Math.round(m.x        * 100) / 100,
    y:        Math.round(m.y        * 100) / 100,
    rotation: Math.round(m.rotation * 10)  / 10,
  }));

  // ── Assemble ───────────────────────────────────────────────────────────────
  const obj: Record<string, unknown> = {
    schemaVersion: 2,
    id:            meta.trackId,
    name:          meta.name,
    country:       meta.country,
    defaultLaps:   meta.laps,
    startingHeat:  meta.heat,
    startingStress: meta.stress,
    tileColumns,
    tileRows,
    tileSizePx:    2048,
    trackWidth,
    samplesPerEdge: 16,
    finishLine: {
      sectorIndex:     finishSectorIndex,
      afterSpaceIndex: finishAfterSpaceIdx,
    },
    sectors,
    nodes:          exportNodes,
    cornerIndices,
    ...(phantomIndices.length > 0 ? { phantomIndices } : {}),
  };
  if (markers.length > 0) obj.conditionMarkers = markers;
  if (weatherToken) {
    obj.weatherToken = {
      x:     Math.round(weatherToken.x     * 100) / 100,
      y:     Math.round(weatherToken.y     * 100) / 100,
      width: Math.round(weatherToken.width * 100) / 100,
    };
  }
  return obj;
}

export function exportV2JsonString(state: EditorState): string {
  return JSON.stringify(buildV2Object(state), null, 2);
}

export function exportV2Package(state: EditorState): void {
  const json = exportV2JsonString(state);
  downloadFile(`track_${state.meta.trackId}_v2.json`, json, 'application/json');
}

// ── Crypto helpers ─────────────────────────────────────────────────────────

/** SHA-256 of a UTF-8 string via the Web Crypto API. Returns a lowercase hex string. */
async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Manifest builder ──────────────────────────────────────────────────────

/**
 * Builds the `manifest.json` object for a track package.
 * @param v2obj  - the already-built V2 JSON object (used to derive spaces/corners/expansions)
 * @param meta   - editor meta (name, country, heat, stress, laps)
 * @param checksum - "sha256:{hex}" of the serialised track JSON
 */
function buildManifest(
  v2obj: Record<string, unknown>,
  meta: EditorState['meta'],
  checksum: string,
): Record<string, unknown> {
  const sectors = (v2obj.sectors as Array<{
    spaceCount: number;
    surfaces?: Array<{ type: string }>;
  }>) ?? [];

  const totalSpaces = sectors.reduce((sum, s) => sum + s.spaceCount, 0);
  const corners     = sectors.length;

  // Derive required expansion set from surface types present in any sector.
  const expansionSet = new Set<string>();
  for (const sec of sectors) {
    for (const surf of sec.surfaces ?? []) {
      if (surf.type === 'flooded') expansionSet.add('Flooded');
      if (surf.type === 'tunnel')  expansionSet.add('Tunnel');
      if (surf.type === 'gravel')  expansionSet.add('Gravel');
    }
  }

  return {
    trackId:       meta.trackId,
    name:          meta.name,
    country:       meta.country,
    // Version = export date (YYYY-MM-DD). Automatically increments on every export
    // and gives testers a meaningful timeline without requiring manual bookkeeping.
    version:       new Date().toISOString().slice(0, 10),
    schemaVersion: 2,
    startingHeat:  meta.heat,
    startingStress: meta.stress,
    defaultLaps:   meta.laps,
    spaces:        totalSpaces,
    corners,
    expansions:    [...expansionSet],
    // SHA-256 of the track JSON; used by the game to verify integrity and
    // by the multiplayer lobby to ensure all players use the same track version.
    trackChecksum: checksum,
  };
}

/**
 * Export a single ZIP containing manifest.json, the V2 JSON, and all background tiles.
 * Drop the ZIP into the game's TracksImport folder to install.
 *
 * ZIP layout:
 *   manifest.json              ← TrackManifest with metadata + SHA-256 checksum
 *   track_{id}_v2.json         ← V2 track definition
 *   tiles/
 *     T_{id}_{col}_{row}.jpg
 *     ...
 */
export async function exportV2Bundle(state: EditorState): Promise<void> {
  const trackId = state.meta.trackId || 'track';

  // Build the V2 object once; derive both the JSON string and the manifest from it.
  const v2obj   = buildV2Object(state);
  const json    = JSON.stringify(v2obj, null, 2);
  const checksum = `sha256:${await sha256hex(json)}`;
  const manifest = buildManifest(v2obj, state.meta, checksum);

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file(`track_${trackId}_v2.json`, json);

  if (state.backgroundImage) {
    await addTilesToZip(state, zip.folder('tiles')!);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `track_${trackId}_v2_package.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
