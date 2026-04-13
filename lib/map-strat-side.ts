import type { GameMap } from "@/types/catalog";
import type { StratSide } from "@/types/strat";

/** SVG outline path for a strat side, respecting `side_meaning_inverted` on the map. */
export function outlinePathForStratSide(
  map: GameMap,
  side: "atk" | "def",
): string | null {
  const inv = map.editor_meta?.side_meaning_inverted === true;
  if (!inv) {
    return side === "atk" ? map.path_atk : map.path_def;
  }
  return side === "atk" ? map.path_def : map.path_atk;
}

/**
 * Territory outline for the strat viewer: pick `path_atk` or saved `path_def` only — same
 * references as the map editor; no extra geometric transforms on the path string.
 */
export function outlinePathForStratDisplay(
  map: GameMap,
  side: StratSide,
): string | null {
  return outlinePathForStratSide(map, side);
}
