import React, { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Toolbar } from './components/Toolbar';
import { TrackCanvas } from './components/TrackCanvas';
import { Sidebar } from './components/Sidebar';
import { EmptyHint } from './components/EmptyHint';
import { ChecklistPanel } from './components/ChecklistPanel';
import { useEditorStore } from './store/editorStore';

export const App: React.FC = () => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const {
    tool,
    setTool,
    undo,
    redo,
    zoom,
    setZoom,
    setPan,
    setCanvasSize,
    loopClosed,
    selectedNodeIds,
    spaceInput,
    setSpaceInput,
    setSpacesBetween,
    toggleNodeCorner,
    removeNode,
    removeNodesBetween,
    setNodeFinishLine,
    toggleNodeLegendsLine,
    flipLollipopSide,
    toggleNodePhantom,
    clearSelection,
    activeSurfaceType,
    activeSurfaceSide,
    setActiveSurface,
    checklistOpen,
  } = useEditorStore();

  // Resize canvas to always fill the available workspace
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setCanvasSize(Math.floor(width), Math.floor(height));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [setCanvasSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault(); redo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault(); setZoom(1); setPan(0, 0); return;
      }

      // Space count input (when exactly 2 nodes are selected)
      if (selectedNodeIds.length === 2) {
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          setSpaceInput(spaceInput === null ? e.key : spaceInput + e.key);
          return;
        }
        if (e.key === 'Backspace' && spaceInput !== null) {
          e.preventDefault();
          setSpaceInput(spaceInput.length <= 1 ? null : spaceInput.slice(0, -1));
          return;
        }
        if (e.key === 'Enter' && spaceInput !== null) {
          e.preventDefault();
          const count = parseInt(spaceInput, 10);
          if (count >= 1) {
            setSpacesBetween(selectedNodeIds[0], selectedNodeIds[1], count);
          }
          setSpaceInput(null);
          return;
        }
      }

      // Escape
      if (e.key === 'Escape') {
        if (spaceInput !== null) { setSpaceInput(null); return; }
        clearSelection();
        return;
      }

      // Node operations (when 1 or 2 nodes selected)
      if (selectedNodeIds.length >= 1) {
        // C — toggle corner on all selected nodes
        if (e.key === 'c' || e.key === 'C') {
          if (!loopClosed) return; // corners only make sense on closed loop
          e.preventDefault();
          selectedNodeIds.forEach(id => toggleNodeCorner(id));
          clearSelection();
          return;
        }

        // F — set finish line on first selected node
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          if (selectedNodeIds[0]) setNodeFinishLine(selectedNodeIds[0]);
          clearSelection();
          return;
        }

        // L — toggle legends line on first selected node
        if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          if (selectedNodeIds[0]) toggleNodeLegendsLine(selectedNodeIds[0]);
          clearSelection();
          return;
        }

        // I — flip lollipop side(s) on the selected node
        if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          if (selectedNodeIds[0]) flipLollipopSide(selectedNodeIds[0]);
          clearSelection();
          return;
        }

        // H — toggle phantom (bridge crossing) on selected nodes
        if (e.key === 'h' || e.key === 'H') {
          e.preventDefault();
          selectedNodeIds.forEach(id => toggleNodePhantom(id));
          clearSelection();
          return;
        }

        // Delete / Backspace
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          if (selectedNodeIds.length === 2) {
            removeNodesBetween(selectedNodeIds[0], selectedNodeIds[1]);
          } else {
            removeNode(selectedNodeIds[0]);
          }
          return;
        }
      }

      // Surface mode shortcuts — set the active brush type/side
      if (tool === 'surface') {
        switch (e.key) {
          case 'p': case 'P': e.preventDefault(); setActiveSurface('plain');   return;
          case 'g': case 'G': e.preventDefault(); setActiveSurface('gravel');  return;
          case 'w': case 'W': e.preventDefault(); setActiveSurface('flooded'); return;
          case 't': case 'T': e.preventDefault(); setActiveSurface('tunnel');  return;
          case '1': e.preventDefault(); setActiveSurface(activeSurfaceType, 'both');    return;
          case '2': e.preventDefault(); setActiveSurface(activeSurfaceType, 'outside'); return;
          case '3': e.preventDefault(); setActiveSurface(activeSurfaceType, 'inside');  return;
        }
      }

      // Tool / view shortcuts (no node required)
      switch (e.key) {
        case 'v': case 'V': setTool('edit'); break;
        case 's': case 'S': setTool('surface'); break;
        case 'd': case 'D': setTool('condition'); break;
        case 'b': case 'B': setTool('background'); break;
        case '+': case '=': setZoom(zoom * 1.2); break;
        case '-': setZoom(zoom / 1.2); break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    tool, zoom, selectedNodeIds, spaceInput, loopClosed,
    activeSurfaceType, activeSurfaceSide,
    setTool, undo, redo, setZoom, setPan,
    setSpaceInput, setSpacesBetween, clearSelection,
    toggleNodeCorner, removeNode, removeNodesBetween,
    setNodeFinishLine, toggleNodeLegendsLine, setActiveSurface,
  ]);

  return (
    <div style={styles.app}>
      <Toolbar />
      <div style={styles.workspace}>
        <div style={styles.canvasWrapper} ref={canvasContainerRef}>
          {checklistOpen && <ChecklistPanel />}
          <TrackCanvas stageRef={stageRef} />
          <EmptyHint />
          <ZoomIndicator />
        </div>
        <Sidebar stageRef={stageRef} />
      </div>
    </div>
  );
};

const ZoomIndicator: React.FC = () => {
  const { zoom, setZoom, setPan } = useEditorStore();
  return (
    <div style={styles.zoomBadge} title="Ctrl+0 to reset, scroll to zoom">
      <button style={styles.zoomBtn} onClick={() => setZoom(zoom / 1.2)} title="Zoom out">−</button>
      <span
        style={styles.zoomLabel}
        onClick={() => { setZoom(1); setPan(0, 0); }}
        title="Click to reset zoom"
      >
        {Math.round(zoom * 100)}%
      </span>
      <button style={styles.zoomBtn} onClick={() => setZoom(zoom * 1.2)} title="Zoom in">+</button>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex', flexDirection: 'column',
    width: '100vw', height: '100vh',
    background: '#0f172a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflow: 'hidden', color: '#e2e8f0',
  },
  workspace: { display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' },
  canvasWrapper: {
    flex: 1, minWidth: 0, position: 'relative',
    overflow: 'hidden', background: '#1a1a2e',
  },
  zoomBadge: {
    position: 'absolute', bottom: 12, left: 12,
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid #334155', borderRadius: 6,
    padding: '3px 8px', backdropFilter: 'blur(4px)',
  },
  zoomBtn: {
    background: 'transparent', border: 'none',
    color: '#94a3b8', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px',
  },
  zoomLabel: {
    color: '#94a3b8', fontSize: 11, minWidth: 36, textAlign: 'center', cursor: 'pointer',
  },
};
