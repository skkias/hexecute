import type { AgentAbilityBlueprint } from "@/types/agent-ability";
import type { StratPlacedAbility } from "@/types/strat";

const ALL_KEY_SLOTS: ("q" | "e" | "c" | "x")[] = ["q", "e", "c", "x"];

/** One row in the strat “place ability” tray: a key binding or a custom-named blueprint. */
export type AbilityPlacementOption =
  | { kind: "key"; slot: "q" | "e" | "c" | "x" }
  | { kind: "custom"; blueprintId: string; name: string };

/**
 * Build placement chips from coach blueprints. Empty blueprint → all four keys (legacy).
 * Custom rows (`slot: custom`) each get their own chip keyed by `blueprintId`.
 */
export function abilityPlacementOptionsFromBlueprint(
  blueprint: AgentAbilityBlueprint[] | null | undefined,
): AbilityPlacementOption[] {
  if (!blueprint || blueprint.length === 0) {
    return ALL_KEY_SLOTS.map((slot) => ({ kind: "key", slot }));
  }
  const out: AbilityPlacementOption[] = [];
  const seenKey = new Set<string>();
  for (const b of blueprint) {
    if (b.slot === "custom") {
      out.push({ kind: "custom", blueprintId: b.id, name: b.name });
    } else if (
      b.slot === "q" ||
      b.slot === "e" ||
      b.slot === "c" ||
      b.slot === "x"
    ) {
      if (!seenKey.has(b.slot)) {
        seenKey.add(b.slot);
        out.push({ kind: "key", slot: b.slot });
      }
    }
  }
  return out;
}

/**
 * @deprecated Prefer {@link abilityPlacementOptionsFromBlueprint} — multiple custom
 * abilities cannot be represented as slot keys alone.
 */
export function allowedAbilitySlotsFromBlueprint(
  blueprint: AgentAbilityBlueprint[] | null | undefined,
): StratPlacedAbility["slot"][] {
  return abilityPlacementOptionsFromBlueprint(blueprint).map((o) =>
    o.kind === "key" ? o.slot : "custom",
  );
}
