import JSZip from 'jszip';
import type { EditorState } from '../types/track';

const TILE_SIZE = 2048;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Render all background tiles and add them directly into a JSZip folder.
 * Used by exportV2Bundle to embed tiles alongside the JSON in one package.
 */
export async function addTilesToZip(state: EditorState, zipFolder: JSZip): Promise<void> {
  const {
    backgroundImage,
    backgroundX,
    backgroundY,
    backgroundScale,
    backgroundSize,
    tileColumns,
    tileRows,
    meta,
  } = state;

  if (!backgroundImage) return;

  const img = await loadImage(backgroundImage);
  const trackId = meta.trackId || 'track';

  for (let row = 0; row < tileRows; row++) {
    for (let col = 0; col < tileColumns; col++) {
      const canvas = document.createElement('canvas');
      canvas.width = TILE_SIZE;
      canvas.height = TILE_SIZE;
      const ctx = canvas.getContext('2d')!;

      const tileWorldX = col * TILE_SIZE;
      const tileWorldY = row * TILE_SIZE;

      const srcX = (tileWorldX - backgroundX) / backgroundScale;
      const srcY = (tileWorldY - backgroundY) / backgroundScale;
      const srcW = TILE_SIZE / backgroundScale;
      const srcH = TILE_SIZE / backgroundScale;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      const clampedSrcX     = Math.max(0, srcX);
      const clampedSrcY     = Math.max(0, srcY);
      const clampedSrcRight  = Math.min(backgroundSize.width,  srcX + srcW);
      const clampedSrcBottom = Math.min(backgroundSize.height, srcY + srcH);

      if (clampedSrcRight > clampedSrcX && clampedSrcBottom > clampedSrcY) {
        const dstX = (clampedSrcX - srcX) * backgroundScale;
        const dstY = (clampedSrcY - srcY) * backgroundScale;
        const dstW = (clampedSrcRight - clampedSrcX) * backgroundScale;
        const dstH = (clampedSrcBottom - clampedSrcY) * backgroundScale;
        ctx.drawImage(
          img,
          clampedSrcX, clampedSrcY, clampedSrcRight - clampedSrcX, clampedSrcBottom - clampedSrcY,
          dstX, dstY, dstW, dstH,
        );
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      zipFolder.file(`T_${trackId}_${col}_${row}.jpg`, dataUrlToBlob(dataUrl));
    }
  }
}

/**
 * Export each tile of the background as a 2048×2048 JPEG named
 * T_{trackId}_{col}_{row}.jpg, bundled into a single ZIP download.
 *
 * The background image occupies world rect:
 *   [backgroundX, backgroundY,
 *    backgroundX + backgroundSize.width  * backgroundScale,
 *    backgroundY + backgroundSize.height * backgroundScale]
 *
 * Each tile occupies world rect [col*2048, row*2048, (col+1)*2048, (row+1)*2048].
 * We convert that to image source coordinates and use Canvas 2D to crop.
 * Tiles that fall entirely outside the image are exported as solid black.
 */
export async function exportBackgroundTiles(state: EditorState): Promise<void> {
  const {
    backgroundImage,
    backgroundX,
    backgroundY,
    backgroundScale,
    backgroundSize,
    tileColumns,
    tileRows,
    meta,
  } = state;

  if (!backgroundImage) return;

  const img = await loadImage(backgroundImage);
  const trackId = meta.trackId || 'track';
  const zip = new JSZip();

  for (let row = 0; row < tileRows; row++) {
    for (let col = 0; col < tileColumns; col++) {
      const canvas = document.createElement('canvas');
      canvas.width = TILE_SIZE;
      canvas.height = TILE_SIZE;
      const ctx = canvas.getContext('2d')!;

      // Tile world rect top-left
      const tileWorldX = col * TILE_SIZE;
      const tileWorldY = row * TILE_SIZE;

      // Convert tile world coords to image source coords.
      // world_x = img_x * backgroundScale + backgroundX
      // => img_x = (world_x - backgroundX) / backgroundScale
      const srcX = (tileWorldX - backgroundX) / backgroundScale;
      const srcY = (tileWorldY - backgroundY) / backgroundScale;
      const srcW = TILE_SIZE / backgroundScale;
      const srcH = TILE_SIZE / backgroundScale;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

      // Clamp source rect to actual image bounds before drawing
      const clampedSrcX = Math.max(0, srcX);
      const clampedSrcY = Math.max(0, srcY);
      const clampedSrcRight = Math.min(backgroundSize.width, srcX + srcW);
      const clampedSrcBottom = Math.min(backgroundSize.height, srcY + srcH);

      if (clampedSrcRight > clampedSrcX && clampedSrcBottom > clampedSrcY) {
        const dstX = (clampedSrcX - srcX) * backgroundScale;
        const dstY = (clampedSrcY - srcY) * backgroundScale;
        const dstW = (clampedSrcRight - clampedSrcX) * backgroundScale;
        const dstH = (clampedSrcBottom - clampedSrcY) * backgroundScale;
        ctx.drawImage(
          img,
          clampedSrcX, clampedSrcY, clampedSrcRight - clampedSrcX, clampedSrcBottom - clampedSrcY,
          dstX, dstY, dstW, dstH
        );
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      zip.file(`T_${trackId}_${col}_${row}.jpg`, dataUrlToBlob(dataUrl));
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `T_${trackId}_tiles.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
