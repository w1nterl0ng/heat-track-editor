import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import JSZip from 'jszip';
import type {
  EditorState,
  TrackNode,
  SegmentData,
  ToolMode,
  TrackMeta,
  RaceLine,
  SurfaceType,
  SurfaceSide,
  ConditionMarker,
} from '../types/track';
import { sampleSpline } from '../lib/spline';

const SAMPLES_PER_EDGE_CM = 16;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeNode(x: number, y: number, overrides?: Partial<TrackNode>): TrackNode {
  return {
    id: uid(),
    x,
    y,
    isCorner: false,
    speedLimit: 4,
    isFinishLine: false,
    isLegendsLine: false,
    isPhantom: false,
    surfaceType: 'plain',
    surfaceSide: 'both',
    ...overrides,
  };
}

function makeSegmentData(startNodeId: string): SegmentData {
  return {
    id: uid(),
    startNodeId,
    raceLine: 'L',
    isChicane: false,
    legendCountdowns: [0, 0, 0, 0],
  };
}

/**
 * Keep segmentData in sync with corner nodes.
 * Preserves existing entries by startNodeId; creates defaults for new corners.
 */
function syncSegmentData(nodes: TrackNode[], existing: SegmentData[]): SegmentData[] {
  const byNodeId = new Map(existing.map(sd => [sd.startNodeId, sd]));
  return nodes
    .filter(nd => nd.isCorner)
    .map(nd => byNodeId.get(nd.id) ?? makeSegmentData(nd.id));
}

/**
 * Return the indices of nodes BETWEEN idA and idB on the shorter clockwise arc.
 * Does NOT include idA or idB themselves.
 */
function shortArcBetween(nodes: TrackNode[], idA: string, idB: string): number[] {
  const n = nodes.length;
  const iA = nodes.findIndex(nd => nd.id === idA);
  const iB = nodes.findIndex(nd => nd.id === idB);
  if (iA === -1 || iB === -1 || iA === iB) return [];

  const cwDist = (iB - iA + n) % n;
  const ccwDist = (iA - iB + n) % n;
  const useClockwise = cwDist <= ccwDist;
  const steps = useClockwise ? cwDist : ccwDist;
  const dir = useClockwise ? 1 : -1;

  const result: number[] = [];
  for (let k = 1; k < steps; k++) {
    result.push((iA + dir * k + n) % n);
  }
  return result;
}

/**
 * Replace the shorter arc between idA and idB with (count - 1) evenly-spaced
 * new nodes, giving exactly `count` edges (spaces) between them.
 */
function applySetSpacesBetween(
  nodes: TrackNode[],
  idA: string,
  idB: string,
  count: number
): TrackNode[] {
  if (count < 1) return nodes;
  const n = nodes.length;
  const iA = nodes.findIndex(nd => nd.id === idA);
  const iB = nodes.findIndex(nd => nd.id === idB);
  if (iA === -1 || iB === -1 || iA === iB) return nodes;

  const cwDist = (iB - iA + n) % n;
  const ccwDist = (iA - iB + n) % n;

  let fromIdx: number, toIdx: number;
  if (cwDist <= ccwDist) {
    fromIdx = iA; toIdx = iB;
  } else {
    fromIdx = iB; toIdx = iA;
  }

  const nodeFrom = nodes[fromIdx];
  const nodeTo = nodes[toIdx];

  const newNodes: TrackNode[] = Array.from({ length: count - 1 }, (_, k) => {
    const frac = (k + 1) / count;
    return makeNode(
      nodeFrom.x + (nodeTo.x - nodeFrom.x) * frac,
      nodeFrom.y + (nodeTo.y - nodeFrom.y) * frac,
    );
  });

  if (fromIdx < toIdx) {
    return [
      ...nodes.slice(0, fromIdx + 1),
      ...newNodes,
      ...nodes.slice(toIdx),
    ];
  } else {
    return [
      ...nodes.slice(toIdx, fromIdx + 1),
      ...newNodes,
    ];
  }
}

