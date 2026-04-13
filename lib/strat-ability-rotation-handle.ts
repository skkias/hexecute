import type { MapPoint } from "@/lib/map-path";

/** Distance from anchor to rotation handle on the strat map (logical units, ~% of view width). */
export function stratAbilityRotationHandleDistance(vbWidth: number): number {
  return Math.max(vbWidth * 0.048, 14);
}

/** Stored attack-space point for the rotation handle (angle follows `rotationDeg` from +X). */
export function stratAbilityRotationHandleStored(
  origin: MapPoint,
  rotationDeg: number,
  dist: number,
): MapPoint {
  const rad = (rotationDeg * Math.PI) / 180;
  return {
    x: origin.x + dist * Math.cos(rad),
    y: origin.y + dist * Math.sin(rad),
  };
}
