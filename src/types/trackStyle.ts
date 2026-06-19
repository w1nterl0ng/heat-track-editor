export interface TrackStyleBackground {
  /** Main background fill color. */
  fill: string;
  /** Whether to render a blueprint-style grid over the background. */
  showGrid: boolean;
  gridColor: string;
  gridOpacity: number;
}

export interface TrackStyleTrack {
  /** Color of the thick center stroke that forms the track body. */
  bodyFill: string;
  bodyOpacity: number;
  /** Color of the inner and outer edge lines. */
  edgeStroke: string;
  /** Edge stroke width multiplier (1.0 ≈ 2 screen px at zoom 1). */
  edgeWidth: number;
  /** Whether to render a dashed center line over the track body. */
  showCenterLine: boolean;
  centerStroke: string;
  /** Dash pattern [dashLen, gapLen] in world-space pixels (divided by zoom at render time). */
  centerDash: [number, number];
  /** Center line stroke width multiplier (1.0 = 1 screen px). */
  centerLineWidth: number;
}

export interface TrackStyleMarkers {
  cornerStroke: string;
  cornerLabelColor: string;
  cornerStripeStroke: string;
  chicaneStripeStroke: string;
  finishStroke: string;
  finishLabelColor: string;
  legendsStroke: string;
  raceLineStroke: string;
  raceLineOpacity: number;
  /** Race line stroke width as a fraction of track width (0.05 = 5% of full track width). */
  raceLineWidth: number;
}

export interface TrackStyleLollipops {
  speedFill: string;
  speedStroke: string;
  speedLabelColor: string;
  /** 'circle' = plain filled circle; 'gauge' = speedometer arc with tick marks */
  speedMarkerShape: 'circle' | 'gauge';
  /**
   * URL of a PNG badge to render as the speed marker background.
   * When set, the PNG is used instead of the Konva-drawn shape.
   * The number is overlaid on top. Should be a square 1:1 image.
   */
  speedMarkerImageSrc: string | null;
  legendsFill: string;
  legendsStroke: string;
  legendsLabelColor: string;
  /**
   * URL of a PNG badge to render as the legends marker.
   * When set, the PNG is rendered directly with no text overlay.
   */
  legendsMarkerImageSrc: string | null;
  countdownFill: string;
  countdownStroke: string;
  /**
   * URL of a PNG asset to render as the condition/countdown marker.
   * When set, the PNG is rendered at each countdown position, rotated
   * to align with the track edge using the local normal vector.
   */
  conditionMarkerImageSrc: string | null;
  /**
   * Which podium graphic layout to use.
   * 'tall' = vertical staircase layout; 'square' = compact square layout.
   * Only rendered when at least one podium slot is placed in the editor.
   */
  podiumGraphic: 'tall' | 'square';
}

export interface TrackStyleSurfaces {
  tunnel: { fill: string; opacity: number };
  flooded: { fill: string; opacity: number };
  gravel: { fill: string; opacity: number };
}

export interface TrackStyle {
  id: string;
  label: string;
  description: string;
  background: TrackStyleBackground;
  track: TrackStyleTrack;
  markers: TrackStyleMarkers;
  lollipops: TrackStyleLollipops;
  surfaces: TrackStyleSurfaces;
}
