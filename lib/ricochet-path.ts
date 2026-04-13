import type { MapPoint } from "@/lib/map-path";
import type { VisionLosContext } from "@/lib/vision-cone-los";

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

function hitDistanceOnRay(
  origin: MapPoint,
  dir: MapPoint,
  seg: Segment,
): number | null {
  const sx = seg.b.x - seg.a.x;
  const sy = seg.b.y - seg.a.y;
  const den = dir.x * sy - dir.y * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qpx = seg.a.x - origin.x;
  const qpy = seg.a.y - origin.y;
  const t = (qpx * sy - qpy * sx) / den;
  const u = (qpx * dir.y - qpy * dir.x) / den;
  if (t < 0) return null;
  if (u < 0 || u > 1) return null;
  return t;
}

function normalize(v: MapPoint): MapPoint | null {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-9) return null;
  return { x: v.x / len, y: v.y / len };
}

function reflectDir(inDir: MapPoint, seg: Segment): MapPoint | null {
  const tangent = normalize({
    x: seg.b.x - seg.a.x,
    y: seg.b.y - seg.a.y,
  });
  if (!tangent) return null;
  const normal = { x: -tangent.y, y: tangent.x };
  const dot = inDir.x * normal.x + inDir.y * normal.y;
  const out = {
    x: inDir.x - 2 * dot * normal.x,
    y: inDir.y - 2 * dot * normal.y,
  };
  return normalize(out);
}

function blockersFromContext(ctx: VisionLosContext): Segment[] {
  return [
    ...ringSegments(ctx.outer),
    ...ctx.holes.flatMap((h) => ringSegments(h)),
    ...ctx.filledBlockerPolygons.flatMap((p) => ringSegments(p)),
    ...ctx.hollowBlockerRings.flatMap((r) => ringSegments(r)),
    ...ctx.openBlockerSegments,
  ];
}

/**
 * Polyline for utility that travels in a straight heading and reflects on walls.
 * Distance is consumed continuously across segments until exhausted.
 */
export function computeRicochetPath(args: {
  from: MapPoint;
  toward: MapPoint;
  context: VisionLosContext | null | undefined;
  maxBounces?: number;
}): MapPoint[] {
  const { from, toward, context } = args;
  const maxBounces = Math.max(0, Math.min(48, args.maxBounces ?? 12));
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  let remaining = Math.hypot(dx, dy);
  if (remaining < 1e-6) return [from];
  const baseDir = normalize({ x: dx, y: dy });
  if (!baseDir) return [from];
  if (!context) return [from, toward];

  const segs = blockersFromContext(context);
  if (segs.length === 0) return [from, toward];

  const EPS = 1e-3;
  const out: MapPoint[] = [from];
  let origin = from;
  let dir = baseDir;
  let bounces = 0;

  while (remaining > EPS) {
    let nearest: { t: number; seg: Segment } | null = null;
    for (const seg of segs) {
      const t = hitDistanceOnRay(origin, dir, seg);
      if (t == null || t <= EPS || t > remaining + EPS) continue;
      if (!nearest || t < nearest.t) nearest = { t, seg };
    }

    if (!nearest) {
      out.push({
        x: origin.x + dir.x * remaining,
        y: origin.y + dir.y * remaining,
      });
      break;
    }

    const hit = {
      x: origin.x + dir.x * nearest.t,
      y: origin.y + dir.y * nearest.t,
    };
    out.push(hit);
    remaining -= nearest.t;
    if (remaining <= EPS) break;
    if (bounces >= maxBounces) {
      out.push({
        x: hit.x + dir.x * remaining,
        y: hit.y + dir.y * remaining,
      });
      break;
    }

    const reflected = reflectDir(dir, nearest.seg);
    if (!reflected) break;
    dir = reflected;
    origin = { x: hit.x + dir.x * EPS * 4, y: hit.y + dir.y * EPS * 4 };
    bounces += 1;
  }

  return out;
}
