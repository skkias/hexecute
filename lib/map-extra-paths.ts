import type { MapOverlayKind, MapOverlayShape } from "@/types/catalog";
import type { MapPoint } from "@/lib/map-path";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseKind(raw: unknown): MapOverlayKind | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().toLowerCase();
  if (k === "obstacle" || k === "elevation" || k === "wall" || k === "grade") {
    return k;
  }
  return null;
}

/** Accepts jsonb array or a double-encoded JSON string (some clients store that). */
export function normalizeExtraPaths(raw: unknown): MapOverlayShape[] {
  let data = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  const out: MapOverlayShape[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id ? o.id : newId();
    const kind = parseKind(o.kind);
    if (!kind) continue;
    const pts = Array.isArray(o.points) ? o.points : [];
    const points: MapPoint[] = [];
    for (const pt of pts) {
      if (!pt || typeof pt !== "object") continue;
      const px = asFiniteNumber((pt as { x?: unknown }).x);
      const py = asFiniteNumber((pt as { y?: unknown }).y);
      if (px !== null && py !== null) {
        points.push({ x: px, y: py });
      }
    }
    let gradeHighSide: 1 | -1 | undefined;
    if (kind === "grade") {
      const g = o.gradeHighSide;
      gradeHighSide = g === -1 ? -1 : 1;
    }
    out.push({ id, kind, points, gradeHighSide });
  }
  return out;
}
