import type { MapEditorMeta } from "@/types/catalog";
import type { MapPoint, ViewBoxRect } from "@/lib/map-path";

/**
 * Uniform scale of all **saved map geometry** (paths, overlays, spawns, labels, strat
 * pins) about the viewBox center. The reference image is **not** scaled — adjust this to
 * eyeball vectors to bitmap art. Default 1.
 */
export function mapGeometryScaleFromEditorMeta(
  meta: MapEditorMeta | null | undefined,
): number {
  const s = meta?.map_geometry_scale;
  if (typeof s !== "number" || !Number.isFinite(s)) return 1;
  return Math.min(8, Math.max(0.05, s));
}

export function mapGeometryGroupTransform(
  vb: ViewBoxRect,
  scale: number,
): string | undefined {
  if (Math.abs(scale - 1) < 1e-9) return undefined;
  const cx = vb.minX + vb.width / 2;
  const cy = vb.minY + vb.height / 2;
  return `translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})`;
}

/** Root SVG user space → logical geometry space (inverse of {@link logicalPointToRootGeometry}). */
export function rootPointToLogicalGeometry(
  root: MapPoint,
  vb: ViewBoxRect,
  scale: number,
): MapPoint {
  if (Math.abs(scale - 1) < 1e-9 || scale <= 0) return root;
  const cx = vb.minX + vb.width / 2;
  const cy = vb.minY + vb.height / 2;
  return {
    x: (root.x - cx) / scale + cx,
    y: (root.y - cy) / scale + cy,
  };
}

export function logicalPointToRootGeometry(
  logical: MapPoint,
  vb: ViewBoxRect,
  scale: number,
): MapPoint {
  if (Math.abs(scale - 1) < 1e-9 || scale <= 0) return logical;
  const cx = vb.minX + vb.width / 2;
  const cy = vb.minY + vb.height / 2;
  return {
    x: (logical.x - cx) * scale + cx,
    y: (logical.y - cy) * scale + cy,
  };
}
