import type { GameMap } from "@/types/catalog";
import type { StratSide } from "@/types/strat";
import { normalizeEditorMeta } from "@/lib/map-editor-meta";

/**
 * Extra paths, spawns, and labels are stored in the same frame as `path_atk` (purple ring).
 * The saved `path_def` ring is the horizontal midline mirror of `path_atk`. When the strat
 * viewer shows `path_def` as the territory outline (see {@link outlinePathForStratSide}),
 * those layers must be mirrored the same way so they line up — no separate 180° “swap
 * sides” transform; invert-meaning only swaps **which** outline/pair of references applies.
 */
export function stratDisplayUsesPathDefOutline(
  map: GameMap,
  side: StratSide,
): boolean {
  const em = normalizeEditorMeta(map.editor_meta);
  const inv = em.side_meaning_inverted === true;
  if (!inv) return side === "def";
  return side === "atk";
}
