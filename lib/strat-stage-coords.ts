import type { GameMap } from "@/types/catalog";
import {
  flipPointsOverHorizontalMidline,
  type MapPoint,
  type ViewBoxRect,
} from "@/lib/map-path";
import { stratDisplayUsesPathDefOutline } from "@/lib/strat-side-display-geometry";
import type { StratSide } from "@/types/strat";

function stratStoredAttackPointToDisplay(
  vb: ViewBoxRect,
  map: GameMap,
  side: StratSide,
  p: MapPoint,
): MapPoint {
  if (!stratDisplayUsesPathDefOutline(map, side)) return p;
  return flipPointsOverHorizontalMidline(vb, [p])[0]!;
}

/**
 * Stage pins are stored in `path_atk` coordinates. When the viewer shows `path_def`, mirror
 * into that frame (same as `stratMapDisplayData`).
 */
export function stratStagePinForDisplay(
  vb: ViewBoxRect,
  side: StratSide,
  map: GameMap,
  storedAttack: MapPoint,
): MapPoint {
  return stratStoredAttackPointToDisplay(vb, map, side, storedAttack);
}

export function stratStagePinToStoredAttack(
  vb: ViewBoxRect,
  side: StratSide,
  map: GameMap,
  displayCoords: MapPoint,
): MapPoint {
  return stratStoredAttackPointToDisplay(vb, map, side, displayCoords);
}
