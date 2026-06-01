import type { PressCornerLabel, SegmentData } from '../types/track';
import type { ComputedSegment } from '../store/editorStore';

/** Build label → 0-based corner/sector index map for game export. */
export function buildPressCornersMap(
  segmentData: SegmentData[],
  computed: ComputedSegment[],
): Partial<Record<PressCornerLabel, number>> {
  const map: Partial<Record<PressCornerLabel, number>> = {};
  for (const seg of computed) {
    const sd = segmentData.find(d => d.startNodeId === seg.startNodeId);
    if (sd?.pressCornerLabel) {
      map[sd.pressCornerLabel] = seg.segmentIndex;
    }
  }
  return map;
}

/** Labels already assigned on other sectors (optionally excluding one sector). */
export function usedPressCornerLabels(
  segmentData: SegmentData[],
  exceptStartNodeId?: string,
): Set<PressCornerLabel> {
  const used = new Set<PressCornerLabel>();
  for (const sd of segmentData) {
    if (sd.startNodeId === exceptStartNodeId) continue;
    if (sd.pressCornerLabel) used.add(sd.pressCornerLabel);
  }
  return used;
}
