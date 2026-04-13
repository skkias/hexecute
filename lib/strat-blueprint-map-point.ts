import type { AgentAbilityBlueprint, AgentAbilityGeometry } from "@/types/agent-ability";
import { stratBlueprintUnitsToMapScale } from "@/lib/agent-ability-blueprint-scale";
import { blueprintStratAnchor } from "@/lib/strat-blueprint-anchor";
import type { MapPoint } from "@/lib/map-path";

function rotateVec(vx: number, vy: number, deg: number): MapPoint {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: vx * c - vy * s, y: vx * s + vy * c };
}

/**
 * Map a blueprint-space point to strat map display coordinates.
 * Matches `StratAbilityBlueprintSvg`: translate(-anchor) → scale → rotate(strat) → translate(map pin).
 */
export function blueprintPointToStratMapDisplay(
  p: MapPoint,
  blueprint: AgentAbilityBlueprint,
  mapX: number,
  mapY: number,
  vbWidth: number,
  rotationDeg: number,
  stratAnchorOverride?: { x: number; y: number } | null,
): MapPoint {
  const anchor = stratAnchorOverride ?? blueprintStratAnchor(blueprint);
  const scale = stratBlueprintUnitsToMapScale(vbWidth);
  const v0 = { x: p.x - anchor.x, y: p.y - anchor.y };
  const v1 = { x: v0.x * scale, y: v0.y * scale };
  const v2 = rotateVec(v1.x, v1.y, rotationDeg);
  return { x: v2.x + mapX, y: v2.y + mapY };
}

/** Geometric center of the rectangle (blueprint space) — cyan rotation handle. */
export function rectangleStratPivotBlueprint(
  g: Extract<AgentAbilityGeometry, { kind: "rectangle" }>,
): MapPoint {
  return { x: g.x + g.w / 2, y: g.y + g.h / 2 };
}

/**
 * Midpoint of the outer "bottom" edge (max Y in local rect space), after the rect's
 * own `rotationDeg` in blueprint space — yellow placement / strat map pin / rotation pivot.
 */
export function rectanglePlacementEdgeBlueprint(
  g: Extract<AgentAbilityGeometry, { kind: "rectangle" }>,
): MapPoint {
  const cx = g.x + g.w / 2;
  const cy = g.y + g.h / 2;
  const halfH = g.h / 2;
  const rd = g.rotationDeg ?? 0;
  if (rd === 0) {
    return { x: cx, y: cy + halfH };
  }
  const rad = (rd * Math.PI) / 180;
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const vx = -halfH * s;
  const vy = halfH * c;
  return { x: cx + vx, y: cy + vy };
}

/**
 * Rectangle: strat map pin and transform anchor = placement edge (yellow dot).
 * Rotation on the map is around this point; cyan handle sits at the rect center.
 */
export function stratAnchorOverrideForBlueprint(
  blueprint: AgentAbilityBlueprint,
): { x: number; y: number } | undefined {
  if (blueprint.shapeKind !== "rectangle") return undefined;
  const g = blueprint.geometry;
  if (g.kind !== "rectangle") return undefined;
  return rectanglePlacementEdgeBlueprint(g);
}
