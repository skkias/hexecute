import type { GameMap } from "@/types/catalog";
import type { StratSide } from "@/types/strat";
import type { MapPoint } from "@/lib/map-path";
import { parsePathToRings } from "@/lib/map-path";
import { outlinePathForStratDisplay } from "@/lib/map-strat-side";
import { stratMapDisplayData } from "@/lib/strat-map-display";
import { circleToPolygon, isCircleOverlay } from "@/lib/map-overlay-geometry";
import { pointInOutlineWithHoles, pointInPolygon } from "@/lib/polygon-contains";

export type VisionLosContext = {
  outer: MapPoint[];
  holes: MapPoint[][];
  blockerPolygons: MapPoint[][];
};

type Segment = { a: MapPoint; b: MapPoint };

function ringSegments(points: MapPoint[]): Segment[] {
  if (points.length < 2) return [];
  const segs: Segment[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    segs.push({ a, b });
  }
  return segs;
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function raySegmentHitDistance(
  o: MapPoint,
  dx: number,
  dy: number,
  seg: Segment,
): number | null {
  const sx = seg.b.x - seg.a.x;
  const sy = seg.b.y - seg.a.y;
  const den = cross(dx, dy, sx, sy);
  if (Math.abs(den) < 1e-9) return null;
  const qpx = seg.a.x - o.x;
  const qpy = seg.a.y - o.y;
  const t = cross(qpx, qpy, sx, sy) / den;
  const u = cross(qpx, qpy, dx, dy) / den;
  if (t < 0) return null;
  if (u < 0 || u > 1) return null;
  return t;
}

function normalizeSignedRad(rad: number): number {
  let r = rad;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

export function buildVisionLosContext(
  gameMap: GameMap,
  side: StratSide,
): VisionLosContext | null {
  const outlinePath = outlinePathForStratDisplay(gameMap, side);
  const rings = parsePathToRings(outlinePath);
  const outer = rings[0] ?? [];
  if (outer.length < 3) return null;
  const holes = rings.slice(1).filter((r) => r.length >= 3);
  const overlays = stratMapDisplayData(gameMap, side).overlays;
  const blockerPolygons: MapPoint[][] = overlays
    .filter((sh) => sh.kind === "obstacle" || sh.kind === "wall")
    .map((sh) => {
      if (isCircleOverlay(sh) && sh.circle) {
        return circleToPolygon(sh.circle, 72);
      }
      return sh.points;
    })
    .filter((pts) => pts.length >= 3);
  return { outer, holes, blockerPolygons };
}

function nearestRayHitDistance(
  origin: MapPoint,
  angleRad: number,
  maxRange: number,
  context: VisionLosContext,
): number {
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  const boundarySegments: Segment[] = [
    ...ringSegments(context.outer),
    ...context.holes.flatMap((h) => ringSegments(h)),
    ...context.blockerPolygons.flatMap((p) => ringSegments(p)),
  ];
  let nearest = maxRange;
  for (const seg of boundarySegments) {
    const hit = raySegmentHitDistance(origin, dx, dy, seg);
    if (hit == null) continue;
    if (hit < nearest) nearest = hit;
  }
  return nearest;
}

export function isVisionOriginInPlayable(
  origin: MapPoint,
  context: VisionLosContext,
): boolean {
  if (!pointInOutlineWithHoles(origin, context.outer, context.holes)) return false;
  for (const poly of context.blockerPolygons) {
    if (pointInPolygon(origin, poly)) return false;
  }
  return true;
}

/**
 * Large enough cast distance so rays reach the far side of the map; actual
 * length is always clamped by {@link nearestRayHitDistance}.
 */
export function visionLosMaxCastRange(
  origin: MapPoint,
  context: VisionLosContext,
): number {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const expand = (pts: MapPoint[]) => {
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
  };
  expand(context.outer);
  for (const h of context.holes) expand(h);
  for (const poly of context.blockerPolygons) expand(poly);
  if (!Number.isFinite(minX)) return 1e9;
  const corners: MapPoint[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  let maxCornerDist = 0;
  for (const c of corners) {
    maxCornerDist = Math.max(
      maxCornerDist,
      Math.hypot(c.x - origin.x, c.y - origin.y),
    );
  }
  return Math.max(maxCornerDist * 2.5, 1);
}

export function computeVisionConeRayEnd(args: {
  origin: MapPoint;
  angleRad: number;
  context: VisionLosContext;
}): MapPoint {
  const { origin, angleRad, context } = args;
  const range = visionLosMaxCastRange(origin, context);
  const hit = nearestRayHitDistance(origin, angleRad, range, context);
  return {
    x: origin.x + Math.cos(angleRad) * hit,
    y: origin.y + Math.sin(angleRad) * hit,
  };
}

export function computeVisionConeLosPolygon(args: {
  origin: MapPoint;
  left: MapPoint;
  right: MapPoint;
  context: VisionLosContext;
}): MapPoint[] {
  const { origin, left, right, context } = args;
  if (!isVisionOriginInPlayable(origin, context)) return [origin];

  const lvx = left.x - origin.x;
  const lvy = left.y - origin.y;
  const rvx = right.x - origin.x;
  const rvy = right.y - origin.y;
  const leftAng = Math.atan2(lvy, lvx);
  const rightAng = Math.atan2(rvy, rvx);
  const sweep = normalizeSignedRad(rightAng - leftAng);
  const range = visionLosMaxCastRange(origin, context);
  const rayCount = Math.max(18, Math.min(120, Math.round(Math.abs(sweep) * 36)));

  const pts: MapPoint[] = [origin];
  for (let i = 0; i <= rayCount; i++) {
    const t = i / rayCount;
    const a = leftAng + sweep * t;
    const nearest = nearestRayHitDistance(origin, a, range, context);
    pts.push({
      x: origin.x + Math.cos(a) * nearest,
      y: origin.y + Math.sin(a) * nearest,
    });
  }
  return pts;
}
