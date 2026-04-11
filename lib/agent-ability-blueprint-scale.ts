import type { AgentAbilityBlueprint } from "@/types/agent-ability";
import {
  blueprintBoundsCenterAndSpan,
  blueprintGeometryBounds,
} from "@/lib/strat-ability-blueprint-bounds";

/** Normalized blueprint drawing canvas (matches `types/agent-ability` docs). */
export const BLUEPRINT_CANVAS_SIZE = 1000;

/**
 * On strat maps, the blueprint’s axis-aligned bounding box **max(width, height)**
 * is scaled so it equals this fraction of the map viewBox width — same as
 * `StratAbilityBlueprintSvg`.
 */
export const STRAT_BLUEPRINT_BBOX_TO_MAP_WIDTH_RATIO = 0.22;

export function stratBlueprintTargetSpanForMap(vbWidth: number): number {
  return vbWidth * STRAT_BLUEPRINT_BBOX_TO_MAP_WIDTH_RATIO;
}

/** Uniform scale from blueprint user units to map units (strat designer / pins). */
export function stratBlueprintUniformScale(
  blueprint: AgentAbilityBlueprint,
  vbWidth: number,
): number {
  const bounds = blueprintGeometryBounds(blueprint.geometry);
  const { span } = blueprintBoundsCenterAndSpan(bounds);
  return stratBlueprintTargetSpanForMap(vbWidth) / span;
}

export function blueprintStratSizingReadout(blueprint: AgentAbilityBlueprint): {
  bboxMaxSide: number;
  targetPercentOfMapWidth: number;
} {
  const bounds = blueprintGeometryBounds(blueprint.geometry);
  const { span } = blueprintBoundsCenterAndSpan(bounds);
  return {
    bboxMaxSide: span,
    targetPercentOfMapWidth: STRAT_BLUEPRINT_BBOX_TO_MAP_WIDTH_RATIO * 100,
  };
}
