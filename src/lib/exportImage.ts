import Konva from 'konva';

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
