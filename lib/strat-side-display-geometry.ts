import type { GameMap } from "@/types/catalog";
import type { StratSide } from "@/types/strat";
import { normalizeEditorMeta } from "@/lib/map-editor-meta";

/**
 * How stored attack-side geometry is shown for a strat side.
 *
 * - **center** — point reflection through the viewBox center (180°), same as MapShapeEditor
 *   “Swap sides”. Used for **defense** strats when atk/def meaning is normal: aligns outline
 *   and overlays the way users expect vs the purple `path_atk` editor view.
 * - **horizontal** — reflection across the horizontal midline (`path_def` = defense ring on
 *   save). Used when **Invert atk/def meaning** is on and the strat side is **attack**:
 *   game attack territory is the mirrored ring (`path_def`), not `path_atk`.
 */
export type StratSideDisplayFlip = "none" | "center" | "horizontal";

export function stratSideDisplayFlip(
  map: GameMap,
  side: StratSide,
): StratSideDisplayFlip {
  const em = normalizeEditorMeta(map.editor_meta);
  const meaningInverted = em.side_meaning_inverted === true;
  const shouldFlipForSide = meaningInverted ? side === "atk" : side === "def";
  if (!shouldFlipForSide) return "none";
  return meaningInverted ? "horizontal" : "center";
}
