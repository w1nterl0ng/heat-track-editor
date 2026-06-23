import Konva from 'konva';
import type { EditorState } from '../types/track';
import { getStyleById, normalizeStyle } from './stylePresets';
import { loadImage } from './exportTiles';

/**
 * Export the Konva stage as a PNG, hiding control-point handles first,
 * then restoring them.
 */
export async function exportBoardImage(
  stage: Konva.Stage,
  trackId: string,
  hideLayerNames: string[] = ['handles']
): Promise<void> {
  const hiddenLayers: Konva.Layer[] = [];

  stage.getLayers().forEach(layer => {
    if (hideLayerNames.includes(layer.name())) {
      layer.hide();
      hiddenLayers.push(layer);
    }
  });

  try {
    const dataUrl = await stage.toDataURL({ mimeType: 'image/png', pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `track_board_${trackId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    hiddenLayers.forEach(l => l.show());
  }
}

/**
 * Export the StyleCanvas as a full-board PNG at 2048×2048 pixels per tile
 * by capturing each tile separately and stitching into one large canvas.
 * Respects the style's transparentBackground setting.
 */
export async function exportBoardImageHiRes(
  state: EditorState,
  stage: Konva.Stage,
): Promise<void> {
  const { tileColumns, tileRows, meta } = state;
  const TILE = 2048;
  const stageW = stage.width();

  // Determine background treatment from active style
  const style = normalizeStyle(
    state.activeStyleId === 'custom' && state.customStyle
      ? state.customStyle
      : getStyleById(state.activeStyleId)
  );
  const transparent = style.background.transparentBackground;

  // Gather content groups (one per Layer)
  const groups: Konva.Group[] = stage.getLayers()
    .map(l => l.getChildren()[0])
    .filter((c): c is Konva.Group => c instanceof Konva.Group);

  const saved = groups.map(g => ({ x: g.x(), y: g.y(), sx: g.scaleX(), sy: g.scaleY() }));

  const totalW = tileColumns * TILE;
  const totalH = tileRows * TILE;
  const tileScale = stageW / TILE;

  // Stitching canvas
  const canvas = document.createElement('canvas');
  canvas.width  = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  if (!transparent) {
    ctx.fillStyle = style.background.fill;
    ctx.fillRect(0, 0, totalW, totalH);
  }

  for (let row = 0; row < tileRows; row++) {
    for (let col = 0; col < tileColumns; col++) {
      groups.forEach(g => {
        g.x(-col * stageW);
        g.y(-row * stageW);
        g.scaleX(tileScale);
        g.scaleY(tileScale);
      });
      stage.draw();

      const tileDataUrl = await stage.toDataURL({
        x: 0, y: 0, width: stageW, height: stageW,
        mimeType: 'image/png',
        pixelRatio: TILE / stageW,
      });

      const img = await loadImage(tileDataUrl);
      ctx.drawImage(img, col * TILE, row * TILE);
    }
  }

  // Restore original transforms
  groups.forEach((g, i) => {
    g.x(saved[i].x); g.y(saved[i].y);
    g.scaleX(saved[i].sx); g.scaleY(saved[i].sy);
  });
  stage.draw();

  // Download
  const finalDataUrl = canvas.toDataURL(transparent ? 'image/png' : 'image/png');
  const a = document.createElement('a');
  a.href     = finalDataUrl;
  a.download = `track_board_${meta.trackId}_hires.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
