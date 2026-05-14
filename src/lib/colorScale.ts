import { HEATMAP_COLORS } from "./constants";

export function getHeatmapColor(value: number, max: number): string {
  if (max === 0 || value === 0) return HEATMAP_COLORS[0];
  const idx = Math.ceil((value / max) * (HEATMAP_COLORS.length - 1));
  return HEATMAP_COLORS[Math.min(idx, HEATMAP_COLORS.length - 1)];
}
