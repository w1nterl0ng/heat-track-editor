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
  /** Edge stroke width multiplier (1.0 = default). */
  edgeWidth: number;
  /** Whether to render a dashed center line over the track body. */
  showCenterLine: boolean;
  centerStroke: string;
  centerDash: [number, number];
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
}

export interface TrackStyleLollipops {
  speedFill: string;
  speedStroke: string;
  speedLabelColor: string;
  legendsFill: string;
  legendsStroke: string;
  legendsLabelColor: string;
  countdownFill: string;
  countdownStroke: string;
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