interface EditorActions {
  setTool(tool: ToolMode): void;
  setMeta(meta: Partial<TrackMeta>): void;
  setTrackWidth(pct: number): void;
  setBackgroundImage(dataUrl: string, width: number, height: number): void;
  setBackgroundOpacity(opacity: number): void;
  setBackgroundTransform(x: number, y: number, scale: number): void;
  fitBackgroundToGrid(): void;
  setTileGrid(columns: number, rows: number): void;
  setCanvasSize(width: number, height: number): void;
  toggleGrid(): void;
  toggleSpline(): void;
  toggleTileGrid(): void;

  // Build phase
  appendNode(x: number, y: number): void;
  closeLoop(): void;

  // Edit phase — nodes
  updateNodePosition(id: string, x: number, y: number): void;
  toggleNodeCorner(id: string): void;
  toggleNodePhantom(id: string): void;
  removeNode(id: string): void;
  removeNodesBetween(idA: string, idB: string): void;
  insertNodeOnEdge(afterNodeId: string, x: number, y: number): void;
  setNodeFinishLine(id: string): void;
  clearFinishLine(): void;
  toggleNodeLegendsLine(id: string): void;
  setSpacesBetween(idA: string, idB: string, count: number): void;

  // Selection
  selectNode(id: string): void;
  clearSelection(): void;

  // Surface
  activeSurfaceType: SurfaceType;
  activeSurfaceSide: SurfaceSide;
  setActiveSurface(type: SurfaceType, side?: SurfaceSide): void;
  setSpaceSurface(nodeIds: string[], type: SurfaceType, side: SurfaceSide): void;
  paintSpace(nodeId: string): void;

  // Legends countdown markers
  setLegendCountdown(startNodeId: string, position: number, aggression: number): void;

  // Condition markers
  generateConditionMarkers(): void;
  updateConditionMarkerPosition(id: string, x: number, y: number): void;
  updateConditionMarkerRotation(id: string, rotation: number): void;
  commitConditionMarkerDrag(): void;

  // Sector data
  updateSegmentData(startNodeId: string, patch: Partial<Omit<SegmentData, 'id' | 'startNodeId'>>): void;
  updateCornerSpeedLimit(nodeId: string, speedLimit: number): void;
  setSelectedSegment(id: string | null): void;

  // Pan/zoom
  setZoom(z: number): void;
  setPan(x: number, y: number): void;

  // Space input UI state (not snapshotted)
  spaceInput: string | null;
  setSpaceInput(v: string | null): void;

  // Undo / redo
  snapshot(): void;
  undo(): void;
  redo(): void;

  // Save / load
  exportPackage(): Promise<void>;
  loadPackage(file: File): Promise<void>;

  resetAll(): void;
}

type StateSnapshot = Omit<EditorState, 'backgroundImage'>;

interface EditorStore extends EditorState, EditorActions {
  _history: StateSnapshot[];
  _future: StateSnapshot[];
}

const DEFAULT_CANVAS = 1200;

const defaultState: EditorState = {
  meta: {
    name: 'New Track',
    trackId: 'new',
    country: '',
    laps: 2,
    heat: 6,
    stress: 3,
  },
  nodes: [],
  loopClosed: false,
  trackWidthPct: 11.58, // 33 mm = 11.58% of one 2048 px tile (28.5 cm)
  segmentData: [],
  backgroundImage: null,
  backgroundOpacity: 0.65,
  backgroundSize: { width: DEFAULT_CANVAS, height: DEFAULT_CANVAS },
  backgroundX: 0,
  backgroundY: 0,
  backgroundScale: 1,
  tileColumns: 3,
  tileRows: 2,
  showTileGrid: true,
  selectedNodeIds: [],
  selectedSegmentId: null,
  conditionMarkers: [],
  tool: 'edit',
  canvasWidth: DEFAULT_CANVAS,
  canvasHeight: DEFAULT_CANVAS,
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  showSpline: true,
};

