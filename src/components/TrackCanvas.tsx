import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useEditorStore, computeSegments } from '../store/editorStore';
import { sampleSpline, nearestSampleIndex } from '../lib/spline';
import {
  buildTrackLines,
  buildCornerLines,
  buildSpaceTicks,
  buildFinishLine,
  buildLegendsLines,
  buildSectorHighlightPolygon,
  buildRaceLineArcs,
  buildCornerStripes,
  buildChicaneStripes,
  buildSpeedMarkers,
  buildSurfaceOverlays,
  buildSpacePolygon,
  buildLegendsMarkers,
  buildCountdownMarkers,
  buildSectorCountdownNumbers,
  buildPhantomOverlays,
  SURFACE_COLORS,
} from '../lib/trackGeometry';

const SAMPLES_PER_EDGE = 16;
const TRACK_HIT_EXTRA = 12;
const NODE_RADIUS = 6;
const CORNER_RADIUS = 9;
const FIRST_NODE_RADIUS = 9;
const TILE_SIZE = 2048;

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export const TrackCanvas: React.FC<Props> = ({ stageRef }) => {
  const {
    nodes,
    loopClosed,
    trackWidthPct,
    segmentData,
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
    tool,
    zoom,
    panX,
    panY,
    showGrid,
    showSpline,
    selectedNodeIds,
    selectedSegmentId,
    spaceInput,
    appendNode,
    closeLoop,
    updateNodePosition,
    insertNodeOnEdge,
    selectNode,
    clearSelection,
    paintSpace,
    setZoom,
    setPan,
    snapshot,
    conditionMarkers,
    updateConditionMarkerPosition,
    updateConditionMarkerRotation,
    commitConditionMarkerDrag,
    setBackgroundTransform,
    activeSurfaceSide,
  } = useEditorStore();

  // Width in world pixels. Reference is one tile (2048 px = 28.5 cm) so the
  // percentage is purely physical and never depends on how many tiles the grid has.
  const trackWidthPx = (trackWidthPct / 100) * TILE_SIZE;
  const halfWidth = trackWidthPx / 2;

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number; afterNodeId: string } | null>(null);
  const [hoveredSpaceNodeId, setHoveredSpaceNodeId] = useState<string | null>(null);
  const hoveredSpaceNodeIdRef = useRef<string | null>(null);
  const rotateCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPanning = useRef(false);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const didPan = useRef(false);
  const draggingNodeId = useRef<string | null>(null);
  const dragHasMoved = useRef(false);
  const isScaling = useRef(false);

  useEffect(() => {
    if (!backgroundImage) { setBgImage(null); return; }
    const img = new window.Image();
    img.src = backgroundImage;
    img.onload = () => setBgImage(img);
  }, [backgroundImage]);

  const nodePoints = useMemo(() => nodes.map(nd => ({ x: nd.x, y: nd.y })), [nodes]);

  const samples = useMemo(
    () => (loopClosed && nodes.length >= 2 ? sampleSpline(nodePoints, SAMPLES_PER_EDGE) : []),
    [nodePoints, loopClosed]
  );

  const computed = useMemo(() => computeSegments(nodes), [nodes]);

  const selectedSegIndex = useMemo(() => {
    const sd = segmentData.find(d => d.id === selectedSegmentId);
    if (!sd) return -1;
    return computed.findIndex(c => c.startNodeId === sd.startNodeId);
  }, [selectedSegmentId, segmentData, computed]);

  const trackLines = useMemo(
    () => (samples.length >= 4 ? buildTrackLines(samples, halfWidth) : null),
    [samples, halfWidth]
  );

  const cornerLines = useMemo(
    () => (samples.length >= 4 ? buildCornerLines(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth]
  );

  const spaceTicks = useMemo(() => {
    if (!showGrid || samples.length < 4) return [];
    return buildSpaceTicks(samples, nodes, SAMPLES_PER_EDGE, halfWidth);
  }, [showGrid, samples, nodes, halfWidth]);

  const finishLine = useMemo(
    () => (samples.length >= 4 ? buildFinishLine(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : null),
    [samples, nodes, halfWidth]
  );

  const legendsLines = useMemo(
    () => (samples.length >= 4 ? buildLegendsLines(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth]
  );

  const legendsMarkers = useMemo(
    () => (samples.length >= 4 ? buildLegendsMarkers(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth]
  );

  const countdownMarkerVisuals = useMemo(
    () => (samples.length >= 4
      ? buildCountdownMarkers(samples, computed, segmentData, SAMPLES_PER_EDGE, halfWidth, nodes)
      : []),
    [samples, computed, segmentData, halfWidth, nodes]
  );

  const sectorCountdownNumbers = useMemo(
    () => (samples.length >= 4
      ? buildSectorCountdownNumbers(samples, computed, segmentData, SAMPLES_PER_EDGE, halfWidth, nodes)
      : []),
    [samples, computed, segmentData, halfWidth, nodes]
  );

  const phantomOverlays = useMemo(
    () => (samples.length >= 4 ? buildPhantomOverlays(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth]
  );

  const raceLineArcs = useMemo(
    () => (samples.length >= 4 ? buildRaceLineArcs(samples, nodes, SAMPLES_PER_EDGE, segmentData, halfWidth) : []),
    [samples, nodes, segmentData, halfWidth]
  );

  const cornerStripes = useMemo(
    () => (samples.length >= 4 ? buildCornerStripes(samples, nodes, SAMPLES_PER_EDGE, segmentData, halfWidth) : []),
    [samples, nodes, segmentData, halfWidth]
  );

  const chicaneStripes = useMemo(
    () => (samples.length >= 4 ? buildChicaneStripes(samples, nodes, SAMPLES_PER_EDGE, segmentData, halfWidth) : []),
    [samples, nodes, segmentData, halfWidth]
  );

  const speedMarkers = useMemo(
    () => (samples.length >= 4 ? buildSpeedMarkers(samples, nodes, SAMPLES_PER_EDGE, halfWidth) : []),
    [samples, nodes, halfWidth]
  );

  const surfaceOverlays = useMemo(
    () => (samples.length >= 4
      ? buildSurfaceOverlays(samples, nodes, SAMPLES_PER_EDGE, halfWidth)
      : []),
    [samples, nodes, halfWidth]
  );

  const hoveredSpacePolygon = useMemo(() => {
    if (!hoveredSpaceNodeId || tool !== 'surface' || samples.length < 4) return null;
    const ni = nodes.findIndex(nd => nd.id === hoveredSpaceNodeId);
    if (ni === -1) return null;
    return buildSpacePolygon(samples, ni, SAMPLES_PER_EDGE, halfWidth, samples.length, activeSurfaceSide);
  }, [hoveredSpaceNodeId, tool, samples, nodes, halfWidth, activeSurfaceSide]);

  const sectorHighlight = useMemo(() => {
    if (selectedSegIndex === -1 || samples.length < 4) return null;
    const seg = computed[selectedSegIndex];
    return buildSectorHighlightPolygon(
      samples, nodes, SAMPLES_PER_EDGE,
      seg.startNodeIndex, seg.endNodeIndex,
      halfWidth
    );
  }, [selectedSegIndex, computed, samples, nodes, halfWidth]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({ x: (sx - panX) / zoom, y: (sy - panY) / zoom }),
    [panX, panY, zoom]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number) => ({ x: wx * zoom + panX, y: wy * zoom + panY }),
    [panX, panY, zoom]
  );

  // Derived background geometry for scale handle position
  const bgRight = backgroundX + backgroundSize.width * backgroundScale;
  const bgBottom = backgroundY + backgroundSize.height * backgroundScale;

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanning.current && panStart.current) {
        const dx = e.evt.clientX - panStart.current.mx;
        const dy = e.evt.clientY - panStart.current.my;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didPan.current = true;
        setPan(panStart.current.px + dx, panStart.current.py + dy);
        return;
      }

      const stage = e.target.getStage()!;
      const sp = stage.getPointerPosition()!;
      if (!sp) return;
      const world = screenToWorld(sp.x, sp.y);
      setCursorWorld(world);

      // Background scale-handle drag
      if (isScaling.current) {
        const dx = world.x - backgroundX;
        const newScale = Math.max(0.01, dx / backgroundSize.width);
        setBackgroundTransform(backgroundX, backgroundY, newScale);
        return;
      }

      // In background mode, skip track hover logic
      if (tool === 'background') return;

      if (loopClosed && samples.length >= 4) {
        const si = nearestSampleIndex(samples, world.x, world.y);
        const nearest = samples[si];
        const dx = nearest.point.x - world.x;
        const dy = nearest.point.y - world.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const threshold = halfWidth + TRACK_HIT_EXTRA / zoom;
        const edgeIdx = Math.floor(si / SAMPLES_PER_EDGE) % nodes.length;
        const onTrack = dist < threshold;

        if (tool === 'edit') {
          if (onTrack) {
            const afterNodeId = nodes[edgeIdx]?.id;
            if (afterNodeId) setGhostPos({ x: nearest.point.x, y: nearest.point.y, afterNodeId });
          } else {
            setGhostPos(null);
          }
          hoveredSpaceNodeIdRef.current = null;
          setHoveredSpaceNodeId(null);
        } else if (tool === 'surface') {
          setGhostPos(null);
          const id = onTrack ? (nodes[edgeIdx]?.id ?? null) : null;
          hoveredSpaceNodeIdRef.current = id;
          setHoveredSpaceNodeId(id);
        }
      } else {
        setGhostPos(null);
        hoveredSpaceNodeIdRef.current = null;
        setHoveredSpaceNodeId(null);
      }
    },
    [
      setPan, screenToWorld, loopClosed, samples, tool, halfWidth, zoom, nodes,
      backgroundX, backgroundY, backgroundSize, setBackgroundTransform,
    ]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    panStart.current = null;
    isScaling.current = false;
  }, []);

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button !== 0) return;
      if (e.target === e.target.getStage()) {
        isPanning.current = true;
        didPan.current = false;
        panStart.current = { mx: e.evt.clientX, my: e.evt.clientY, px: panX, py: panY };
      }
    },
    [panX, panY]
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (didPan.current) { didPan.current = false; return; }
      if (e.target !== e.target.getStage()) return;

      const stage = e.target.getStage()!;
      const sp = stage.getPointerPosition()!;
      if (!sp) return;
      const pos = screenToWorld(sp.x, sp.y);

      if (tool === 'background') return;

      if (!loopClosed) {
        appendNode(pos.x, pos.y);
        return;
      }

      if (tool === 'surface') {
        const id = hoveredSpaceNodeIdRef.current;
        if (id) paintSpace(id);
        return;
      }

      if (tool === 'edit' && ghostPos && !e.evt.shiftKey) {
        insertNodeOnEdge(ghostPos.afterNodeId, ghostPos.x, ghostPos.y);
        setGhostPos(null);
        return;
      }

      if (!e.evt.shiftKey) {
        clearSelection();
      }
    },
    [loopClosed, appendNode, tool, ghostPos, insertNodeOnEdge, screenToWorld, clearSelection]
  );

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = e.target.getStage()!;
      const pointer = stage.getPointerPosition()!;
      const factor = e.evt.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.1, Math.min(5, zoom * factor));
      const worldX = (pointer.x - panX) / zoom;
      const worldY = (pointer.y - panY) / zoom;
      setZoom(newZoom);
      setPan(pointer.x - worldX * newZoom, pointer.y - worldY * newZoom);
    },
    [zoom, panX, panY, setZoom, setPan]
  );

  const handleNodeMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, nodeId: string) => {
      e.cancelBubble = true;
      if (e.evt.button !== 0) return;

      if (e.evt.shiftKey) {
        selectNode(nodeId);
        return;
      }

      draggingNodeId.current = nodeId;
      dragHasMoved.current = false;
    },
    [selectNode]
  );

  const handleNodeDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, nodeId: string) => {
      dragHasMoved.current = true;
      updateNodePosition(nodeId, e.target.x(), e.target.y());
    },
    [updateNodePosition]
  );

  const handleNodeDragEnd = useCallback(
    (_e: Konva.KonvaEventObject<DragEvent>, _nodeId: string) => {
      if (dragHasMoved.current) snapshot();
      draggingNodeId.current = null;
      dragHasMoved.current = false;
    },
    [snapshot]
  );

  const handleFirstNodeClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (!loopClosed && nodes.length >= 3) closeLoop();
    },
    [loopClosed, nodes.length, closeLoop]
  );

  const spaceInputScreenPos = useMemo(() => {
    if (selectedNodeIds.length !== 2) return null;
    const a = nodes.find(n => n.id === selectedNodeIds[0]);
    const b = nodes.find(n => n.id === selectedNodeIds[1]);
    if (!a || !b) return null;
    return worldToScreen((a.x + b.x) / 2, (a.y + b.y) / 2);
  }, [selectedNodeIds, nodes, worldToScreen]);

  const cursorStyle = isPanning.current ? 'grabbing'
    : tool === 'surface' ? (hoveredSpaceNodeId ? 'pointer' : 'default')
    : tool === 'background' ? 'default'
    : 'crosshair';

  // Tile grid lines
  const tileGridLines = useMemo(() => {
    if (!showTileGrid) return null;
    const totalW = tileColumns * TILE_SIZE;
    const totalH = tileRows * TILE_SIZE;
    const vLines: number[][] = [];
    const hLines: number[][] = [];
    for (let col = 0; col <= tileColumns; col++) {
      vLines.push([col * TILE_SIZE, 0, col * TILE_SIZE, totalH]);
    }
    for (let row = 0; row <= tileRows; row++) {
      hLines.push([0, row * TILE_SIZE, totalW, row * TILE_SIZE]);
    }
    return { vLines, hLines, totalW, totalH };
  }, [showTileGrid, tileColumns, tileRows]);

  return (
    <div style={{ position: 'relative', width: canvasWidth, height: canvasHeight }}>
      <Stage
        ref={stageRef as React.RefObject<Konva.Stage>}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleStageClick}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: cursorStyle, background: '#1a1a2e', display: 'block' }}
      >
        {/* ── Background + Tile Grid ────────────────── */}
        <Layer>
          <Group x={panX} y={panY} scaleX={zoom} scaleY={zoom}>

            {/* Background image */}
            {bgImage && (
              <KonvaImage
                image={bgImage}
                x={backgroundX}
                y={backgroundY}
                width={backgroundSize.width * backgroundScale}
                height={backgroundSize.height * backgroundScale}
                opacity={backgroundOpacity}
                listening={tool === 'background'}
                draggable={tool === 'background'}
                onDragMove={e => {
                  setBackgroundTransform(e.target.x(), e.target.y(), backgroundScale);
                }}
                onDragEnd={e => {
                  setBackgroundTransform(e.target.x(), e.target.y(), backgroundScale);
                }}
              />
            )}

            {/* Tile grid overlay */}
            {tileGridLines && (
              <Group listening={false}>
                {tileGridLines.vLines.map((pts, i) => (
                  <Line
                    key={`vg-${i}`}
                    points={pts}
                    stroke="#22d3ee"
                    strokeWidth={1 / zoom}
                    opacity={i === 0 || i === tileColumns ? 0.5 : 0.25}
                  />
                ))}
                {tileGridLines.hLines.map((pts, i) => (
                  <Line
                    key={`hg-${i}`}
                    points={pts}
                    stroke="#22d3ee"
                    strokeWidth={1 / zoom}
                    opacity={i === 0 || i === tileRows ? 0.5 : 0.25}
                  />
                ))}
                {Array.from({ length: tileColumns }, (_, col) =>
                  Array.from({ length: tileRows }, (_, row) => (
                    <Text
                      key={`tl-${col}-${row}`}
                      x={col * TILE_SIZE + 10 / zoom}
                      y={row * TILE_SIZE + 8 / zoom}
                      text={`${col},${row}`}
                      fill="#22d3ee"
                      fontSize={13 / zoom}
                      opacity={0.45}
                    />
                  ))
                )}
              </Group>
            )}

            {/* Background mode: selection outline + scale handle */}
            {tool === 'background' && bgImage && (
              <Group listening={false}>
                <Rect
                  x={backgroundX}
                  y={backgroundY}
                  width={backgroundSize.width * backgroundScale}
                  height={backgroundSize.height * backgroundScale}
                  stroke="#22d3ee"
                  strokeWidth={1.5 / zoom}
                  fill="transparent"
                  dash={[8 / zoom, 4 / zoom]}
                />
              </Group>
            )}
            {tool === 'background' && bgImage && (
              <Circle
                x={bgRight}
                y={bgBottom}
                radius={7 / zoom}
                fill="#22d3ee"
                stroke="#0c4a6e"
                strokeWidth={2 / zoom}
                listening={true}
                onMouseDown={e => {
                  e.cancelBubble = true;
                  isScaling.current = true;
                }}
              />
            )}

          </Group>
        </Layer>

        {/* ── Track geometry ───────────────────────────── */}
        <Layer>
          <Group x={panX} y={panY} scaleX={zoom} scaleY={zoom}>

            {/* Build-mode chain */}
            {!loopClosed && nodes.length >= 2 && (
              <Line
                points={nodes.flatMap(nd => [nd.x, nd.y])}
                stroke="#39ff14" strokeWidth={2 / zoom}
                lineJoin="round" lineCap="round" opacity={0.5} listening={false}
              />
            )}
            {!loopClosed && nodes.length >= 1 && cursorWorld && (
              <Line
                points={[nodes[nodes.length - 1].x, nodes[nodes.length - 1].y, cursorWorld.x, cursorWorld.y]}
                stroke="#39ff14" strokeWidth={1 / zoom}
                dash={[6 / zoom, 4 / zoom]} opacity={0.4} listening={false}
              />
            )}

            {/* Track fill + edges */}
            {trackLines && showSpline && (
              <>
                <Line points={trackLines.centerPoints} stroke="#39ff14"
                  strokeWidth={trackWidthPx} lineJoin="round" lineCap="round"
                  closed opacity={0.18} listening={false} />
                <Line points={trackLines.innerPoints} stroke="#39ff14"
                  strokeWidth={2 / zoom} lineJoin="round" lineCap="round"
                  closed listening={false} />
                <Line points={trackLines.outerPoints} stroke="#39ff14"
                  strokeWidth={2 / zoom} lineJoin="round" lineCap="round"
                  closed listening={false} />
                <Line points={trackLines.centerPoints} stroke="#39ff14"
                  strokeWidth={1 / zoom} dash={[6 / zoom, 6 / zoom]}
                  lineJoin="round" lineCap="round" closed opacity={0.5} listening={false} />
              </>
            )}

            {/* Surface overlays */}
            {surfaceOverlays.map(ov => {
              const cfg = SURFACE_COLORS[ov.surfaceType];
              return (
                <Line
                  key={`surf-${ov.nodeId}`}
                  points={ov.points}
                  closed
                  fill={cfg.fill}
                  opacity={cfg.opacity}
                  listening={false}
                />
              );
            })}

            {/* Phantom space overlays — dark hatched fill + dashed border */}
            {phantomOverlays.map(ov => (
              <React.Fragment key={`ph-${ov.nodeId}`}>
                <Line
                  points={ov.points}
                  closed
                  fill="#000000"
                  opacity={0.55}
                  listening={false}
                />
                <Line
                  points={ov.points}
                  closed
                  fill="transparent"
                  stroke="#94a3b8"
                  strokeWidth={2 / zoom}
                  dash={[6 / zoom, 4 / zoom]}
                  opacity={0.7}
                  listening={false}
                />
              </React.Fragment>
            ))}

            {/* Surface mode hover highlight */}
            {hoveredSpacePolygon && (
              <Line
                points={hoveredSpacePolygon}
                closed
                fill="#ffffff"
                opacity={0.12}
                stroke="#ffffff"
                strokeWidth={2 / zoom}
                listening={false}
              />
            )}

            {/* Race lines — world-space width, scales with zoom */}
            {showSpline && raceLineArcs.map((arc, i) => (
              <Line
                key={`rl-${i}`}
                points={arc.points}
                stroke="#22d3ee"
                strokeWidth={trackWidthPx * 0.05}
                lineJoin="round" lineCap="round"
                opacity={0.7}
                listening={false}
              />
            ))}

            {/* Corner stripes */}
            {cornerStripes.map((cs, i) => (
              <Line
                key={`cstr-${i}`}
                points={cs.points}
                stroke="#ef4444"
                strokeWidth={halfWidth * 0.08}
                dash={[halfWidth * 0.12, halfWidth * 0.08]}
                lineCap="round" lineJoin="round"
                opacity={0.85}
                listening={false}
              />
            ))}

            {/* Chicane stripes */}
            {chicaneStripes.map((cs, i) => (
              <Group key={`chic-${i}`} listening={false}>
                <Line
                  points={cs.innerPoints}
                  stroke="#3b82f6"
                  strokeWidth={halfWidth * 0.08}
                  dash={[halfWidth * 0.12, halfWidth * 0.08]}
                  lineCap="round" lineJoin="round"
                  opacity={0.85}
                />
                <Line
                  points={cs.outerPoints}
                  stroke="#3b82f6"
                  strokeWidth={halfWidth * 0.08}
                  dash={[halfWidth * 0.12, halfWidth * 0.08]}
                  lineCap="round" lineJoin="round"
                  opacity={0.85}
                />
              </Group>
            ))}

            {/* Speed markers — sizes in world space */}
            {speedMarkers.map((m, i) => (
              <Group key={`spd-${i}`} listening={false}>
                <Line
                  points={[m.stickStart.x, m.stickStart.y, m.circleCenter.x, m.circleCenter.y]}
                  stroke="#e2e8f0" strokeWidth={halfWidth * 0.04} lineCap="round"
                />
                <Circle
                  x={m.circleCenter.x} y={m.circleCenter.y}
                  radius={m.circleRadius}
                  fill="#f8fafc" stroke="#1e293b" strokeWidth={halfWidth * 0.04}
                />
                <Text
                  x={m.circleCenter.x - m.circleRadius}
                  y={m.circleCenter.y - m.circleRadius}
                  width={m.circleRadius * 2}
                  height={m.circleRadius * 2}
                  text={String(m.speedLimit)}
                  fill="#0f172a"
                  fontSize={m.circleRadius * 1.1}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            ))}

            {/* Selected sector highlight */}
            {sectorHighlight && sectorHighlight.length > 0 && (
              <Line
                points={sectorHighlight}
                closed
                fill="#f59e0b"
                opacity={0.22}
                stroke="#f59e0b"
                strokeWidth={2 / zoom}
                listening={false}
              />
            )}

            {/* Space ticks */}
            {showGrid && spaceTicks.map((segTicks, si) =>
              segTicks.map((tick, ti) => (
                <Line
                  key={`t-${si}-${ti}`}
                  points={[tick.inner.x, tick.inner.y, tick.outer.x, tick.outer.y]}
                  stroke={si === selectedSegIndex ? '#fbbf24' : '#94a3b8'}
                  strokeWidth={(si === selectedSegIndex ? 2 : 1) / zoom}
                  opacity={0.6} listening={false}
                />
              ))
            )}

            {/* Corner lines */}
            {cornerLines.map((cl, idx) => (
              <Group key={cl.id}>
                <Line
                  points={[cl.inner.x, cl.inner.y, cl.outer.x, cl.outer.y]}
                  stroke="#ef4444" strokeWidth={halfWidth * 0.06} lineCap="round" listening={false}
                />
                <Text
                  x={cl.center.x + halfWidth * 0.4} y={cl.center.y - halfWidth * 0.3}
                  text={`C${idx + 1}`} fill="#ef4444"
                  fontSize={halfWidth * 0.55} fontStyle="bold" listening={false}
                />
              </Group>
            ))}

            {/* Finish line */}
            {finishLine && (
              <Group>
                <Line
                  points={[finishLine.inner.x, finishLine.inner.y, finishLine.outer.x, finishLine.outer.y]}
                  stroke="#facc15" strokeWidth={halfWidth * 0.08}
                  dash={[halfWidth * 0.1, halfWidth * 0.07]} lineCap="round" listening={false}
                />
                <Text x={finishLine.center.x + halfWidth * 0.3} y={finishLine.center.y - halfWidth * 0.3}
                  text="FINISH" fill="#facc15" fontSize={halfWidth * 0.5} fontStyle="bold" listening={false} />
              </Group>
            )}

            {/* Legends lines */}
            {legendsLines.map((ll, i) => (
              <Line key={`ll-${i}`}
                points={[ll.inner.x, ll.inner.y, ll.outer.x, ll.outer.y]}
                stroke="#c084fc" strokeWidth={halfWidth * 0.06}
                dash={[halfWidth * 0.07, halfWidth * 0.05]} lineCap="round" listening={false}
              />
            ))}

            {/* Legends lollipop markers */}
            {legendsMarkers.map((m, i) => (
              <Group key={`lm-${i}`} listening={false}>
                <Line
                  points={[m.stickStart.x, m.stickStart.y, m.circleCenter.x, m.circleCenter.y]}
                  stroke="#92400e" strokeWidth={halfWidth * 0.04} lineCap="round"
                />
                <Circle
                  x={m.circleCenter.x} y={m.circleCenter.y}
                  radius={m.circleRadius}
                  fill="#92400e" stroke="#ffffff" strokeWidth={halfWidth * 0.03}
                />
                <Text
                  x={m.circleCenter.x - m.circleRadius}
                  y={m.circleCenter.y - m.circleRadius}
                  width={m.circleRadius * 2}
                  height={m.circleRadius * 2}
                  text="L"
                  fill="#ffffff"
                  fontSize={m.circleRadius * 1.1}
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            ))}

            {/* Condition markers — world-space sizes */}
            {conditionMarkers.map(m => {
              const size   = halfWidth * 1.0;
              const half   = size / 2;
              const armLen = halfWidth * 1.3;
              const rad    = (m.rotation * Math.PI) / 180;
              const tipX   = armLen * Math.cos(rad);
              const tipY   = armLen * Math.sin(rad);
              const fill =
                m.type === 'sector'  ? '#f59e0b' :
                m.type === 'chicane' ? '#3b82f6' : '#ef4444';
              return (
                <Group
                  key={m.id}
                  x={m.x}
                  y={m.y}
                  draggable={tool === 'condition'}
                  onDragMove={e => updateConditionMarkerPosition(m.id, e.target.x(), e.target.y())}
                  onDragEnd={e => {
                    updateConditionMarkerPosition(m.id, e.target.x(), e.target.y());
                    commitConditionMarkerDrag();
                  }}
                  onWheel={tool === 'condition' ? e => {
                    e.evt.preventDefault();
                    e.evt.stopPropagation();
                    e.cancelBubble = true;
                    const step = e.evt.shiftKey ? 1 : 5;
                    const scrollValue = e.evt.deltaY !== 0 ? e.evt.deltaY : e.evt.deltaX;
                    const delta = scrollValue > 0 ? step : -step;
                    const raw = m.rotation + delta;
                    updateConditionMarkerRotation(m.id, ((raw % 360) + 360) % 360);
                    if (rotateCommitTimerRef.current) clearTimeout(rotateCommitTimerRef.current);
                    rotateCommitTimerRef.current = setTimeout(() => commitConditionMarkerDrag(), 600);
                  } : undefined}
                >
                  <Group rotation={m.rotation}>
                    <Rect
                      x={-half} y={-half}
                      width={size} height={size}
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth={halfWidth * 0.025}
                      cornerRadius={halfWidth * 0.02}
                    />
                    <Text
                      x={-half} y={-half}
                      width={size} height={size}
                      text={m.label}
                      fill="#ffffff"
                      fontSize={size * 0.5}
                      fontStyle="bold"
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </Group>
                  <Line
                    points={[0, 0, tipX, tipY]}
                    stroke="#ffffff"
                    strokeWidth={halfWidth * 0.025}
                    opacity={0.7}
                    listening={false}
                  />
                  <Circle
                    x={tipX} y={tipY}
                    radius={halfWidth * 0.04}
                    fill="#ffffff"
                    stroke={fill}
                    strokeWidth={halfWidth * 0.025}
                    listening={false}
                  />
                </Group>
              );
            })}

            {/* Plain sector countdown numbers (4 … sector_length) */}
            {sectorCountdownNumbers.map((m, i) => {
              const S = halfWidth * 0.28;
              return (
                <Group key={`sn-${i}`} x={m.point.x} y={m.point.y} listening={false}>
                  <Rect
                    x={-S * 0.6} y={-S * 0.55}
                    width={S * 1.2} height={S * 1.1}
                    fill="rgba(0,0,0,0.45)"
                    cornerRadius={S * 0.15}
                  />
                  <Text
                    x={-S * 0.6} y={-S * 0.55}
                    width={S * 1.2} height={S * 1.1}
                    text={m.label}
                    fill="#ffffff"
                    fontSize={S * 0.65}
                    fontStyle="bold"
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                  />
                </Group>
              );
            })}

            {/* Legends countdown markers — world-space sizes */}
            {countdownMarkerVisuals.map((m, i) => {
              const S      = halfWidth * 0.35;
              const brownW = S * 0.1;
              const gap    = S * 0.075;
              const bw     = S * 0.1;
              const half   = S / 2;

              type Layer = { r: number; fill: string };
              const layers: Layer[] = [];
              if (m.aggression >= 2) {
                layers.push({ r: half + brownW + gap + bw + gap + bw, fill: '#000000' });
                layers.push({ r: half + brownW + gap + bw + gap,      fill: '#ffffff' });
              }
              if (m.aggression >= 1) {
                layers.push({ r: half + brownW + gap + bw, fill: '#000000' });
                layers.push({ r: half + brownW + gap,      fill: '#ffffff' });
              }
              layers.push({ r: half + brownW, fill: '#92400e' });
              layers.push({ r: half,          fill: '#fbbf24' });

              return (
                <Group key={`cd-${i}`} x={m.point.x} y={m.point.y} listening={false}>
                  <Group rotation={45}>
                    {layers.map((l, li) => (
                      <Rect key={li}
                        x={-l.r} y={-l.r}
                        width={l.r * 2} height={l.r * 2}
                        fill={l.fill}
                      />
                    ))}
                  </Group>
                  <Text
                    x={-half} y={-half}
                    width={S} height={S}
                    text={m.label}
                    fill="#000000"
                    fontSize={S * 0.55}
                    fontStyle="bold"
                    align="center"
                    verticalAlign="middle"
                    listening={false}
                  />
                </Group>
              );
            })}

            {/* Ghost node (insert preview) */}
            {ghostPos && tool === 'edit' && (
              <Circle
                x={ghostPos.x} y={ghostPos.y}
                radius={NODE_RADIUS / zoom}
                fill="#39ff14" opacity={0.5}
                stroke="#fff" strokeWidth={1 / zoom}
                listening={false}
              />
            )}
          </Group>
        </Layer>

        {/* ── Node handles ─────────────────────────────── */}
        <Layer name="handles">
          <Group x={panX} y={panY} scaleX={zoom} scaleY={zoom}>
            {nodes.map((nd, idx) => {
              const isFirst = idx === 0;
              const isCorner = nd.isCorner;
              const isPhantom = nd.isPhantom;
              const isSelected = selectedNodeIds.includes(nd.id);

              const radius = isCorner ? CORNER_RADIUS
                : isFirst && !loopClosed ? FIRST_NODE_RADIUS
                : NODE_RADIUS;
              const fillColor = isPhantom ? '#1e293b'
                : isCorner ? '#ef4444'
                : isFirst && !loopClosed ? '#f59e0b'
                : '#39ff14';
              const strokeColor = isPhantom ? '#94a3b8'
                : isSelected ? '#60a5fa'
                : '#fff';

              return (
                <Group key={nd.id}>
                  {isSelected && (
                    <Circle x={nd.x} y={nd.y}
                      radius={(radius + 5) / zoom}
                      stroke="#60a5fa" strokeWidth={2 / zoom}
                      fill="transparent" listening={false}
                    />
                  )}
                  {(nd.isFinishLine || nd.isLegendsLine) && (
                    <Circle x={nd.x} y={nd.y}
                      radius={(radius + 3) / zoom}
                      stroke={nd.isFinishLine ? '#facc15' : '#c084fc'}
                      strokeWidth={2 / zoom} fill="transparent"
                      dash={[4 / zoom, 3 / zoom]} listening={false}
                    />
                  )}
                  {isPhantom && (
                    <Circle x={nd.x} y={nd.y}
                      radius={(radius + 3) / zoom}
                      stroke="#94a3b8" strokeWidth={1.5 / zoom}
                      fill="transparent"
                      dash={[3 / zoom, 3 / zoom]} listening={false}
                    />
                  )}
                  <Circle
                    x={nd.x} y={nd.y}
                    radius={radius / zoom}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={(isSelected ? 3 : isPhantom ? 1 : 2) / zoom}
                    opacity={isPhantom ? 0.5 : 1}
                    draggable={tool !== 'surface' && tool !== 'background' && tool !== 'condition' && (loopClosed || !isFirst)}
                    hitFunc={(ctx, shape) => {
                      const r = Math.max(radius, 14) / zoom;
                      ctx.beginPath();
                      ctx.arc(0, 0, r, 0, Math.PI * 2, false);
                      ctx.closePath();
                      ctx.fillStrokeShape(shape);
                    }}
                    onMouseDown={e => handleNodeMouseDown(e, nd.id)}
                    onDragMove={e => handleNodeDragMove(e, nd.id)}
                    onDragEnd={e => handleNodeDragEnd(e, nd.id)}
                    onClick={isFirst && !loopClosed ? handleFirstNodeClick : undefined}
                  />
                  {isFirst && !loopClosed && nodes.length >= 3 && (
                    <Circle x={nd.x} y={nd.y}
                      radius={(FIRST_NODE_RADIUS + 6) / zoom}
                      stroke="#f59e0b" strokeWidth={1.5 / zoom}
                      fill="transparent" dash={[4 / zoom, 3 / zoom]} listening={false}
                    />
                  )}
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>

      {/* ── Space input overlay ──────────────────────── */}
      {spaceInput !== null && spaceInputScreenPos && (
        <div style={{
          position: 'absolute',
          left: spaceInputScreenPos.x - 60,
          top: spaceInputScreenPos.y - 44,
          background: '#0f172a',
          border: '2px solid #3b82f6',
          borderRadius: 8,
          padding: '8px 12px',
          pointerEvents: 'none',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          minWidth: 120,
        }}>
          <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Spaces
          </div>
          <div style={{ color: '#93c5fd', fontSize: 28, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>
            {spaceInput || '…'}
          </div>
          <div style={{ color: '#334155', fontSize: 9 }}>Enter · Esc</div>
        </div>
      )}
    </div>
  );
};
