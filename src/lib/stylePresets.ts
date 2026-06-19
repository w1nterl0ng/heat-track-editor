import type { TrackStyle } from '../types/trackStyle';
import speedLimitSignUrl from '../assets/speed_limit_sign.png';
import legendsMarkerUrl from '../assets/legends_marker.png';
import conditionMarkerUrl from '../assets/condition_marker.png';
// Podium graphic URLs are imported in StyleCanvas directly to avoid bundling both in presets

/**
 * The "Default" style matches the current editor's hardcoded colors exactly,
 * so switching to Style mode with this preset looks identical to the editor view.
 */
export const STYLE_DEFAULT: TrackStyle = {
  id: 'default',
  label: 'Default',
  description: 'Matches the standard editor appearance',
  background: {
    fill: '#1a1a2e',
    showGrid: false,
    gridColor: '#22d3ee',
    gridOpacity: 0.15,
  },
  track: {
    bodyFill: '#39ff14',
    bodyOpacity: 0.15,
    edgeStroke: '#39ff14',
    edgeWidth: 1.0,
    showCenterLine: true,
    centerStroke: '#39ff14',
    centerDash: [6, 6],
    centerLineWidth: 1.0,
  },
  markers: {
    cornerStroke: '#ef4444',
    cornerLabelColor: '#ef4444',
    cornerStripeStroke: '#ef4444',
    chicaneStripeStroke: '#3b82f6',
    finishStroke: '#facc15',
    finishLabelColor: '#facc15',
    legendsStroke: '#c084fc',
    raceLineStroke: '#22d3ee',
    raceLineOpacity: 1.0,
    raceLineWidth: 0.05,
  },
  lollipops: {
    speedFill: '#dc2626',
    speedStroke: '#ffffff',
    speedLabelColor: '#ffffff',
    speedMarkerShape: 'circle',
    speedMarkerImageSrc: null,
    legendsFill: '#f59e0b',
    legendsStroke: '#f59e0b',
    legendsLabelColor: '#ffffff',
    legendsMarkerImageSrc: null,
    countdownFill: '#f59e0b',
    countdownStroke: '#f59e0b',
    conditionMarkerImageSrc: null,
    podiumGraphic: 'tall',
  },
  surfaces: {
    tunnel:  { fill: '#292524', opacity: 0.72 },
    flooded: { fill: '#3b82f6', opacity: 0.45 },
    gravel:  { fill: '#d97706', opacity: 0.50 },
  },
};

/**
 * Blueprint style — technical drawing aesthetic on dark paper.
 * Clean white/cyan lines on a dark navy background, with a subtle grid.
 */
export const STYLE_BLUEPRINT: TrackStyle = {
  id: 'blueprint',
  label: 'Blueprint',
  description: 'Technical drawing on dark paper with grid',
  background: {
    fill: '#0a1628',
    showGrid: true,
    gridColor: '#1d4ed8',
    gridOpacity: 0.35,
  },
  track: {
    bodyFill: '#1e40af',
    bodyOpacity: 0.25,
    edgeStroke: '#93c5fd',
    edgeWidth: 1.2,
    showCenterLine: true,
    centerStroke: '#60a5fa',
    centerDash: [10, 10],
    centerLineWidth: 1.0,
  },
  markers: {
    cornerStroke: '#ffffff',
    cornerLabelColor: '#ffffff',
    cornerStripeStroke: '#93c5fd',
    chicaneStripeStroke: '#7dd3fc',
    finishStroke: '#ffffff',
    finishLabelColor: '#ffffff',
    legendsStroke: '#c4b5fd',
    raceLineStroke: '#38bdf8',
    raceLineOpacity: 0.7,
    raceLineWidth: 0.05,
  },
  lollipops: {
    speedFill: '#1e40af',
    speedStroke: '#93c5fd',
    speedLabelColor: '#1a1a2e',
    speedMarkerShape: 'gauge',
    speedMarkerImageSrc: speedLimitSignUrl,
    legendsFill: '#312e81',
    legendsStroke: '#c4b5fd',
    legendsLabelColor: '#ffffff',
    legendsMarkerImageSrc: legendsMarkerUrl,
    countdownFill: '#1e3a8a',
    countdownStroke: '#93c5fd',
    conditionMarkerImageSrc: conditionMarkerUrl,
    podiumGraphic: 'tall',
  },
  surfaces: {
    tunnel:  { fill: '#0f172a', opacity: 0.8 },
    flooded: { fill: '#1e3a8a', opacity: 0.55 },
    gravel:  { fill: '#44403c', opacity: 0.55 },
  },
};

/**
 * Print style — black on white, optimized for printing physical boards.
 * High-contrast monochrome with the gauge marker shape.
 */
export const STYLE_PRINT: TrackStyle = {
  id: 'print',
  label: 'Print',
  description: 'Black on white — optimized for physical printing',
  background: {
    fill: '#ffffff',
    showGrid: false,
    gridColor: '#cccccc',
    gridOpacity: 0.5,
  },
  track: {
    bodyFill: '#000000',
    bodyOpacity: 0.06,
    edgeStroke: '#000000',
    edgeWidth: 2.5,
    showCenterLine: true,
    centerStroke: '#000000',
    centerDash: [12, 8],
    centerLineWidth: 2.0,
  },
  markers: {
    cornerStroke: '#000000',
    cornerLabelColor: '#000000',
    cornerStripeStroke: '#dc2626',
    chicaneStripeStroke: '#2563eb',
    finishStroke: '#000000',
    finishLabelColor: '#000000',
    legendsStroke: '#444444',
    raceLineStroke: '#888888',
    raceLineOpacity: 0.6,
    raceLineWidth: 0.04,
  },
  lollipops: {
    speedFill: '#ffffff',
    speedStroke: '#000000',
    speedLabelColor: '#000000',
    speedMarkerShape: 'gauge',
    speedMarkerImageSrc: speedLimitSignUrl,
    legendsFill: '#ffffff',
    legendsStroke: '#000000',
    legendsLabelColor: '#000000',
    legendsMarkerImageSrc: legendsMarkerUrl,
    countdownFill: '#ffffff',
    countdownStroke: '#000000',
    conditionMarkerImageSrc: conditionMarkerUrl,
    podiumGraphic: 'tall',
  },
  surfaces: {
    tunnel:  { fill: '#cccccc', opacity: 0.60 },
    flooded: { fill: '#aaaaaa', opacity: 0.40 },
    gravel:  { fill: '#888888', opacity: 0.35 },
  },
};

export const ALL_STYLE_PRESETS: TrackStyle[] = [STYLE_DEFAULT, STYLE_BLUEPRINT, STYLE_PRINT];

export const DEFAULT_STYLE_ID = STYLE_DEFAULT.id;

export function getStyleById(id: string): TrackStyle {
  return ALL_STYLE_PRESETS.find(s => s.id === id) ?? STYLE_DEFAULT;
}
