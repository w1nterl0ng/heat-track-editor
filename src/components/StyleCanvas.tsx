import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line, Circle, Arc, Rect, Text, Image as KonvaImage, Group } from 'react-konva';
import Konva from 'konva';
import { useEditorStore, computeSegments } from '../store/editorStore';
import { sampleSpline } from '../lib/spline';
import {
  buildTrackLines,
  buildCornerLines,
  buildSpaceTicks,
  buildFinishLine,
  buildLegendsLines,
  buildRaceLineArcs,
  buildCornerStripes,
  buildChicaneStripes,
  buildSpeedMarkers,
  buildSurfaceOverlays,
  buildLegendsMarkers,
  buildCountdownMarkers,
  buildPhantomOverlays,
} from '../lib/trackGeometry';
import { getStyleById } from '../lib/stylePresets';
import type { TrackStyle } from '../types/trackStyle';

const SAMPLES_PER_EDGE = 16;
const TILE_SIZE = 2048;

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const StyleCanvas: React.FC<Props> = ({ stageRef }) => {
  const {
    nodes,
    loopClosed,
    trackWidthPct,
    segmentData,
    conditionMarkers,
    backgroundImage,
    backgroundOpacity,
    backgroundSize,
    backgroundX,
    backgroundY,
    backgroundScale,
    tileColumns,
    tileRows,
    showTileGrid,
    canvasWidth,
    canvasHeight,
    zoom,
    panX,
    panY,
    setZoom,
    setPan,
    activeStyleId,
    customStyle,
  } = useEditorStore();

  const style: TrackStyle =
    activeStyleId === 'custom' && customStyle ? customStyle : getStyleById(activeStyleId);

  const trackWidthPx = (trackWidthPct / 100) * TILE_SIZE;
  const halfWidth = trackWidthPx / 2;

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [speedMarkerImg, setSpeedMarkerImg] = useState<HTMLImageElement | null>(null);
  const [legendsMarkerImg, setLegendsMarkerImg] = useState<HTMLImageElement | null>(null);
  const [conditionMarkerImg, setConditionMarkerImg] = useState<HTMLImageElement | null>(null);

  const isPanning = useRef(false);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (!backgroundImage) { setBgImage(null); return; }
    const img = new window.Image();
    img.src = backgroundImage;
    img.onload = () => setBgImage(img);
  }, [backgroundImage]);

  useEffect(() => {
    const src = style.lollipops.speedMarkerImageSrc;
    if (!src) { setSpeedMarkerImg(null); return; }
    const img = new window.Image();
    img.src = src;
    img.onload = () => setSpeedMarkerImg(img);
  }, [style.lollipops.speedMarkerImageSrc]);

  useEffect(() => {
    const src = style.lollipops.legendsMarkerImageSrc;
    if (!src) { setLegendsMarkerImg(null); return; }
    const img = new window.Image();
    img.src = src;
    img.onload = () => setLegendsMarkerImg(img);
  }, [style.lollipops.legendsMarkerImageSrc]);

  useEffect(() => {
    const src = style.lollipops.conditionMarkerImageSrc;
    if (!src) { setConditionMarkerImg(null); return; }
    const img = new window.Image();
    img.src = src;
    img.onload = () => setConditionMarkerImg(img);
  }, [style.lollipops.conditionMarkerImageSrc]);

  // ── Geometry (mirrors TrackCanvas useMemo deps) ───────────────────────────

  const nodePoints = useMemo(() => nodes.map(nd => ({ x: nd.x, y: nd.y })), [nodes]);

  const samples = useMemo(
    () => (loopClosed && nodes.length >= 2 ? sampleSpline(nodePoints, SAMPLES_PER_EDGE) : []),
    [nodePoints, loopClosed],
  );

  const computed = useMemo(() => computeSegments(nodes), [nodes]);

  const trackLines = useMemo(
    () => (samples.length >= 4 ? buildTrackLines(samples, halfWidth) : null),
    [samples, halfWidth],
  );

  const cornerLines = useMemo(
    () => (samples.length >= 4 ? buildCornerLines(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth],
  );

  const spaceTicks = useMemo(
    () => (samples.length >= 4 ? buildSpaceTicks(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth],
  );

  const finishLine = useMemo(
    () => (samples.length >= 4 ? buildFinishLine(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : null),
    [samples, nodes, halfWidth],
  );

  const legendsLines = useMemo(
    () => (samples.length >= 4 ? buildLegendsLines(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth],
  );

  const legendsMarkers = useMemo(
    () => (samples.length >= 4 ? buildLegendsMarkers(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth],
  );

  const countdownMarkerVisuals = useMemo(
    () => (samples.length >= 4
      ? buildCountdownMarkers(samples, computed, segmentData, SAMPLES_PER_EDGE, halfWidth, nodes)
      : []),
    [samples, computed, segmentData, halfWidth, nodes],
  );

  const phantomOverlays = useMemo(
    () => (samples.length >= 4 ? buildPhantomOverlays(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth],
  );

  const raceLineArcs = useMemo(
    () => (samples.length >= 4 ? buildRaceLineArcs(samples, nodes, SAMPLES_PER_EDGE, segmentData, halfWidth) : []),
    [samples, nodes, segmentData, halfWidth],
  );

  const cornerStripes = useMemo(
    () => (samples.length >= 4 ? buildCornerStripes(samples, nodes, SAMPLES_PER_EDGE, segmentData, halfWidth) : []),
    [samples, nodes, segmentData, halfWidth],
  );

  const chicaneStripes = useMemo(
    () => (samples.length >= 4 ? buildChicaneStripes(samples, nodes, SAMPLES_PER_EDGE, segmentData, halfWidth) : []),
    [samples, nodes, segmentData, halfWidth],
  );

  const speedMarkers = useMemo(
    () => (samples.length >= 4 ? buildSpeedMarkers(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth],
  );

  const surfaceOverlays = useMemo(
    () => (samples.length >= 4 ? buildSurfaceOverlays(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth],
  );

  // ── Grid lines ────────────────────────────────────────────────────────────

  const tileGridLines = useMemo(() => {
    const lines: number[][] = [];
    const totalW = tileColumns * TILE_SIZE;
    const totalH = tileRows * TILE_SIZE;
    for (let c = 0; c <= tileColumns; c++) {
      const x = c * TILE_SIZE;
      lines.push([x, 0, x, totalH]);
    }
    for (let r = 0; r <= tileRows; r++) {
      const y = r * TILE_SIZE;
      lines.push([0, y, totalW, y]);
    }
    return lines;
  }, [tileColumns, tileRows]);

  // ── Pan / Zoom (shared with editor viewport) ──────────────────────────────

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const factor = e.evt.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoom * factor, 0.05), 20);
      const worldX = (pointer.x - panX) / zoom;
      const worldY = (pointer.y - panY) / zoom;
      setZoom(newZoom);
      setPan(pointer.x - worldX * newZoom, pointer.y - worldY * newZoom);
    },
    [zoom, panX, panY, setZoom, setPan],
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Allow left-click (plain drag) or middle-click to pan
      if (e.evt.button !== 0 && e.evt.button !== 1) return;
      e.evt.preventDefault();
      isPanning.current = true;
      panStart.current = { mx: e.evt.clientX, my: e.evt.clientY, px: panX, py: panY };
    },
    [panX, panY],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isPanning.current || !panStart.current) return;
      const dx = e.evt.clientX - panStart.current.mx;
      const dy = e.evt.clientY - panStart.current.my;
      setPan(panStart.current.px + dx, panStart.current.py + dy);
    },
    [setPan],
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    panStart.current = null;
  }, []);

  // ── Surface color helper ──────────────────────────────────────────────────

  function surfaceColor(type: string): { fill: string; opacity: number } {
    if (type === 'tunnel')  return style.surfaces.tunnel;
    if (type === 'flooded') return style.surfaces.flooded;
    if (type === 'gravel')  return style.surfaces.gravel;
    return { fill: 'transparent', opacity: 0 };
  }

  const edgeW = (style.track.edgeWidth * 2) / zoom;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Stage
      ref={stageRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{ cursor: 'grab', background: style.background.fill, display: 'block' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── Layer 1: Background ─────────────────────────────────────── */}
      <Layer>
        <Group x={panX} y={panY} scaleX={zoom} scaleY={zoom}>

          {/* Solid background fill when no image is loaded */}
          {!backgroundImage && (
            <Rect
              x={0}
              y={0}
              width={tileColumns * TILE_SIZE}
              height={tileRows * TILE_SIZE}
              fill={style.background.fill}
            />
          )}

          {/* Uploaded background image */}
          {bgImage && (
            <KonvaImage
              image={bgImage}
              x={backgroundX}
              y={backgroundY}
              width={backgroundSize.width * backgroundScale}
              height={backgroundSize.height * backgroundScale}
              opacity={backgroundOpacity}
              listening={false}
            />
          )}

          {/* Style blueprint grid */}
          {style.background.showGrid && tileGridLines.map((pts, i) => (
            <Line
              key={`bg-grid-${i}`}
              points={pts}
              stroke={style.background.gridColor}
              strokeWidth={1 / zoom}
              opacity={style.background.gridOpacity}
              listening={false}
            />
          ))}

          {/* Editor tile boundary grid (when enabled and no style grid) */}
          {showTileGrid && !style.background.showGrid && tileGridLines.map((pts, i) => (
            <Line
              key={`tile-${i}`}
              points={pts}
              stroke="#22d3ee"
              strokeWidth={1 / zoom}
              opacity={0.15}
              listening={false}
            />
          ))}
        </Group>
      </Layer>

      {/* ── Layer 2: Track + markers (no interaction) ───────────────── */}
      <Layer listening={false}>
        <Group x={panX} y={panY} scaleX={zoom} scaleY={zoom}>

          {/* Surface overlays */}
          {surfaceOverlays.map((ov, i) => {
            const cfg = surfaceColor(ov.surfaceType);
            return (
              <Line
                key={`surf-${i}`}
                points={ov.points}
                closed
                fill={cfg.fill}
                opacity={cfg.opacity}
                stroke="transparent"
                strokeWidth={0}
              />
            );
          })}

          {/* Phantom (bridge crossing) overlays */}
          {phantomOverlays.map((ov, i) => (
            <React.Fragment key={`phantom-${i}`}>
              <Line points={ov.points} closed fill="#000000" opacity={0.55} stroke="transparent" strokeWidth={0} />
              <Line
                points={ov.points}
                closed
                fill="transparent"
                stroke={style.markers.cornerStroke}
                strokeWidth={2 / zoom}
                dash={[6 / zoom, 4 / zoom]}
                opacity={0.4}
              />
            </React.Fragment>
          ))}

          {/* Track body — thick filled center stroke */}
          {trackLines && (
            <Line
              points={trackLines.centerPoints}
              stroke={style.track.bodyFill}
              strokeWidth={trackWidthPx}
              lineJoin="round"
              lineCap="round"
              closed
              opacity={style.track.bodyOpacity}
            />
          )}

          {/* Race line arcs */}
          {raceLineArcs.map((arc, i) => (
            <Line
              key={`race-${i}`}
              points={arc.points}
              stroke={style.markers.raceLineStroke}
              strokeWidth={trackWidthPx * 0.05}
              lineCap="round"
              opacity={style.markers.raceLineOpacity}
            />
          ))}

          {/* Corner stripes */}
          {cornerStripes.map((arc, i) => (
            <Line
              key={`cstripe-${i}`}
              points={arc.points}
              stroke={style.markers.cornerStripeStroke}
              strokeWidth={halfWidth * 0.08}
              lineCap="round"
              dash={[halfWidth * 0.12, halfWidth * 0.08]}
            />
          ))}

          {/* Chicane stripes — inner and outer edges */}
          {chicaneStripes.map((arc, i) => (
            <React.Fragment key={`chistripe-${i}`}>
              <Line
                points={arc.innerPoints}
                stroke={style.markers.chicaneStripeStroke}
                strokeWidth={halfWidth * 0.08}
                lineCap="round"
                dash={[halfWidth * 0.12, halfWidth * 0.08]}
              />
              <Line
                points={arc.outerPoints}
                stroke={style.markers.chicaneStripeStroke}
                strokeWidth={halfWidth * 0.08}
                lineCap="round"
                dash={[halfWidth * 0.12, halfWidth * 0.08]}
              />
            </React.Fragment>
          ))}

          {/* Space ticks (spaceTicks is SpaceTick[][] — one array per segment) */}
          {spaceTicks.map((segTicks, si) =>
            segTicks.map((tick, ti) => (
              <Line
                key={`t-${si}-${ti}`}
                points={[tick.inner.x, tick.inner.y, tick.outer.x, tick.outer.y]}
                stroke={style.track.edgeStroke}
                strokeWidth={1 / zoom}
                opacity={0.3}
              />
            ))
          )}

          {/* Track edges — inner and outer lines */}
          {trackLines && (
            <>
              <Line
                points={trackLines.innerPoints}
                stroke={style.track.edgeStroke}
                strokeWidth={edgeW}
                lineJoin="round"
                lineCap="round"
                closed
              />
              <Line
                points={trackLines.outerPoints}
                stroke={style.track.edgeStroke}
                strokeWidth={edgeW}
                lineJoin="round"
                lineCap="round"
                closed
              />
            </>
          )}

          {/* Optional dashed center line */}
          {style.track.showCenterLine && trackLines && (
            <Line
              points={trackLines.centerPoints}
              stroke={style.track.centerStroke}
              strokeWidth={1 / zoom}
              lineJoin="round"
              lineCap="round"
              closed
              dash={[style.track.centerDash[0] / zoom, style.track.centerDash[1] / zoom]}
              opacity={0.55}
            />
          )}

          {/* Corner lines + labels */}
          {cornerLines.map((cl, idx) => (
            <Group key={cl.id}>
              <Line
                points={[cl.inner.x, cl.inner.y, cl.outer.x, cl.outer.y]}
                stroke={style.markers.cornerStroke}
                strokeWidth={halfWidth * 0.06}
                lineCap="round"
              />
              <Text
                x={cl.center.x + halfWidth * 0.4}
                y={cl.center.y - halfWidth * 0.3}
                text={`C${idx + 1}`}
                fill={style.markers.cornerLabelColor}
                fontSize={halfWidth * 0.55}
                fontStyle="bold"
              />
            </Group>
          ))}

          {/* Finish line + label */}
          {finishLine && (
            <Group>
              <Line
                points={[finishLine.inner.x, finishLine.inner.y, finishLine.outer.x, finishLine.outer.y]}
                stroke={style.markers.finishStroke}
                strokeWidth={halfWidth * 0.08}
                dash={[halfWidth * 0.1, halfWidth * 0.07]}
                lineCap="round"
              />
              <Text
                x={finishLine.center.x + halfWidth * 0.3}
                y={finishLine.center.y - halfWidth * 0.3}
                text="FINISH"
                fill={style.markers.finishLabelColor}
                fontSize={halfWidth * 0.5}
                fontStyle="bold"
              />
            </Group>
          )}

          {/* Legends lines */}
          {legendsLines.map((ll, i) => (
            <Line
              key={`ll-${i}`}
              points={[ll.inner.x, ll.inner.y, ll.outer.x, ll.outer.y]}
              stroke={style.markers.legendsStroke}
              strokeWidth={halfWidth * 0.06}
              dash={[halfWidth * 0.07, halfWidth * 0.05]}
              lineCap="round"
            />
          ))}

          {/* Speed lollipops */}
          {speedMarkers.map((m, i) => {
            const lo = style.lollipops;
            const strokeW = m.circleRadius * 0.07;
            const diameter = m.circleRadius * 2;

            // PNG badge: overlay the number on top of the image asset
            if (speedMarkerImg) {
              // PNG opening is at the bottom (90° in screen coords).
              // Rotate so the opening faces back toward the track edge.
              const openingAngleDeg = Math.atan2(
                m.stickStart.y - m.circleCenter.y,
                m.stickStart.x - m.circleCenter.x,
              ) * (180 / Math.PI);
              const badgeRotation = openingAngleDeg - 90;

              return (
                <Group key={`spd-${i}`}>
                  <Line
                    points={[m.stickStart.x, m.stickStart.y, m.circleCenter.x, m.circleCenter.y]}
                    stroke={lo.speedStroke}
                    strokeWidth={halfWidth * 0.04}
                    lineCap="round"
                  />
                  {/* Rotated group: opening faces the stick */}
                  <Group x={m.circleCenter.x} y={m.circleCenter.y} rotation={badgeRotation}>
                    <KonvaImage
                      image={speedMarkerImg}
                      x={-m.circleRadius}
                      y={-m.circleRadius}
                      width={diameter}
                      height={diameter}
                    />
                    <Text
                      x={-m.circleRadius}
                      y={-m.circleRadius}
                      width={diameter}
                      height={diameter}
                      text={String(m.speedLimit)}
                      fill={lo.speedLabelColor}
                      fontSize={m.circleRadius * 0.95}
                      fontStyle="bold"
                      align="center"
                      verticalAlign="middle"
                    />
                  </Group>
                </Group>
              );
            }

            // Gauge shape: arc ring with notch tick marks
            if (lo.speedMarkerShape === 'gauge') {
              // Opening direction: from circleCenter back toward the track edge
              const openingAngleDeg = Math.atan2(
                m.stickStart.y - m.circleCenter.y,
                m.stickStart.x - m.circleCenter.x,
              ) * (180 / Math.PI);
              // Small opening (~35°) — arc sweeps the remaining 325°
              const openingDeg = 35;
              const arcSweep = 360 - openingDeg;
              // Arc starts at half the opening past the gap center
              const arcStartDeg = openingAngleDeg + openingDeg / 2;
              // Thin ring: band is ~14% of radius
              const outerR = m.circleRadius * 0.81;
              const innerR = m.circleRadius * 0.67;
              // 9 evenly-spaced tick notches along the arc
              const TICK_COUNT = 9;
              const tickAngles: number[] = [];
              for (let t = 0; t <= TICK_COUNT; t++) {
                tickAngles.push(arcStartDeg + (arcSweep / TICK_COUNT) * t);
              }
              // Ticks extend slightly into and out of the ring
              const tickOuterR = outerR + m.circleRadius * 0.04;
              const tickInnerR = innerR + m.circleRadius * 0.04; // only cut from outside inward ~40% of band

              return (
                <Group key={`spd-${i}`}>
                  {/* Stick */}
                  <Line
                    points={[m.stickStart.x, m.stickStart.y, m.circleCenter.x, m.circleCenter.y]}
                    stroke={lo.speedStroke}
                    strokeWidth={halfWidth * 0.04}
                    lineCap="round"
                  />
                  <Group x={m.circleCenter.x} y={m.circleCenter.y}>
                    {/* Badge background circle */}
                    <Circle
                      radius={m.circleRadius}
                      fill={lo.speedFill}
                      stroke={lo.speedStroke}
                      strokeWidth={strokeW * 1.8}
                    />
                    {/* Gauge arc ring — thin filled band, 325° sweep */}
                    <Arc
                      innerRadius={innerR}
                      outerRadius={outerR}
                      angle={arcSweep}
                      rotation={arcStartDeg}
                      fill={lo.speedStroke}
                      stroke="transparent"
                      strokeWidth={0}
                    />
                    {/* Tick notches — cut from outer edge inward, in badge fill color */}
                    {tickAngles.map((angleDeg, ti) => (
                      <Group key={ti} rotation={angleDeg}>
                        <Line
                          points={[tickInnerR, 0, tickOuterR, 0]}
                          stroke={lo.speedFill}
                          strokeWidth={strokeW * 0.9}
                          lineCap="butt"
                        />
                      </Group>
                    ))}
                    {/* Speed number */}
                    <Text
                      x={-m.circleRadius}
                      y={-m.circleRadius}
                      width={m.circleRadius * 2}
                      height={m.circleRadius * 2}
                      text={String(m.speedLimit)}
                      fill={lo.speedLabelColor}
                      fontSize={m.circleRadius * 1.0}
                      fontStyle="bold"
                      align="center"
                      verticalAlign="middle"
                    />
                  </Group>
                </Group>
              );
            }

            // Default: plain filled circle
            return (
              <Group key={`spd-${i}`}>
                <Line
                  points={[m.stickStart.x, m.stickStart.y, m.circleCenter.x, m.circleCenter.y]}
                  stroke={lo.speedStroke}
                  strokeWidth={halfWidth * 0.04}
                  lineCap="round"
                />
                <Circle
                  x={m.circleCenter.x}
                  y={m.circleCenter.y}
                  radius={m.circleRadius}
                  fill={lo.speedFill}
                  stroke={lo.speedStroke}
                  strokeWidth={strokeW * 1.6}
                />
                <Text
                  x={m.circleCenter.x - m.circleRadius}
                  y={m.circleCenter.y - m.circleRadius}
                  width={m.circleRadius * 2}
                  height={m.circleRadius * 2}
                  text={String(m.speedLimit)}
                  fill={lo.speedLabelColor}
                  fontSize={m.circleRadius * 1.1}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            );
          })}

          {/* Legends lollipops */}
          {legendsMarkers.map((m, i) => {
            const lo = style.lollipops;
            const diameter = m.circleRadius * 2;

            // PNG badge: render the image directly, no text overlay
            if (legendsMarkerImg) {
              const openingAngleDeg = Math.atan2(
                m.stickStart.y - m.circleCenter.y,
                m.stickStart.x - m.circleCenter.x,
              ) * (180 / Math.PI);
              const badgeRotation = openingAngleDeg - 90;

              return (
                <Group key={`lm-${i}`}>
                  <Line
                    points={[m.stickStart.x, m.stickStart.y, m.circleCenter.x, m.circleCenter.y]}
                    stroke={lo.legendsStroke}
                    strokeWidth={halfWidth * 0.04}
                    lineCap="round"
                  />
                  <Group x={m.circleCenter.x} y={m.circleCenter.y} rotation={badgeRotation}>
                    <KonvaImage
                      image={legendsMarkerImg}
                      x={-m.circleRadius}
                      y={-m.circleRadius}
                      width={diameter}
                      height={diameter}
                    />
                  </Group>
                </Group>
              );
            }

            // Fallback: plain circle with "L" label
            return (
              <Group key={`lm-${i}`}>
                <Line
                  points={[m.stickStart.x, m.stickStart.y, m.circleCenter.x, m.circleCenter.y]}
                  stroke={lo.legendsStroke}
                  strokeWidth={halfWidth * 0.04}
                  lineCap="round"
                />
                <Circle
                  x={m.circleCenter.x}
                  y={m.circleCenter.y}
                  radius={m.circleRadius}
                  fill={lo.legendsFill}
                  stroke={lo.legendsStroke}
                  strokeWidth={halfWidth * 0.03}
                />
                <Text
                  x={m.circleCenter.x - m.circleRadius}
                  y={m.circleCenter.y - m.circleRadius}
                  width={diameter}
                  height={diameter}
                  text="L"
                  fill={lo.legendsLabelColor}
                  fontSize={m.circleRadius * 1.1}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            );
          })}

          {/* Countdown / condition markers */}
          {countdownMarkerVisuals.map((m, i) => {
            // Fallback: diamond shape
            const S    = halfWidth * 0.35;
            const half = S / 2;
            return (
              <Group key={`cd-${i}`} x={m.point.x} y={m.point.y}>
                <Group rotation={45}>
                  <Rect
                    x={-(half + S * 0.1)}
                    y={-(half + S * 0.1)}
                    width={(half + S * 0.1) * 2}
                    height={(half + S * 0.1) * 2}
                    fill={style.lollipops.countdownStroke}
                  />
                  <Rect
                    x={-half}
                    y={-half}
                    width={S}
                    height={S}
                    fill={style.lollipops.countdownFill}
                  />
                </Group>
                <Text
                  x={-half}
                  y={-half}
                  width={S}
                  height={S}
                  text={m.label}
                  fill={style.lollipops.speedLabelColor}
                  fontSize={S * 0.55}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            );
          })}

          {/* Condition markers (S/C tiles) — PNG building or fallback colored box */}
          {conditionMarkers.map(m => {
            const imgSize = halfWidth * 1.90;
            const half = imgSize / 2;

            if (conditionMarkerImg) {
              return (
                <Group key={m.id} x={m.x} y={m.y} rotation={m.rotation}>
                  <KonvaImage
                    image={conditionMarkerImg}
                    x={-half}
                    y={-half}
                    width={imgSize}
                    height={imgSize}
                  />
                </Group>
              );
            }

            // Fallback: colored box with label
            const fill =
              m.type === 'sector'  ? '#f59e0b' :
              m.type === 'chicane' ? '#3b82f6' : '#ef4444';
            const boxSize = halfWidth * 1.0;
            const boxHalf = boxSize / 2;
            return (
              <Group key={m.id} x={m.x} y={m.y}>
                <Group rotation={m.rotation}>
                  <Rect
                    x={-boxHalf} y={-boxHalf}
                    width={boxSize} height={boxSize}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={halfWidth * 0.025}
                    cornerRadius={halfWidth * 0.02}
                  />
                  <Text
                    x={-boxHalf} y={-boxHalf}
                    width={boxSize} height={boxSize}
                    text={m.label}
                    fill="#ffffff"
                    fontSize={boxSize * 0.5}
                    fontStyle="bold"
                    align="center"
                    verticalAlign="middle"
                  />
                </Group>
              </Group>
            );
          })}

        </Group>
      </Layer>
    </Stage>
  );
};