function snapState(s: EditorState): StateSnapshot {
  return {
    meta: { ...s.meta },
    nodes: s.nodes.map(n => ({ ...n })),
    loopClosed: s.loopClosed,
    trackWidthPct: s.trackWidthPct,
    segmentData: s.segmentData.map(sd => ({ ...sd })),
    backgroundOpacity: s.backgroundOpacity,
    backgroundSize: { ...s.backgroundSize },
    backgroundX: s.backgroundX,
    backgroundY: s.backgroundY,
    backgroundScale: s.backgroundScale,
    tileColumns: s.tileColumns,
    tileRows: s.tileRows,
    showTileGrid: s.showTileGrid,
    selectedNodeIds: [...s.selectedNodeIds],
    selectedSegmentId: s.selectedSegmentId,
    conditionMarkers: s.conditionMarkers.map(m => ({ ...m })),
    tool: s.tool,
    canvasWidth: s.canvasWidth,
    canvasHeight: s.canvasHeight,
    zoom: s.zoom,
    panX: s.panX,
    panY: s.panY,
    showGrid: s.showGrid,
    showSpline: s.showSpline,
  };
}

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector((set, get) => ({
    ...defaultState,
    _history: [],
    _future: [],
    spaceInput: null,
    activeSurfaceType: 'gravel' as SurfaceType,
    activeSurfaceSide: 'both' as SurfaceSide,

    snapshot() {
      const snap = snapState(get());
      set(st => ({ _history: [...st._history.slice(-49), snap], _future: [] }));
    },

    undo() {
      const { _history } = get();
      if (_history.length === 0) return;
      const prev = _history[_history.length - 1];
      const currentSnap = snapState(get());
      set(st => ({
        ...prev,
        _history: st._history.slice(0, -1),
        _future: [currentSnap, ...st._future.slice(0, 49)],
        spaceInput: null,
      }));
    },

    redo() {
      const { _future } = get();
      if (_future.length === 0) return;
      const next = _future[0];
      const currentSnap = snapState(get());
      set(st => ({
        ...next,
        _history: [...st._history.slice(-49), currentSnap],
        _future: st._future.slice(1),
        spaceInput: null,
      }));
    },

    setTool(tool) { set({ tool }); },
    setMeta(meta) { set(s => ({ meta: { ...s.meta, ...meta } })); },
    setTrackWidth(pct) { set({ trackWidthPct: pct }); },
    setBackgroundOpacity(opacity) { set({ backgroundOpacity: Math.max(0, Math.min(1, opacity)) }); },
    toggleGrid() { set(s => ({ showGrid: !s.showGrid })); },
    toggleSpline() { set(s => ({ showSpline: !s.showSpline })); },
    toggleTileGrid() { set(s => ({ showTileGrid: !s.showTileGrid })); },
    setZoom(z) { set({ zoom: Math.max(0.1, Math.min(5, z)) }); },
    setPan(x, y) { set({ panX: x, panY: y }); },

    setBackgroundTransform(x, y, scale) {
      set({ backgroundX: x, backgroundY: y, backgroundScale: Math.max(0.01, scale) });
    },

    setTileGrid(columns, rows) {
      set({ tileColumns: Math.max(1, Math.min(8, columns)), tileRows: Math.max(1, Math.min(8, rows)) });
    },

    fitBackgroundToGrid() {
      set(s => {
        if (!s.backgroundImage) return {};
        const fitScale = Math.min(
          (s.tileColumns * 2048) / s.backgroundSize.width,
          (s.tileRows * 2048) / s.backgroundSize.height
        );
        return { backgroundX: 0, backgroundY: 0, backgroundScale: fitScale };
      });
    },

    setBackgroundImage(dataUrl, width, height) {
      set(s => {
        const fitScale = Math.min(
          (s.tileColumns * 2048) / width,
          (s.tileRows * 2048) / height
        );
        return {
          backgroundImage: dataUrl,
          backgroundSize: { width, height },
          backgroundX: 0,
          backgroundY: 0,
          backgroundScale: fitScale,
        };
      });
    },

    setCanvasSize(width, height) {
      set({ canvasWidth: width, canvasHeight: height });
    },

    appendNode(x, y) {
      get().snapshot();
      set(s => ({ nodes: [...s.nodes, makeNode(x, y)] }));
    },

    closeLoop() {
      get().snapshot();
      set({ loopClosed: true });
    },

    updateNodePosition(id, x, y) {
      set(s => ({
        nodes: s.nodes.map(nd => nd.id === id ? { ...nd, x, y } : nd),
      }));
    },

    toggleNodeCorner(id) {
      get().snapshot();
      set(s => {
        const nodes = s.nodes.map(nd =>
          nd.id === id ? { ...nd, isCorner: !nd.isCorner } : nd
        );
        return { nodes, segmentData: syncSegmentData(nodes, s.segmentData) };
      });
    },

    toggleNodePhantom(id) {
      get().snapshot();
      set(s => ({
        nodes: s.nodes.map(nd =>
          nd.id === id
            ? { ...nd, isPhantom: !nd.isPhantom, isCorner: false, isFinishLine: false, isLegendsLine: false }
            : nd
        ),
      }));
    },

    removeNode(id) {
      get().snapshot();
      set(s => {
        const nodes = s.nodes.filter(nd => nd.id !== id);
        const segmentData = syncSegmentData(nodes, s.segmentData);
        const selectedNodeIds = s.selectedNodeIds.filter(sid => sid !== id);
        return { nodes, segmentData, selectedNodeIds };
      });
    },

    removeNodesBetween(idA, idB) {
      get().snapshot();
      set(s => {
        const between = shortArcBetween(s.nodes, idA, idB);
        if (between.length === 0) return {};
        const idsToRemove = new Set(between.map(i => s.nodes[i].id));
        const nodes = s.nodes.filter(nd => !idsToRemove.has(nd.id));
        const segmentData = syncSegmentData(nodes, s.segmentData);
        const selectedNodeIds = s.selectedNodeIds.filter(sid => !idsToRemove.has(sid));
        return { nodes, segmentData, selectedNodeIds };
      });
    },

    insertNodeOnEdge(afterNodeId, x, y) {
      get().snapshot();
      set(s => {
        const afterIdx = s.nodes.findIndex(nd => nd.id === afterNodeId);
        if (afterIdx === -1) return {};
        const nodes = [
          ...s.nodes.slice(0, afterIdx + 1),
          makeNode(x, y),
          ...s.nodes.slice(afterIdx + 1),
        ];
        return { nodes };
      });
    },

    setNodeFinishLine(id) {
      set(s => {
        const alreadySet = s.nodes.find(nd => nd.id === id)?.isFinishLine ?? false;
        return {
          nodes: s.nodes.map(nd => ({
            ...nd,
            isFinishLine: alreadySet ? false : nd.id === id,
          })),
        };
      });
    },

    clearFinishLine() {
      set(s => ({
        nodes: s.nodes.map(nd => ({ ...nd, isFinishLine: false })),
      }));
    },

    toggleNodeLegendsLine(id) {
      set(s => ({
        nodes: s.nodes.map(nd =>
          nd.id === id ? { ...nd, isLegendsLine: !nd.isLegendsLine } : nd
        ),
      }));
    },

    setSpacesBetween(idA, idB, count) {
      get().snapshot();
      set(s => {
        const nodes = applySetSpacesBetween(s.nodes, idA, idB, count);
        const segmentData = syncSegmentData(nodes, s.segmentData);
        return { nodes, segmentData, selectedNodeIds: [] };
      });
    },

    selectNode(id) {
      set(s => {
        const already = s.selectedNodeIds.includes(id);
        if (already) {
          return { selectedNodeIds: s.selectedNodeIds.filter(sid => sid !== id) };
        }
        if (s.selectedNodeIds.length >= 2) {
          return { selectedNodeIds: [s.selectedNodeIds[1], id] };
        }
        return { selectedNodeIds: [...s.selectedNodeIds, id] };
      });
    },

    clearSelection() {
      set({ selectedNodeIds: [], spaceInput: null });
    },

    generateConditionMarkers() {
      const { nodes, segmentData, tileColumns, tileRows } = get();
      if (nodes.length < 2) return;
      get().snapshot();

      const computed = computeSegments(nodes);
      const pts = nodes.map(nd => ({ x: nd.x, y: nd.y }));
      const samples = sampleSpline(pts, SAMPLES_PER_EDGE_CM);

      const markers: ConditionMarker[] = [];
      const worldWidth = tileColumns * 2048;
      const worldHeight = tileRows * 2048;
      const offsetOut = Math.min(worldWidth, worldHeight) * 0.04; // push markers slightly off-track
      let sectorNum = 1;

      computed.forEach((seg, i) => {
        const sd = segmentData.find(d => d.startNodeId === seg.startNodeId);
        const isChicane = sd?.isChicane ?? false;

        // Sector / chicane marker — placed at arc midpoint, offset inward
        const midSample = samples[
          ((seg.startNodeIndex * SAMPLES_PER_EDGE_CM) +
            Math.floor((seg.spaces * SAMPLES_PER_EDGE_CM) / 2)) % samples.length
        ];
        markers.push({
          id: uid(),
          type: isChicane ? 'chicane' : 'sector',
          label: `S${sectorNum}`,
          x: midSample.point.x - midSample.normal.x * offsetOut,
          y: midSample.point.y - midSample.normal.y * offsetOut,
          rotation: 0,
        });
        sectorNum++;

        // Corner marker at the END of this segment.
        // Suppress if THIS segment is a chicane (no corner at its end)
        // OR if the NEXT segment is a chicane (no corner at its start).
        // Label uses i+1 (sector-order number) so it matches the game engine's
        // corner index, keeping the board label consistent with CLI output ("C4"
        // on the board = corner index 3 = "C4" in the engine).
        const nextSeg = computed[(i + 1) % computed.length];
        const nextSd = segmentData.find(d => d.startNodeId === nextSeg.startNodeId);
        const nextIsChicane = nextSd?.isChicane ?? false;

        if (!isChicane && !nextIsChicane) {
          const endNode = nodes[seg.endNodeIndex];
          const cornerSample = samples[(seg.endNodeIndex * SAMPLES_PER_EDGE_CM) % samples.length];
          markers.push({
            id: uid(),
            type: 'corner',
            label: `C${i + 1}`,
            x: endNode.x + cornerSample.normal.x * offsetOut,
            y: endNode.y + cornerSample.normal.y * offsetOut,
            rotation: 0,
          });
        }
      });

      set({ conditionMarkers: markers });
    },

    updateConditionMarkerPosition(id, x, y) {
      set(s => ({
        conditionMarkers: s.conditionMarkers.map(m =>
          m.id === id ? { ...m, x, y } : m
        ),
      }));
    },

    updateConditionMarkerRotation(id, rotation) {
      set(s => ({
        conditionMarkers: s.conditionMarkers.map(m =>
          m.id === id ? { ...m, rotation } : m
        ),
      }));
    },

    commitConditionMarkerDrag() {
      get().snapshot();
    },

    setSpaceSurface(nodeIds, type, side) {
      get().snapshot();
      const effectiveSide: SurfaceSide = type === 'tunnel' ? 'both' : side;
      set(s => ({
        nodes: s.nodes.map(nd =>
          nodeIds.includes(nd.id)
            ? { ...nd, surfaceType: type, surfaceSide: effectiveSide }
            : nd
        ),
      }));
    },

    setActiveSurface(type, side) {
      const effectiveSide: SurfaceSide = type === 'tunnel' ? 'both' : (side ?? get().activeSurfaceSide);
      set({ activeSurfaceType: type, activeSurfaceSide: effectiveSide });
    },

    paintSpace(nodeId) {
      const { activeSurfaceType, activeSurfaceSide } = get();
      get().snapshot();
      set(s => {
        const nd = s.nodes.find(n => n.id === nodeId);
        if (!nd) return {};
        // Toggle to plain when clicking a space that already has the active type+side
        const isToggle =
          activeSurfaceType !== 'plain' &&
          nd.surfaceType === activeSurfaceType &&
          nd.surfaceSide === activeSurfaceSide;
        const newType: SurfaceType = isToggle ? 'plain' : activeSurfaceType;
        const newSide: SurfaceSide = newType === 'tunnel' ? 'both' : activeSurfaceSide;
        return {
          nodes: s.nodes.map(n =>
            n.id === nodeId ? { ...n, surfaceType: newType, surfaceSide: newSide } : n
          ),
        };
      });
    },

    updateSegmentData(startNodeId, patch) {
      set(s => ({
        segmentData: s.segmentData.map(sd =>
          sd.startNodeId === startNodeId ? { ...sd, ...patch } : sd
        ),
      }));
    },

    setLegendCountdown(startNodeId, position, aggression) {
      get().snapshot();
      set(s => ({
        segmentData: s.segmentData.map(sd => {
          if (sd.startNodeId !== startNodeId) return sd;
          const updated = [...(sd.legendCountdowns ?? [0, 0, 0, 0])];
          updated[position] = aggression;
          return { ...sd, legendCountdowns: updated };
        }),
      }));
    },

    updateCornerSpeedLimit(nodeId, speedLimit) {
      set(s => ({
        nodes: s.nodes.map(nd => nd.id === nodeId ? { ...nd, speedLimit } : nd),
      }));
    },

    setSelectedSegment(id) { set({ selectedSegmentId: id }); },

    setSpaceInput(v) { set({ spaceInput: v }); },

    async exportPackage() {
      const s = get();
      const zip = new JSZip();

      zip.file('manifest.json', JSON.stringify({
        version: 2,
        savedAt: new Date().toISOString(),
        trackId: s.meta.trackId,
      }, null, 2));

      zip.file('state.json', JSON.stringify(snapState(s), null, 2));

      if (s.backgroundImage) {
        const match = s.backgroundImage.match(/^data:(image\/[\w+]+);base64,(.+)$/);
        if (match) {
          const [, mime, b64] = match;
          const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          zip.file(`background.${ext}`, bytes);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${s.meta.trackId || 'track'}_editor.hte`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    async loadPackage(file: File) {
      let rawState: Partial<EditorState>;
      let bgDataUrl: string | null = null;

      if (file.name.endsWith('.hte')) {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());

        const CURRENT_VERSION = 2;
        const manifestEntry = zip.file('manifest.json');
        if (manifestEntry) {
          const manifest = JSON.parse(await manifestEntry.async('text'));
          if (manifest.version > CURRENT_VERSION) {
            throw new Error(
              `This .hte file was saved with a newer version of the track editor (v${manifest.version}). Please update the editor.`
            );
          }
        }

        const stateEntry = zip.file('state.json');
        if (!stateEntry) throw new Error('Invalid .hte package: missing state.json');
        rawState = JSON.parse(await stateEntry.async('text'));

        const bgEntry = zip.file(/^background\./)[0];
        if (bgEntry) {
          const ext = bgEntry.name.split('.').pop()!;
          const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
          const b64 = await bgEntry.async('base64');
          bgDataUrl = `data:${mime};base64,${b64}`;
        }
      } else {
        // Legacy .json format — backward compatibility
        const pkg = JSON.parse(await file.text());
        const raw = pkg.state ?? pkg;
        rawState = raw;
        bgDataUrl = raw.backgroundImage ?? null;
      }

      const state: EditorState = {
        ...defaultState,
        ...rawState,
        backgroundImage: bgDataUrl,
      };
      set({
        ...state,
        _history: [],
        _future: [],
        spaceInput: null,
      });
    },

    resetAll() {
      set({ ...defaultState, _history: [], _future: [], spaceInput: null });
    },
  }))
);

export { syncSegmentData };

export interface ComputedSegment {
  startNodeId: string;
  endNodeId: string;
  startNodeIndex: number;
  endNodeIndex: number;
  spaces: number;
  segmentIndex: number;
}

export function computeSegments(nodes: TrackNode[]): ComputedSegment[] {
  const n = nodes.length;
  const cornerIndices = nodes.map((nd, i) => (nd.isCorner ? i : -1)).filter(i => i >= 0);
  if (cornerIndices.length < 2) return [];

  return cornerIndices.map((cStart, ci) => {
    const cEnd = cornerIndices[(ci + 1) % cornerIndices.length];
    const arcLen = (cEnd - cStart + n) % n;
    // Count only edges whose SOURCE node is not phantom.
    // Node i is the source of edge i→i+1 (one game space).
    // cStart (corner) and all non-phantom nodes between it and cEnd are counted.
    let spaces = 0;
    for (let k = 0; k < arcLen; k++) {
      if (!nodes[(cStart + k) % n].isPhantom) spaces++;
    }
    return {
      startNodeId: nodes[cStart].id,
      endNodeId: nodes[cEnd].id,
      startNodeIndex: cStart,
      endNodeIndex: cEnd,
      spaces,
      segmentIndex: ci,
    };
  });
}

export function raceLine(segmentData: SegmentData[], startNodeId: string): RaceLine {
  return segmentData.find(sd => sd.startNodeId === startNodeId)?.raceLine ?? 'L';
}
