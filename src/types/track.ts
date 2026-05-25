export interface Point {
  x: number;
  y: number;
}

export type ToolMode = 'edit' | 'surface' | 'condition' | 'background';

export type ConditionMarkerType = 'sector' | 'corner' | 'chicane';

export interface ConditionMarker {
  id: string;
  type: ConditionMarkerType;
  /** Display label: S1, S2 for sectors/chicanes; C1, C2 for corners. */
  label: string;
  x: number;
  y: number;
  /** Orientation in degrees (0 = right / east). Controls tile placement angle in game. */
  rotation: number;
}

/**
 * The weather condition token placed somewhere on the board.
 * Fixed aspect ratio 17:10 (width:height). Scale is controlled by width;
 * height = width * (10/17). Has no rotation — scale only.
 */
export interface WeatherToken {
  x: number;
  y: number;
  /** Width in world-space pixels. Height = width × (10/17). */
  width: number;
}

export type SurfaceType = 'plain' | 'tunnel' | 'flooded' | 'gravel';
/** Which lateral half of the track the surface covers. Tunnel is always 'both'. */
export type SurfaceSide = 'both' | 'inside' | 'outside';

export type RaceLine = 'L' | 'R';

/**
 * A single node in the track spline.
 * Every edge between adjacent nodes equals one playable space,
 * EXCEPT edges whose destination node has isPhantom = true.
 * Phantom nodes keep the spline visually continuous through sections
 * that cross another part of the circuit (e.g. a bridge overpass) without
 * contributing game spaces.
 */
export interface TrackNode {
  id: string;
  x: number;
  y: number;
  /** Marks the start of a new game sector (corner). */
  isCorner: boolean;
  /** Speed limit at this corner (only meaningful when isCorner = true). */
  speedLimit: number;
  /** Finish line is drawn at this node. At most one per track. */
  isFinishLine: boolean;
  /** Legends expansion line is drawn at this node. */
  isLegendsLine: boolean;
  /**
   * When true, the edge leading INTO this node does not count as a game space.
   * Use for nodes placed inside a bridge crossing to keep the spline continuous
   * without adding playable spaces. Phantom nodes cannot be corners, finish
   * lines, or legends lines.
   */
  isPhantom: boolean;
  /**
   * Surface type of the edge FROM this node to the next node.
   * 'plain' = default asphalt, no overlay.
   */
  surfaceType: SurfaceType;
  /**
   * Which lateral half of the track the surface covers.
   * Ignored when surfaceType is 'plain'. 'tunnel' is always rendered as 'both'.
   */
  surfaceSide: SurfaceSide;
  /**
   * Which edge of the track the speed-limit lollipop post extends from.
   * Only meaningful when isCorner = true. Defaults to 'outer' when absent.
   * Editor-only — not included in game export formats.
   */
  cornerLollipopSide?: 'inner' | 'outer';
  /**
   * Which edge of the track the legends lollipop post extends from.
   * Only meaningful when isLegendsLine = true. Defaults to 'inner' when absent
   * (matching the original placement on the inside of the track).
   * Editor-only — not included in game export formats.
   */
  legendsLollipopSide?: 'inner' | 'outer';
}

/**
 * Per-sector game data. One entry per corner node.
 * The sector runs from this corner node clockwise to the next corner node.
 * `spaces` is derived: count edges between the two corner nodes.
 */
export interface SegmentData {
  id: string;
  /** The id of the corner node that starts this sector. */
  startNodeId: string;
  raceLine: RaceLine;
  /**
   * A chicane is a short sector where both bounding corners share the same speed limit.
   * Visually: blue dashed stripes on both track edges from 1 space before the start
   * corner to 1 space after the end corner. Replaces the red corner stripes for both
   * corners involved.
   */
  isChicane: boolean;
  /**
   * Aggression level for each legends countdown marker at the end of this sector.
   * Index 0 = marker closest to the corner, index 1 = next, etc.
   * Values: 0 = no chevron, 1 = single chevron, 2 = double chevron.
   * Non-chicane sectors have up to 4 markers (indices 0–3).
   * Chicane sectors have up to 2 markers (indices 0–1).
   * Applicable count is capped by the number of spaces in the sector.
   */
  legendCountdowns: number[];
  /**
   * Which side of the track all countdown numbers for this sector appear on
   * (both the plain space-count numbers and the 0–3 legend diamond markers).
   * Defaults to 'inner' when absent. Editor-only — not included in game exports.
   */
  countdownSide?: 'inner' | 'outer';
}

export interface TrackMeta {
  name: string;
  trackId: string;
  country: string;
  laps: number;
  heat: number;
  stress: number;
  /** Name of the person who designed the physical track layout. */
  designer: string;
  /** Name of the person who created this digital track file. */
  trackEditor: string;
}

export interface EditorState {
  conditionMarkers: ConditionMarker[];
  /** The weather token placed on the board. Null when not yet placed. */
  weatherToken: WeatherToken | null;
  meta: TrackMeta;
  nodes: TrackNode[];
  /** True once the user has clicked the first node to close the loop. */
  loopClosed: boolean;
  trackWidthPct: number;
  /** One entry per corner node, preserving per-sector game data. */
  segmentData: SegmentData[];
  backgroundImage: string | null;
  backgroundOpacity: number;
  /** Natural (unscaled) pixel dimensions of the uploaded background image. */
  backgroundSize: { width: number; height: number };
  /** World-space position of the background image's top-left corner. */
  backgroundX: number;
  backgroundY: number;
  /** Uniform scale applied to the background image in world space. */
  backgroundScale: number;
  /** Number of 2048 px tile columns that define the world width. */
  tileColumns: number;
  /** Number of 2048 px tile rows that define the world height. */
  tileRows: number;
  /** Whether the tile grid overlay is visible. */
  showTileGrid: boolean;
  /** 0, 1, or 2 selected node ids (edit mode). */
  selectedNodeIds: string[];
  selectedSegmentId: string | null;
  tool: ToolMode;
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showSpline: boolean;
}
