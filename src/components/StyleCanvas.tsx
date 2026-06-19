import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import podiumTallUrl from '../assets/podium_tall.png';
import podiumSquareUrl from '../assets/podium_square.png';
import weatherHolderUrl from '../assets/weather_holder.png';
import trackStatsUrl from '../assets/track_stats.png';
import noSlipFinishUrl from '../assets/no_slip_finish.png';
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
  buildSectorCountdownNumbers,
  buildStartingGridRows,
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
    meta,
    conditionMarkers,
    podiumSlots,
    weatherToken,
    trackStats,
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
  const [podiumImg, setPodiumImg] = useState<HTMLImageElement | null>(null);
  const [weatherHolderImg, setWeatherHolderImg] = useState<HTMLImageElement | null>(null);
  const [trackStatsImg, setTrackStatsImg] = useState<HTMLImageElement | null>(null);
  const [noSlipImg, setNoSlipImg] = useState<HTMLImageElement | null>(null);

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

  useEffect(() => {
    const src = style.lollipops.podiumGraphic === 'square' ? podiumSquareUrl : podiumTallUrl;
    const img = new window.Image();
    img.src = src;
    img.onload = () => setPodiumImg(img);
  }, [style.lollipops.podiumGraphic]);

  useEffect(() => {
    const img = new window.Image();
    img.src = weatherHolderUrl;
    img.onload = () => setWeatherHolderImg(img);
  }, []);

  useEffect(() => {
    const img = new window.Image();
    img.src = trackStatsUrl;
    img.onload = () => setTrackStatsImg(img);
  }, []);

  useEffect(() => {
    const img = new window.Image();
    img.src = noSlipFinishUrl;
    img.onload = () => setNoSlipImg(img);
  }, []);

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

  const sectorCountdownNumbers = useMemo(
    () => (samples.length >= 4
      ? buildSectorCountdownNumbers(samples, computed, segmentData, SAMPLES_PER_EDGE, halfWidth, nodes)
      : []),
    [samples, computed, segmentData, halfWidth, nodes],
  );

  const startingGridRows = useMemo(
    () => (samples.length >= 4
      ? buildStartingGridRows(samples, nodes, segmentData, SAMPLES_PER_EDGE)
      : []),
    [samples, nodes, segmentData],
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

  // World-space edge width — scales with zoom like track body/race line/etc.
  // Calibrated so appearance matches at zoom=1 (≈ edgeWidth×2 screen px at typical halfWidth).
  const edgeW = style.track.edgeWidth * halfWidth * 0.018;

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

          {/* Track edges — inner and outer lines (rendered before curbing so curbing sits on top) */}
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

          {/* Race line arcs */}
          {raceLineArcs.map((arc, i) => (
            <Line
              key={`race-${i}`}
              points={arc.points}
              stroke={style.markers.raceLineStroke}
              strokeWidth={trackWidthPx * style.markers.raceLineWidth}
              lineCap="round"
              opacity={style.markers.raceLineOpacity}
            />
          ))}

          {/* Corner curbing — alternating squares (solid base + white dash overlay) */}
          {cornerStripes.map((arc, i) => {
            const sw = halfWidth * 0.13;  // stripe width = square height
            const sq = sw;                // dash length ≈ width → square
            return (
              <React.Fragment key={`cstripe-${i}`}>
                <Line points={arc.points} stroke={style.markers.cornerStripeStroke}
                  strokeWidth={sw} lineCap="butt" lineJoin="miter" />
                <Line points={arc.points} stroke="#ffffff"
                  strokeWidth={sw} lineCap="butt" lineJoin="miter"
                  dash={[sq, sq]} />
              </React.Fragment>
            );
          })}

          {/* Chicane curbing — blue/white alternating squares on inner and outer edges */}
          {chicaneStripes.map((arc, i) => {
            const sw = halfWidth * 0.13;
            const sq = sw;
            return (
              <React.Fragment key={`chistripe-${i}`}>
                <Line points={arc.innerPoints} stroke={style.markers.chicaneStripeStroke}
                  strokeWidth={sw} lineCap="butt" lineJoin="miter" />
                <Line points={arc.innerPoints} stroke="#ffffff"
                  strokeWidth={sw} lineCap="butt" lineJoin="miter"
                  dash={[sq, sq]} />
                <Line points={arc.outerPoints} stroke={style.markers.chicaneStripeStroke}
                  strokeWidth={sw} lineCap="butt" lineJoin="miter" />
                <Line points={arc.outerPoints} stroke="#ffffff"
                  strokeWidth={sw} lineCap="butt" lineJoin="miter"
                  dash={[sq, sq]} />
              </React.Fragment>
            );
          })}

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

          {/* Space countdown numbers — placed at space center, respecting countdownSide */}
          {sectorCountdownNumbers.map((n, i) => {
            // Inner side needs a 180° flip relative to outer so both face the track
            let rotDeg = Math.atan2(n.tangent.y, n.tangent.x) * (180 / Math.PI);
            if (n.dir === -1) rotDeg += 180;
            if (rotDeg > 90) rotDeg -= 180;
            else if (rotDeg < -90) rotDeg += 180;
            const fontSize = halfWidth * 0.48;
            return (
              <Group key={`sn-${i}`} x={n.point.x} y={n.point.y} rotation={rotDeg}>
                <Text
                  x={-fontSize * 1.2}
                  y={-fontSize * 0.6}
                  width={fontSize * 2.4}
                  height={fontSize * 1.2}
                  text={n.label}
                  fill={style.track.edgeStroke}
                  fontSize={fontSize}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            );
          })}

          {/* Optional dashed center line */}
          {style.track.showCenterLine && trackLines && (
            <Line
              points={trackLines.centerPoints}
              stroke={style.track.centerStroke}
              strokeWidth={style.track.centerLineWidth * halfWidth * 0.008}
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

          {/* No-slip finish graphic — outside track on non-race-line side of finish */}
          {noSlipImg && finishLine && startingGridRows.length > 0 && (() => {
            const { inner, outer, center } = finishLine;
            // Derive unit normal from inner→outer direction
            const nx = (outer.x - inner.x) / (2 * halfWidth);
            const ny = (outer.y - inner.y) / (2 * halfWidth);
            // Tangent: 90° CCW from normal
            const tx = -ny;
            const ty =  nx;
            // Place on the side OPPOSITE to the race line
            const oppSide = -startingGridRows[0].raceLineSide;
            const imgW = halfWidth * 3;
            const imgH = imgW * (noSlipImg.naturalHeight / noSlipImg.naturalWidth);
            // Center of image: halfWidth * 2 from track center on the opposite side
            const px = center.x + nx * oppSide * halfWidth * 2;
            const py = center.y + ny * oppSide * halfWidth * 2;
            const rotDeg = Math.atan2(ty, tx) * (180 / Math.PI);
            return (
              <Group x={px} y={py} rotation={rotDeg}>
                <KonvaImage
                  image={noSlipImg}
                  x={-imgW / 2}
                  y={-imgH / 2}
                  width={imgW}
                  height={imgH}
                  listening={false}
                />
              </Group>
            );
          })()}

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
            // S = half-side of the rotated square (diamond extends S*√2 from center)
            const S   = halfWidth * 0.228;            // 60% of original 0.38
            const bw  = S * 0.18;                   // black border extra width
            const rv  = bw * 0.75;                  // rivet radius
            const cr  = S * 0.16;                   // corner radius on the inner rect
            const crB = (S + bw) * 0.16;            // corner radius on the border rect
            const crW = crB;                         // white matches black size

            // Each chevron layer = a black backing + white face slightly in front
            const chevStep   = S * 0.7;          // distance between each stacked layer
            const whiteInset = chevStep * 0.65;     // white is 1/3 of chevStep in front of its black
            const cox = 0;

            // +90° so flat edge faces the track; text counter-rotated to stay readable
            const trackAngleDeg = Math.atan2(m.tangent.y, m.tangent.x) * (180 / Math.PI);
            const outerRot = trackAngleDeg + 45;

            return (
              <Group key={`cd-${i}`} x={m.point.x} y={m.point.y} rotation={outerRot}>

                {/* ── Chevrons: one set per aggression level, rendered back-to-front ── */}
                {m.aggression > 0 && Array.from(
                  { length: m.aggression },
                  (_, i) => m.aggression - i,   // renders furthest layer first
                ).map(ci => (
                  <React.Fragment key={`chev-${ci}`}>
                    {/* Black diamond — backing for this layer */}
                    <Group x={cox} y={-chevStep * ci} rotation={45}>
                      <Rect
                        x={-(S + bw)} y={-(S + bw)}
                        width={(S + bw) * 2} height={(S + bw) * 2}
                        fill="#000000" cornerRadius={crB}
                      />
                    </Group>
                    {/* White diamond — same size as black, just in front of its black */}
                    <Group x={cox} y={-chevStep * ci + whiteInset} rotation={45}>
                      <Rect
                        x={-(S + bw)} y={-(S + bw)}
                        width={(S + bw) * 2} height={(S + bw) * 2}
                        fill="#ffffff" cornerRadius={crW}
                      />
                    </Group>
                  </React.Fragment>
                ))}

                {/* ── Main diamond ── */}
                <Group rotation={45}>
                  {/* Black border */}
                  <Rect
                    x={-(S + bw)} y={-(S + bw)}
                    width={(S + bw) * 2} height={(S + bw) * 2}
                    fill="#000000" cornerRadius={crB}
                  />
                  {/* Orange fill */}
                  <Rect
                    x={-S} y={-S}
                    width={S * 2} height={S * 2}
                    fill={style.lollipops.countdownFill} cornerRadius={cr}
                  />
                </Group>

                {/* Rivets — inset inside the orange fill, clear of the border */}
                <Circle x={0} y={-(S * Math.SQRT2 * 0.72)} radius={rv} fill="#000000" />
                <Circle x={0} y={ (S * Math.SQRT2 * 0.72)} radius={rv} fill="#000000" />

                {/* Number — rotates with the marker */}
                <Text
                  x={-S} y={-S}
                  width={S * 2} height={S * 2}
                  text={m.label}
                  fill="#000000"
                  fontSize={S * 1.55}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            );
          })}

          {/* Starting grid — ] bracket cradles each position number, race line side is odd */}
          {startingGridRows.map(row => {
            const { rank1, rank2, crossline: cp, tangent: t, normal: n, raceLineSide: rls } = row;
            const color  = style.track.edgeStroke;
            const sw     = style.track.edgeWidth * halfWidth * 0.018; // world-space, matches edgeW
            const armLen = halfWidth * 0.10; // 5% of ~2*halfWidth space length
            const fs     = halfWidth * 0.38;

            // Text rotation: perpendicular to track, no anti-flip so ±90 stays distinct
            const rotDeg = Math.atan2(t.y, t.x) * (180 / Math.PI) + 90;

            const renderPosition = (rank: number, side: 1 | -1, offsetBack: number) => {
              // Bar center: at crossline, shifted into the space and into the lane
              const barX = cp.x - t.x * offsetBack + n.x * halfWidth * 0.5 * side;
              const barY = cp.y - t.y * offsetBack + n.y * halfWidth * 0.5 * side;

              // Bar endpoints: 10%→90% of lane width (80% centered)
              const b1 = { x: barX + n.x * side * halfWidth * (-0.4), y: barY + n.y * side * halfWidth * (-0.4) };
              const b2 = { x: barX + n.x * side * halfWidth * ( 0.4), y: barY + n.y * side * halfWidth * ( 0.4) };

              // Arm endpoints: -tangent from each bar end
              const a1 = { x: b1.x - t.x * armLen, y: b1.y - t.y * armLen };
              const a2 = { x: b2.x - t.x * armLen, y: b2.y - t.y * armLen };

              // Label: ~half-space behind the crossline, in the lane center
              const lblX = cp.x - t.x * halfWidth + n.x * halfWidth * 0.5 * side;
              const lblY = cp.y - t.y * halfWidth + n.y * halfWidth * 0.5 * side;

              return (
                <React.Fragment key={`sg-${rank}`}>
                  <Line points={[b1.x, b1.y, b2.x, b2.y]} stroke={color} strokeWidth={sw} lineCap="square" listening={false} />
                  <Line points={[b1.x, b1.y, a1.x, a1.y]} stroke={color} strokeWidth={sw} lineCap="square" listening={false} />
                  <Line points={[b2.x, b2.y, a2.x, a2.y]} stroke={color} strokeWidth={sw} lineCap="square" listening={false} />
                  <Group x={lblX} y={lblY} rotation={rotDeg}>
                    <Text x={-fs} y={-fs * 0.65} width={fs * 2} height={fs * 1.3}
                      text={String(rank)} fill={color} fontSize={fs}
                      fontStyle="bold" align="center" verticalAlign="middle" listening={false} />
                  </Group>
                </React.Fragment>
              );
            };

            return (
              <React.Fragment key={`sgr-${rank1}`}>
                {renderPosition(rank1, rls,            halfWidth * 0.18)}
                {renderPosition(rank2, -rls as 1|-1,  halfWidth * 0.38)}
              </React.Fragment>
            );
          })}

          {/* Podium graphic — rendered at rank-1 slot position; only when slots are defined */}
          {podiumImg && podiumSlots.length > 0 && (() => {
            const slot = podiumSlots.find(s => s.rank === 1) ?? podiumSlots[0];
            // Initial scale: 8× the half-track-width wide; square is 90% of that
            const imgW = halfWidth * 8 * (style.lollipops.podiumGraphic === 'square' ? 0.9 : 1.0);
            const imgH = imgW * (podiumImg.naturalHeight / podiumImg.naturalWidth);
            // Offsets so rank-1 box aligns with the placed slot
            const isTall  = style.lollipops.podiumGraphic === 'tall';
            const xOff = isTall ? 0          : imgW * 0.30;
            const yOff = isTall ? imgH * 0.35 : imgH * 0.25;
            return (
              <Group x={slot.x} y={slot.y} rotation={slot.rotation}>
                <KonvaImage
                  image={podiumImg}
                  x={-imgW / 2 + xOff}
                  y={-imgH / 2 + yOff}
                  width={imgW}
                  height={imgH}
                />
              </Group>
            );
          })()}

          {/* Weather holder — with StartingHeat and StartingStress overlaid on the cards */}
          {weatherHolderImg && weatherToken && (() => {
            const ww = weatherToken.width * 1.4;
            const wh = ww * (weatherHolderImg.naturalHeight / weatherHolderImg.naturalWidth);
            const xOff = -ww * 0.60;
            const imgLeft = weatherToken.x + xOff;
            const imgTop  = weatherToken.y - wh / 2;
            const fs = wh * 0.28; // doubled font size
            const cardX = imgLeft + ww * 0.06; // shifted right
            const cardW = ww * 0.14;
            return (
              <Group>
                <KonvaImage image={weatherHolderImg} x={imgLeft} y={imgTop} width={ww} height={wh} listening={false} />
                {/* StartingHeat — orange card (top of left column, ~6–47% height) */}
                <Text
                  x={cardX} y={imgTop + wh * 0.07}
                  width={cardW} height={wh * 0.41}
                  text={String(meta.heat)}
                  fill="#ffffff" stroke="#000000" strokeWidth={fs * 0.02}
                  fontSize={fs} fontStyle="bold"
                  align="center" verticalAlign="middle" listening={false}
                />
                {/* StartingStress — yellow card (bottom of left column, ~53–93% height) */}
                <Text
                  x={cardX} y={imgTop + wh * 0.51}
                  width={cardW} height={wh * 0.40}
                  text={String(meta.stress)}
                  fill="#ffffff" stroke="#000000" strokeWidth={fs * 0.02}
                  fontSize={fs} fontStyle="bold"
                  align="center" verticalAlign="middle" listening={false}
                />
              </Group>
            );
          })()}

          {/* Track stats graphic — with laps, totalSpaces, corners overlaid */}
          {trackStatsImg && trackStats && (() => {
            const ww = trackStats.width;
            const wh = ww * (trackStatsImg.naturalHeight / trackStatsImg.naturalWidth);
            const imgLeft = trackStats.x - ww / 2;
            const imgTop  = trackStats.y - wh / 2;
            const totalSpaces = computed.reduce((s, seg) => s + seg.spaces, 0);
            const cornerCount = computed.length;
            const fs = wh * 0.50;
            return (
              <Group>
                <KonvaImage image={trackStatsImg} x={imgLeft} y={imgTop} width={ww} height={wh} listening={false} />
                {/* Laps — inside arrow circle, left section (~0–21% width) */}
                <Text
                  x={imgLeft + ww * 0.05} y={imgTop + wh * 0.20}
                  width={ww * 0.20} height={wh * 0.84}
                  text={String(meta.laps)}
                  fill="#1a1a1a" fontSize={fs} fontStyle="bold"
                  align="center" verticalAlign="middle" listening={false}
                />
                {/* Total spaces — cream center box (~22–60% width) */}
                <Text
                  x={imgLeft + ww * 0.32} y={imgTop + wh * 0.04}
                  width={ww * 0.38} height={wh * 0.55}
                  text={String(totalSpaces)}
                  fill="#1a1a1a" fontSize={fs} fontStyle="bold"
                  align="center" verticalAlign="middle" listening={false}
                />
                {/* Corners — speed dial, right section (~67–97% width) */}
                <Text
                  x={imgLeft + ww * 0.71} y={imgTop + wh * 0.15}
                  width={ww * 0.30} height={wh * 0.84}
                  text={String(cornerCount)}
                  fill="#f0ece0" fontSize={fs} fontStyle="bold"
                  align="center" verticalAlign="middle" listening={false}
                />
              </Group>
            );
          })()}

          {/* Condition markers (S/C tiles) — chicane gets checkered border, others use PNG/fallback */}
          {conditionMarkers.map(m => {
            const imgSize = halfWidth * 1.90;
            const half = imgSize / 2;

            // ── PNG building + optional checkered border for chicane ─────────
            if (conditionMarkerImg) {
              const sw    = imgSize * 0.10;   // border stripe width = square height
              const sq    = sw;               // dash → square
              const color = style.markers.chicaneStripeStroke;
              return (
                <Group key={m.id} x={m.x} y={m.y} rotation={m.rotation}>
                  {/* Checkered border for chicane only — drawn first so PNG renders on top */}
                  {m.type === 'chicane' && (
                    <>
                      <Rect x={-half} y={-half} width={imgSize} height={imgSize}
                        stroke={color} strokeWidth={sw} fill="transparent" />
                      <Rect x={-half} y={-half} width={imgSize} height={imgSize}
                        stroke="#ffffff" strokeWidth={sw} fill="transparent"
                        dash={[sq, sq]} />
                    </>
                  )}
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
            const fill = m.type === 'sector' ? '#f59e0b' : '#ef4444';
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
